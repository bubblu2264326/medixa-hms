'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  PartyDetail,
  LedgerEntry,
  PartyInsights,
  PartyPermissions,
  PartySupplyGroupBy,
  PartySupplyResponse,
} from '../types';
import { getPartyInsights, getPartyLedger, getPartySupplies } from '../api';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { usePharmacyPosSettings } from '@/src/features/pharmacy/settings/hooks/usePharmacyPosSettings';
import { formatDateInTimezone, getTimezoneNowDateInput } from '@/src/lib/timezone/client';
import { useSystemTimezone } from '@/src/lib/timezone/useSystemTimezone';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  LineChart,
  Package,
  TrendingDown,
  X,
} from 'lucide-react';

type PartyDetailModalProps = {
  party: PartyDetail;
  permissions: PartyPermissions;
  onClose: () => void;
};

type ActiveTab = 'ledger' | 'supplies' | 'insights';

function getDefaultDateRange(timeZone: string) {
  const to = getTimezoneNowDateInput(timeZone);
  const [year, month, day] = to.split('-').map((v) => Number(v));
  const oneMonthBefore = new Date(Date.UTC(year, month - 1, day));
  oneMonthBefore.setUTCMonth(oneMonthBefore.getUTCMonth() - 1);
  return {
    from: oneMonthBefore.toISOString().slice(0, 10),
    to,
  };
}

function fmtMoney(value: number | string) {
  return parseFloat(String(value || 0)).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(value: string | null | undefined, timeZone: string) {
  if (!value) return '—';
  return formatDateInTimezone(value, timeZone);
}

function TypeBadge({ type }: { type: LedgerEntry['type'] }) {
  const config = {
    Purchase: {
      bg: 'bg-destructive/10 text-destructive border-destructive/30',
      icon: <ArrowDownLeft size={12} />,
      label: 'Purchase',
    },
    Return: {
      bg: 'bg-info/10 text-info border-info/30',
      icon: <ArrowUpRight size={12} />,
      label: 'Return',
    },
    Payment: {
      bg: 'bg-primary/10 text-primary border-primary/30',
      icon: <CreditCard size={12} />,
      label: 'Payment',
    },
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export function PartyDetailModal({
  party,
  permissions,
  onClose,
}: PartyDetailModalProps) {
  const systemTimezone = useSystemTimezone();
  const defaultDateRange = getDefaultDateRange(systemTimezone);
  const { settings: posSettings } = usePharmacyPosSettings();

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    permissions.canViewFinancials ? 'ledger' : 'supplies'
  );
  const [groupBy, setGroupBy] = useState<PartySupplyGroupBy>('batch');

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const [supplies, setSupplies] = useState<PartySupplyResponse>({
    groupBy: 'batch',
    groups: [],
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [suppliesLoading, setSuppliesLoading] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [supplyFilters, setSupplyFilters] = useState({
    from: defaultDateRange.from,
    to: defaultDateRange.to,
    medicine: '',
    page: 1,
    pageSize: 10,
  });

  const [insights, setInsights] = useState<PartyInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const canViewFinancials = permissions.canViewFinancials;

  const loadLedger = useCallback(async () => {
    if (!canViewFinancials) return;
    setLedgerLoading(true);
    try {
      const data = await getPartyLedger(party.party_id);
      setLedgerEntries(data);
    } catch {
      setLedgerEntries([]);
    } finally {
      setLedgerLoading(false);
    }
  }, [canViewFinancials, party.party_id]);

  const loadSupplies = useCallback(async () => {
    setSuppliesLoading(true);
    try {
      const data = await getPartySupplies(party.party_id, supplyFilters, groupBy);
      setSupplies(data);
    } catch {
      setSupplies({
        groupBy,
        groups: [],
        page: 1,
        pageSize: supplyFilters.pageSize,
        total: 0,
        totalPages: 1,
      });
    } finally {
      setSuppliesLoading(false);
    }
  }, [party.party_id, supplyFilters, groupBy]);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const data = await getPartyInsights(party.party_id, {
        from: supplyFilters.from || undefined,
        to: supplyFilters.to || undefined,
        deadStockDays: posSettings.deadStockDays,
      });
      setInsights(data);
    } catch {
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  }, [party.party_id, supplyFilters.from, supplyFilters.to, posSettings.deadStockDays]);

  useEffect(() => {
    if (activeTab === 'ledger') void loadLedger();
  }, [activeTab, loadLedger]);

  useEffect(() => {
    if (activeTab === 'supplies') void loadSupplies();
  }, [activeTab, loadSupplies]);

  useEffect(() => {
    if (activeTab === 'insights') void loadInsights();
  }, [activeTab, loadInsights]);

  const ledgerWithBalance = useMemo(() => {
    let running = 0;
    return ledgerEntries.map((entry) => {
      running +=
        (parseFloat(String(entry.debit)) || 0) -
        (parseFloat(String(entry.credit)) || 0);
      return { ...entry, balance: running };
    });
  }, [ledgerEntries]);

  const ledgerTotals = useMemo(() => {
    const totalDebit = ledgerEntries.reduce(
      (sum, entry) => sum + (parseFloat(String(entry.debit)) || 0),
      0
    );
    const totalCredit = ledgerEntries.reduce(
      (sum, entry) => sum + (parseFloat(String(entry.credit)) || 0),
      0
    );
    return { totalDebit, totalCredit, outstanding: totalDebit - totalCredit };
  }, [ledgerEntries]);

  return (
    <>
      <div
        className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[140] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex h-screen w-full flex-col bg-muted">
          <div className="sticky top-0 z-10 border-b border-border bg-white/95 px-6 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{party.name}</h3>
                <p className="text-xs font-semibold text-muted-foreground">
                  {party.contact_number ?? 'No contact'}{' '}
                  {party.gst_number ? `• GST: ${party.gst_number}` : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canViewFinancials ? (
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    activeTab === 'ledger'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Ledger
                </button>
              ) : null}
              <button
                onClick={() => setActiveTab('supplies')}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    activeTab === 'supplies'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
              >
                Supplies / Batches
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    activeTab === 'insights'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
              >
                Insights / Stats
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-6">
            {activeTab === 'ledger' && canViewFinancials ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Total Purchases</p>
                    <p className="mt-1 text-xl font-semibold text-destructive">Rs. {fmtMoney(ledgerTotals.totalDebit)}</p>
                  </div>
                  <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Paid / Returns</p>
                    <p className="mt-1 text-xl font-semibold text-primary">Rs. {fmtMoney(ledgerTotals.totalCredit)}</p>
                  </div>
                  <div className="rounded-md border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Outstanding</p>
                    <p className="mt-1 text-xl font-semibold text-orange-600">Rs. {fmtMoney(Math.abs(ledgerTotals.outstanding))}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPayment(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary"
                >
                  <DollarSign size={16} />
                  Record Payment to Party
                </button>

                <div className="overflow-auto rounded-md border border-border bg-white">
                  {ledgerLoading ? (
                    <div className="flex h-32 items-center justify-center text-sm font-semibold text-muted-foreground">Loading ledger...</div>
                  ) : ledgerWithBalance.length === 0 ? (
                    <div className="flex h-32 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                      <TrendingDown size={16} />
                      No transactions yet
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3 text-right">Debit</th>
                          <th className="px-4 py-3 text-right">Credit</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerWithBalance.map((entry, index) => (
                          <tr key={`${entry.type}-${entry.id}-${index}`}>
                            <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{fmtDate(entry.date, systemTimezone)}</td>
                            <td className="px-4 py-3"><TypeBadge type={entry.type} /></td>
                            <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{entry.reference ?? '—'}</td>
                            <td className="px-4 py-3 text-right text-xs font-bold text-destructive">
                              {Number(entry.debit) > 0 ? `Rs. ${fmtMoney(entry.debit)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-bold text-primary">
                              {Number(entry.credit) > 0 ? `Rs. ${fmtMoney(entry.credit)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-orange-600">
                              Rs. {fmtMoney(Math.abs(entry.balance))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'supplies' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupBy('batch');
                      setExpandedGroupId(null);
                      setSupplyFilters((previous) => ({ ...previous, page: 1 }));
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      groupBy === 'batch'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Batch / Lot View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupBy('invoice');
                      setExpandedGroupId(null);
                      setSupplyFilters((previous) => ({ ...previous, page: 1 }));
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      groupBy === 'invoice'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Invoice / Order View
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-white p-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">From</label>
                    <input
                      type="date"
                      value={supplyFilters.from}
                      onChange={(event) =>
                        setSupplyFilters((previous) => ({ ...previous, from: event.target.value, page: 1 }))
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">To</label>
                    <input
                      type="date"
                      value={supplyFilters.to}
                      onChange={(event) =>
                        setSupplyFilters((previous) => ({ ...previous, to: event.target.value, page: 1 }))
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Product / Medicine / Batch / Invoice</label>
                    <input
                      value={supplyFilters.medicine}
                      onChange={(event) =>
                        setSupplyFilters((previous) => ({ ...previous, medicine: event.target.value, page: 1 }))
                      }
                      placeholder="Search by product, batch, or invoice..."
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground"
                    />
                  </div>
                </div>

                <div className="overflow-auto rounded-md border border-border bg-white">
                  {suppliesLoading ? (
                    <div className="flex h-32 items-center justify-center text-sm font-semibold text-muted-foreground">Loading supplies...</div>
                  ) : supplies.groups.length === 0 ? (
                    <div className="flex h-32 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Package size={16} />
                      No grouped records found
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        {groupBy === 'batch' ? (
                          <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                            <th className="px-4 py-3">Batch / Lot</th>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Expiry</th>
                            <th className="px-4 py-3 text-right">Units</th>
                            <th className="px-4 py-3 text-right">Sub Units</th>
                            <th className="px-4 py-3 text-right">Supply Events</th>
                            <th className="px-4 py-3 text-right">Products</th>
                          </tr>
                        ) : (
                          <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                            <th className="px-4 py-3">Invoice</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Units</th>
                            <th className="px-4 py-3 text-right">Sub Units</th>
                            <th className="px-4 py-3 text-right">Line Items</th>
                            <th className="px-4 py-3 text-right">Products</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplies.groups.map((group) => {
                          const expanded = expandedGroupId === group.group_id;
                          return (
                            <Fragment key={group.group_id}>
                              {groupBy === 'batch' ? (
                                <tr
                                  className="cursor-pointer hover:bg-muted"
                                  onClick={() =>
                                    setExpandedGroupId((previous) => (previous === group.group_id ? null : group.group_id))
                                  }
                                >
                                  <td className="px-4 py-3 font-bold text-foreground">{group.batch_number || 'No Batch'}</td>
                                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{group.batch_code || '—'}</td>
                                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{fmtDate(group.expiry_date, systemTimezone)}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">{group.total_units}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">{group.total_sub_units}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">{group.supply_events}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-primary">
                                    {expanded ? 'Hide' : 'Show'} ({group.children_count})
                                  </td>
                                </tr>
                              ) : (
                                <tr
                                  className="cursor-pointer hover:bg-muted"
                                  onClick={() =>
                                    setExpandedGroupId((previous) => (previous === group.group_id ? null : group.group_id))
                                  }
                                >
                                  <td className="px-4 py-3 font-bold text-foreground">{group.invoice_no || `#${group.purchase_id}`}</td>
                                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{fmtDate(group.invoice_timestamp, systemTimezone)}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">{group.total_units}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">{group.total_sub_units}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">{group.supply_events}</td>
                                  <td className="px-4 py-3 text-right text-xs font-bold text-primary">
                                    {expanded ? 'Hide' : 'Show'} ({group.children_count})
                                  </td>
                                </tr>
                              )}

                              {expanded ? (
                                <tr>
                                  <td className="bg-muted px-4 py-3" colSpan={groupBy === 'batch' ? 7 : 6}>
                                    <div className="overflow-auto rounded-xl border border-border bg-white">
                                      <table className="w-full text-xs">
                                        <thead className="bg-muted text-left font-semibold uppercase text-muted-foreground">
                                          <tr>
                                            <th className="px-3 py-2">Product</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Batch</th>
                                            <th className="px-3 py-2">Code</th>
                                            <th className="px-3 py-2">Expiry</th>
                                            <th className="px-3 py-2 text-right">Units</th>
                                            <th className="px-3 py-2 text-right">Sub Units</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {group.children.map((child, index) => (
                                            <tr key={`${group.group_id}-child-${child.medicine_id}-${index}`}>
                                              <td className="px-3 py-2 font-semibold text-foreground">
                                                {child.brand_name || child.generic_name || 'Unnamed'}
                                              </td>
                                              <td className="px-3 py-2 text-muted-foreground">{child.category || '—'}</td>
                                              <td className="px-3 py-2 text-muted-foreground">{child.batch_number || '—'}</td>
                                              <td className="px-3 py-2 text-muted-foreground">{child.batch_code || '—'}</td>
                                              <td className="px-3 py-2 text-muted-foreground">{fmtDate(child.expiry_date, systemTimezone)}</td>
                                              <td className="px-3 py-2 text-right font-bold text-foreground">{child.quantity}</td>
                                              <td className="px-3 py-2 text-right font-bold text-foreground">{child.sub_quantity}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Showing page {supplies.page} of {supplies.totalPages} ({supplies.total}{' '}
                    {groupBy === 'batch' ? 'batches' : 'invoices'})
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={supplyFilters.page <= 1}
                      onClick={() =>
                        setSupplyFilters((previous) => ({
                          ...previous,
                          page: Math.max(1, previous.page - 1),
                        }))
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={supplyFilters.page >= supplies.totalPages}
                      onClick={() =>
                        setSupplyFilters((previous) => ({
                          ...previous,
                          page: Math.min(supplies.totalPages, previous.page + 1),
                        }))
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'insights' ? (
              <div className="space-y-4">
                {insightsLoading ? (
                  <div className="flex h-32 items-center justify-center text-sm font-semibold text-muted-foreground">Loading insights...</div>
                ) : insights ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expired Batches</p>
                        <p className="mt-1 text-2xl font-semibold text-destructive">{insights.inventoryHealth.expiredBatchesCount}</p>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expired Stock Units</p>
                        <p className="mt-1 text-2xl font-semibold text-destructive">{fmtMoney(insights.inventoryHealth.expiredStockUnits)}</p>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dead Stock Batches</p>
                        <p className="mt-1 text-2xl font-semibold text-warning-foreground">{insights.inventoryHealth.deadStockBatches}</p>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dead Stock Units</p>
                        <p className="mt-1 text-2xl font-semibold text-warning-foreground">{fmtMoney(insights.inventoryHealth.deadStockUnits)}</p>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Threshold: {insights.inventoryHealth.deadStockDays} days</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sell-through %</p>
                        <p className="mt-1 text-2xl font-semibold text-primary">{insights.performance.sellThroughPercent.toFixed(2)}%</p>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Products</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{insights.performance.activeProducts}</p>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Purchased Units</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{fmtMoney(insights.performance.purchasedStockUnits)}</p>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sold Units</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{fmtMoney(insights.performance.soldStockUnits)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Fast-moving Products</p>
                        <div className="mt-3 space-y-2">
                          {insights.performance.fastMovingProducts.length === 0 ? (
                            <p className="text-sm font-semibold text-muted-foreground">No movement data</p>
                          ) : insights.performance.fastMovingProducts.map((item) => (
                            <div key={`fast-${item.medicine_id}`} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                              <span className="text-sm font-semibold text-foreground">{item.brand_name || item.generic_name || 'Unnamed'}</span>
                              <span className="text-sm font-semibold text-primary">{fmtMoney(item.sold_units)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-md border border-border bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Slow / No-movement Products</p>
                        <div className="mt-3 space-y-2">
                          {insights.performance.slowMovingProducts.length === 0 ? (
                            <p className="text-sm font-semibold text-muted-foreground">No movement data</p>
                          ) : insights.performance.slowMovingProducts.map((item) => (
                            <div key={`slow-${item.medicine_id}`} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                              <span className="text-sm font-semibold text-foreground">{item.brand_name || item.generic_name || 'Unnamed'}</span>
                              <span className="text-sm font-semibold text-warning-foreground">{fmtMoney(item.sold_units)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {insights.canViewFinancials && insights.financial ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-md border border-border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Purchases</p>
                          <p className="mt-1 text-xl font-semibold text-destructive">Rs. {fmtMoney(insights.financial.totalPurchasesAmount)}</p>
                        </div>
                        <div className="rounded-md border border-border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Paid</p>
                          <p className="mt-1 text-xl font-semibold text-primary">Rs. {fmtMoney(insights.financial.totalPaidAmount)}</p>
                        </div>
                        <div className="rounded-md border border-border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outstanding</p>
                          <p className="mt-1 text-xl font-semibold text-orange-600">Rs. {fmtMoney(Math.abs(insights.financial.outstandingAmount))}</p>
                        </div>
                        <div className="rounded-md border border-border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Return Amount</p>
                          <p className="mt-1 text-xl font-semibold text-info">Rs. {fmtMoney(insights.financial.totalReturnAmount)}</p>
                        </div>
                        <div className="rounded-md border border-border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Return Rate</p>
                          <p className="mt-1 text-xl font-semibold text-foreground">{(insights.financial.returnRate * 100).toFixed(2)}%</p>
                        </div>
                        <div className="rounded-md border border-border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg Purchase Ticket</p>
                          <p className="mt-1 text-xl font-semibold text-foreground">Rs. {fmtMoney(insights.financial.averagePurchaseTicket)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border bg-white p-5 text-sm font-semibold text-muted-foreground">
                        Financial insights are restricted for your role.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-32 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                    <LineChart size={16} />
                    Unable to load insights
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showPayment && canViewFinancials ? (
        <RecordPaymentDialog
          partyId={party.party_id}
          partyName={party.name}
          onClose={() => setShowPayment(false)}
          onRecorded={loadLedger}
        />
      ) : null}
    </>
  );
}
