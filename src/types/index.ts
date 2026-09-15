// ============================================================================
// Central data models for the whole app. Every collection maps to a type here.
// ============================================================================

/** A single product-specific specification row (e.g. "Fork Length" -> "1150 mm"). */
export interface Spec {
  label: string;
  value: string;
}

/** PRODUCT MASTER — one document in the `products` collection. */
export interface Product {
  id: string;
  name: string;
  category: string;
  itemCode: string; // model / item code
  capacity: string; // e.g. "2500 KG"
  hsn: string;
  unit: string; // e.g. "Nos", "Set"
  basicPrice: number; // INTERNAL ONLY — never shown to customer / never in PDF
  listingPrice: number; // default customer-facing rate
  gstRate: number; // percentage, e.g. 18
  description: string;
  specifications: Spec[]; // product-specific, NOT assumed identical across products
  imageUrl?: string;
  createdAt?: number;
  updatedAt?: number;
}

/** CUSTOMER MASTER — one document in the `customers` collection. */
export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * A line item INSIDE a saved quotation. This is a SNAPSHOT — copied from the
 * product master at save time so later master edits never change old quotations.
 * Note: basicPrice is deliberately NOT stored here (internal-only, never needed
 * on a saved customer quotation).
 */
export interface QuotationItem {
  productId: string; // reference back to master (for convenience only)
  name: string;
  itemCode: string;
  capacity: string;
  hsn: string;
  unit: string;
  description: string;
  specifications: Spec[];
  imageUrl?: string; // snapshot of the product image at save time
  gstRate: number;
  quantity: number;
  rate: number; // quoted rate (defaults to listingPrice, user can override)
}

/** Snapshot of the customer as it was when the quotation was saved. */
export interface CustomerSnapshot {
  customerId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
}

/** Computed money totals for a quotation. */
export interface QuotationTotals {
  taxableAmount: number; // sum of line taxable amounts (before tax, after line discount)
  totalCgst: number;
  totalSgst: number;
  totalGst: number;
  discount: number; // overall discount amount applied on taxable
  grandTotal: number; // final amount including tax
  amountInWords: string;
}

/** QUOTATION — one document in the `quotations` collection. */
export interface Quotation {
  id: string;
  quotationNumber: string; // e.g. PL-Q-000127 (auto, unique)
  date: number; // epoch ms
  poNumber?: string;
  poDate?: number;
  customer: CustomerSnapshot;
  items: QuotationItem[];
  discountType: 'none' | 'percent' | 'amount';
  discountValue: number;
  totals: QuotationTotals;
  termsSnapshot: string[]; // terms as they were at save time
  pdfUrl?: string; // Firebase Storage download URL of the generated PDF
  pdfFileName?: string;
  status: 'draft' | 'final';
  createdAt?: number;
  updatedAt?: number;
}

/** COMPANY SETTINGS — single document `companySettings/main`. */
export interface CompanySettings {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  logoUrl: string;
  bankDetails: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  jurisdiction: string;
  footer: string;
  authorisedSignatory: string;
  termsAndConditions: string[]; // default T&C lines used on new quotations
  // Configurable formats
  quotationPrefix: string; // e.g. "PL-Q-"
  quotationPadLength: number; // e.g. 6 -> 000127
  pdfFileNameTemplate: string; // e.g. "{number}-{customer}.pdf"
}
