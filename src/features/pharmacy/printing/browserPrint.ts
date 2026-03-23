import { buildReceiptHtml } from './receiptHtml';
import type { ReceiptPayload } from './types';

async function waitForImages(doc: Document, timeoutMs = 2000) {
  const images = Array.from(doc.images ?? []);
  if (images.length === 0) return;

  await Promise.race([
    Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          })
      )
    ),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export async function printViaHiddenIframe(payload: ReceiptPayload) {
  const html = buildReceiptHtml(payload, { origin: window.location.origin });

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error('Failed to create print frame');
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    throw new Error('Print frame unavailable');
  }

  // Wait for layout/assets (logo) before print() to avoid blank/missing images.
  await new Promise((resolve) => setTimeout(resolve, 50));
  await waitForImages(doc);
  // Fonts API is optional; don't block if unsupported.
  await (doc as any).fonts?.ready?.catch?.(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 50));

  win.focus();
  win.print();

  // Cleanup later (some browsers need a moment after print() call)
  setTimeout(() => iframe.remove(), 2000);
}
