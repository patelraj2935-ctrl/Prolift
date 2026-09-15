// ============================================================================
// Centralized validation + input sanitizing for the whole app (India context).
//
// Two layers:
//  - *Error() functions return '' when valid (or empty & optional), else a
//    human-readable message. Used for UI feedback + submit gating.
//  - sanitize.* helpers restrict what the user can type as they type (input
//    masking), so e.g. letters never land in a phone/number field.
//
// The same rules are mirrored in firestore.rules so invalid data cannot be
// persisted even by calling the Firebase API directly (defense in depth).
// ============================================================================

// ---- Shared regexes (keep in sync with firestore.rules) --------------------
export const RE = {
  phone: /^[6-9]\d{9}$/,                 // 10-digit Indian mobile
  pincode: /^[1-9]\d{5}$/,               // 6-digit PIN
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,   // basic email shape
  gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, // 15-char GSTIN
  hsn: /^\d{4,8}$/,                       // HSN/SAC code (4-8 digits)
};

// ---- Required ---------------------------------------------------------------
/** Non-empty after trimming (rejects whitespace-only). */
export function requiredError(v: string, label = 'This field'): string {
  return v && v.trim() ? '' : `${label} is required`;
}

// ---- Formatted string fields (all optional unless marked required) ---------
export function phoneError(v: string): string {
  if (!v.trim()) return '';
  return RE.phone.test(v.replace(/\D/g, '')) ? '' : 'Phone number must be a valid 10-digit mobile';
}

export function pincodeError(v: string): string {
  if (!v.trim()) return '';
  return RE.pincode.test(v.trim()) ? '' : 'Enter a valid 6-digit PIN code';
}

export function emailError(v: string, required = false): string {
  if (!v.trim()) return required ? 'Email is required' : '';
  return RE.email.test(v.trim()) ? '' : 'Please enter a valid email address';
}

export function gstinError(v: string): string {
  if (!v.trim()) return '';
  return RE.gstin.test(v.trim().toUpperCase()) ? '' : 'Enter a valid 15-character GSTIN (uppercase)';
}

export function hsnError(v: string): string {
  if (!v.trim()) return '';
  return RE.hsn.test(v.trim()) ? '' : 'HSN must be 4-8 digits';
}

// ---- Numeric fields ---------------------------------------------------------
/** Finite number; optionally bounded. Accepts a real number (not a string). */
export function numberError(
  v: number,
  { min, max, integer, label = 'Value' }: { min?: number; max?: number; integer?: boolean; label?: string } = {},
): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return `${label} must be a valid number`;
  if (integer && !Number.isInteger(v)) return `${label} must be a whole number`;
  if (min !== undefined && v < min) return `${label} must be at least ${min}`;
  if (max !== undefined && v > max) return `${label} must be at most ${max}`;
  return '';
}

// ---- Input sanitizers (masking) --------------------------------------------
export const sanitize = {
  /** Digits only, max 10 (Indian mobile). */
  phone: (v: string) => v.replace(/\D/g, '').slice(0, 10),
  /** Digits only, max 6 (PIN). */
  pincode: (v: string) => v.replace(/\D/g, '').slice(0, 6),
  /** Uppercase alphanumeric, max 15 (GSTIN). */
  gstin: (v: string) => v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15),
  /** Digits only (unbounded) — for HSN and other integer-ish strings. */
  digits: (v: string) => v.replace(/\D/g, ''),
  /** Integer text: digits only. */
  integer: (v: string) => v.replace(/\D/g, ''),
  /** Decimal text: digits + a single dot. */
  decimal: (v: string) => {
    let s = v.replace(/[^\d.]/g, '');
    const i = s.indexOf('.');
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
    return s;
  },
};

/** Parse a sanitized numeric string to a number; '' / invalid -> fallback. */
export function toNumber(v: string, fallback = 0): number {
  if (v === '' || v === '.' || v === '-') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ---- Aggregate helpers ------------------------------------------------------
/** Validate a customer-like record; returns field -> error message. */
export function customerErrors(c: {
  companyName?: string; phone?: string; email?: string; gstin?: string; pincode?: string;
}) {
  return {
    companyName: requiredError(c.companyName ?? '', 'Company name'),
    phone: phoneError(c.phone ?? ''),
    email: emailError(c.email ?? ''),
    gstin: gstinError(c.gstin ?? ''),
    pincode: pincodeError(c.pincode ?? ''),
  };
}

/** Validate a product-like record; returns field -> error message. */
export function productErrors(p: {
  name?: string; hsn?: string; basicPrice?: number; listingPrice?: number; gstRate?: number;
}) {
  return {
    name: requiredError(p.name ?? '', 'Product name'),
    hsn: hsnError(p.hsn ?? ''),
    basicPrice: numberError(p.basicPrice ?? NaN, { min: 0, label: 'Basic price' }),
    listingPrice: numberError(p.listingPrice ?? NaN, { min: 0, label: 'Listing price' }),
    gstRate: numberError(p.gstRate ?? NaN, { min: 0, max: 100, label: 'GST rate' }),
  };
}

/** True when none of the fields have an error. */
export function hasNoErrors(errs: Record<string, string>): boolean {
  return Object.values(errs).every((e) => !e);
}
