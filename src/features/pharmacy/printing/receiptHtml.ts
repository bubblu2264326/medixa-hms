import type { ReceiptPayload } from './types';
import { DEFAULT_TIMEZONE, formatDateTimeInTimezone, isValidIanaTimezone } from "@/src/lib/timezone/client";

function asNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: unknown) {
  const n = asNumber(value);
  return n.toFixed(2);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildReceiptHtml(payload: ReceiptPayload, opts?: { origin?: string }) {
  const { config, transaction } = payload;
  const clinicName = config.clinic_name || 'Pharmacy';
  const header = config.receipt_header || '';
  const footer = config.receipt_footer || '';
  const address = config.clinic_address || '';
  const phone = config.clinic_phone || '';
  const logoUrl = config.logo_url || '/logo_new.png';
  const origin = opts?.origin;
  const saleId = transaction.sale_id;
  const ref = transaction.payment_reference || `SALE-${saleId}`;
  const payloadTz = String(config?.system_timezone ?? '').trim();
  const tz = isValidIanaTimezone(payloadTz) ? payloadTz : DEFAULT_TIMEZONE;
  const ts = transaction.sale_timestamp ? formatDateTimeInTimezone(transaction.sale_timestamp, tz) : '';
  const staffName = (transaction as any).staff_name || '';
  const patientName = (transaction as any).patient_name || '';

  const itemsRows = (transaction.items || []).map((item) => {
    const qty = asNumber(item.qty);
    const unit = asNumber(item.unit_price);
    const total = asNumber(item.total_price);
    const name = item.medicine_name || item.generic_name || 'Item';
    const overrideBadge = item.is_override ? `<span class="badge">OVR</span>` : '';
    return `
      <tr class="item">
        <td class="name">
          <div class="pname">${escapeHtml(name)} ${overrideBadge}</div>
        </td>
        <td class="qty">${qty}</td>
        <td class="price">${formatMoney(unit)}</td>
        <td class="total">${formatMoney(total)}</td>
      </tr>
    `;
  }).join('');

  const totalAmount = formatMoney(transaction.total_amount);
  const paidAmount = formatMoney((transaction as any).paid_amount);
  const dueAmount = formatMoney((transaction as any).due_amount);
  const changeAmount = formatMoney((transaction as any).change_amount);
  const discountAmount = formatMoney((transaction as any).discount_amount);

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Receipt ${escapeHtml(ref)}</title>
      ${origin ? `<base href="${escapeHtml(origin)}/" />` : ''}
      <style>
        :root { --w: 80mm; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; color: #000; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .paper { width: var(--w); padding: 14px 10px 18px; }
        .logoWrap { display: flex; justify-content: center; margin: 0 0 8px; }
        img.logo { width: 44px; height: 44px; object-fit: contain; }
        h1 { margin: 0; font-size: 16px; text-align: center; letter-spacing: 0.2px; }
        .center { text-align: center; }
        .muted { color: #111; opacity: 0.85; }
        .small { font-size: 10px; }
        .meta { margin-top: 6px; font-size: 10.5px; line-height: 1.35; }
        .metaRow { display: flex; justify-content: space-between; gap: 8px; }
        .sep { border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { padding: 4px 0; vertical-align: top; }
        thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75; }
        tbody td { font-size: 11px; }
        th.name, td.name { width: 52%; padding-right: 6px; }
        th.qty, td.qty { width: 10%; text-align: right; padding-right: 4px; }
        th.price, td.price { width: 18%; text-align: right; padding-right: 4px; }
        th.total, td.total { width: 20%; text-align: right; }
        tr.item { border-top: 1px dotted rgba(0,0,0,0.25); }
        tr.item:first-child { border-top: 0; }
        .pname { font-weight: 700; line-height: 1.15; word-break: break-word; }
        .badge { display: inline-block; font-size: 9px; padding: 1px 4px; margin-left: 4px; border: 1px solid rgba(0,0,0,0.35); border-radius: 999px; opacity: 0.9; }
        .totals { margin-top: 6px; font-size: 11px; }
        .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .bold { font-weight: 800; }
        .footer { margin-top: 10px; text-align: center; font-size: 10.5px; opacity: 0.85; }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="paper">
        <div class="logoWrap">
          <img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />
        </div>
        <h1>${escapeHtml(clinicName)}</h1>
        ${header ? `<div class="center muted small">${escapeHtml(header)}</div>` : ''}
        ${address ? `<div class="center muted small">${escapeHtml(address)}</div>` : ''}
        ${phone ? `<div class="center muted small">${escapeHtml(phone)}</div>` : ''}
        <div class="sep"></div>
        <div class="meta">
          <div class="metaRow">
            <div class="muted">Receipt:</div>
            <div class="bold">${escapeHtml(ref)}</div>
          </div>
          ${ts ? `<div class="metaRow"><div class="muted">Date:</div><div>${escapeHtml(ts)}</div></div>` : ''}
          ${staffName ? `<div class="metaRow"><div class="muted">Cashier:</div><div>${escapeHtml(staffName)}</div></div>` : ''}
          ${patientName ? `<div class="metaRow"><div class="muted">Patient:</div><div>${escapeHtml(patientName)}</div></div>` : ''}
        </div>
        <div class="sep"></div>
        <table>
          <thead>
            <tr>
              <th class="name">Product</th>
              <th class="qty">Qty</th>
              <th class="price">Price</th>
              <th class="total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || '<tr><td colspan="4">No items</td></tr>'}
          </tbody>
        </table>
        <div class="sep"></div>
        <div class="totals">
          <div class="row"><span>Grand Total</span><span class="bold">${totalAmount}</span></div>
          ${discountAmount !== '0.00' ? `<div class="row"><span>Discount</span><span>${discountAmount}</span></div>` : ''}
          <div class="row"><span>Paid</span><span>${paidAmount}</span></div>
          <div class="row"><span>Amount Due</span><span>${dueAmount}</span></div>
          <div class="row"><span>Change</span><span>${changeAmount}</span></div>
        </div>
        <div class="sep"></div>
        ${footer ? `<div class="footer">${escapeHtml(footer)}</div>` : ''}
      </div>
    </body>
  </html>`;
}
