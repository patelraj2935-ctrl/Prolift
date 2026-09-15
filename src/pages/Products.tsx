import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Product, Spec } from '../types';
import {
  listProducts, createProduct, updateProduct, deleteProduct, searchProducts,
} from '../data/products';
import { formatINR } from '../logic/calculations';
import { ProductThumb } from '../components/ProductThumb';
import { ImageCropper } from '../components/ImageCropper';
import { productErrors, hasNoErrors, sanitize } from '../logic/validation';
import { MaskedInput, NumberInput } from '../components/inputs';

const EMPTY: Omit<Product, 'id'> = {
  name: '', category: '', itemCode: '', capacity: '', hsn: '', unit: 'Nos',
  basicPrice: 0, listingPrice: 0, gstRate: 18, description: '', specifications: [], imageUrl: '',
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setProducts(await listProducts());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? Existing quotations keep their saved copy.`)) return;
    await deleteProduct(p.id);
    load();
  };

  const filtered = searchProducts(products, term);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Master</h1>
          <p className="text-sm text-slate-500">Add products once — they auto-fill on quotations.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add Product</button>
      </div>

      <input className="input mb-4 max-w-md" placeholder="Search by name, code, capacity, category…" value={term} onChange={(e) => setTerm(e.target.value)} />

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Item Code</th>
              <th className="table-th">Capacity</th>
              <th className="table-th">HSN</th>
              <th className="table-th text-right">Listing Price</th>
              <th className="table-th text-right">GST</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="table-td" colSpan={7}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td className="table-td text-slate-400" colSpan={7}>No products yet.</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">
                  <div className="flex items-center gap-2">
                    <ProductThumb src={p.imageUrl} name={p.name} size={36} />
                    <div>{p.name}<div className="text-xs font-normal text-slate-400">{p.category}</div></div>
                  </div>
                </td>
                <td className="table-td">{p.itemCode}</td>
                <td className="table-td">{p.capacity}</td>
                <td className="table-td">{p.hsn}</td>
                <td className="table-td text-right">{formatINR(p.listingPrice)}</td>
                <td className="table-td text-right">{p.gstRate}%</td>
                <td className="table-td">
                  <div className="flex justify-end gap-2">
                    <button className="text-slate-500 hover:text-brand-600" onClick={() => setEditing(p)}><Pencil size={16} /></button>
                    <button className="text-slate-500 hover:text-red-600" onClick={() => remove(p)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ initial, onClose, onSaved }: { initial: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Omit<Product, 'id'>>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  // Raw image awaiting crop (data URL). When set, the cropper modal is shown.
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | number | Spec[]) => setForm((f) => ({ ...f, [k]: v }));

  const errors = productErrors(form);
  const canSave = hasNoErrors(errors) && !busy;

  const setSpec = (i: number, key: keyof Spec, v: string) => {
    const specs = [...form.specifications];
    specs[i] = { ...specs[i], [key]: v };
    set('specifications', specs);
  };
  const addSpec = () => set('specifications', [...form.specifications, { label: '', value: '' }]);
  const removeSpec = (i: number) => set('specifications', form.specifications.filter((_, idx) => idx !== i));

  // Read the uploaded file into a data URL and open the cropper. The cropper
  // outputs the final (cropped + downscaled) data URL, which we store — so it
  // works offline (demo mode) and the hover preview shows exactly what was kept.
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-picking the same file later
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const clean = { ...form, specifications: form.specifications.filter((s) => s.label || s.value) };
    if (initial) await updateProduct(initial.id, clean);
    else await createProduct(clean);
    setBusy(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">{initial ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          <div className="col-span-2">
            <label className="label">Product Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div><label className="label">Category</label><input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
          <div><label className="label">Item Code / Model</label><input className="input" value={form.itemCode} onChange={(e) => set('itemCode', e.target.value)} /></div>
          <div><label className="label">Capacity</label><input className="input" placeholder="e.g. 2500 KG" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></div>
          <div>
            <label className="label">HSN</label>
            <MaskedInput className="input" inputMode="numeric" value={form.hsn} sanitize={sanitize.digits} onValue={(v) => set('hsn', v)} />
            {errors.hsn && <p className="mt-1 text-xs text-red-600">{errors.hsn}</p>}
          </div>
          <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={(e) => set('unit', e.target.value)} /></div>
          <div>
            <label className="label">GST Rate (%)</label>
            <NumberInput className="input" min={0} max={100} value={form.gstRate} onValue={(n) => set('gstRate', n)} />
            {errors.gstRate && <p className="mt-1 text-xs text-red-600">{errors.gstRate}</p>}
          </div>
          <div>
            <label className="label">Basic / Purchase Price <span className="text-red-500">(internal)</span></label>
            <NumberInput className="input" min={0} value={form.basicPrice} onValue={(n) => set('basicPrice', n)} />
            {errors.basicPrice && <p className="mt-1 text-xs text-red-600">{errors.basicPrice}</p>}
          </div>
          <div>
            <label className="label">Listing Price (customer)</label>
            <NumberInput className="input" min={0} value={form.listingPrice} onValue={(n) => set('listingPrice', n)} />
            {errors.listingPrice && <p className="mt-1 text-xs text-red-600">{errors.listingPrice}</p>}
          </div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>

          <div className="col-span-2">
            <label className="label">Product Image</label>
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="h-20 w-20 rounded border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-slate-300 text-center text-xs text-slate-400">No image</div>
              )}
              <div className="flex-1 space-y-2">
                <input className="input" placeholder="Paste image URL…" value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <label className="btn-secondary cursor-pointer">
                    Upload &amp; Crop
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  </label>
                  {form.imageUrl && <button type="button" className="btn-secondary" onClick={() => setCropSrc(form.imageUrl!)}>Re-crop</button>}
                  {form.imageUrl && <button type="button" className="btn-secondary" onClick={() => set('imageUrl', '')}>Remove</button>}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Product Specifications</label>
              <button type="button" className="text-sm font-semibold text-brand-600" onClick={addSpec}>+ Add spec</button>
            </div>
            {form.specifications.length === 0 && <p className="text-xs text-slate-400">No specs added. Each product can have its own specs.</p>}
            <div className="space-y-2">
              {form.specifications.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder="Label (e.g. Fork Length)" value={s.label} onChange={(e) => setSpec(i, 'label', e.target.value)} />
                  <input className="input" placeholder="Value (e.g. 1150 mm)" value={s.value} onChange={(e) => setSpec(i, 'value', e.target.value)} />
                  <button type="button" onClick={() => removeSpec(i)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t p-4">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!canSave} onClick={save}>{busy ? 'Saving…' : 'Save Product'}</button>
        </div>
      </div>

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onCropped={(dataUrl) => { set('imageUrl', dataUrl); setCropSrc(null); }}
        />
      )}
    </div>
  );
}
