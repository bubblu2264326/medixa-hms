'use client';

import { useState } from 'react';
import { recordPayment } from '../api';
import toast from 'react-hot-toast';
import { X, DollarSign } from 'lucide-react';

interface RecordPaymentDialogProps {
  partyId: number;
  partyName: string;
  onClose: () => void;
  onRecorded: () => void;
}

export function RecordPaymentDialog({ partyId, partyName, onClose, onRecorded }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      await recordPayment({
        party_id: partyId,
        amount: numAmount,
        payment_method: paymentMethod,
        reference_note: referenceNote,
      });
      toast.success(`Payment of Rs. ${numAmount.toLocaleString()} recorded`);
      onRecorded();
      onClose();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-8 relative animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary text-white rounded-md shadow-lg ">
            <DollarSign size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Record Payment</h2>
            <p className="text-xs text-muted-foreground font-semibold truncate max-w-[180px]">To: {partyName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">Amount (Rs.)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-border rounded-xl px-4 py-3 text-xl font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-ring/20 bg-primary/10"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted"
            >
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Online</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">Reference / Note</label>
            <input
              value={referenceNote}
              onChange={e => setReferenceNote(e.target.value)}
              placeholder="e.g. Cheque #1234, Invoice settlement..."
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg  hover:bg-primary transition-all disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
