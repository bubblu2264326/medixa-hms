// Patient allergy helpers — shared by the EMR/prescription layer and the IPD MAR
// safety check so "drug vs allergy" is evaluated identically everywhere.
// The runner is any { query } — the pooled `query` fn or a PoolClient both satisfy it.

export type AllergyRunner = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };
export const ALLERGY_SEVERITIES = ["mild", "moderate", "severe", "unknown"] as const;

export async function listActiveAllergies(runner: AllergyRunner, patientId: number) {
  const r = await runner.query(
    `SELECT allergy_id, allergen, reaction, severity, noted_at
       FROM patient_allergy
      WHERE patient_id = $1 AND is_active
      ORDER BY noted_at DESC`,
    [patientId]
  );
  return r.rows;
}

// First active allergy whose allergen overlaps the drug name (case-insensitive,
// substring either direction), or null. Used to warn/block at prescribe/administer time.
export async function findAllergyConflict(runner: AllergyRunner, patientId: number, drugName: string) {
  if (!drugName) return null;
  const r = await runner.query(
    `SELECT allergen, severity
       FROM patient_allergy
      WHERE patient_id = $1 AND is_active
        AND ($2 ILIKE '%' || allergen || '%' OR allergen ILIKE '%' || $2 || '%')
      LIMIT 1`,
    [patientId, drugName]
  );
  return r.rows[0] ?? null;
}
