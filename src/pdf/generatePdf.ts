// ============================================================================
// Renders a Quotation to a PDF Blob with pdfmake (pure JS, in-browser),
// uploads it to Firebase Storage, and optionally downloads it.
// ============================================================================
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';
import type { CompanySettings, Quotation } from '../types';
import { buildDocDefinition } from './pdfDoc';
import { buildPdfFileName } from './filename';

// pdfmake + its bundled fonts are ~large; load them on demand (only when a PDF
// is actually generated) so they stay out of the main app bundle. Cached after
// the first call.
/**
 * The vfs_fonts module exports a flat map { "Roboto-Medium.ttf": <base64>, … }
 * via CommonJS `module.exports = vfs`. Depending on the bundler's ESM interop,
 * that map can arrive directly, under `.default`, or under the legacy
 * `.pdfMake.vfs`. Unwrap whichever shape we get so pdfmake finds its fonts —
 * otherwise it throws "File 'Roboto-Medium.ttf' not found in virtual file system".
 */
function resolveVfs(mod: unknown): Record<string, string> {
  const candidates = [
    (mod as { pdfMake?: { vfs?: unknown } })?.pdfMake?.vfs,
    (mod as { vfs?: unknown })?.vfs,
    (mod as { default?: unknown })?.default,
    mod,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object' && Object.keys(c as object).some((k) => k.endsWith('.ttf'))) {
      return c as Record<string, string>;
    }
  }
  return {};
}

let pdfMakePromise: ReturnType<typeof loadPdfMake> | null = null;
async function loadPdfMake() {
  const [pdfMakeMod, fontsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = ((pdfMakeMod as { default?: unknown }).default ??
    pdfMakeMod) as typeof import('pdfmake/build/pdfmake');
  // Register the bundled Roboto fonts. Cast keeps TS happy across pdfmake type versions.
  (pdfMake as unknown as { vfs: unknown }).vfs = resolveVfs(fontsMod);
  return pdfMake;
}
async function getPdfMake() {
  if (!pdfMakePromise) pdfMakePromise = loadPdfMake();
  return pdfMakePromise;
}

/** Best-effort: fetch an image URL and convert to a data URL for embedding. */
async function toDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined as unknown as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined; // logo is optional — never block PDF on it
  }
}

/** Build the PDF as a Blob. */
export async function renderPdfBlob(q: Quotation, settings: CompanySettings): Promise<Blob> {
  const pdfMake = await getPdfMake();
  const logoDataUrl = await toDataUrl(settings.logoUrl);
  const docDef = buildDocDefinition(q, settings, logoDataUrl);
  // pdfmake 0.3.x returns a Promise from getBlob(); the old callback form no
  // longer fires, which silently hung PDF generation.
  return await (pdfMake.createPdf(docDef).getBlob() as unknown as Promise<Blob>);
}

/** Trigger a browser download of the PDF. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Upload the PDF to Firebase Storage under quotations/<file>.pdf. */
export async function uploadPdf(blob: Blob, fileName: string): Promise<string> {
  const storageRef = ref(storage, `quotations/${fileName}`);
  await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
  return await getDownloadURL(storageRef);
}

/** Full pipeline: render -> download -> upload to Storage. Returns the URL. */
export async function generateAndStorePdf(
  q: Quotation,
  settings: CompanySettings,
  opts: { download?: boolean } = { download: true },
): Promise<{ fileName: string; downloadUrl: string }> {
  const fileName = buildPdfFileName(q, settings);
  const blob = await renderPdfBlob(q, settings);
  if (opts.download) downloadBlob(blob, fileName);
  // In demo mode (no Firebase) we can't upload to Storage — the PDF still
  // downloads locally; the stored URL is simply left empty.
  const downloadUrl = isFirebaseConfigured ? await uploadPdf(blob, fileName) : '';
  return { fileName, downloadUrl };
}
