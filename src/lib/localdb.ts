// ============================================================================
// Local (offline/demo) data store used when Firebase isn't configured yet.
// Backs the app with browser localStorage so the whole system is reviewable
// locally. Swapping to Firebase later needs NO UI changes — the data modules
// branch on isFirebaseConfigured.
// ============================================================================
import type { Product, Customer, CompanySettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/settings';
import { lsGet, lsSet, genId } from './storage';

export { lsGet, lsSet, genId };


// ---- Demo seed data (only written once, if nothing exists yet) ------------

export const seedProducts: Omit<Product, 'id'>[] = [
  { name: 'Hand Pallet Truck', category: 'Pallet Trucks', itemCode: 'HPT-2000', capacity: '2000 KG', hsn: '8427', unit: 'Nos', basicPrice: 9500, listingPrice: 13500, gstRate: 18, description: 'Heavy-duty manual hand pallet truck.', specifications: [{ label: 'Fork Length', value: '1150 mm' }, { label: 'Fork Width', value: '550 mm' }, { label: 'Lowered Height', value: '85 mm' }], imageUrl: '/products/HPT-2000.jpg' },
  { name: 'Hand Pallet Truck', category: 'Pallet Trucks', itemCode: 'HPT-2500', capacity: '2500 KG', hsn: '8427', unit: 'Nos', basicPrice: 10500, listingPrice: 14500, gstRate: 18, description: 'Manual hand pallet truck, 2500 kg capacity.', specifications: [{ label: 'Fork Length', value: '1150 mm' }, { label: 'Fork Width', value: '550 mm' }], imageUrl: '/products/HPT-2500.jpg' },
  { name: 'Hand Pallet Truck', category: 'Pallet Trucks', itemCode: 'HPT-5000', capacity: '5000 KG', hsn: '8427', unit: 'Nos', basicPrice: 22000, listingPrice: 29500, gstRate: 18, description: 'Extra heavy-duty hand pallet truck, 5000 kg.', specifications: [{ label: 'Fork Length', value: '1150 mm' }], imageUrl: '/products/HPT-5000.jpg' },
  { name: 'S.S. Hand Pallet Truck', category: 'Pallet Trucks', itemCode: 'SSHPT-2500', capacity: '2500 KG', hsn: '8427', unit: 'Nos', basicPrice: 32000, listingPrice: 42000, gstRate: 18, description: 'Stainless steel hand pallet truck for hygienic environments.', specifications: [{ label: 'Material', value: 'SS 304' }], imageUrl: '/products/SSHPT-2500.jpg' },
  { name: 'Manual Stacker', category: 'Stackers', itemCode: 'MS-1000', capacity: '500-1500 KG', hsn: '8427', unit: 'Nos', basicPrice: 48000, listingPrice: 62000, gstRate: 18, description: 'Manual hydraulic stacker.', specifications: [{ label: 'Lift Height', value: '1600 mm' }], imageUrl: '/products/MS-1000.jpg' },
  { name: 'Semi Electric Stacker', category: 'Stackers', itemCode: 'SES-1000', capacity: '500-1500 KG', hsn: '8427', unit: 'Nos', basicPrice: 95000, listingPrice: 125000, gstRate: 18, description: 'Semi-electric stacker with electric lift.', specifications: [{ label: 'Lift Height', value: '1600 mm' }, { label: 'Battery', value: '12V / 100Ah' }], imageUrl: '/products/SES-1000.jpg' },
  { name: 'Platform Trolley', category: 'Trolleys', itemCode: 'PT-300', capacity: '300 KG', hsn: '8716', unit: 'Nos', basicPrice: 4500, listingPrice: 6500, gstRate: 18, description: 'General purpose platform trolley.', specifications: [], imageUrl: '/products/PT-300.jpg' },
  { name: 'Castor Wheels', category: 'Spare Parts', itemCode: 'CW-STD', capacity: '-', hsn: '8302', unit: 'Set', basicPrice: 800, listingPrice: 1400, gstRate: 18, description: 'Replacement castor wheels (set of 4).', specifications: [], imageUrl: '/products/CW-STD.jpg' },
  { name: 'Seal Kit', category: 'Spare Parts', itemCode: 'SK-STD', capacity: '-', hsn: '8431', unit: 'Set', basicPrice: 350, listingPrice: 750, gstRate: 18, description: 'Hydraulic seal kit.', specifications: [], imageUrl: '/products/SK-STD.jpg' },
  { name: 'Drive Wheel', category: 'Spare Parts', itemCode: 'DW-STD', capacity: '-', hsn: '8431', unit: 'Nos', basicPrice: 1200, listingPrice: 2200, gstRate: 18, description: 'Polyurethane drive wheel.', specifications: [], imageUrl: '/products/DW-STD.jpg' },
  { name: 'Traction Battery', category: 'Batteries', itemCode: 'TB-24V', capacity: '-', hsn: '8507', unit: 'Nos', basicPrice: 45000, listingPrice: 58000, gstRate: 18, description: '24V traction battery.', specifications: [{ label: 'Voltage', value: '24V' }], imageUrl: '/products/TB-24V.jpg' },
  { name: 'Scissor Lift Table', category: 'Lift Tables', itemCode: 'SLT-1000', capacity: '1000 KG', hsn: '8428', unit: 'Nos', basicPrice: 68000, listingPrice: 89000, gstRate: 18, description: 'Hydraulic scissor lift table.', specifications: [{ label: 'Max Height', value: '1000 mm' }], imageUrl: '/products/SLT-1000.jpg' },
  { name: 'Electric Pallet Truck', category: 'Electric', itemCode: 'EPT-2000', capacity: '2000 KG', hsn: '8427', unit: 'Nos', basicPrice: 165000, listingPrice: 210000, gstRate: 18, description: 'Fully electric pallet truck.', specifications: [{ label: 'Battery', value: '24V / 210Ah' }], imageUrl: '/products/EPT-2000.jpg' },
  { name: 'Battery Operated Pallet Truck (BOPT)', category: 'Electric', itemCode: 'BOPT-2000', capacity: '2000 KG', hsn: '8427', unit: 'Nos', basicPrice: 210000, listingPrice: 265000, gstRate: 18, description: 'Battery operated pallet truck with rider option.', specifications: [{ label: 'Battery', value: '24V / 240Ah' }], imageUrl: '/products/BOPT-2000.jpg' },
  { name: 'Battery Operated Forklift', category: 'Forklifts', itemCode: 'BOF-3000', capacity: '3000 KG', hsn: '8427', unit: 'Nos', basicPrice: 850000, listingPrice: 1050000, gstRate: 18, description: 'Electric counterbalance forklift.', specifications: [{ label: 'Lift Height', value: '3000 mm' }, { label: 'Battery', value: '48V' }], imageUrl: '/products/BOF-3000.jpg' },
  { name: 'Reach Truck Forklift', category: 'Forklifts', itemCode: 'RT-1500', capacity: '1500 KG', hsn: '8427', unit: 'Nos', basicPrice: 1250000, listingPrice: 1550000, gstRate: 18, description: 'Electric reach truck for narrow aisles.', specifications: [{ label: 'Lift Height', value: '6000 mm' }], imageUrl: '/products/RT-1500.jpg' },
];

export const seedCustomers: Omit<Customer, 'id'>[] = [
  { companyName: 'ABC Industries Pvt Ltd', contactPerson: 'Ramesh Shah', phone: '9876543210', email: 'purchase@abcindustries.in', gstin: '24ABCDE1234F1Z5', billingAddress: 'Plot 12, GIDC Estate, Phase 1', shippingAddress: 'Plot 12, GIDC Estate, Phase 1', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015', notes: 'Regular customer.' },
  { companyName: 'Shreeji Logistics', contactPerson: 'Nikhil Patel', phone: '9825012345', email: 'info@shreejilogistics.com', gstin: '24SHREE5678G1Z2', billingAddress: 'Warehouse 4, Ring Road', shippingAddress: 'Warehouse 4, Ring Road', city: 'Rajkot', state: 'Gujarat', pincode: '360001', notes: '' },
];

/** Populate demo data once, so the local review has products/customers ready. */
export function seedDemoData(): void {
  const seeded = lsGet('seeded', false);
  const products = lsGet<Product[]>('products', []);
  const customers = lsGet<Customer[]>('customers', []);

  if (!seeded || !Array.isArray(products) || products.length === 0 || !Array.isArray(customers) || customers.length === 0) {
    lsSet('products', seedProducts.map((p) => ({ ...p, imageUrl: `/products/${p.itemCode}.jpg`, id: genId(), createdAt: Date.now(), updatedAt: Date.now() })));
    lsSet('customers', seedCustomers.map((c) => ({ ...c, id: genId(), createdAt: Date.now(), updatedAt: Date.now() })));
    lsSet('settings', { ...DEFAULT_SETTINGS });
    lsSet('seeded', true);
  }

  // One-time branding migration (runs once per BRAND_VERSION bump): refresh the
  // stored company settings to the current defaults WITHOUT touching
  // products/customers/quotations. Only replaces while the stored name is still
  // one of our auto-seeded placeholders — never overwrites a name the owner set,
  // and never re-runs once applied, so later Settings edits are preserved.
  const BRAND_VERSION = 3;
  const AUTO_SEEDED_NAMES = [
    'ProLift Material Handling',
    'WEST INDIA FORKLIFT SERVICES',
    'PROLIFT MATERIAL HANDLING',
  ];
  if (lsGet('brandVersion', 0) < BRAND_VERSION) {
    const storedSettings = lsGet<Partial<CompanySettings> | null>('settings', null);
    if (!storedSettings || AUTO_SEEDED_NAMES.includes(storedSettings.companyName ?? '')) {
      lsSet('settings', { ...DEFAULT_SETTINGS });
    }
    lsSet('brandVersion', BRAND_VERSION);
  }

  // One-time product-image migration: attach the catalog photos (in public/products)
  // to any already-stored products by item code, without overwriting user images.
  const KNOWN_CODES = new Set([
    'HPT-2000', 'HPT-2500', 'HPT-5000', 'SSHPT-2500', 'MS-1000', 'SES-1000', 'PT-300', 'CW-STD',
    'SK-STD', 'DW-STD', 'TB-24V', 'SLT-1000', 'EPT-2000', 'BOPT-2000', 'BOF-3000', 'RT-1500',
  ]);
  if (!lsGet('productImagesV1', false)) {
    const prods = lsGet<Product[]>('products', []);
    let changed = false;
    const updated = prods.map((p) => {
      if (!p.imageUrl && KNOWN_CODES.has(p.itemCode)) {
        changed = true;
        return { ...p, imageUrl: `/products/${p.itemCode}.jpg` };
      }
      return p;
    });
    if (changed) lsSet('products', updated);
    lsSet('productImagesV1', true);
  }
}

