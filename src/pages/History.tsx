import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Copy, FileDown, Trash2, ExternalLink, Eye } from 'lucide-react';
import type { Quotation, CompanySettings } from '../types';
import { listQuotations, searchQuotations, deleteQuotation, attachPdf } from '../data/quotations';
import { getSettings } from '../data/settings';
import { renderPdfBlob, downloadBlob, uploadPdf } from '../pdf/generatePdf';
import { buildPdfFileName } from '../pdf/filename';
import { isFirebaseConfigured } from '../lib/firebase';
import { formatINR } from '../logic/calculations';

export default function History() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; fileName: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [q, s] = await Promise.all([listQuotations(), getSettings()]);
    setQuotations(q); setSettings(s); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const duplicate = (q: Quotation) => {
    // Navigate to a fresh quotation seeded with this one's data (new number on save).
    navigate('/quotation/new', { state: { duplicateFrom: q } });
  };

  // Render the saved quotation and show it in the preview modal (with Download).
  const previewPdf = async (q: Quotation) => {
    if (!settings) return;
    setPdfBusy(q.id);
    try {
      const blob = await renderPdfBlob(q, settings);
      const fileName = buildPdfFileName(q, settings);
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(blob), blob, fileName });
      if (isFirebaseConfigured) {
        const downloadUrl = await uploadPdf(blob, fileName);
        await attachPdf(q.id, downloadUrl, fileName);
        load();
      }
    } finally {
      setPdfBusy(null);
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const remove = async (q: Quotation) => {
    if (!confirm(`Delete ${q.quotationNumber}? This cannot be undone.`)) return;
    await deleteQuotation(q.id);
    load();
  };

  const filtered = searchQuotations(quotations, term);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Quotation History</h1>
        <p className="text-sm text-slate-500">Every quotation is saved with a frozen snapshot.</p>
      </div>

      <input className="input mb-4 max-w-md" placeholder="Search by number, customer, PO…" value={term} onChange={(e) => setTerm(e.target.value)} />

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Number</th>
              <th className="table-th">Date</th>
              <th className="table-th">Customer</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">PDF</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="table-td" colSpan={6}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td className="table-td text-slate-400" colSpan={6}>No quotations yet.</td></tr>}
            {filtered.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="table-td font-semibold text-brand-700">{q.quotationNumber}</td>
                <td className="table-td">{new Date(q.date).toLocaleDateString('en-IN')}</td>
                <td className="table-td">{q.customer.companyName}</td>
                <td className="table-td text-right">{formatINR(q.totals.grandTotal)}</td>
                <td className="table-td">
                  {q.pdfUrl ? (
                    <a href={q.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600">
                      <ExternalLink size={14} /> Open
                    </a>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="table-td">
                  <div className="flex justify-end gap-3">
                    <button title="Edit" className="text-slate-500 hover:text-brand-600" onClick={() => navigate(`/quotation/${q.id}/edit`)}><Pencil size={16} /></button>
                    <button title="Duplicate" className="text-slate-500 hover:text-brand-600" onClick={() => duplicate(q)}><Copy size={16} /></button>
                    <button title="Preview PDF" className="text-slate-500 hover:text-brand-600 disabled:opacity-40" disabled={pdfBusy === q.id} onClick={() => previewPdf(q)}><Eye size={16} /></button>
                    <button title="Delete" className="text-slate-500 hover:text-red-600" onClick={() => remove(q)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PDF preview modal — review a saved quotation, then download */}
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
