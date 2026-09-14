// CRUD + search for the PRODUCT MASTER (`products` collection).
// Falls back to local storage when Firebase isn't configured (demo mode).
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { lsGet, lsSet, genId } from '../lib/localdb';
import type { Product } from '../types';

const COL = () => collection(db, 'products');

export async function listProducts(): Promise<Product[]> {
  if (!isFirebaseConfigured) {
    // Preserve catalog (poster) order — seeded 1..16, then user additions appended.
    return lsGet<Product[]>('products', []);
  }
  const snap = await getDocs(query(COL(), orderBy('createdAt')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
}

export async function createProduct(p: Omit<Product, 'id'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const items = lsGet<Product[]>('products', []);
    const id = genId();
    items.push({ ...p, id, createdAt: Date.now(), updatedAt: Date.now() });
    lsSet('products', items);
    return id;
  }
  const ref = await addDoc(COL(), { ...p, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}

export async function updateProduct(id: string, p: Partial<Product>): Promise<void> {
  if (!isFirebaseConfigured) {
    const items = lsGet<Product[]>('products', []).map((it) => (it.id === id ? { ...it, ...p, updatedAt: Date.now() } : it));
    lsSet('products', items);
    return;
  }
  await updateDoc(doc(db, 'products', id), { ...p, updatedAt: Date.now() });
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    lsSet('products', lsGet<Product[]>('products', []).filter((it) => it.id !== id));
    return;
  }
  await deleteDoc(doc(db, 'products', id));
}

/**
 * Client-side fuzzy search across the searchable fields.
 * Searching "2500" matches capacity/name/code that contain "2500".
 */
export function searchProducts(products: Product[], term: string): Product[] {
  const t = term.trim().toLowerCase();
  if (!t) return products;
  return products.filter((p) =>
    [p.name, p.itemCode, p.capacity, p.category, p.hsn]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(t)),
  );
}
