// Data access for the single company-settings document (companySettings/main).
// Falls back to local storage when Firebase isn't configured (demo mode).
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { lsGet, lsSet } from '../lib/storage';
import type { CompanySettings } from '../types';

const SETTINGS_REF = () => doc(db, 'companySettings', 'main');

/** ProLift Material Handling defaults — used until the owner edits Company Settings. */
export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'PROLIFT MATERIAL HANDLING',
  tagline: 'Comprehensive Solutions for All kind of Material Handling Equipments, Spares & Service, AMCs, CMCs, Used Trucks, Rentals',
  address: '123, Industrial Area, Ahmedabad, Gujarat - 380015',
  phone: '+91 97249 43182',
  email: 'proliftmaterialhandling@gmail.com',
  gstin: '24PROLIFT0000A1Z0',
  logoUrl: '',
  bankDetails: '',
  paymentTerms: '100 % Advance',
  deliveryTerms: 'Ready stock',
  warrantyTerms: '12 months against manufacturing defects.',
  jurisdiction: 'Subject to Ahmedabad Jurisdiction',
  footer: 'This is a computer Generated Invoice',
  authorisedSignatory: 'Authorised Signatory',
  termsAndConditions: [
    'Payment : 100 % Advance',
    'EX works : Ahmedabad, Transportation and Freight charges will be extra as actual',
    'Delivery of parts : Ready stock',
    'All Mfg. Name, Part No., Symbol & Description are used for reference purpose only.',
  ],
  quotationPrefix: 'PL-Q-',
  quotationPadLength: 4,
  pdfFileNameTemplate: '{number}-{customer}.pdf',
};

export async function getSettings(): Promise<CompanySettings> {
  if (!isFirebaseConfigured) {
    return { ...DEFAULT_SETTINGS, ...lsGet<Partial<CompanySettings>>('settings', {}) };
  }
  const snap = await getDoc(SETTINGS_REF());
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<CompanySettings>) };
}

export async function saveSettings(settings: CompanySettings): Promise<void> {
  if (!isFirebaseConfigured) {
    lsSet('settings', settings);
    return;
  }
  await setDoc(SETTINGS_REF(), settings, { merge: true });
}
