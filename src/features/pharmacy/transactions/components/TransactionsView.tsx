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
  purchase: { label: 'Purchase In', color: 'text-info', bg: 'bg-info/10', border: 'border-info/30', icon: <ArrowDownLeft size={14} /> },
  sale: { label: 'Sale Out', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', icon: <ShoppingCart size={14} /> },
  sale_return: { label: 'Sale Return', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: <RotateCcw size={14} /> },
  purchase_return: { label: 'Pur. Return', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', icon: <ArrowUpRight size={14} /> },
  adjustment: { label: 'Adjustment', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', icon: <Activity size={14} /> },
};

const DEFAULT_CONFIG = { label: 'Other', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: <Activity size={14} /> };

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
          <div className="p-2.5 bg-primary text-white rounded-md shadow-lg ">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Medicine Transactions</h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Real-time Movement Log</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-md border border-border/50">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by medicine, supplier, or invoice..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-border/60 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/60 overflow-x-auto max-w-full">
          {['all', 'purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`
                px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all
                ${typeFilter === t 
                  ? "bg-white text-primary shadow-sm border border-border/60" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-white rounded-lg border border-border shadow-xl  relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-12 gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest animate-pulse">Tracking movements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-12 opacity-40">
            <Activity size={48} className="text-muted-foreground" />
            <p className="font-bold text-muted-foreground mt-4 text-sm">No transactions matched your search</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-md border-b border-border z-10">
              <tr className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                  <tr key={txn.txn_id} className="group hover:bg-muted/50 transition-all duration-300">
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <div className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-tight w-fit
                          ${config.bg} ${config.color} ${config.border}
                        `}>
                          {config.icon}
                          {config.label}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground ml-1">
                          <Calendar size={12} />
                          <span className="text-[11px] font-bold">
                            {formatDateInTimezone(txn.created_at, systemTimezone, { day: '2-digit', month: 'short' })} • {formatDateTimeInTimezone(txn.created_at, systemTimezone, { day: undefined, month: undefined, year: undefined })}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {txn.medicine_name}
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-muted-foreground">
                          <Box size={10} className="text-primary" />
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
                          <FileText size={12} className="text-muted-foreground" />
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                            {txn.invoice_no || (txn.sale_id ? `Receipt #${txn.sale_id}` : '—')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-muted-foreground" />
                          <span className="text-xs font-bold text-muted-foreground">
                            {txn.party_name || (txn.sale_id ? 'Store Dispensing' : 'Internal')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted-foreground tracking-tight">#{txn.batch_number}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-warning-foreground hover:bg-warning/15 hover:text-warning-foreground bg-white shadow-sm border border-amber-100"
                            >
                              <Pencil size={14} />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Edit</span>
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
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-primary hover:bg-primary/10 hover:text-primary bg-white shadow-sm border border-primary/30"
                            >
                              <RotateCcw size={14} />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Return</span>
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
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-warning-foreground hover:bg-warning/15 hover:text-warning-foreground bg-white shadow-sm border border-amber-100"
                            >
                              <Pencil size={14} />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Edit</span>
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
                                className="h-8 px-2 justify-start gap-1.5 rounded-lg text-info hover:bg-info/10 hover:text-info bg-white shadow-sm border border-info/30"
                              >
                                <RotateCcw size={14} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Return</span>
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
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-warning-foreground hover:bg-warning/15 hover:text-warning-foreground bg-white shadow-sm border border-amber-100"
                            >
                              <Pencil size={14} />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 justify-start gap-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-border"
                            >
                              <Eye size={14} />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">View</span>
                            </Button>
                          </>
                        )}

                        {(txn.txn_type === 'purchase_return' || (!txn.sale_id && !txn.invoice_no && !txn.sale_return_id)) && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-8 px-2 justify-start gap-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-border"
                           >
                             <Eye size={14} />
                             <span className="text-[10px] font-semibold uppercase tracking-wider">View</span>
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
