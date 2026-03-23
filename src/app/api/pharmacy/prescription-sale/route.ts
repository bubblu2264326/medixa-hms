import { query } from "@/database/db";
import { NextRequest, NextResponse } from "next/server";

function getSubUnitsPerUnit(value: unknown) {
  return Math.max(1, Number(value ?? 1));
}

function toTotalSubUnits(quantity: unknown, subQuantity: unknown, subUnitsPerUnit: number) {
  return (Number(quantity ?? 0) * subUnitsPerUnit) + Number(subQuantity ?? 0);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const visitId = searchParams.get("visitId");

    if (!patientId || !visitId) {
      return NextResponse.json(
        { success: false, error: "patientId and visitId are required" },
        { status: 400 }
      );
    }

    const visitResult = await query(
      `
        select
          v.visit_id,
          v.patient_id,
          v.clinic_number,
          v.visit_type,
          v.status,
          b.bill_id
        from visit v
        left join bill b on b.visit_id = v.visit_id
        where v.visit_id = $1
          and v.patient_id = $2
          and v.is_deleted = false
          and v.status not in ('completed', 'discharged')
        limit 1
      `,
      [Number(visitId), Number(patientId)]
    );

    if (visitResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Active visit not found for the selected patient" },
        { status: 404 }
      );
    }

    const prescriptionResult = await query(
      `
        with selected_prescription as (
          select p.prescription_id
          from prescription p
          where p.visit_id = $1
            and exists (
              select 1
              from prescription_medicines pmx
              where pmx.prescription_id = p.prescription_id
                and coalesce(pmx.dispensed_quantity, 0) < coalesce(pmx.prescribed_quantity, 0)
            )
          order by p.prescription_id desc
          limit 1
        )
        select
          p.prescription_id,
          p.visit_id,
          p.created_at,
          pm.prescription_medicine_id,
          pm.prescribed_quantity,
          pm.dispensed_quantity,
          pm.frequency,
          pm.duration,
          pm.instructions,
          m.medicine_id,
          m.generic_name,
          m.brand_name,
          m.category,
          m.dosage_value,
          m.dosage_unit,
          m.form,
          pos.id as pos_medicine_id,
          pos.price,
          pos.sub_unit,
          pos.sub_units_per_unit,
          pos.allow_sub_unit_sale,
          pos.batch_id,
          pos.batch_number,
          pos.expiry_date,
          pos.batch_stock_quantity,
          pos.batch_stock_sub_quantity,
          pos.batch_sale_price,
          pos.batch_sale_sub_unit_price,
          pos.total_stock_quantity,
          pos.total_stock_sub_quantity
        from prescription p
        join prescription_medicines pm on pm.prescription_id = p.prescription_id
        join medicine m on m.medicine_id = pm.medicine_id
        left join lateral (
          select vp.*
          from v_medicine_pos vp
          where vp.id = pm.medicine_id
            and (
              (coalesce(vp.batch_stock_quantity, 0) * coalesce(vp.sub_units_per_unit, 1)) +
              coalesce(vp.batch_stock_sub_quantity, 0)
            ) > 0
          order by vp.expiry_date asc nulls last, vp.batch_id asc
          limit 1
        ) pos on true
        join selected_prescription sp on sp.prescription_id = p.prescription_id
        where p.visit_id = $1
          and coalesce(pm.dispensed_quantity, 0) < coalesce(pm.prescribed_quantity, 0)
        order by pm.prescription_medicine_id asc
      `,
      [Number(visitId)]
    );

    if (prescriptionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No pending prescription found for this visit" },
        { status: 404 }
      );
    }

    const rows = prescriptionResult.rows;
    const availableItems: Array<Record<string, unknown>> = [];
    const unavailableItems: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const subUnitsPerUnit = getSubUnitsPerUnit(row.sub_units_per_unit);
      const prescribedQuantity = Number(row.prescribed_quantity ?? 0);
      const alreadyDispensedQuantity = Number(row.dispensed_quantity ?? 0);
      const pendingQuantity = Math.max(0, prescribedQuantity - alreadyDispensedQuantity);

      const totalAvailableQty = Number(row.total_stock_quantity ?? row.batch_stock_quantity ?? 0);
      const totalAvailableSubQty = Number(row.total_stock_sub_quantity ?? row.batch_stock_sub_quantity ?? 0);
      const totalAvailableSubUnits = toTotalSubUnits(totalAvailableQty, totalAvailableSubQty, subUnitsPerUnit);
      const requiredSubUnits = toTotalSubUnits(pendingQuantity, 0, subUnitsPerUnit);
      const hasSufficientStock = requiredSubUnits > 0 && totalAvailableSubUnits >= requiredSubUnits;

      const commonFields = {
        prescriptionMedicineId: Number(row.prescription_medicine_id),
        prescribedQuantity: pendingQuantity,
        alreadyDispensedQuantity,
        frequency: row.frequency,
        duration: row.duration,
        instructions: row.instructions,
      };

      if (hasSufficientStock) {
        availableItems.push({
          ...commonFields,
          availableQuantity: totalAvailableQty,
          availabilityStatus: totalAvailableQty <= 5 ? "low_stock" : "available",
          availabilityNote:
            totalAvailableQty <= 5
              ? `Only ${totalAvailableQty} unit(s) currently available`
              : null,
          medicine: {
            id: row.pos_medicine_id ?? row.medicine_id,
            medicine_id: row.medicine_id,
            generic_name: row.generic_name,
            brand_name: row.brand_name,
            category: row.category,
            dosage_value: Number(row.dosage_value ?? 0),
            dosage_unit: row.dosage_unit,
            form: row.form,
            price: Number(row.batch_sale_price ?? row.price ?? 0),
            stock_quantity: totalAvailableQty,
            stock_sub_quantity: totalAvailableSubQty,
            sub_unit: row.sub_unit,
            sub_units_per_unit: subUnitsPerUnit,
            sub_unit_price: Number(row.batch_sale_sub_unit_price ?? 0),
            allow_sub_unit_sale: Boolean(row.allow_sub_unit_sale),
            batch_id: row.batch_id ? Number(row.batch_id) : undefined,
            batch_number: row.batch_number,
            expiry_date: row.expiry_date,
            batch_stock_quantity: Number(row.batch_stock_quantity ?? 0),
            batch_stock_sub_quantity: Number(row.batch_stock_sub_quantity ?? 0),
            batch_sale_price: Number(row.batch_sale_price ?? row.price ?? 0),
            batch_sale_sub_unit_price: Number(row.batch_sale_sub_unit_price ?? 0),
            total_stock_quantity: Number(row.total_stock_quantity ?? 0),
            total_stock_sub_quantity: Number(row.total_stock_sub_quantity ?? 0),
          },
        });
        continue;
      }

      unavailableItems.push({
        ...commonFields,
        availableQuantity: totalAvailableQty,
        availabilityStatus: totalAvailableSubUnits > 0 ? "insufficient_stock" : "out_of_stock",
        availabilityNote:
          totalAvailableSubUnits > 0
            ? `Only ${totalAvailableQty} unit(s) are available right now against required ${pendingQuantity} unit(s)`
            : "No stocked batch is currently available in pharmacy",
        medicine: {
          id: row.medicine_id,
          medicine_id: row.medicine_id,
          generic_name: row.generic_name,
          brand_name: row.brand_name,
          category: row.category,
          dosage_value: Number(row.dosage_value ?? 0),
          dosage_unit: row.dosage_unit,
          form: row.form,
          price: Number(row.price ?? 0),
          stock_quantity: Number(row.total_stock_quantity ?? 0),
          stock_sub_quantity: Number(row.total_stock_sub_quantity ?? 0),
          sub_unit: row.sub_unit,
          sub_units_per_unit: subUnitsPerUnit,
          sub_unit_price: Number(row.batch_sale_sub_unit_price ?? 0),
          allow_sub_unit_sale: Boolean(row.allow_sub_unit_sale),
          total_stock_quantity: Number(row.total_stock_quantity ?? 0),
          total_stock_sub_quantity: Number(row.total_stock_sub_quantity ?? 0),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        visitId: Number(visitId),
        patientId: Number(patientId),
        billId: visitResult.rows[0].bill_id ? Number(visitResult.rows[0].bill_id) : null,
        prescriptionId: Number(rows[0].prescription_id),
        clinicNumber: visitResult.rows[0].clinic_number,
        visitType: visitResult.rows[0].visit_type,
        status: visitResult.rows[0].status,
        availableItems,
        unavailableItems,
      },
    });
  } catch (error) {
    console.error("Prescription sale load error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load prescription sale" },
      { status: 500 }
    );
  }
}
