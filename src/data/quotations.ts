// CRUD for the QUOTATIONS collection. Handles snapshot-on-save and PDF URL.
// Falls back to local storage when Firebase isn't configured (demo mode).
import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { lsGet, lsSet } from '../lib/localdb';
import type { Quotation } from '../types';

const COL = () => collection(db, 'quotations');

export async function listQuotations(): Promise<Quotation[]> {
  if (!isFirebaseConfigured) {
    return lsGet<Quotation[]>('quotations', []).sort((a, b) => b.date - a.date);
  }
  const snap = await getDocs(query(COL(), orderBy('date', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quotation, 'id'>) }));
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  if (!isFirebaseConfigured) {
    return lsGet<Quotation[]>('quotations', []).find((q) => q.id === id) ?? null;
  }
  const snap = await getDoc(doc(db, 'quotations', id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Quotation, 'id'>) }) : null;
}

/**
 * Saves a quotation. The `quotation` object already contains frozen snapshots
 * of the customer + items, so later master edits never affect it.
 */
export async function saveQuotation(quotation: Quotation): Promise<void> {
  if (!isFirebaseConfigured) {
    const all = lsGet<Quotation[]>('quotations', []);
    const idx = all.findIndex((q) => q.id === quotation.id);
    const record = { ...quotation, createdAt: quotation.createdAt ?? Date.now(), updatedAt: Date.now() };
    if (idx >= 0) all[idx] = record; else all.push(record);
    lsSet('quotations', all);
    return;
  }
  const { id, ...data } = quotation;
  await setDoc(doc(db, 'quotations', id), {
    ...data,
    createdAt: data.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}

export async function attachPdf(id: string, pdfUrl: string, pdfFileName: string): Promise<void> {
  if (!isFirebaseConfigured) {
    lsSet('quotations', lsGet<Quotation[]>('quotations', []).map((q) => (q.id === id ? { ...q, pdfUrl, pdfFileName } : q)));
    return;
  }
  await updateDoc(doc(db, 'quotations', id), { pdfUrl, pdfFileName, updatedAt: Date.now() });
}

export async function deleteQuotation(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    lsSet('quotations', lsGet<Quotation[]>('quotations', []).filter((q) => q.id !== id));
    return;
  }
  await deleteDoc(doc(db, 'quotations', id));
}

/** Client-side search across number, customer name, PO number. */
export function searchQuotations(quotations: Quotation[], term: string): Quotation[] {
  const t = term.trim().toLowerCase();
  if (!t) return quotations;
  return quotations.filter((q) =>
    [q.quotationNumber, q.customer.companyName, q.poNumber ?? '']
      .some((f) => f.toLowerCase().includes(t)),
  );
}
