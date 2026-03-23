'use client';

import { useCallback, useEffect, useState } from 'react';
import { PartyDetail, LedgerEntry } from '../types';
import { getPartyLedger } from '../api';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, TrendingDown, X } from 'lucide-react';

interface PartyLedgerPanelProps {
  party: PartyDetail;
  onClose: () => void;
}

function fmt(n: number | string) {
  return parseFloat(String(n)).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TypeBadge({ type }: { type: LedgerEntry['type'] }) {
  const config = {
    Purchase: { bg: 'bg-red-50 text-red-600 border-red-100', icon: <ArrowDownLeft size={12} />, label: 'Purchase' },
    Return: { bg: 'bg-blue-50 text-blue-600 border-blue-100', icon: <ArrowUpRight size={12} />, label: 'Return' },
    Payment: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <CreditCard size={12} />, label: 'Payment' },
  }[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${config.bg}`}>
      {config.icon} {config.label}
    </span>
  );
}

export function PartyLedgerPanel({ party, onClose }: PartyLedgerPanelProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPartyLedger(party.party_id);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [party.party_id]);

  useEffect(() => { void load(); }, [load]);

  // Compute running balance
  let runningBalance = 0;
  const withBalance = entries.map(e => {
    runningBalance += (parseFloat(String(e.debit)) || 0) - (parseFloat(String(e.credit)) || 0);
    return { ...e, balance: runningBalance };
  });

  const totalDebit = entries.reduce((s, e) => s + (parseFloat(String(e.debit)) || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(String(e.credit)) || 0), 0);
  const outstanding = totalDebit - totalCredit;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-lg font-black text-slate-800">{party.name}</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {party.contact_number ?? 'No contact'} {party.gst_number ? `• GST: ${party.gst_number}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-0.5">Total Purchases</p>
            <p className="text-lg font-black text-red-600">Rs. {fmt(totalDebit)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Paid / Returns</p>
            <p className="text-lg font-black text-emerald-600">Rs. {fmt(totalCredit)}</p>
          </div>
          <div className={`rounded-2xl p-3 border text-center shadow-sm ${outstanding > 0 ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Outstanding</p>
            <p className={`text-lg font-black ${outstanding > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
              Rs. {fmt(Math.abs(outstanding))}
            </p>
          </div>
        </div>

        {/* Record Payment Button */}
        <div className="px-4 py-3 border-b border-slate-100">
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-2.5 rounded-xl bg-teal-500 text-white font-black text-sm hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
          >
            <DollarSign size={16} />
            Record Payment to Party
          </button>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 font-semibold text-sm">Loading ledger…</div>
          ) : withBalance.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
              <TrendingDown size={32} className="text-slate-400" />
              <p className="text-slate-500 font-semibold text-sm">No transactions yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-3">Date</th>
                  <th className="text-left pb-3">Type</th>
                  <th className="text-left pb-3">Reference</th>
                  <th className="text-right pb-3">Debit</th>
                  <th className="text-right pb-3">Credit</th>
                  <th className="text-right pb-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {withBalance.map((e, i) => (
                  <tr key={`${e.type}-${e.id}-${i}`} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-500 font-semibold text-xs">
                      {new Date(e.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="py-3"><TypeBadge type={e.type} /></td>
                    <td className="py-3 text-slate-600 font-semibold text-xs max-w-[120px] truncate">{e.reference ?? '—'}</td>
                    <td className="py-3 text-right font-bold text-red-600 text-xs">
                      {parseFloat(String(e.debit)) > 0 ? `Rs. ${fmt(e.debit)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-600 text-xs">
                      {parseFloat(String(e.credit)) > 0 ? `Rs. ${fmt(e.credit)}` : '—'}
                    </td>
                    <td className={`py-3 text-right font-black text-xs ${e.balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      Rs. {fmt(Math.abs(e.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showPayment && (
        <RecordPaymentDialog
          partyId={party.party_id}
          partyName={party.name}
          onClose={() => setShowPayment(false)}
          onRecorded={load}
        />
      )}
    </>
  );
}
