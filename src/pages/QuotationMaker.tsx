// ============================================================================
// The heart of the app. Fast flow:
// search customer -> auto-fill -> search product -> auto-fill -> qty -> price ->
// totals -> save (auto number + snapshot) -> generate & store PDF.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Trash2, FileDown, Save } from 'lucide-react';
import type {
  Customer, Product, Quotation, QuotationItem, CustomerSnapshot, CompanySettings,
} from '../types';
import { SearchSelect } from '../components/SearchSelect';
import { ProductThumb } from '../components/ProductThumb';
import { listProducts, searchProducts } from '../data/products';
import { listCustomers, searchCustomers, createCustomer } from '../data/customers';
import { getSettings } from '../data/settings';
import { nextQuotationNumber } from '../data/sequences';
import { saveQuotation, getQuotation, attachPdf } from '../data/quotations';
import { computeTotals, formatINR, formatNum } from '../logic/calculations';
import { renderPdfBlob, downloadBlob, uploadPdf } from '../pdf/generatePdf';
import { buildPdfFileName } from '../pdf/filename';
import { isFirebaseConfigured } from '../lib/firebase';
import { customerErrors, hasNoErrors, sanitize } from '../logic/validation';
import { lsGet, lsSet } from '../lib/localdb';
import { MaskedInput, NumberInput } from '../components/inputs';

// Auto-saved draft of an in-progress NEW quotation, so navigating away and back
// doesn't lose typed data. Cleared once the quotation is saved.
const DRAFT_KEY = 'quotationDraft';
type QuotationDraft = {
  customer: CustomerSnapshot | null;
  items: QuotationItem[];
  poNumber: string;
  poDate: string;
  discountType: 'none' | 'percent' | 'amount';
  discountValue: number;
};

function toSnapshot(c: Customer): CustomerSnapshot {
  return {
    customerId: c.id, companyName: c.companyName, contactPerson: c.contactPerson,
    phone: c.phone, email: c.email, gstin: c.gstin, billingAddress: c.billingAddress,
    shippingAddress: c.shippingAddress, city: c.city, state: c.state, pincode: c.pincode,
  };
}

const EMPTY_CUSTOMER: Omit<Customer, 'id'> = {
  companyName: '', contactPerson: '', phone: '', email: '', gstin: '',
  billingAddress: '', shippingAddress: '', city: '', state: '', pincode: '', notes: '',
};

function productToItem(p: Product): QuotationItem {
  return {
    productId: p.id, name: p.name, itemCode: p.itemCode, capacity: p.capacity,
    hsn: p.hsn, unit: p.unit, description: p.description, specifications: p.specifications,
    imageUrl: p.imageUrl, gstRate: p.gstRate, quantity: 1, rate: p.listingPrice, // rate defaults to listing price
  };
}

export default function QuotationMaker() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const duplicateFrom = (location.state as { duplicateFrom?: Quotation } | null)?.duplicateFrom;

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  const [customer, setCustomer] = useState<CustomerSnapshot | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [existing, setExisting] = useState<Quotation | null>(null);
  const [busy, setBusy] = useState<'' | 'saving' | 'pdf'>('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // true once initial load/restore done
  const [draftRestored, setDraftRestored] = useState(false);

  // PDF preview modal (shown after "Generate PDF", before downloading).
  const [preview, setPreview] = useState<{ url: string; blob: Blob; fileName: string } | null>(null);

  // Inline "new customer" creation, right on the quotation page.
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCust, setNewCust] = useState<Omit<Customer, 'id'>>(EMPTY_CUSTOMER);

  const newCustErrors = customerErrors(newCust);
  const canSaveNewCust = !!newCust.companyName.trim() && hasNoErrors(newCustErrors);

  const saveNewCustomer = async () => {
    if (!canSaveNewCust) return;
    const record = { ...newCust, shippingAddress: newCust.shippingAddress || newCust.billingAddress };
    const newId = await createCustomer(record);
    const full: Customer = { ...record, id: newId };
    setCustomers((prev) => [...prev, full].sort((a, b) => a.companyName.localeCompare(b.companyName)));
    setCustomer(toSnapshot(full)); // auto-select it into this quotation
    setShowNewCust(false);
    setNewCust(EMPTY_CUSTOMER);
  };

  // Load master data + settings, and any existing/duplicated quotation.
  useEffect(() => {
    (async () => {
      const [p, c, s] = await Promise.all([listProducts(), listCustomers(), getSettings()]);
      setProducts(p); setCustomers(c); setSettings(s);

      const source = id ? await getQuotation(id) : null;
      const seed = source ?? duplicateFrom ?? null;
      if (source) setExisting(source);
      if (seed) {
        setCustomer(seed.customer);
        setItems(seed.items);
        setDiscountType(seed.discountType);
        setDiscountValue(seed.discountValue);
        if (source) { setPoNumber(seed.poNumber ?? ''); setPoDate(seed.poDate ? new Date(seed.poDate).toISOString().slice(0, 10) : ''); }
      } else {
        // Brand-new quotation: restore an auto-saved draft if one exists.
        const draft = lsGet<QuotationDraft | null>(DRAFT_KEY, null);
        if (draft && (draft.customer || draft.items?.length)) {
          setCustomer(draft.customer);
          setItems(draft.items ?? []);
          setPoNumber(draft.poNumber ?? '');
          setPoDate(draft.poDate ?? '');
          setDiscountType(draft.discountType ?? 'none');
          setDiscountValue(draft.discountValue ?? 0);
          setDraftRestored(true);
        }
      }
      setHydrated(true);
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save the draft as the user edits a NEW (not-yet-saved) quotation.
  useEffect(() => {
    if (!hydrated || id || existing) return; // only for a fresh, unsaved quotation
    lsSet<QuotationDraft>(DRAFT_KEY, { customer, items, poNumber, poDate, discountType, discountValue });
  }, [hydrated, id, existing, customer, items, poNumber, poDate, discountType, discountValue]);

  const clearDraft = () => { lsSet<QuotationDraft | null>(DRAFT_KEY, null); setDraftRestored(false); };

  const totals = useMemo(
    () => computeTotals({ items, discountType, discountValue }),
    [items, discountType, discountValue],
  );

  const addProduct = (p: Product) => setItems((prev) => [...prev, productToItem(p)]);
  const updateItem = (i: number, patch: Partial<QuotationItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const buildQuotation = async (): Promise<Quotation> => {
    if (!settings) throw new Error('Settings not loaded');
    const number = existing ? existing.quotationNumber : await nextQuotationNumber(settings);
    const quotationId = existing?.id ?? crypto.randomUUID();
    return {
      id: quotationId,
      quotationNumber: number,
      date: existing?.date ?? Date.now(),
      poNumber: poNumber || undefined,
      poDate: poDate ? new Date(poDate).getTime() : undefined,
      customer: customer!,
      items,
      discountType,
      discountValue,
      totals,
      termsSnapshot: settings.termsAndConditions,
      status: 'final',
      pdfUrl: existing?.pdfUrl,
      pdfFileName: existing?.pdfFileName,
      createdAt: existing?.createdAt,
    };
  };

  const canSave = customer && items.length > 0 && !busy;

  const save = async (): Promise<Quotation | null> => {
    if (!canSave) return null;
    setBusy('saving');
    try {
      const q = await buildQuotation();
      await saveQuotation(q);
      setExisting(q);
      setSavedId(q.id);
      lsSet<QuotationDraft | null>(DRAFT_KEY, null); // saved — draft no longer needed
      setDraftRestored(false);
      return q;
    } catch (err) {
      console.error('Save failed:', err);
      alert('Could not save quotation: ' + (err instanceof Error ? err.message : String(err)));
      return null;
    } finally {
      setBusy('');
    }
  };

  // Render the PDF, download it directly, and show it in a preview modal.
  const saveAndPdf = async () => {
    const q = (await save()) ?? existing;
    if (!q || !settings) return;
    setBusy('pdf');
    try {
      const blob = await renderPdfBlob(q, settings);
      const fileName = buildPdfFileName(q, settings);

      // Trigger immediate browser download
      downloadBlob(blob, fileName);

      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(blob), blob, fileName });

      if (isFirebaseConfigured) {
        try {
          const downloadUrl = await uploadPdf(blob, fileName);
          await attachPdf(q.id, downloadUrl, fileName);
        } catch (err) {
          console.warn('Firebase Storage upload skipped/not enabled:', err);
        }
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Could not generate PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy('');
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  if (!settings) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{existing ? `Edit ${existing.quotationNumber}` : 'New Quotation'}</h1>
          <p className="text-sm text-slate-500">Search, select, set quantity, generate — under a minute.</p>
        </div>
        {savedId && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Saved</span>}
      </div>

      {draftRestored && !savedId && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <span>↩︎ Restored your unsaved draft.</span>
          <button className="font-semibold underline" onClick={() => { clearDraft(); setCustomer(null); setItems([]); setPoNumber(''); setPoDate(''); setDiscountType('none'); setDiscountValue(0); }}>Start blank</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* LEFT: customer + products */}
        <div className="space-y-5 lg:col-span-2">
          {/* Customer */}
          <div className="card">
            <label className="label">Customer</label>
            {!customer ? (
              showNewCust ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input className="input sm:col-span-2" placeholder="Company name *" value={newCust.companyName} onChange={(e) => setNewCust({ ...newCust, companyName: e.target.value })} autoFocus />
                    <input className="input" placeholder="Contact person" value={newCust.contactPerson} onChange={(e) => setNewCust({ ...newCust, contactPerson: e.target.value })} />
                    <div>
                      <MaskedInput className="input w-full" inputMode="numeric" placeholder="Phone (10-digit)" value={newCust.phone} sanitize={sanitize.phone} onValue={(v) => setNewCust({ ...newCust, phone: v })} />
                      {newCustErrors.phone && <p className="mt-1 text-xs text-red-600">{newCustErrors.phone}</p>}
                    </div>
                    <div>
                      <input className="input w-full" type="email" placeholder="Email" value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} />
                      {newCustErrors.email && <p className="mt-1 text-xs text-red-600">{newCustErrors.email}</p>}
                    </div>
                    <div>
                      <MaskedInput className="input w-full uppercase" placeholder="GSTIN" value={newCust.gstin} sanitize={sanitize.gstin} onValue={(v) => setNewCust({ ...newCust, gstin: v })} />
                      {newCustErrors.gstin && <p className="mt-1 text-xs text-red-600">{newCustErrors.gstin}</p>}
                    </div>
                    <input className="input sm:col-span-2" placeholder="Billing address" value={newCust.billingAddress} onChange={(e) => setNewCust({ ...newCust, billingAddress: e.target.value })} />
                    <input className="input" placeholder="City" value={newCust.city} onChange={(e) => setNewCust({ ...newCust, city: e.target.value })} />
                    <input className="input" placeholder="State" value={newCust.state} onChange={(e) => setNewCust({ ...newCust, state: e.target.value })} />
                    <div>
                      <MaskedInput className="input w-full" inputMode="numeric" placeholder="PIN Code (6-digit)" value={newCust.pincode} sanitize={sanitize.pincode} onValue={(v) => setNewCust({ ...newCust, pincode: v })} />
                      {newCustErrors.pincode && <p className="mt-1 text-xs text-red-600">{newCustErrors.pincode}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" disabled={!canSaveNewCust} onClick={saveNewCustomer}>Save &amp; Use</button>
                    <button className="btn-secondary" onClick={() => { setShowNewCust(false); setNewCust(EMPTY_CUSTOMER); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <SearchSelect
                    items={customers}
                    placeholder="Search customer by name, phone, city, GSTIN…"
                    filter={searchCustomers}
                    getKey={(c) => c.id}
                    onSelect={(c) => setCustomer(toSnapshot(c))}
                    renderItem={(c) => (
                      <div>
                        <div className="font-medium">{c.companyName}</div>
                        <div className="text-xs text-slate-400">{[c.contactPerson, c.city, c.phone].filter(Boolean).join(' · ')}</div>
                      </div>
                    )}
                  />
                  <button className="text-sm font-medium text-brand-600" onClick={() => setShowNewCust(true)}>+ New Customer</button>
                </div>
              )
            ) : (
              <div className="flex items-start justify-between rounded-lg bg-slate-50 p-3">
                <div className="text-sm">
                  <div className="font-semibold">{customer.companyName}</div>
                  <div className="text-slate-500">{customer.billingAddress}</div>
                  <div className="text-slate-500">{[customer.city, customer.state].filter(Boolean).join(', ')}</div>
                  {customer.gstin && <div className="text-slate-500">GSTIN: {customer.gstin}</div>}
                </div>
                <button className="text-sm text-brand-600" onClick={() => setCustomer(null)}>Change</button>
              </div>
            )}
          </div>

          {/* Product search */}
          <div className="card">
            <label className="label">Add Product</label>
            <SearchSelect
              items={products}
              placeholder='Search product — try "2500", item code, category…'
              filter={searchProducts}
              getKey={(p) => p.id}
              onSelect={addProduct}
              renderItem={(p) => (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ProductThumb src={p.imageUrl} name={p.name} size={36} />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-400">{[p.itemCode, p.capacity, p.category].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{formatINR(p.listingPrice)}</div>
                </div>
              )}
            />

            {/* Line items */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th w-20">Qty</th>
                    <th className="table-th w-32 text-right">Rate</th>
                    <th className="table-th w-32 text-right">Taxable</th>
                    <th className="table-th w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && <tr><td className="table-td text-slate-400" colSpan={5}>No products added yet.</td></tr>}
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <ProductThumb src={it.imageUrl} name={it.name} size={40} />
                          <div>
                            <div className="font-medium">{it.name}</div>
                            <div className="text-xs text-slate-400">{[it.itemCode, it.capacity].filter(Boolean).join(' · ')} · GST {it.gstRate}%</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <NumberInput className="input py-1" allowDecimal={false} min={1} value={it.quantity} onValue={(n) => updateItem(i, { quantity: Math.max(1, n) })} />
                      </td>
                      <td className="table-td">
                        <NumberInput className="input py-1 text-right" min={0} value={it.rate} onValue={(n) => updateItem(i, { rate: n })} />
                      </td>
                      <td className="table-td text-right">{formatNum(it.rate * it.quantity)}</td>
                      <td className="table-td">
                        <button className="text-slate-400 hover:text-red-500" onClick={() => removeItem(i)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: PO, discount, totals, actions */}
        <div className="space-y-5">
          <div className="card space-y-3">
            <div>
              <label className="label">P.O. Number (optional)</label>
              <input className="input" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
            <div>
              <label className="label">P.O. Date (optional)</label>
              <input className="input" type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </div>
          </div>

          <div className="card space-y-3">
            <div>
              <label className="label">Discount</label>
              <div className="flex gap-2">
                <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as typeof discountType)}>
                  <option value="none">None</option>
                  <option value="percent">%</option>
                  <option value="amount">₹</option>
                </select>
                <NumberInput className="input" min={0} disabled={discountType === 'none'} value={discountValue} onValue={setDiscountValue} />
              </div>
            </div>

            <div className="space-y-1 border-t pt-3 text-sm">
              {totals.discount > 0 && <Row label="Discount" value={`- ${formatNum(totals.discount)}`} />}
              <Row label="Taxable Amount" value={formatNum(totals.taxableAmount)} />
              <Row label="CGST" value={formatNum(totals.totalCgst)} />
              <Row label="SGST" value={formatNum(totals.totalSgst)} />
              <div className="flex justify-between border-t pt-2 text-base font-bold text-brand-700">
                <span>Grand Total</span><span>{formatINR(totals.grandTotal)}</span>
              </div>
              <p className="pt-1 text-xs italic text-slate-400">{totals.amountInWords}</p>
            </div>
          </div>

          <div className="space-y-2">
            {!customer && <div className="rounded-lg bg-amber-50 p-2 text-center text-xs font-semibold text-amber-700">⚠️ Select a Customer above to enable Save &amp; PDF</div>}
            {customer && items.length === 0 && <div className="rounded-lg bg-amber-50 p-2 text-center text-xs font-semibold text-amber-700">⚠️ Add at least 1 product above to enable Save &amp; PDF</div>}
            <button className="btn-secondary w-full" disabled={!canSave} onClick={save}>
              <Save size={16} /> {busy === 'saving' ? 'Saving…' : 'Save Quotation'}
            </button>
            <button className="btn-primary w-full" disabled={!canSave} onClick={saveAndPdf}>
              <FileDown size={16} /> {busy === 'pdf' ? 'Generating PDF…' : 'Save & Download PDF'}
            </button>
            <button className="btn-secondary w-full" onClick={() => navigate('/history')}>Go to History</button>
          </div>
        </div>
      </div>

      {/* PDF preview modal — review before downloading */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-4 backdrop-blur-sm" onClick={closePreview}>
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">PDF Preview</div>
                <div className="text-xs text-slate-400">{preview.fileName}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => downloadBlob(preview.blob, preview.fileName)}>
                  <FileDown size={16} /> Download
                </button>
                <button className="btn-secondary" onClick={closePreview}>Close</button>
              </div>
            </div>
            <iframe title="PDF preview" src={preview.url} className="h-full w-full flex-1 bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-slate-600"><span>{label}</span><span>{value}</span></div>;
}
