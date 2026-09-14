// ============================================================================
// Builds a pdfmake document definition for the branded quotation, modelled on
// the West India Forklift Services sample: header + QUOTATION bar, a 3-part
// Billing / Details / Shipping box, a fully-bordered items table (HSN under the
// item code, CGST/SGST shown as rate + amount), a totals block with amount in
// words, terms, and a signature/jurisdiction footer. Monochrome (black/gray/
// white). Pure data-in / definition-out — all company info comes from settings.
// ============================================================================
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import type { CompanySettings, Quotation } from '../types';
import { lineBreakdown, discountFactorFor, formatNum } from '../logic/calculations';

const INK = '#111827';      // near-black text + borders
const MUTE = '#6b7280';     // gray secondary text
const BORDER = '#111827';   // thin black table lines (like the sample)
const HEADFILL = '#f3f4f6'; // light-gray header row
const MIN_ROWS = 4;         // small cushion only — no big block of empty lines

/** Shared fully-bordered table layout with tight padding. */
const bordered = {
  hLineColor: () => BORDER,
  vLineColor: () => BORDER,
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  paddingLeft: () => 3,
  paddingRight: () => 3,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

function fmtDate(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function buildDocDefinition(
  q: Quotation,
  settings: CompanySettings,
  logoDataUrl?: string,
): TDocumentDefinitions {
  const factor = discountFactorFor({
    items: q.items, discountType: q.discountType, discountValue: q.discountValue,
  });

  // ---- Letterhead ---- (name, tagline, address + phone)
  const addressLine = [
    settings.address || '',
    settings.phone ? `Phone: ${settings.phone}` : '',
  ].filter(Boolean).join('.  ');
  const companyStack: Content[] = [
    { text: settings.companyName, style: 'company' },
    settings.tagline ? { text: settings.tagline, style: 'tagline' } : { text: '' },
    addressLine ? { text: addressLine, style: 'cmeta' } : { text: '' },
  ];
  const header: Content = logoDataUrl
    ? {
      columns: [
        { width: '*', stack: companyStack },
        { image: logoDataUrl, width: 70, fit: [70, 70], alignment: 'right' },
      ],
      columnGap: 8,
    }
    : { stack: companyStack };

  // Email + GSTIN line framed by a rule above and below (matches the sample).
  // GSTIN value is bold.
  const contactBar: Content = {
    table: {
      widths: ['*', 'auto'],
      body: [[
        { text: settings.email ? `Email : ${settings.email}` : '', style: 'cmeta', border: [false, true, false, true], margin: [0, 1, 0, 1] },
        { text: [{ text: 'GSTIN : ' }, { text: settings.gstin || '', bold: true }], style: 'cmeta', alignment: 'right', border: [false, true, false, true], margin: [0, 1, 0, 1] },
      ]],
    },
    layout: { hLineColor: () => INK, hLineWidth: () => 1, vLineWidth: () => 0, paddingTop: () => 1, paddingBottom: () => 1 },
    margin: [0, 3, 0, 0],
  };

  // ---- QUOTATION title bar ----
  const titleBar: Content = {
    table: { widths: ['*'], body: [[{ text: 'QUOTATION', style: 'title', border: [false, false, false, true] }]] },
    layout: { hLineColor: () => INK, hLineWidth: () => 0.8, vLineWidth: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
    margin: [0, 6, 0, 8],
  };

  // ---- Billing / Details / Shipping ----
  const cityState = [q.customer.city, q.customer.state].filter(Boolean).join(', ');
  const billCell: TableCell = {
    stack: [
      { text: 'Billing Address:', style: 'metaLabel' },
      { text: q.customer.companyName, bold: true },
      { text: q.customer.billingAddress || '' },
      cityState ? { text: cityState } : { text: '' },
      q.customer.gstin ? { text: `GSTIN: ${q.customer.gstin}` } : { text: '' },
    ],
    style: 'meta',
  };
  const detailCell: TableCell = {
    stack: [
      { text: [{ text: 'Quote No : ', bold: true }, q.quotationNumber] },
      { text: [{ text: 'Date : ', bold: true }, fmtDate(q.date)] },
      { text: [{ text: 'P.O. No. : ', bold: true }, q.poNumber || ''] },
      { text: [{ text: 'P.O. Date : ', bold: true }, fmtDate(q.poDate)] },
      { text: [{ text: 'Cust. GSTIN : ', bold: true }, q.customer.gstin || ''] },
    ],
    style: 'meta',
  };
  const shipCell: TableCell = {
    stack: [
      { text: 'Shipping Address:', style: 'metaLabel' },
      { text: q.customer.companyName, bold: true },
      { text: q.customer.shippingAddress || q.customer.billingAddress || '' },
      cityState ? { text: cityState } : { text: '' },
    ],
    style: 'meta',
  };
  const metaTable: Content = {
    table: { widths: ['34%', '32%', '34%'], body: [[billCell, detailCell, shipCell]] },
    layout: bordered,
  };

  // ---- Items table ----
  const headRow: TableCell[] = [
    'Sr. No.', 'Perticuler / Item Code', 'Description', 'Qty / Nos.',
    'Unit rate In Rs.', 'Taxable amount in Rs.', 'CGST', 'SGST', 'Amount Including tax',
  ].map((t, i) => ({ text: t, style: 'th', alignment: i >= 3 ? 'right' : 'left' }));

  const dataRows: TableCell[][] = q.items.map((it, i) => {
    const b = lineBreakdown(it, factor);
    const half = it.gstRate / 2;
    return [
      { text: String(i + 1), style: 'td', alignment: 'center' },
      {
        stack: [
          { text: it.name, bold: true },
          it.itemCode ? { text: it.itemCode } : { text: '' },
          { text: `HSN: ${it.hsn}`, style: 'muted' },
        ],
        style: 'td',
      },
      {
        stack: [
          { text: it.description || '' },
          ...(it.specifications?.slice(0, 4).map((s) => ({ text: `• ${s.label}: ${s.value}` })) ?? []),
        ],
        style: 'td',
      },
      { text: `${it.quantity} ${it.unit}`, style: 'td', alignment: 'right' },
      { text: formatNum(it.rate), style: 'td', alignment: 'right' },
      { text: formatNum(b.taxable), style: 'td', alignment: 'right' },
      { stack: [{ text: `${half}%`, style: 'muted' }, { text: formatNum(b.cgst) }], style: 'td', alignment: 'right' },
      { stack: [{ text: `${half}%`, style: 'muted' }, { text: formatNum(b.sgst) }], style: 'td', alignment: 'right' },
      { text: formatNum(b.amountInclTax), style: 'td', alignment: 'right' },
    ];
  });

  // Pad short quotes with just a couple of blank rows for balance — but never the
  // big block of empty lines we had before (only fill up to MIN_ROWS total).
  const fillerRows: TableCell[][] = [];
  for (let i = dataRows.length; i < MIN_ROWS; i++) {
    fillerRows.push(Array.from({ length: 9 }, () => ({ text: ' ', style: 'td' })));
  }

  const itemsTable: Content = {
    table: {
      headerRows: 1,
      widths: ['5%', '17%', '23%', '8%', '11%', '12%', '7%', '7%', '10%'],
      body: [headRow, ...dataRows, ...fillerRows],
    },
    layout: { ...bordered, fillColor: (rowIndex: number) => (rowIndex === 0 ? HEADFILL : null) },
    margin: [0, 8, 0, 0],
  };

  // ---- Totals + amount in words ----
  const rates = new Set(q.items.map((it) => it.gstRate));
  const half = rates.size === 1 ? [...rates][0] / 2 : null;
  const totRows: TableCell[][] = [];
  if (q.totals.discount > 0) {
    totRows.push([{ text: 'Discount', style: 'tl' }, { text: `- ${formatNum(q.totals.discount)}`, style: 'tv' }]);
  }
  totRows.push([{ text: 'Total Amt. W/o Tax', style: 'tl' }, { text: formatNum(q.totals.taxableAmount), style: 'tv' }]);
  totRows.push([{ text: `Total CGST${half != null ? ` ${half} %` : ''}`, style: 'tl' }, { text: formatNum(q.totals.totalCgst), style: 'tv' }]);
  totRows.push([{ text: `Total SGST${half != null ? ` ${half} %` : ''}`, style: 'tl' }, { text: formatNum(q.totals.totalSgst), style: 'tv' }]);
  totRows.push([
    { text: 'Total Amount including Tax', bold: true, margin: [3, 2, 3, 2] },
    { text: formatNum(q.totals.grandTotal), bold: true, alignment: 'right', margin: [3, 2, 3, 2] },
  ]);

  const summary: Content = {
    columns: [
      {
        width: '*',
        table: { widths: ['*'], body: [[{ text: [{ text: 'Amount in Words : ', bold: true }, q.totals.amountInWords], style: 'words' }]] },
        layout: bordered,
      },
      {
        width: 'auto',
        table: { widths: ['*', 'auto'], body: totRows },
        layout: bordered,
      },
    ],
    columnGap: 0,
    margin: [0, -0.6, 0, 0], // butt up against the items table
  };

  // ---- Terms ----
  const terms: Content = {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'Terms & conditions:', bold: true, margin: [0, 0, 0, 2] },
          ...q.termsSnapshot.map((t) => ({ text: t, style: 'term' })),
          ...(settings.bankDetails ? [{ text: `Bank Details: ${settings.bankDetails}`, style: 'term', margin: [0, 4, 0, 0] as [number, number, number, number] }] : []),
        ],
        margin: [4, 4, 4, 4],
      }]],
    },
    layout: bordered,
    margin: [0, 8, 0, 0],
  };

  // ---- Signature ----
  const signature: Content = {
    columns: [
      { width: '*', text: 'E. & O.E.', style: 'metaLabel', margin: [0, 28, 0, 0] },
      {
        width: '*',
        alignment: 'right',
        stack: [
          { text: `For ${settings.companyName}`, bold: true },
          { text: '\n\n\n' },
          { text: settings.authorisedSignatory || 'Authorised Signatory' },
        ],
      },
    ],
    margin: [0, 10, 0, 0],
  };

  return {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 42],
    info: { title: q.quotationNumber, author: settings.companyName },
    content: [header, contactBar, titleBar, metaTable, itemsTable, summary, terms, signature],
    footer: (): Content => ({
      columns: [
        { text: settings.jurisdiction || '', style: 'foot', alignment: 'left' },
        { text: 'This is a computer Generated Invoice', style: 'foot', alignment: 'center' },
        {
          text: settings.footer && settings.footer !== 'This is a computer Generated Invoice' ? settings.footer : '',
          style: 'foot',
          alignment: 'right',
        },
      ],
      margin: [28, 6, 28, 0],
    }),
    defaultStyle: { fontSize: 8.5, color: INK, lineHeight: 1.15 },
    styles: {
      company: { fontSize: 19, bold: true, color: INK, characterSpacing: 0.4 },
      tagline: { fontSize: 7.5, color: MUTE, margin: [0, 1, 0, 0], lineHeight: 1.01 },
      cmeta: { fontSize: 8, color: '#374151', margin: [0, 1, 0, 0], lineHeight: 1.01 },
      title: { fontSize: 12.5, bold: true, alignment: 'center', characterSpacing: 4, color: INK },
      meta: { fontSize: 8, lineHeight: 1.35, color: INK },
      metaLabel: { fontSize: 7.5, bold: true, characterSpacing: 0.3, color: MUTE },
      th: { fontSize: 7.5, bold: true, color: INK, characterSpacing: 0.2 },
      td: { fontSize: 8, color: INK, lineHeight: 1.15 },
      muted: { fontSize: 7, color: MUTE },
      tl: { fontSize: 8, margin: [3, 1.5, 3, 1.5], color: '#374151' },
      tv: { fontSize: 8, alignment: 'right', margin: [3, 1.5, 3, 1.5] },
      words: { fontSize: 8, margin: [4, 4, 4, 4] },
      term: { fontSize: 7.5, margin: [0, 0, 0, 1.5], lineHeight: 1.3, color: '#374151' },
      foot: { fontSize: 7, color: MUTE, characterSpacing: 0.2 },
    },
  };
}
