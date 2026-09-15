// ============================================================================
// Field validators + input sanitizers for customer / company data (India).
// Each *Error() returns '' when valid (or empty & optional), else a message.
// The sanitize.* helpers restrict what the user can type as they type.
// ============================================================================

/** 10-digit Indian mobile (starts 6-9). Optional: empty is allowed. */
export function phoneError(v: string): string {
  if (!v.trim()) return '';
  return /^[6-9]\d{9}$/.test(v.replace(/\D/g, '')) ? '' : 'Enter a valid 10-digit mobile number';
}

/** 6-digit Indian PIN code (first digit 1-9). Optional. */
export function pincodeError(v: string): string {
  if (!v.trim()) return '';
  return /^[1-9]\d{5}$/.test(v.trim()) ? '' : 'Enter a valid 6-digit PIN code';
}

/** Basic email shape. Optional. */
export function emailError(v: string): string {
  if (!v.trim()) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address';
}

/** 15-character GSTIN (e.g. 27ABCDE1234F1Z5). Optional. */
export function gstinError(v: string): string {
  if (!v.trim()) return '';
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v.trim().toUpperCase())
    ? ''
    : 'Enter a valid 15-character GSTIN';
}

/** Restrict raw input as the user types. */
export const sanitize = {
  phone: (v: string) => v.replace(/\D/g, '').slice(0, 10),
  pincode: (v: string) => v.replace(/\D/g, '').slice(0, 6),
  gstin: (v: string) => v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15),
};

/** Validate a customer-like record; returns a map of field -> error message. */
export function customerErrors(c: { phone?: string; email?: string; gstin?: string; pincode?: string }) {
  return {
    phone: phoneError(c.phone ?? ''),
    email: emailError(c.email ?? ''),
    gstin: gstinError(c.gstin ?? ''),
    pincode: pincodeError(c.pincode ?? ''),
  };
}

/** True when none of the fields have an error. */
export function hasNoErrors(errs: Record<string, string>): boolean {
  return Object.values(errs).every((e) => !e);
}
