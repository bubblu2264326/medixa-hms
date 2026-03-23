import type { Medicine } from "./types";

type StockCarrier = Pick<
  Medicine,
  | "batch_stock_quantity"
  | "batch_stock_sub_quantity"
  | "total_stock_quantity"
  | "total_stock_sub_quantity"
  | "stock_quantity"
  | "stock_sub_quantity"
  | "sub_units_per_unit"
  | "form"
  | "sub_unit"
  | "batch_number"
  | "min_stock_level"
  | "is_low_stock"
  | "is_out_of_stock"
>;

export interface StockBreakdown {
  units: number;
  subUnits: number;
  totalSubUnits: number;
  subUnitsPerUnit: number;
}

export interface StockValidationResult {
  valid: boolean;
  message?: string;
  available: StockBreakdown;
  requested: StockBreakdown;
}

export function getSubUnitsPerUnit(medicine: Pick<StockCarrier, "sub_units_per_unit">): number {
  return Math.max(1, Number(medicine.sub_units_per_unit || 1));
}

export function toStockBreakdown(
  quantity: number,
  subQuantity: number,
  subUnitsPerUnit: number
): StockBreakdown {
  const divisor = Math.max(1, Number(subUnitsPerUnit || 1));
  const rawUnits = Math.max(0, Number(quantity || 0));
  const rawSubUnits = Math.max(0, Number(subQuantity || 0));
  const totalSubUnits = (rawUnits * divisor) + rawSubUnits;
  const normalizedUnits = Math.floor(totalSubUnits / divisor);
  const normalizedSubUnits = totalSubUnits % divisor;

  return {
    units: normalizedUnits,
    subUnits: normalizedSubUnits,
    totalSubUnits,
    subUnitsPerUnit: divisor,
  };
}

export function getAvailableStockBreakdown(medicine: StockCarrier): StockBreakdown {
  const subUnitsPerUnit = getSubUnitsPerUnit(medicine);
  const units = Number(
    medicine.batch_stock_quantity
      ?? medicine.total_stock_quantity
      ?? medicine.stock_quantity
      ?? 0
  );
  const subUnits = Number(
    medicine.batch_stock_sub_quantity
      ?? medicine.total_stock_sub_quantity
      ?? medicine.stock_sub_quantity
      ?? 0
  );

  return toStockBreakdown(units, subUnits, subUnitsPerUnit);
}

export function formatStockQuantity(
  breakdown: Pick<StockBreakdown, "units" | "subUnits" | "subUnitsPerUnit">,
  medicine: { form?: string; sub_unit?: string }
): string {
  const unitLabel = formatUnitLabel(medicine.sub_unit || "units", breakdown.units);
  const subUnitLabel = formatUnitLabel(medicine.form || "sub-units", breakdown.subUnits);

  if (breakdown.subUnitsPerUnit <= 1 || breakdown.subUnits <= 0) {
    return `${breakdown.units} ${unitLabel}`;
  }

  if (breakdown.units <= 0) {
    return `${breakdown.subUnits} ${subUnitLabel}`;
  }

  return `${breakdown.units} ${unitLabel} + ${breakdown.subUnits} ${subUnitLabel}`;
}

function formatUnitLabel(label: string, count: number): string {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return "";
  if (count === 1) return trimmed;

  const [prefix, lastToken] = splitLastToken(trimmed);
  if (!lastToken) return trimmed;
  if (looksUncountable(lastToken)) return trimmed;

  const plural = pluralizeWordPreservingCase(lastToken);
  if (!plural) return trimmed;
  return `${prefix}${plural}`;
}

function splitLastToken(input: string): [prefix: string, token: string] {
  const trimmed = input.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace < 0) return ["", trimmed];
  return [trimmed.slice(0, lastSpace + 1), trimmed.slice(lastSpace + 1)];
}

function looksUncountable(word: string): boolean {
  const w = word.trim();
  if (!w) return true;

  // Units where pluralization is typically not desired (mg, ml, IU, etc.)
  const unit = w.toLowerCase();
  if (
    unit === "mg"
    || unit === "g"
    || unit === "kg"
    || unit === "mcg"
    || unit === "ug"
    || unit === "µg"
    || unit === "ml"
    || unit === "l"
    || unit === "iu"
    || unit === "u"
    || unit === "meq"
  ) {
    return true;
  }
  if (/^\d+$/.test(w)) return true;

  return false;
}

function pluralizeWordPreservingCase(word: string): string {
  const w = word.trim();
  if (!w) return w;

  const lower = w.toLowerCase();
  if (lower.endsWith("s")) return w;

  const isAllCaps = w === w.toUpperCase();
  const applyCase = (suffix: string) => (isAllCaps ? suffix.toUpperCase() : suffix);

  if (lower.endsWith("ch") || lower.endsWith("sh") || /[sxz]$/.test(lower)) {
    return `${w}${applyCase("es")}`;
  }

  if (/[^\Waeiou]y$/i.test(w)) {
    return `${w.slice(0, -1)}${applyCase("ies")}`;
  }

  return `${w}${applyCase("s")}`;
}

export function getMedicineAvailability(medicine: StockCarrier): {
  isOutOfStock: boolean;
  isLowStock: boolean;
  available: StockBreakdown;
} {
  const available = getAvailableStockBreakdown(medicine);
  const lowStockThreshold = Math.max(0, Number(medicine.min_stock_level ?? 0));
  const isOutOfStock =
    typeof medicine.is_out_of_stock === "boolean"
      ? medicine.is_out_of_stock
      : available.totalSubUnits <= 0;
  const isLowStock =
    typeof medicine.is_low_stock === "boolean"
      ? medicine.is_low_stock
      : !isOutOfStock && available.totalSubUnits <= (lowStockThreshold * available.subUnitsPerUnit);

  return {
    isOutOfStock,
    isLowStock,
    available,
  };
}

export function validateRequestedStock(
  medicine: StockCarrier,
  requestedQty: number,
  requestedSubQty: number = 0
): StockValidationResult {
  const available = getAvailableStockBreakdown(medicine);
  const requested = toStockBreakdown(
    requestedQty,
    requestedSubQty,
    available.subUnitsPerUnit
  );

  if (requested.totalSubUnits <= 0) {
    return {
      valid: false,
      message: "Quantity must be greater than 0",
      available,
      requested,
    };
  }

  if (available.totalSubUnits <= 0) {
    return {
      valid: false,
      message: "Medicine out of stock",
      available,
      requested,
    };
  }

  if (requested.totalSubUnits > available.totalSubUnits) {
    return {
      valid: false,
      message: `Only ${formatStockQuantity(available, medicine)} available${medicine.batch_number ? ` in batch ${medicine.batch_number}` : ""}`,
      available,
      requested,
    };
  }

  return {
    valid: true,
    available,
    requested,
  };
}
