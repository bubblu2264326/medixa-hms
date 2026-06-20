import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteHeldTransaction, getHeldTransactions } from '../../api';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils';
import { Loader2, X, RefreshCcw, FileText, User, Calendar, ShoppingBag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTimeInTimezone } from '@/src/lib/timezone/client';
import { useSystemTimezone } from '@/src/lib/timezone/useSystemTimezone';

interface HeldTransactionsModalProps {
  onClose: () => void;
  onLoad: (transaction: Transaction) => void;
}

export const HeldTransactionsModal: React.FC<HeldTransactionsModalProps> = ({ onClose, onLoad }) => {
  const systemTimezone = useSystemTimezone();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousOverflowRef = React.useRef<string>('');
  const previousInertRef = React.useRef<boolean | undefined>(undefined);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await getHeldTransactions();
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        toast.error(response.error || 'Failed to load held transactions');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching held transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const appRoot = document.getElementById('__next') as (HTMLElement & { inert?: boolean }) | null;
    previousOverflowRef.current = document.body.style.overflow;
    previousInertRef.current = appRoot?.inert;

    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;

    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflowRef.current;
      if (appRoot) appRoot.inert = previousInertRef.current || false;
    };
  }, [mounted]);

  if (!mounted) return null;

  const portalTarget =
    (typeof document !== 'undefined'
      ? (document.fullscreenElement ?? document.body)
      : null) as HTMLElement | null;

  if (!portalTarget) return null;

  const getPatientLabel = (tx: Transaction) => {
    const customerName = tx.customer?.name?.trim();
    if (customerName) return customerName;
    if (tx.customerId && tx.visitId) return `Patient #${tx.customerId} • Visit #${tx.visitId}`;
    if (tx.customerId) return `Patient #${tx.customerId}`;
    return 'Walk-in Customer';
  };

  const handleDelete = async (tx: Transaction) => {
    if (deletingId) return;

    setDeletingId(tx.id);
    try {
      const response = await deleteHeldTransaction(tx.id);
      if (response.success) {
        setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
        toast.success('Held transaction deleted', {
          position: 'top-center',
          style: { zIndex: 2147483647 },
        });
      } else {
        toast.error(response.error || 'Failed to delete held transaction', {
          position: 'top-center',
          style: { zIndex: 2147483647 },
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error deleting held transaction', {
        position: 'top-center',
        style: { zIndex: 2147483647 },
      });
    } finally {
      setDeletingId(null);
    }
  };

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
        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/50">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning-foreground">
              <RefreshCcw size={14} className="animate-spin-slow" />
              Resume Payment
            </div>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Held Transactions
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a previously saved transaction to resume billing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-md border border-border bg-white text-muted-foreground hover:text-foreground hover:border-input transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-warning-foreground" size={40} />
              <p className="text-muted-foreground font-medium italic">Scanning vault for held sales...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted rounded-lg border-2 border-dashed border-border">
              <div className="p-4 bg-white rounded-full shadow-sm text-muted-foreground">
                <ShoppingBag size={48} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">No held transactions</p>
                <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest font-bold">All sales are current or completed</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="group relative bg-white border border-border rounded-lg p-6 hover:border-amber-400 hover:shadow-xl hover: transition-all duration-300"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-5">
                      <div className="w-12 h-12 rounded-md bg-warning/15 flex items-center justify-center text-warning-foreground group-hover:scale-110 transition-transform duration-300">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ref</span>
                          <span className="font-mono font-bold text-foreground">{tx.reference}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User size={14} className="text-muted-foreground" />
                            <span className="font-semibold">
                              {getPatientLabel(tx)}
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
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Amount</p>
                        <div className="text-lg font-semibold text-primary">
                          {formatCurrency(tx.payment.payableAmount)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(tx)}
                        disabled={deletingId === tx.id}
                        title="Delete held transaction"
                        className="shrink-0 p-3 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {deletingId === tx.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => onLoad(tx)}
                        disabled={deletingId === tx.id}
                        className="shrink-0 px-8 py-4 bg-foreground text-white rounded-md font-semibold text-sm uppercase tracking-widest hover:bg-amber-600 hover:shadow-lg hover: active:scale-95 transition-all duration-300"
                      >
                        {tx.mode === 'RETURN' ? 'Load Return' : 'Load Sale'}
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
            Close Window
          </button>
        </div>
      </div>
    </div>
  ), portalTarget);
};
