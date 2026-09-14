// CRUD + search for the CUSTOMER MASTER (`customers` collection).
// Falls back to local storage when Firebase isn't configured (demo mode).
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { lsGet, lsSet, genId, seedCustomers } from '../lib/localdb';
import type { Customer } from '../types';

const COL = () => collection(db, 'customers');

export async function listCustomers(): Promise<Customer[]> {
  if (!isFirebaseConfigured) {
    return lsGet<Customer[]>('customers', []).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }
  let snap = await getDocs(query(COL(), orderBy('companyName')));
  if (snap.empty) {
    try {
      await Promise.all(
        seedCustomers.map((c) =>
          addDoc(COL(), { ...c, createdAt: Date.now(), updatedAt: Date.now() })
        )
      );
      snap = await getDocs(query(COL(), orderBy('companyName')));
    } catch (err) {
      console.warn('Auto-seeding Firestore customers failed:', err);
    }
  }
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Customer, 'id'>) }));
}

export async function createCustomer(c: Omit<Customer, 'id'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const items = lsGet<Customer[]>('customers', []);
    const id = genId();
    items.push({ ...c, id, createdAt: Date.now(), updatedAt: Date.now() });
    lsSet('customers', items);
    return id;
  }
  const ref = await addDoc(COL(), { ...c, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}

export async function updateCustomer(id: string, c: Partial<Customer>): Promise<void> {
  if (!isFirebaseConfigured) {
    const items = lsGet<Customer[]>('customers', []).map((it) => (it.id === id ? { ...it, ...c, updatedAt: Date.now() } : it));
    lsSet('customers', items);
    return;
  }
  await updateDoc(doc(db, 'customers', id), { ...c, updatedAt: Date.now() });
}

export async function deleteCustomer(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    lsSet('customers', lsGet<Customer[]>('customers', []).filter((it) => it.id !== id));
    return;
  }
  await deleteDoc(doc(db, 'customers', id));
}

/** Search across company name, contact, phone, city, GSTIN. */
export function searchCustomers(customers: Customer[], term: string): Customer[] {
  const t = term.trim().toLowerCase();
  if (!t) return customers;
  return customers.filter((c) =>
    [c.companyName, c.contactPerson, c.phone, c.city, c.gstin, c.email]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(t)),
  );
}
