// Builds the dynamic PDF filename from a configurable template.
// Template tokens: {number}, {customer}, {date}
import type { CompanySettings, Quotation } from '../types';

function slug(text: string): string {
  return (text || 'Customer')
    .replace(/[^a-zA-Z0-9]+/g, '-') // non-alphanumerics -> dash
    .replace(/^-+|-+$/g, '')        // trim dashes
    .slice(0, 40) || 'Customer';
}

export function buildPdfFileName(q: Quotation, settings: CompanySettings): string {
  const dateStr = new Date(q.date).toISOString().slice(0, 10);
  const name = (settings.pdfFileNameTemplate || '{number}-{customer}.pdf')
    .replace('{number}', q.quotationNumber)
    .replace('{customer}', slug(q.customer.companyName))
    .replace('{date}', dateStr);
  return name.endsWith('.pdf') ? name : `${name}.pdf`;
}
