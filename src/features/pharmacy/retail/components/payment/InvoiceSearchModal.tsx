import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTransactions } from '../../api';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils';
import { Loader2, X, Search, FileText, User, Calendar, ShoppingBag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTimeInTimezone } from '@/src/lib/timezone/client';
import { useSystemTimezone } from '@/src/lib/timezone/useSystemTimezone';

interface InvoiceSearchModalProps {
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
}

export const InvoiceSearchModal: React.FC<InvoiceSearchModalProps> = ({ onClose, onSelect }) => {
  const systemTimezone = useSystemTimezone();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousOverflowRef = React.useRef<string>('');
  const previousInertRef = React.useRef<boolean>(false);

  const fetchTransactions = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const response = await getTransactions(query);
      if (response.success && response.data) {
        // Filter out returns, only show sales
        const salesOnly = response.data.filter(tx => tx.mode !== 'RETURN');
        setTransactions(salesOnly);
      } else {
        toast.error(response.error || 'Failed to search invoices');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchTransactions]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const appRoot = document.getElementById('__next') as (HTMLElement & { inert?: boolean }) | null;
    previousOverflowRef.current = document.body.style.overflow;
    previousInertRef.current = !!appRoot?.inert;

    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;

    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflowRef.current;
      if (appRoot) appRoot.inert = previousInertRef.current;
    };
  }, [mounted]);

  if (!mounted) return null;

  const portalTarget =
    (typeof document !== 'undefined'
      ? (document.fullscreenElement ?? document.body)
      : null) as HTMLElement | null;

  if (!portalTarget) return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-4xl rounded-lg border border-white/70 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] outline-none"
      >
        {/* Header */}
        <div className="p-8 border-b border-border bg-muted/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Search size={14} />
                Invoice Retrieval
              </div>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Search Invoices
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Find a completed sale to initiate a return.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-md border border-border bg-white text-muted-foreground hover:text-foreground hover:border-input transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by Invoice Number or Patient Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-16 pl-16 pr-6 bg-white border-2 border-border rounded-[1.25rem] text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:shadow-lg  transition-all"
              autoFocus
            />
            {loading && (
              <div className="absolute inset-y-0 right-6 flex items-center">
                <Loader2 className="animate-spin text-primary" size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-muted/30">
          {transactions.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white rounded-lg border-2 border-dashed border-border">
              <div className="p-4 bg-muted rounded-full text-muted-foreground">
                <FileText size={48} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {searchQuery ? 'No matching invoices found' : 'Start typing to search'}
                </p>
                <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest font-bold">
                  {searchQuery ? 'Check the reference number and try again' : 'Enter invoice # or patient name'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="group relative bg-white border border-border rounded-lg p-6 hover:border-indigo-400 hover:shadow-xl  transition-all duration-300"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-5">
                      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Invoice</span>
                          <span className="font-mono font-bold text-foreground">{tx.reference}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User size={14} className="text-muted-foreground" />
                            <span className="font-semibold">
                              {tx.customerId ? `Patient: ${tx.customerId}` : 'Walk-in Customer'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar size={14} className="text-muted-foreground" />
                            <span>{formatDateTimeInTimezone(tx.timestamp, systemTimezone)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-primary font-bold">
                            <ShoppingBag size={14} />
                            <span>{tx.items.length} Items</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:justify-end">
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Bill</p>
                        <div className="text-lg font-semibold text-primary">
                          {formatCurrency(tx.payment.payableAmount)}
                        </div>
                      </div>
                      <button
                        onClick={() => onSelect(tx)}
                        className="flex items-center gap-2 shrink-0 px-8 py-4 bg-foreground text-white rounded-md font-semibold text-sm uppercase tracking-widest hover:bg-primary hover:shadow-lg  active:scale-95 transition-all duration-300"
                      >
                        Select for Return
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ), portalTarget);
};
