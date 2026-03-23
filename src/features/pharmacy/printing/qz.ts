import type { ReceiptPayload } from './types';

declare global {
  interface Window {
    qz?: any;
  }
}

const QZ_SCRIPT_SRC = 'https://localhost:8181/qz-tray.js';

function escposCut() {
  return '\x1D\x56\x00';
}

function escposInit() {
  return '\x1B\x40';
}

function escposBold(on: boolean) {
  return on ? '\x1B\x45\x01' : '\x1B\x45\x00';
}

function escposCenter(on: boolean) {
  return on ? '\x1B\x61\x01' : '\x1B\x61\x00';
}

function escposNewlines(n = 1) {
  return '\n'.repeat(Math.max(1, n));
}

function asNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return asNumber(value).toFixed(2);
}

function padRight(text: string, width: number) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

function padLeft(text: string, width: number) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  return ' '.repeat(width - s.length) + s;
}

export async function ensureQzLoaded() {
  if (window.qz) return window.qz;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-qz-tray="true"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load QZ Tray script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = QZ_SCRIPT_SRC;
    script.async = true;
    script.dataset.qzTray = 'true';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load QZ Tray script. Is QZ Tray running?')), { once: true });
    document.head.appendChild(script);
  });

  if (!window.qz) {
    throw new Error('QZ Tray script loaded but `window.qz` is unavailable');
  }

  return window.qz;
}

export async function qzConnect() {
  const qz = await ensureQzLoaded();
  if (qz.websocket && qz.websocket.isActive?.()) return;
  await qz.websocket.connect();
}

export async function qzDisconnect() {
  const qz = await ensureQzLoaded();
  if (!qz.websocket || !qz.websocket.isActive?.()) return;
  await qz.websocket.disconnect();
}

export async function qzListPrinters(): Promise<string[]> {
  const qz = await ensureQzLoaded();
  return await qz.printers.find();
}

export async function qzPrintRaw(printerName: string, data: string[]) {
  const qz = await ensureQzLoaded();
  await qzConnect();

  if (!printerName) {
    throw new Error('No printer selected for silent printing');
  }

  const cfg = qz.configs.create(printerName);
  await qz.print(cfg, data);
}

export function buildEscPosTestTicket() {
  let out = '';
  out += escposInit();
  out += escposCenter(true) + escposBold(true) + 'TEST PRINT' + escposBold(false) + escposNewlines(1);
  out += escposCenter(false);
  out += `Time: ${new Date().toLocaleString()}` + escposNewlines(1);
  out += 'If you can read this, QZ Tray printing works.' + escposNewlines(2);
  out += escposCut();
  return out;
}

export function buildEscPosReceipt(payload: ReceiptPayload) {
  const { config, transaction } = payload;
  const clinicName = config.clinic_name || 'Pharmacy';
  const header = config.receipt_header || '';
  const footer = config.receipt_footer || '';
  const address = config.clinic_address || '';
  const phone = config.clinic_phone || '';
  const saleId = transaction.sale_id;
  const ref = transaction.payment_reference || `SALE-${saleId}`;
  const ts = transaction.sale_timestamp ? new Date(transaction.sale_timestamp).toLocaleString() : '';
  const staffName = (transaction as any).staff_name || '';
  const patientName = (transaction as any).patient_name || '';

  let out = '';
  out += escposInit();
  out += escposCenter(true) + escposBold(true) + `${clinicName}` + escposBold(false) + escposNewlines(1);
  out += escposCenter(false);
  if (header) out += `${header}` + escposNewlines(1);
  if (address) out += `${address}` + escposNewlines(1);
  if (phone) out += `${phone}` + escposNewlines(1);
  out += '------------------------------' + escposNewlines(1);
  out += `Receipt: ${ref}` + escposNewlines(1);
  if (ts) out += `${ts}` + escposNewlines(1);
  if (staffName) out += `Cashier: ${staffName}` + escposNewlines(1);
  if (patientName) out += `Patient: ${patientName}` + escposNewlines(1);
  out += '------------------------------' + escposNewlines(1);

  out += padRight('Product', 16) + padLeft('Qty', 4) + padLeft('Total', 10) + escposNewlines(1);
  out += '------------------------------' + escposNewlines(1);

  for (const item of (transaction.items || [])) {
    const name = String(item.medicine_name || item.generic_name || 'Item');
    const qty = asNumber(item.qty);
    const total = money(item.total_price);
    const firstLine = padRight(name, 16) + padLeft(String(qty), 4) + padLeft(total, 10);
    out += firstLine + escposNewlines(1);

    const unit = money(item.unit_price);
    const flags = item.is_override ? ' OVR' : '';
    out += `  @${unit}${flags}` + escposNewlines(1);
  }

  out += '------------------------------' + escposNewlines(1);
  out += `GRAND TOTAL: ${money(transaction.total_amount)}` + escposNewlines(1);
  const discountAmount = money((transaction as any).discount_amount);
  if (discountAmount !== '0.00') out += `DISCOUNT  : ${discountAmount}` + escposNewlines(1);
  out += `PAID      : ${money((transaction as any).paid_amount)}` + escposNewlines(1);
  out += `AMOUNT DUE: ${money((transaction as any).due_amount)}` + escposNewlines(1);
  out += `CHANGE    : ${money((transaction as any).change_amount)}` + escposNewlines(1);
  out += '------------------------------' + escposNewlines(1);
  if (footer) out += escposCenter(true) + `${footer}` + escposNewlines(1) + escposCenter(false);
  out += escposNewlines(2);
  out += escposCut();

  return out;
}

export async function qzPrintReceipt(payload: ReceiptPayload, printerName: string) {
  await qzPrintRaw(printerName, [buildEscPosReceipt(payload)]);
}
