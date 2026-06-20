// FBR / PRAL e-invoicing submission queue. The app enqueues a finalized bill;
// a PRAL-integrated worker submits and writes back the FBR invoice number + QR.
// Live submission requires a PRAL token (env config) — enqueue is always safe.

export type FbrRunner = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

// Idempotent enqueue — one submission row per bill. An already-submitted bill is
// left submitted; otherwise (re)queued. Returns the submission_id (or null).
export async function enqueueFbrInvoice(runner: FbrRunner, billId: number | null | undefined): Promise<number | null> {
  if (!billId) return null;
  const r = await runner.query(
    `INSERT INTO fbr_invoice_submission (bill_id) VALUES ($1)
     ON CONFLICT (bill_id) DO UPDATE
       SET status = CASE WHEN fbr_invoice_submission.status = 'submitted' THEN 'submitted' ELSE 'queued' END
     RETURNING submission_id`,
    [billId]
  );
  return r?.rows?.[0]?.submission_id ?? null;
}
