import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    // 1. Overall Summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total_patients,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_registrations,
        (SELECT COUNT(*) FROM visit WHERE visit_timestamp >= NOW() - INTERVAL '30 days') as active_visitors
      FROM patient
    `);

    // 2. Gender Distribution
    const genderDist = await query(`
      SELECT gender, COUNT(*) as count
      FROM patient
      GROUP BY gender
    `);

    // 3. Age Groups
    const ageGroups = await query(`
      SELECT 
        CASE 
          WHEN age < 13 THEN 'Children (0-12)'
          WHEN age < 20 THEN 'Teens (13-19)'
          WHEN age < 40 THEN 'Adults (20-39)'
          WHEN age < 60 THEN 'Middle-Aged (40-59)'
          ELSE 'Seniors (60+)'
        END as age_group,
        COUNT(*) as count
      FROM patient
      GROUP BY age_group
      ORDER BY count DESC
    `);

    // 4. Monthly Trend (last 6 months)
    const trend = await query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COUNT(*) as count,
        MIN(created_at) as sort_key
      FROM patient
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY sort_key ASC
    `);

    // 5. Recent Patients
    const recentPatients = await query(`
      SELECT 
        patient_name,
        gender,
        age,
        TO_CHAR(created_at, 'DD Mon, HH:MI AM') as registered_at
      FROM patient
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      summary: summary.rows[0],
      genderDist: genderDist.rows,
      ageGroups: ageGroups.rows,
      trend: trend.rows,
      recentPatients: recentPatients.rows
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Patients API Error:", error);
    return NextResponse.json({ error: "Failed to fetch patient analytics" }, { status: 500 });
  }
}
