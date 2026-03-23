import type { ApiResponse } from '@/src/lib/types';
import type { ReceiptPayload } from './types';

export async function fetchReceiptPayload(saleId: string): Promise<ReceiptPayload> {
  const res = await fetch(`/api/receipts/${encodeURIComponent(saleId)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const body = (await res.json()) as ApiResponse;

  if (!res.ok || !body?.success || !body?.data) {
    throw new Error(body?.error || 'Failed to load receipt payload');
  }

  return body.data as ReceiptPayload;
}

