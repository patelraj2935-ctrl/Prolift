// ============================================================================
// Pure quotation math. No Firebase, no React — just numbers in, numbers out.
// This keeps tax/total logic testable and separate from UI.
// ============================================================================
import type { QuotationItem, QuotationTotals } from '../types';
import { amountToWords } from './numberToWords';

/** Round to 2 decimals safely. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Taxable amount for a single line = rate * quantity (before tax). */
export function lineTaxable(item: QuotationItem): number {
  return round2(item.rate * item.quantity);
}

/** GST amount for a single line (total GST, split CGST/SGST later). */
export function lineGst(item: QuotationItem, taxableAfterDiscount: number): number {
  return round2((taxableAfterDiscount * item.gstRate) / 100);
}

export interface CalcInput {
  items: QuotationItem[];
  discountType: 'none' | 'percent' | 'amount';
  discountValue: number;
}

/**
 * Computes all totals for a quotation.
 * Discount is applied on the overall taxable amount, distributed proportionally
 * across lines so each line's GST is computed on its discounted taxable value.
 */
export function computeTotals({ items, discountType, discountValue }: CalcInput): QuotationTotals {
  const grossTaxable = round2(items.reduce((sum, it) => sum + lineTaxable(it), 0));

  // Determine overall discount amount on the taxable value.
  let discount = 0;
  if (discountType === 'percent') discount = round2((grossTaxable * discountValue) / 100);
  else if (discountType === 'amount') discount = round2(discountValue);
  if (discount > grossTaxable) discount = grossTaxable;

  const discountFactor = grossTaxable > 0 ? (grossTaxable - discount) / grossTaxable : 1;

  let totalGst = 0;
  let taxableAmount = 0;
  for (const it of items) {
    const lineTax = round2(lineTaxable(it) * discountFactor);
    taxableAmount = round2(taxableAmount + lineTax);
    totalGst = round2(totalGst + lineGst(it, lineTax));
  }

  const totalCgst = round2(totalGst / 2);
  const totalSgst = round2(totalGst - totalCgst); // avoids rounding drift
  const grandTotal = round2(taxableAmount + totalGst);

  return {
    taxableAmount,
    totalCgst,
    totalSgst,
    totalGst,
    discount,
    grandTotal,
    amountInWords: amountToWords(grandTotal),
  };
}

/** Per-line values used when rendering the PDF/preview table. */
export function lineBreakdown(item: QuotationItem, discountFactor = 1) {
  const taxable = round2(lineTaxable(item) * discountFactor);
  const gst = round2((taxable * item.gstRate) / 100);
  const cgst = round2(gst / 2);
  const sgst = round2(gst - cgst);
  return {
    taxable,
    cgst,
    sgst,
    amountInclTax: round2(taxable + gst),
  };
}

/** The proportional discount factor (shared by preview + PDF so lines match totals). */
export function discountFactorFor({ items, discountType, discountValue }: CalcInput): number {
  const grossTaxable = round2(items.reduce((sum, it) => sum + lineTaxable(it), 0));
  let discount = 0;
  if (discountType === 'percent') discount = round2((grossTaxable * discountValue) / 100);
  else if (discountType === 'amount') discount = round2(discountValue);
  if (discount > grossTaxable) discount = grossTaxable;
  return grossTaxable > 0 ? (grossTaxable - discount) / grossTaxable : 1;
}

export const formatINR = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n || 0);

export const formatNum = (n: number): string =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
