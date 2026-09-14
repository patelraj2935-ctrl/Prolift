// ============================================================================
// Atomic quotation-number generation. Uses a Firestore transaction so two saves
// can never receive the same number (prevents duplicates).
// Falls back to a local counter when Firebase isn't configured (demo mode).
// ============================================================================
import { doc, runTransaction } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { lsGet, lsSet } from '../lib/localdb';
import type { CompanySettings } from '../types';

const SEQ_REF = () => doc(db, 'quotationSequences', 'quotation');

/**
 * Reserves and returns the next quotation number, e.g. "PL-Q-000127".
 * The counter is incremented atomically (Firestore transaction) so numbers
 * are never duplicated.
 */
export async function nextQuotationNumber(settings: CompanySettings): Promise<string> {
  let nextValue: number;

  if (!isFirebaseConfigured) {
    nextValue = lsGet<number>('quotationSeq', 0) + 1;
    lsSet('quotationSeq', nextValue);
  } else {
    const ref = SEQ_REF();
    nextValue = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? (snap.data().current as number) : 0;
      const next = current + 1;
      tx.set(ref, { current: next }, { merge: true });
      return next;
    });
  }

  const padded = String(nextValue).padStart(settings.quotationPadLength, '0');
  return `${settings.quotationPrefix}${padded}`;
}
