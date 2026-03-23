import type { PrinterSettings, PrintMode } from './types';

const MODE_KEY = 'pharmacy.printing.mode';
const AUTO_KEY = 'pharmacy.printing.autoPrint';
const QZ_PRINTER_KEY = 'pharmacy.printing.qz.printerName';

const DEFAULTS: PrinterSettings = {
  mode: 'browser',
  autoPrint: true,
  qzPrinterName: '',
};

function safeGetItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getPrinterSettings(): PrinterSettings {
  if (typeof window === 'undefined') return DEFAULTS;

  const modeRaw = safeGetItem(MODE_KEY);
  const mode: PrintMode = modeRaw === 'silent_qz' ? 'silent_qz' : 'browser';

  const autoRaw = safeGetItem(AUTO_KEY);
  const autoPrint = autoRaw === null ? DEFAULTS.autoPrint : autoRaw === 'true';

  const qzPrinterName = safeGetItem(QZ_PRINTER_KEY) ?? DEFAULTS.qzPrinterName;

  return { mode, autoPrint, qzPrinterName };
}

export function setPrinterMode(mode: PrintMode) {
  safeSetItem(MODE_KEY, mode);
}

export function setAutoPrint(autoPrint: boolean) {
  safeSetItem(AUTO_KEY, String(autoPrint));
}

export function setQzPrinterName(printerName: string) {
  safeSetItem(QZ_PRINTER_KEY, printerName);
}

