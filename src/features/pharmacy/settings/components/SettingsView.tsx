"use client";

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Settings, Printer, PlugZap, RefreshCw } from 'lucide-react';
import { usePharmacyPrinterSettings } from '../hooks/usePharmacyPrinterSettings';
import { usePharmacyPosSettings } from '../hooks/usePharmacyPosSettings';
import { buildEscPosTestTicket, qzConnect, qzDisconnect, qzListPrinters, qzPrintRaw } from '@/src/features/pharmacy/printing/qz';

type QzStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type ReceiptConfig = {
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  logo_url?: string | null;
  paper_size?: string | null;
};

export function SettingsView() {
  const { settings, setMode, setAutoPrint, setQzPrinterName } = usePharmacyPrinterSettings();
  const { settings: posSettings, setClearSessionOnModeSwitch, setDeadStockDays } = usePharmacyPosSettings();
  const [qzStatus, setQzStatus] = useState<QzStatus>('disconnected');
  const [printers, setPrinters] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    receipt_header: '',
    receipt_footer: '',
    logo_url: '',
    paper_size: '80mm',
  });
  const [savingReceipt, setSavingReceipt] = useState(false);

  const isSilent = settings.mode === 'silent_qz';

  const loadPrinters = async () => {
    setBusy(true);
    try {
      const list = await qzListPrinters();
      setPrinters(list);
      if (list.length === 0) toast.error('No printers found by QZ Tray');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to list printers');
    } finally {
      setBusy(false);
    }
  };

  const connectQz = async () => {
    setBusy(true);
    setQzStatus('connecting');
    try {
      await qzConnect();
      setQzStatus('connected');
      await loadPrinters();
      toast.success('Connected to QZ Tray');
    } catch (err) {
      console.error(err);
      setQzStatus('error');
      toast.error(err instanceof Error ? err.message : 'Failed to connect to QZ Tray');
    } finally {
      setBusy(false);
    }
  };

  const disconnectQz = async () => {
    setBusy(true);
    try {
      await qzDisconnect();
      setQzStatus('disconnected');
      toast.success('Disconnected from QZ Tray');
    } catch (err) {
      console.error(err);
      toast.error('Failed to disconnect QZ Tray');
    } finally {
      setBusy(false);
    }
  };

  const modeLabel = useMemo(() => (isSilent ? 'Silent (QZ Tray)' : 'Browser Print'), [isSilent]);

  useEffect(() => {
    setPrinters([]);
    setQzStatus('disconnected');
  }, [settings.mode]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pos/receipt-config');
        const body = await res.json();
        if (body?.success) {
          setReceiptConfig({
            clinic_name: body?.data?.clinic_name ?? '',
            clinic_address: body?.data?.clinic_address ?? '',
            clinic_phone: body?.data?.clinic_phone ?? '',
            receipt_header: body?.data?.receipt_header ?? '',
            receipt_footer: body?.data?.receipt_footer ?? '',
            logo_url: body?.data?.logo_url ?? '',
            paper_size: body?.data?.paper_size ?? '80mm',
          });
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 leading-none">Settings</h2>
          <p className="text-[12px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Printer configuration</p>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white border border-slate-200/60 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          <Printer size={14} />
          Receipt Printing
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Print Mode</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('browser')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold border transition ${
                  settings.mode === 'browser'
                    ? 'bg-white border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Browser
              </button>
              <button
                type="button"
                onClick={() => setMode('silent_qz')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold border transition ${
                  settings.mode === 'silent_qz'
                    ? 'bg-white border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Silent (Thermal)
              </button>
            </div>
            <div className="mt-2 text-[12px] text-slate-500">
              Current: <span className="font-bold text-slate-700">{modeLabel}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Auto-print After Sale</div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{settings.autoPrint ? 'Enabled' : 'Disabled'}</span>
              <button
                type="button"
                onClick={() => setAutoPrint(!settings.autoPrint)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoPrint ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.autoPrint ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 text-[12px] text-slate-500">Printing never blocks completing a sale.</div>
          </div>
        </div>

        {isSilent ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                <PlugZap size={14} />
                QZ Tray
              </div>
              <div className="text-xs font-bold text-slate-600">
                Status:{' '}
                <span
                  className={`${
                    qzStatus === 'connected'
                      ? 'text-emerald-600'
                      : qzStatus === 'connecting'
                      ? 'text-amber-600'
                      : qzStatus === 'error'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {qzStatus}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={connectQz}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
              >
                {qzStatus === 'connecting' ? <RefreshCw className="inline mr-2 animate-spin" size={14} /> : null}
                Connect
              </button>
              <button
                type="button"
                onClick={disconnectQz}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white disabled:opacity-50"
              >
                Disconnect
              </button>
              <button
                type="button"
                onClick={loadPrinters}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white disabled:opacity-50"
              >
                Refresh Printers
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">
                  Printer
                </label>
                <select
                  value={settings.qzPrinterName}
                  onChange={(e) => setQzPrinterName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                >
                  <option value="">Select printer…</option>
                  {printers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[12px] text-slate-500">
                  QZ Tray must be installed and running on this PC.
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!settings.qzPrinterName) {
                      toast.error('Select a printer first');
                      return;
                    }

                    setBusy(true);
                    try {
                      await qzPrintRaw(settings.qzPrinterName, [buildEscPosTestTicket()]);
                      toast.success('Test print sent');
                    } catch (err) {
                      console.error(err);
                      toast.error(err instanceof Error ? err.message : 'Test print failed');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                >
                  Test Print
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
              Silent mode prints without the browser dialog using ESC/POS through QZ Tray.
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">POS Behavior</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Clear cart on Sale/Return switch: {posSettings.clearSessionOnModeSwitch ? 'On' : 'Off'}
            </span>
            <button
              type="button"
              onClick={() => setClearSessionOnModeSwitch(!posSettings.clearSessionOnModeSwitch)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                posSettings.clearSessionOnModeSwitch ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  posSettings.clearSessionOnModeSwitch ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
            When enabled, switching between Sale and Return clears the cart, payment, and loaded invoice/patient context.
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">
              Dead Stock Days
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={365}
                value={posSettings.deadStockDays}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isFinite(value)) return;
                  setDeadStockDays(value);
                }}
                className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              />
              <p className="text-[12px] text-slate-500">
                Used in supplier insights to mark dead stock. Default: 30 days.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Receipt Branding</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Clinic Name</label>
              <input
                value={receiptConfig.clinic_name ?? ''}
                onChange={(e) => setReceiptConfig((p) => ({ ...p, clinic_name: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Phone</label>
              <input
                value={receiptConfig.clinic_phone ?? ''}
                onChange={(e) => setReceiptConfig((p) => ({ ...p, clinic_phone: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Address</label>
              <input
                value={receiptConfig.clinic_address ?? ''}
                onChange={(e) => setReceiptConfig((p) => ({ ...p, clinic_address: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Receipt Header</label>
              <input
                value={receiptConfig.receipt_header ?? ''}
                onChange={(e) => setReceiptConfig((p) => ({ ...p, receipt_header: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Receipt Footer</label>
              <input
                value={receiptConfig.receipt_footer ?? ''}
                onChange={(e) => setReceiptConfig((p) => ({ ...p, receipt_footer: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Logo URL (optional)</label>
              <input
                value={receiptConfig.logo_url ?? ''}
                onChange={(e) => setReceiptConfig((p) => ({ ...p, logo_url: e.target.value }))}
                placeholder="/logo.png"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              />
              <p className="mt-2 text-[12px] text-slate-500">Leave empty to use the navbar logo (`/logo.png`).</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={savingReceipt}
              onClick={async () => {
                setSavingReceipt(true);
                try {
                  const res = await fetch('/api/pos/receipt-config', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(receiptConfig),
                  });
                  const body = await res.json();
                  if (!res.ok || !body?.success) {
                    throw new Error(body?.error || 'Failed to save receipt config');
                  }
                  toast.success('Receipt branding saved');
                  setReceiptConfig({
                    clinic_name: body?.data?.clinic_name ?? '',
                    clinic_address: body?.data?.clinic_address ?? '',
                    clinic_phone: body?.data?.clinic_phone ?? '',
                    receipt_header: body?.data?.receipt_header ?? '',
                    receipt_footer: body?.data?.receipt_footer ?? '',
                    logo_url: body?.data?.logo_url ?? '',
                    paper_size: body?.data?.paper_size ?? '80mm',
                  });
                } catch (err) {
                  console.error(err);
                  toast.error(err instanceof Error ? err.message : 'Save failed');
                } finally {
                  setSavingReceipt(false);
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
            >
              Save Branding
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Help</div>
          <p className="mt-2 text-sm text-slate-600">
            Browser mode uses the system print dialog. Silent mode requires QZ Tray and a selected printer.
          </p>
        </div>
      </div>
    </div>
  );
}
