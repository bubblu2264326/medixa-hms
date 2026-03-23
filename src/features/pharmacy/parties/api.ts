import {
  PartyDetail,
  AddPartyInput,
  LedgerEntry,
  PartySupplyFilters,
  PartySupplyGroupBy,
  PartySupplyResponse,
  PartyInsights,
  PartyInsightsFilters,
} from './types';

export async function getAllParties(): Promise<PartyDetail[]> {
  const res = await fetch('/api/party');
  if (!res.ok) throw new Error('Failed to fetch parties');
  return res.json();
}

export async function addParty(input: AddPartyInput): Promise<PartyDetail> {
  const res = await fetch('/api/party', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to add party');
  const data = await res.json();
  return data.data;
}

export async function updateParty(
  party_id: number,
  input: Partial<AddPartyInput> & { status?: boolean }
): Promise<PartyDetail> {
  const res = await fetch('/api/party', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ party_id, ...input }),
  });
  if (!res.ok) throw new Error('Failed to update party');
  const data = await res.json();
  return data.data;
}

export async function getPartyLedger(partyId: number): Promise<LedgerEntry[]> {
  const res = await fetch(`/api/pharmacy/ledger?party_id=${partyId}`);
  if (!res.ok) throw new Error('Failed to fetch ledger');
  const data = await res.json();
  return data.data;
}

export async function recordPayment(payload: {
  party_id: number;
  amount: number;
  payment_method?: string;
  reference_note?: string;
}): Promise<void> {
  const res = await fetch('/api/pharmacy/ledger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record payment');
}

export async function getPartySupplies(
  partyId: number,
  filters: PartySupplyFilters = {},
  groupBy: PartySupplyGroupBy = 'batch'
): Promise<PartySupplyResponse> {
  const params = new URLSearchParams();
  params.set('groupBy', groupBy);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.medicine) params.set('medicine', filters.medicine);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/pharmacy/party/${partyId}/supplies${suffix}`);
  if (!res.ok) throw new Error('Failed to fetch party supplies');
  const payload = await res.json();
  return payload.data as PartySupplyResponse;
}

export async function getPartyInsights(
  partyId: number,
  filters: PartyInsightsFilters = {}
): Promise<PartyInsights> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.deadStockDays) params.set('deadStockDays', String(filters.deadStockDays));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/pharmacy/party/${partyId}/insights${suffix}`);
  if (!res.ok) throw new Error('Failed to fetch party insights');
  const payload = await res.json();
  return payload.data as PartyInsights;
}
