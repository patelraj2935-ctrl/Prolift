import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Customer } from '../types';
import {
  listCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers,
} from '../data/customers';
import { customerErrors, hasNoErrors, sanitize } from '../logic/validation';
import { MaskedInput } from '../components/inputs';

const EMPTY: Omit<Customer, 'id'> = {
  companyName: '', contactPerson: '', phone: '', email: '', gstin: '',
  billingAddress: '', shippingAddress: '', city: '', state: '', pincode: '', notes: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); setCustomers(await listCustomers()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const remove = async (c: Customer) => {
    if (!confirm(`Delete "${c.companyName}"? Existing quotations keep their saved copy.`)) return;
    await deleteCustomer(c.id);
    load();
  };

  const filtered = searchCustomers(customers, term);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Master</h1>
          <p className="text-sm text-slate-500">Add customers once — they auto-fill on quotations.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add Customer</button>
      </div>

      <input className="input mb-4 max-w-md" placeholder="Search by company, contact, phone, city, GSTIN…" value={term} onChange={(e) => setTerm(e.target.value)} />

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Company</th>
              <th className="table-th">Contact</th>
              <th className="table-th">Phone</th>
              <th className="table-th">City</th>
              <th className="table-th">GSTIN</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="table-td" colSpan={6}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td className="table-td text-slate-400" colSpan={6}>No customers yet.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">{c.companyName}</td>
                <td className="table-td">{c.contactPerson}</td>
                <td className="table-td">{c.phone}</td>
                <td className="table-td">{c.city}</td>
                <td className="table-td">{c.gstin}</td>
                <td className="table-td">
                  <div className="flex justify-end gap-2">
                    <button className="text-slate-500 hover:text-brand-600" onClick={() => setEditing(c)}><Pencil size={16} /></button>
                    <button className="text-slate-500 hover:text-red-600" onClick={() => remove(c)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CustomerForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function CustomerForm({ initial, onClose, onSaved }: { initial: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Omit<Customer, 'id'>>(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const errors = useMemo(() => customerErrors(form), [form]);
  const canSave = !!form.companyName.trim() && hasNoErrors(errors) && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    if (initial) await updateCustomer(initial.id, form);
    else await createCustomer(form);
    setBusy(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">{initial ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          <div className="col-span-2">
            <label className="label">Company Name *</label>
            <input className="input" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>}
          </div>
          <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} /></div>
          <div>
            <label className="label">Phone</label>
            <MaskedInput className="input" inputMode="numeric" placeholder="10-digit mobile" value={form.phone} sanitize={sanitize.phone} onValue={(v) => set('phone', v)} />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
          <div>
            <label className="label">GSTIN</label>
            <MaskedInput className="input uppercase" placeholder="27ABCDE1234F1Z5" value={form.gstin} sanitize={sanitize.gstin} onValue={(v) => set('gstin', v)} />
            {errors.gstin && <p className="mt-1 text-xs text-red-600">{errors.gstin}</p>}
          </div>
          <div className="col-span-2"><label className="label">Billing Address</label><textarea className="input" rows={2} value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Shipping Address</label><textarea className="input" rows={2} value={form.shippingAddress} onChange={(e) => set('shippingAddress', e.target.value)} /></div>
          <div><label className="label">City</label><input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className="label">State</label><input className="input" value={form.state} onChange={(e) => set('state', e.target.value)} /></div>
          <div>
            <label className="label">PIN Code</label>
            <MaskedInput className="input" inputMode="numeric" placeholder="6-digit PIN" value={form.pincode} sanitize={sanitize.pincode} onValue={(v) => set('pincode', v)} />
            {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
          </div>
          <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 border-t p-4">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!canSave} onClick={save}>{busy ? 'Saving…' : 'Save Customer'}</button>
        </div>
      </div>
    </div>
  );
}
