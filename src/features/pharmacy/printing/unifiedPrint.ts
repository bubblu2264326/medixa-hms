import toast from 'react-hot-toast';
import { fetchReceiptPayload } from './receiptApi';
import { getPrinterSettings } from './settingsStorage';
import { printViaHiddenIframe } from './browserPrint';
import { qzPrintReceipt } from './qz';

export async function printReceiptUnified(saleId: string, opts?: { silent?: boolean }) {
  const settings = getPrinterSettings();
  const payload = await fetchReceiptPayload(saleId);

  const forceSilent = opts?.silent === true;
  const mode = forceSilent ? 'silent_qz' : settings.mode;

  if (mode === 'silent_qz') {
    await qzPrintReceipt(payload, settings.qzPrinterName);
    toast.success('Receipt printed (silent)');
    return;
  }

  await printViaHiddenIframe(payload);
  toast.success('Print dialog opened');
}

export function fireAndForgetPrint(saleId: string) {
  printReceiptUnified(saleId).catch((err) => {
    console.error(err);
    toast.error(err instanceof Error ? err.message : 'Printing failed');
  });
}

