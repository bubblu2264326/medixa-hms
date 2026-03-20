import { ApiResponse } from '@/src/lib/types';
import { Party, Medicine, PurchaseFormMetadata, PurchaseInvoice } from './types'

export async function getAllPartiesName(): Promise<Party[]> {
  const res = await fetch('/api/party');
  if (!res.ok) throw new Error("Failed to fetch Data from /api/party");
  const data = await res.json();
  return data.map((p: any) => ({
    id: p.party_id,
    name: p.name,
  }));
}

export async function getAllMedicines(): Promise<Medicine[]> {
  const res = await fetch('/api/medicine/purchase-search');
  if (!res.ok) throw new Error("Failed to fetch Data from /api/medicine/purchase-search");
  const data = await res.json();
  return data.map((m: any) => ({
    ...m,
    id: m.id // Backend now returns 'id' directly
  }));
}

export async function submitPurchase(invoice: PurchaseInvoice): Promise<ApiResponse<any>> {
  const response = await fetch('/api/pharmacy/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoice),
  });

  return await response.json();
}

/**
 * Fetches purchase form metadata previews for invoice, internal batch code,
 * and the suggested supplier lot number.
 */
export async function getPurchaseFormMetadata(): Promise<PurchaseFormMetadata | null> {
  try {
    const res = await fetch('/api/pharmacy/purchase/utils?type=form-metadata');
    const response: ApiResponse<any> = await res.json();
    return response.success && response.data ? response.data : null;
  } catch (err) {
    console.error('Failed to fetch purchase form metadata', err);
    return null;
  }
}

/**
 * Fetches the price history of a medicine (most recent batch data)
 */
export async function getMedicinePriceHistory(medicineId: number): Promise<any | null> {
  try {
    const res = await fetch(`/api/pharmacy/purchase/utils?type=price-history&medicine_id=${medicineId}`);
    const response: ApiResponse<any> = await res.json();
    return response.success ? response.data : null;
  } catch (err) {
    console.error('Failed to fetch price history', err);
    return null;
  }
}

/**
 * Fetches a purchase invoice by ID for editing
 */
export async function fetchPurchase(purchaseId: number): Promise<ApiResponse<any>> {
  const res = await fetch(`/api/pharmacy/purchase/${purchaseId}`);
  return await res.json();
}

/**
 * Updates an existing purchase invoice
 */
export async function updatePurchase(purchaseId: number, invoice: PurchaseInvoice): Promise<ApiResponse<any>> {
  const res = await fetch(`/api/pharmacy/purchase/${purchaseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return await res.json();
}
