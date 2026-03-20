import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";

export async function GET(req: NextRequest) {
  try {
    // 1. Expiring soon (90 days)
    const expiringSoonQuery = `
      SELECT 
        m.brand_name, 
        m.generic_name, 
        mb.batch_number, 
        mb.expiry_date, 
        mb.stock_quantity, 
        mb.stock_sub_quantity
      FROM medicine_batch mb
      JOIN medicine m ON mb.medicine_id = m.medicine_id
      WHERE mb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        AND mb.expiry_date >= CURRENT_DATE
        AND (mb.stock_quantity > 0 OR mb.stock_sub_quantity > 0)
      ORDER BY mb.expiry_date ASC;
    `;
    
    // 2. Dead stock (6 months)
    // Medicines with stock but no sales in the last 6 months
    const deadStockQuery = `
      SELECT 
        m.medicine_id,
        m.brand_name, 
        m.generic_name,
        SUM(mb.stock_quantity) as total_units,
        SUM(mb.stock_sub_quantity) as total_sub_units,
        MAX(ps.sale_timestamp) as last_sale_date
      FROM medicine m
      JOIN medicine_batch mb ON m.medicine_id = mb.medicine_id
      LEFT JOIN pharmacy_sale_detail psd ON m.medicine_id = psd.medicine_id
      LEFT JOIN pharmacy_sale ps ON psd.sale_id = ps.sale_id
      WHERE (mb.stock_quantity > 0 OR mb.stock_sub_quantity > 0)
      GROUP BY m.medicine_id, m.brand_name, m.generic_name
      HAVING MAX(ps.sale_timestamp) IS NULL OR MAX(ps.sale_timestamp) < CURRENT_DATE - INTERVAL '6 months'
      ORDER BY m.brand_name ASC;
    `;

    const [expiringSoonRes, deadStockRes] = await Promise.all([
      query(expiringSoonQuery),
      query(deadStockQuery)
    ]);

    return NextResponse.json({
      expiringSoon: expiringSoonRes.rows,
      deadStock: deadStockRes.rows
    });

  } catch (error) {
    console.error("Error fetching pharmacy stock reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
