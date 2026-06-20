'use client';

import { useState } from 'react';
import { addParty } from '../api';
import { AddPartyInput } from '../types';
import toast from 'react-hot-toast';
import { X, Building2 } from 'lucide-react';

interface AddPartyDialogProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddPartyDialog({ onClose, onAdded }: AddPartyDialogProps) {
  const [form, setForm] = useState<AddPartyInput>({
    name: '',
    contact_number: '',
    address: '',
    email: '',
    gst_number: '',
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Party name is required');
    setSaving(true);
    try {
      await addParty(form);
      toast.success(`Party "${form.name}" added successfully`);
      onAdded();
      onClose();
    } catch {
      toast.error('Failed to add party');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary text-white rounded-md shadow-lg ">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add New Party</h2>
            <p className="text-xs text-muted-foreground font-medium">Supplier / Vendor Information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">
              Party Name <span className="text-destructive">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Sohail Medical Suppliers"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">Contact</label>
              <input
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                placeholder="03XX-XXXXXXX"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">GST/NTN No.</label>
              <input
                name="gst_number"
                value={form.gst_number}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="supplier@example.com"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={2}
              placeholder="Full address..."
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-muted resize-none"
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
              {saving ? 'Saving…' : 'Add Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
