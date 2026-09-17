import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CompanySettings } from '../types';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../data/settings';
import { sanitize, phoneError, emailError, gstinError } from '../logic/validation';
import { NumberInput } from '../components/inputs';

export default function Settings() {
  const [form, setForm] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { (async () => { setForm(await getSettings()); setLoading(false); })(); }, []);

  const set = (k: keyof CompanySettings, v: string | number | string[]) => setForm((f) => ({ ...f, [k]: v }));

  const setTerm = (i: number, v: string) => set('termsAndConditions', form.termsAndConditions.map((t, idx) => (idx === i ? v : t)));
  const addTerm = () => set('termsAndConditions', [...form.termsAndConditions, '']);
  const removeTerm = (i: number) => set('termsAndConditions', form.termsAndConditions.filter((_, idx) => idx !== i));

  const settingsInvalid = !!(phoneError(form.phone) || emailError(form.email) || gstinError(form.gstin));

  const save = async () => {
    if (settingsInvalid) return;
    setBusy(true);
    await saveSettings({ ...form, termsAndConditions: form.termsAndConditions.filter(Boolean) });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company Settings</h1>
          <p className="text-sm text-slate-500">These values appear on every quotation PDF.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {saved && <span className="text-sm font-semibold text-green-600">Saved ✓</span>}
          <button className="btn-primary" disabled={busy || settingsInvalid} onClick={save}>{busy ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-bold text-slate-700">Business Identity</h2>
          <Field label="Company Name" v={form.companyName} on={(v) => set('companyName', v)} />
          <Field label="Tagline" v={form.tagline} on={(v) => set('tagline', v)} />
          <Field label="Phone" v={form.phone} on={(v) => set('phone', v)} sanitize={sanitize.phone} error={phoneError(form.phone)} inputMode="numeric" />
          <Field label="Email" v={form.email} on={(v) => set('email', v)} error={emailError(form.email)} />
          <Field label="GSTIN" v={form.gstin} on={(v) => set('gstin', v)} sanitize={sanitize.gstin} error={gstinError(form.gstin)} />
          <Field label="Logo URL" v={form.logoUrl} on={(v) => set('logoUrl', v)} />
          <Area label="Address" v={form.address} on={(v) => set('address', v)} span />
        </div>

        <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-bold text-slate-700">Terms &amp; Business Info</h2>
          <Area label="Bank Details" v={form.bankDetails} on={(v) => set('bankDetails', v)} span />
          <Field label="Payment Terms" v={form.paymentTerms} on={(v) => set('paymentTerms', v)} />
          <Field label="Delivery Terms" v={form.deliveryTerms} on={(v) => set('deliveryTerms', v)} />
          <Field label="Warranty Terms" v={form.warrantyTerms} on={(v) => set('warrantyTerms', v)} />
          <Field label="Jurisdiction" v={form.jurisdiction} on={(v) => set('jurisdiction', v)} />
          <Field label="Authorised Signatory" v={form.authorisedSignatory} on={(v) => set('authorisedSignatory', v)} />
          <Field label="Footer" v={form.footer} on={(v) => set('footer', v)} />
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-700">Default Terms &amp; Conditions (on PDF)</h2>
            <button className="text-sm font-semibold text-brand-600" onClick={addTerm}>+ Add term</button>
          </div>
          <div className="space-y-2">
            {form.termsAndConditions.map((t, i) => (
              <div key={i} className="flex gap-2">
                <span className="pt-2 text-sm text-slate-400">{i + 1}.</span>
                <input className="input" value={t} onChange={(e) => setTerm(i, e.target.value)} />
                <button onClick={() => removeTerm(i)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="sm:col-span-2 lg:col-span-3 font-bold text-slate-700">Numbering &amp; File Names (configurable)</h2>
          <Field label="Quotation Prefix" v={form.quotationPrefix} on={(v) => set('quotationPrefix', v)} />
          <div>
            <label className="label">Number Pad Length</label>
            <NumberInput className="input" allowDecimal={false} min={1} max={10} value={form.quotationPadLength} onValue={(n) => set('quotationPadLength', n)} />
          </div>
          <Field label="PDF Filename Template" v={form.pdfFileNameTemplate} on={(v) => set('pdfFileNameTemplate', v)} />
          <p className="sm:col-span-2 lg:col-span-3 text-xs text-slate-400">Filename tokens: <code>{'{number}'}</code>, <code>{'{customer}'}</code>, <code>{'{date}'}</code>. Example: <code>PL-Q-000127-ABC-Industries.pdf</code></p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, on, span, error, inputMode, sanitize }: { label: string; v: string; on: (v: string) => void; span?: boolean; error?: string; inputMode?: 'numeric' | 'decimal' | 'text'; sanitize?: (v: string) => string }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      <input
        className="input"
        inputMode={inputMode}
        value={v}
        onChange={(e) => {
          const nv = sanitize ? sanitize(e.target.value) : e.target.value;
          if (sanitize) e.currentTarget.value = nv; // keep DOM in sync (beats controlled bailout)
          on(nv);
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
function Area({ label, v, on, span }: { label: string; v: string; on: (v: string) => void; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      <textarea className="input" rows={2} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
