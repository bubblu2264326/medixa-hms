'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  Activity, ArrowDownLeft, ArrowUpRight, ShoppingCart, 
  RotateCcw, Search, Eye, 
  FileText, Calendar, Box, User, Pencil
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { formatDateInTimezone, formatDateTimeInTimezone } from '@/src/lib/timezone/client';
import { useSystemTimezone } from '@/src/lib/timezone/useSystemTimezone';

type Transaction = {
  txn_id: number;
  txn_type: 'purchase' | 'sale' | 'sale_return' | 'purchase_return' | 'adjustment';
  quantity: number;
  sub_quantity: number;
  created_at: string;
  medicine_name: string;
  unit: string;
  sub_unit: string;
  batch_number: string;
  expiry_date: string;
  party_name: string | null;
  invoice_no: string | null;
  sale_id: number | null;
  visit_id: number | null;
  bill_id: number | null;
  is_prescription_sale: boolean | null;
  sale_return_id: number | null;
  sale_return_reason: string | null;
  ref_purchase_id: number | null;
};

const TYPE_CONFIG = {
  purchase: { label: 'Purchase In', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: <ArrowDownLeft size={14} /> },
  sale: { label: 'Sale Out', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <ShoppingCart size={14} /> },
  sale_return: { label: 'Sale Return', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: <RotateCcw size={14} /> },
  purchase_return: { label: 'Pur. Return', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: <ArrowUpRight size={14} /> },
  adjustment: { label: 'Adjustment', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: <Activity size={14} /> },
};

const DEFAULT_CONFIG = { label: 'Other', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', icon: <Activity size={14} /> };

export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const systemTimezone = useSystemTimezone();

  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacy/transactions');
      const json = await res.json();
      setData(json.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return data.filter(t => {
      const matchesSearch = 
        t.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
        (t.party_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.invoice_no?.toLowerCase() || '').includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || t.txn_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [data, search, typeFilter]);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header section */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Medicine Transactions</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Real-time Movement Log</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by medicine, supplier, or invoice..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200/60 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full">
          {['all', 'purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`
                px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all
                ${typeFilter === t 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-12 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
            <p className="font-black text-slate-400 text-xs uppercase tracking-widest animate-pulse">Tracking movements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-12 opacity-40">
            <Activity size={48} className="text-slate-300" />
            <p className="font-bold text-slate-500 mt-4 text-sm">No transactions matched your search</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 z-10">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Status & Type</th>
                <th className="px-6 py-4">Medicine & Movement</th>
                <th className="px-6 py-4">Ref / Entity</th>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {filtered.map((txn) => {
                const config = TYPE_CONFIG[txn.txn_type] || DEFAULT_CONFIG;
                return (
                  <tr key={txn.txn_id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <div className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tight w-fit
                          ${config.bg} ${config.color} ${config.border}
                        `}>
                          {config.icon}
                          {config.label}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 ml-1">
                          <Calendar size={12} />
                          <span className="text-[11px] font-bold">
                            {formatDateInTimezone(txn.created_at, systemTimezone, { day: '2-digit', month: 'short' })} • {formatDateTimeInTimezone(txn.created_at, systemTimezone, { day: undefined, month: undefined, year: undefined })}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors">
                          {txn.medicine_name}
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-400">
                          <Box size={10} className="text-indigo-400" />
                          <span>{txn.quantity} {txn.unit}</span>
                          {txn.sub_quantity > 0 && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span>{txn.sub_quantity} {txn.sub_unit}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="text-slate-400" />
                          <span className="text-[11px] font-black text-slate-500 uppercase">
                            {txn.invoice_no || (txn.sale_id ? `Receipt #${txn.sale_id}` : '—')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-500">
                            {txn.party_name || (txn.sale_id ? 'Store Dispensing' : 'Internal')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-slate-600 tracking-tight">#{txn.batch_number}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Exp: {formatDateInTimezone(txn.expiry_date, systemTimezone)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {txn.txn_type === 'sale' && txn.sale_id && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set('tab', 'retail');
                                  params.set('mode', 'edit');
                                  params.set('ref', txn.sale_id!.toString());
                                  router.push(`${pathname}?${params.toString()}`);
                              }}
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 bg-white shadow-sm border border-amber-100"
                            >
                              <Pencil size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set('tab', 'retail');
                                  params.set('mode', 'return');
                                  params.set('ref', txn.sale_id!.toString());
                                  router.push(`${pathname}?${params.toString()}`);
                              }}
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 bg-white shadow-sm border border-emerald-100"
                            >
                              <RotateCcw size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">Return</span>
                            </Button>
                          </>
                        )}

                        {txn.txn_type === 'purchase' && txn.ref_purchase_id && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set('tab', 'purchase');
                                  params.set('mode', 'edit');
                                  params.set('ref', txn.ref_purchase_id!.toString());
                                  router.push(`${pathname}?${params.toString()}`);
                              }}
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 bg-white shadow-sm border border-amber-100"
                            >
                              <Pencil size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                            </Button>
                            {txn.invoice_no && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set('tab', 'purchaseReturn');
                                    params.set('ref', txn.invoice_no!);
                                    router.push(`${pathname}?${params.toString()}`);
                                }}
                                className="h-8 px-2 justify-start gap-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 bg-white shadow-sm border border-blue-100"
                              >
                                <RotateCcw size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Return</span>
                              </Button>
                            )}
                          </>
                        )}
                        
                        {txn.txn_type === 'sale_return' && txn.sale_return_id && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set('tab', 'retail');
                                  params.set('mode', 'edit_return');
                                  params.set('ref', txn.sale_return_id!.toString());
                                  router.push(`${pathname}?${params.toString()}`);
                              }}
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 bg-white shadow-sm border border-amber-100"
                            >
                              <Pencil size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-slate-200"
                            >
                              <Eye size={14} />
                              <span className="text-[10px] font-black uppercase tracking-wider">View</span>
                            </Button>
                          </>
                        )}

                        {(txn.txn_type === 'purchase_return' || (!txn.sale_id && !txn.invoice_no && !txn.sale_return_id)) && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-8 px-2 justify-start gap-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-slate-200"
                           >
                             <Eye size={14} />
                             <span className="text-[10px] font-black uppercase tracking-wider">View</span>
                           </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
