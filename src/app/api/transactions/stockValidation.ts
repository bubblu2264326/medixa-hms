import type { PoolClient } from "pg";
import type { CartItem } from "@/src/lib/types";
import { formatStockQuantity, toStockBreakdown } from "@/src/features/pharmacy/retail/stock";

type InventoryItem = CartItem & {
  batchId?: number;
  batchNumber?: string;
};

interface ExistingSaleDetailRow {
  medicine_id: number;
  batch_id: number | null;
  quantity: number;
  sub_quantity: number;
}

// ─── FEFO Result Types ────────────────────────────────────────
export interface BatchAllocation {
  batchId: number;
  batchNumber: string;
  medicineId: number;
  allocatedQuantity: number;
  allocatedSubQuantity: number;
  unitPrice: number;
  subUnitPrice: number;
  expiryDate: string | null;
}

export interface FEFOResult {
  medicineId: number;
  allocations: BatchAllocation[];
}

// ─── Aggregation Types ────────────────────────────────────────
interface AggregatedItem {
  medicineId: number;
  batchId: number;
  quantity: number;
  subQuantity: number;
  medicine: InventoryItem["medicine"];
}

interface MedicineRequest {
  medicineId: number;
  totalQuantity: number;
  totalSubQuantity: number;
  medicine: InventoryItem["medicine"];
}

// ─── Helpers ──────────────────────────────────────────────────

function inventoryKey(medicineId: number, batchId: number) {
  return `${medicineId}:${batchId}`;
}

function getInventoryItems(items: CartItem[]): InventoryItem[] {
  return items.filter(
    (item) => item.isBillable !== false && item.isInventoryBacked !== false && item.fulfillmentMode !== "override"
  );
}

function aggregateInventoryItems(items: InventoryItem[]): AggregatedItem[] {
  const grouped = new Map<string, AggregatedItem>();

  for (const item of items) {
    const medicineId = Number(item.medicine.medicine_id ?? item.medicine.id);
    const batchId = Number(item.batchId ?? item.medicine.batch_id ?? 0);

    if (!medicineId || !batchId) {
      throw new Error(`Inventory-backed sale items require a valid medicine batch for ${item.medicine.brand_name}`);
    }

    const key = inventoryKey(medicineId, batchId);
    const current = grouped.get(key);

    if (current) {
      current.quantity += Number(item.quantity || 0);
      current.subQuantity += Number(item.subQuantity || 0);
      continue;
    }

    grouped.set(key, {
      medicineId,
      batchId,
      quantity: Number(item.quantity || 0),
      subQuantity: Number(item.subQuantity || 0),
      medicine: item.medicine,
    });
  }

  return [...grouped.values()];
}

function aggregateExistingSaleDetails(rows: ExistingSaleDetailRow[]): Map<string, { quantity: number; subQuantity: number }> {
  const grouped = new Map<string, { quantity: number; subQuantity: number }>();

  for (const row of rows) {
    if (!row.batch_id) {
      continue;
    }

    const key = inventoryKey(Number(row.medicine_id), Number(row.batch_id));
    const current = grouped.get(key) ?? { quantity: 0, subQuantity: 0 };
    current.quantity += Number(row.quantity || 0);
    current.subQuantity += Number(row.sub_quantity || 0);
    grouped.set(key, current);
  }

  return grouped;
}

/** Aggregate cart items by medicine_id (ignoring batch) for FEFO allocation */
function aggregateByMedicine(items: InventoryItem[]): MedicineRequest[] {
  const grouped = new Map<number, MedicineRequest>();

  for (const item of items) {
    const medicineId = Number(item.medicine.medicine_id ?? item.medicine.id);
    if (!medicineId) {
      throw new Error(`Missing medicine_id for ${item.medicine.brand_name}`);
    }

    const current = grouped.get(medicineId);
    if (current) {
      current.totalQuantity += Number(item.quantity || 0);
      current.totalSubQuantity += Number(item.subQuantity || 0);
      continue;
    }

    grouped.set(medicineId, {
      medicineId,
      totalQuantity: Number(item.quantity || 0),
      totalSubQuantity: Number(item.subQuantity || 0),
      medicine: item.medicine,
    });
  }

  return [...grouped.values()];
}

function buildStockErrorMessage(
  medicine: AggregatedItem["medicine"],
  availableQty: number,
  availableSubQty: number
) {
  const available = toStockBreakdown(
    availableQty,
    availableSubQty,
    Number(medicine.sub_units_per_unit || 1)
  );
  return `Only ${formatStockQuantity(available, medicine)} available${medicine.batch_number ? ` in batch ${medicine.batch_number}` : ""}`;
}

// ─── Error Class ──────────────────────────────────────────────

export class StockValidationError extends Error {
  status = 409;
  details: {
    medicineId: number;
    batchId: number;
    requestedQuantity: number;
    requestedSubQuantity: number;
    availableQuantity: number;
    availableSubQuantity: number;
  };

  constructor(
    message: string,
    details: StockValidationError["details"]
  ) {
    super(message);
    this.name = "StockValidationError";
    this.details = details;
  }
}

// ─── Legacy Batch-Specific Validation ─────────────────────────
// Used when the frontend sends specific batch_id per item (backward-compatible)

export async function validateInventoryItemsForSale(
  client: Pick<PoolClient, "query">,
  items: CartItem[],
  existingSaleDetails: ExistingSaleDetailRow[] = []
) {
  const inventoryItems = getInventoryItems(items);
  if (inventoryItems.length === 0) {
    return;
  }

  const requestedByBatch = aggregateInventoryItems(inventoryItems);
  const existingReserved = aggregateExistingSaleDetails(existingSaleDetails);

  for (const item of requestedByBatch) {
    const batchResult = await client.query(
      `
        SELECT
          mb.batch_id,
          mb.batch_number,
          COALESCE(mb.stock_quantity, 0) AS stock_quantity,
          COALESCE(mb.stock_sub_quantity, 0) AS stock_sub_quantity,
          COALESCE(m.sub_units_per_unit, 1) AS sub_units_per_unit,
          m.form,
          m.sub_unit
        FROM medicine_batch mb
        JOIN medicine m ON m.medicine_id = mb.medicine_id
        WHERE mb.batch_id = $1
          AND mb.medicine_id = $2
          AND (mb.expiry_date > CURRENT_DATE OR mb.expiry_date IS NULL)
        FOR UPDATE
      `,
      [item.batchId, item.medicineId]
    );

    if (batchResult.rows.length === 0) {
      throw new StockValidationError("Selected batch is no longer available", {
        medicineId: item.medicineId,
        batchId: item.batchId,
        requestedQuantity: item.quantity,
        requestedSubQuantity: item.subQuantity,
        availableQuantity: 0,
        availableSubQuantity: 0,
      });
    }

    const batchRow = batchResult.rows[0];
    console.info(`[StockValidation] Validating batch ${item.batchId} (${batchRow?.batch_number || 'N/A'}) for medicine ${item.medicine?.brand_name} (ID: ${item.medicineId}). Requested: ${item.quantity}u, ${item.subQuantity}s.`);
    const key = inventoryKey(item.medicineId, item.batchId);
    const existing = existingReserved.get(key) ?? { quantity: 0, subQuantity: 0 };
    const subUnitsPerUnit = Number(batchRow.sub_units_per_unit || 1);

    const availableNow = toStockBreakdown(
      Number(batchRow.stock_quantity || 0),
      Number(batchRow.stock_sub_quantity || 0),
      subUnitsPerUnit
    );
    const reservedByCurrentSale = toStockBreakdown(existing.quantity, existing.subQuantity, subUnitsPerUnit);
    const effectiveAvailable = toStockBreakdown(
      availableNow.units + reservedByCurrentSale.units,
      availableNow.subUnits + reservedByCurrentSale.subUnits,
      subUnitsPerUnit
    );
    const requested = toStockBreakdown(item.quantity, item.subQuantity, subUnitsPerUnit);

    if (requested.totalSubUnits > effectiveAvailable.totalSubUnits) {
      throw new StockValidationError(
        buildStockErrorMessage(
          {
            ...item.medicine,
            batch_number: batchRow.batch_number,
            sub_units_per_unit: subUnitsPerUnit,
            form: batchRow.form,
            sub_unit: batchRow.sub_unit,
          },
          effectiveAvailable.units,
          effectiveAvailable.subUnits
        ),
        {
          medicineId: item.medicineId,
          batchId: item.batchId,
          requestedQuantity: item.quantity,
          requestedSubQuantity: item.subQuantity,
          availableQuantity: effectiveAvailable.units,
          availableSubQuantity: effectiveAvailable.subUnits,
        }
      );
    }
  }
}

// ─── FEFO Batch Allocation ────────────────────────────────────
/*
  Given a medicine_id and a requested total quantity, this function:
  1. Queries all non-expired batches sorted by expiry_date ASC (FEFO), batch_id ASC
  2. Locks them with FOR UPDATE to prevent overselling
  3. Iterates through batches, allocating stock until the request is fulfilled
  4. Returns an array of (batch_id, allocated_quantity, allocated_sub_quantity)
*/

export async function allocateBatchesFEFO(
  client: Pick<PoolClient, "query">,
  medicineId: number,
  requestedQuantity: number,
  requestedSubQuantity: number,
  medicine: InventoryItem["medicine"]
): Promise<BatchAllocation[]> {
  const subUnitsPerUnit = Math.max(1, Number(medicine.sub_units_per_unit || 1));
  const requestedBreakdown = toStockBreakdown(requestedQuantity, requestedSubQuantity, subUnitsPerUnit);
  let remainingSubUnits = requestedBreakdown.totalSubUnits;

  console.info(`[StockValidation] Allocating FEFO for medicine ${medicine.brand_name} (ID: ${medicineId}). Total requested sub-units: ${remainingSubUnits}.`);

  if (remainingSubUnits <= 0) {
    throw new StockValidationError("Quantity must be greater than 0", {
      medicineId,
      batchId: 0,
      requestedQuantity,
      requestedSubQuantity,
      availableQuantity: 0,
      availableSubQuantity: 0,
    });
  }

  // Fetch all valid batches for this medicine, sorted by expiry (FEFO), locked
  const batchResult = await client.query(
    `
      SELECT
        mb.batch_id,
        mb.batch_number,
        COALESCE(mb.stock_quantity, 0)::integer     AS stock_quantity,
        COALESCE(mb.stock_sub_quantity, 0)::integer AS stock_sub_quantity,
        COALESCE(mb.sale_price, mb.purchase_price)::float8 AS unit_price,
        mb.sale_sub_unit_price::float8 AS sub_unit_price,
        mb.expiry_date
      FROM medicine_batch mb
      WHERE mb.medicine_id = $1
        AND (mb.expiry_date > CURRENT_DATE OR mb.expiry_date IS NULL)
        AND (
          (COALESCE(mb.stock_quantity, 0) * $2) + COALESCE(mb.stock_sub_quantity, 0)
        ) > 0
      ORDER BY mb.expiry_date ASC NULLS LAST, mb.batch_id ASC
      FOR UPDATE
    `,
    [medicineId, subUnitsPerUnit]
  );

  if (batchResult.rows.length === 0) {
    throw new StockValidationError(
      `${medicine.brand_name || "Medicine"} is out of stock`,
      {
        medicineId,
        batchId: 0,
        requestedQuantity,
        requestedSubQuantity,
        availableQuantity: 0,
        availableSubQuantity: 0,
      }
    );
  }

  const allocations: BatchAllocation[] = [];
  let totalAvailableSubUnits = 0;

  for (const batch of batchResult.rows) {
    const batchStock = toStockBreakdown(
      Number(batch.stock_quantity),
      Number(batch.stock_sub_quantity),
      subUnitsPerUnit
    );
    totalAvailableSubUnits += batchStock.totalSubUnits;

    if (remainingSubUnits <= 0) continue;

    const allocateSubUnits = Math.min(remainingSubUnits, batchStock.totalSubUnits);
    const allocatedBreakdown = toStockBreakdown(0, allocateSubUnits, subUnitsPerUnit);

    allocations.push({
      batchId: Number(batch.batch_id),
      batchNumber: batch.batch_number,
      medicineId,
      allocatedQuantity: allocatedBreakdown.units,
      allocatedSubQuantity: allocatedBreakdown.subUnits,
      unitPrice: Number(batch.unit_price || 0),
      subUnitPrice: Number(batch.sub_unit_price || (batch.unit_price / subUnitsPerUnit) || 0),
      expiryDate: batch.expiry_date,
    });

    console.info(`[StockValidation] Allocated ${allocatedBreakdown.units}u, ${allocatedBreakdown.subUnits}s from batch ${batch.batch_id} (${batch.batch_number}).`);

    remainingSubUnits -= allocateSubUnits;
  }

  // All batches exhausted but request not fulfilled
  if (remainingSubUnits > 0) {
    const totalAvailable = toStockBreakdown(0, totalAvailableSubUnits, subUnitsPerUnit);
    throw new StockValidationError(
      `Only ${formatStockQuantity(totalAvailable, medicine)} of ${medicine.brand_name || "medicine"} available across all batches`,
      {
        medicineId,
        batchId: 0,
        requestedQuantity,
        requestedSubQuantity,
        availableQuantity: totalAvailable.units,
        availableSubQuantity: totalAvailable.subUnits,
      }
    );
  }

  return allocations;
}

// ─── Full FEFO Allocation for a Sale ──────────────────────────
/*
  Entry point for the sale route: takes all cart items, identifies which need
  inventory-backed FEFO allocation, and returns the full list of batch allocations
  grouped by medicine. Each allocation can be directly inserted as a sale_detail row.
*/

export async function allocateInventoryForSale(
  client: Pick<PoolClient, "query">,
  items: CartItem[]
): Promise<FEFOResult[]> {
  const inventoryItems = getInventoryItems(items);
  if (inventoryItems.length === 0) {
    return [];
  }

  const medicineRequests = aggregateByMedicine(inventoryItems);
  const results: FEFOResult[] = [];

  for (const req of medicineRequests) {
    const allocations = await allocateBatchesFEFO(
      client,
      req.medicineId,
      req.totalQuantity,
      req.totalSubQuantity,
      req.medicine
    );

    results.push({
      medicineId: req.medicineId,
      allocations,
    });
  }

  return results;
}
