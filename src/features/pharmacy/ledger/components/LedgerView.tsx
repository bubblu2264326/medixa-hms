'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, ArrowDownLeft, ArrowUpRight, CreditCard,
  Search, Filter
} from 'lucide-react';
import { formatDateInTimezone } from '@/src/lib/timezone/client';
import { useSystemTimezone } from '@/src/lib/timezone/useSystemTimezone';

type LedgerRow = {
  id: number;
  type: 'Purchase' | 'Return' | 'Payment';
  party_name: string;
  party_id: number;
  reference: string | null;
  date: string;
  debit: number;
  credit: number;
};

function fmt(n: number | string) {
  return parseFloat(String(n)).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TYPE_CONFIG = {
  Purchase: { bg: 'bg-destructive/10 text-destructive border-destructive/30', icon: <ArrowDownLeft size={11} /> },
  Return:   { bg: 'bg-info/10 text-info border-info/30', icon: <ArrowUpRight size={11} /> },
  Payment:  { bg: 'bg-primary/10 text-primary border-primary/30', icon: <CreditCard size={11} /> },
};

function TypeBadge({ type }: { type: LedgerRow['type'] }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${cfg.bg}`}>
      {cfg.icon} {type}
    </span>
  );
}

export function LedgerView() {
  const systemTimezone = useSystemTimezone();
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | LedgerRow['type']>('All');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacy/ledger');
      const json = await res.json();
      setEntries(json.data ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchSearch =
        e.party_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.reference ?? '').toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'All' || e.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [entries, search, typeFilter]);

  // Financial tracking moved to Admin module
  // const totalDebit = entries.reduce((s, e) => s + (parseFloat(String(e.debit)) || 0), 0);
  // const totalCredit = entries.reduce((s, e) => s + (parseFloat(String(e.credit)) || 0), 0);
  // const outstanding = totalDebit - totalCredit;

  const TYPES: Array<'All' | LedgerRow['type']> = ['All', 'Purchase', 'Return', 'Payment'];

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Party Ledger</h3>
            <p className="text-xs text-muted-foreground font-medium">All transactions across all parties</p>
          </div>
        </div>
      </div>

      {/* Summary Cards - Hidden for non-admin roles */}
      {/* 
      <div className="grid grid-cols-3 gap-3">
        ... (cards hidden) ...
      </div>
      */}
      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by party or invoice…"
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border/40">
          <Filter size={13} className="text-muted-foreground ml-2" />
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                typeFilter === t
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-md border border-border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground font-semibold text-sm">
            <BookOpen size={28} className="animate-pulse mr-2" /> Loading ledger…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-40">
            <BookOpen size={36} className="text-muted-foreground" />
            <p className="text-muted-foreground font-semibold text-sm">No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted border-b border-border">
              <tr className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Party</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-right px-5 py-3">Debit</th>
                <th className="text-right px-5 py-3">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e, i) => (
                <tr key={`${e.type}-${e.id}-${i}`} className="hover:bg-muted transition-colors">
                  <td className="px-5 py-3 text-muted-foreground font-semibold text-xs whitespace-nowrap">
                    {formatDateInTimezone(e.date, systemTimezone, { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground text-xs">{e.party_name}</td>
                  <td className="px-5 py-3"><TypeBadge type={e.type} /></td>
                  <td className="px-5 py-3 text-muted-foreground font-medium text-xs max-w-[160px] truncate">{e.reference ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-destructive text-xs">
                    {parseFloat(String(e.debit)) > 0 ? `Rs. ${fmt(e.debit)}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-primary text-xs">
                    {parseFloat(String(e.credit)) > 0 ? `Rs. ${fmt(e.credit)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
