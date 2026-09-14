# ProLift — Quotation Management System

A fast, single-user web app for creating branded ProLift Material Handling quotations.
Frontend: **Vite + React + TypeScript + Tailwind**. Backend: **Firebase** (Auth, Firestore, Storage).

---

## 1. Run locally (no Firebase yet)

```bash
npm install
npm run dev
```

Open the printed URL. The app loads, but login/save need Firebase keys (step 2).

---

## 2. Connect Firebase (one-time, ~10 min)

1. Go to <https://console.firebase.google.com> → **Add project**.
2. In the project, open **Build**:
   - **Authentication** → Get started → enable **Email/Password**. Add one user (your login) under the *Users* tab.
   - **Firestore Database** → Create database → *Production mode*.
   - **Storage** → Get started (this prompts the **Blaze** upgrade + a credit card; needed to store PDF files).
3. **Project Settings** (gear icon) → *Your apps* → **Web app** (`</>`) → register → copy the config values.
4. Paste those values into **`.env`** (copy from `.env.example`):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
5. Publish the security rules (from `firestore.rules` and `storage.rules`) in the Firebase console, or via the Firebase CLI. They restrict all data to logged-in users.
6. Restart `npm run dev`. Log in with the user you created.

> **Tip:** In Firebase → Billing, set a **budget alert at ₹100** so you never get a surprise bill (you'll realistically stay at ₹0).

---

## 3. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. On <https://vercel.com> → New Project → import the repo.
3. Framework preset: **Vite**. Add the same 6 `VITE_FIREBASE_*` env vars in Vercel's project settings.
4. Deploy. Done — live URL, free HTTPS.

---

## First-time in-app setup
1. **Company Settings** → fill address, phone, GSTIN, bank details, terms, logo URL.
2. **Product Master** → add your products (name, code, capacity, HSN, prices, GST, specs).
3. **Customer Master** → add customers (or add them on the fly later).
4. **New Quotation** → search customer → search product → qty → **Save & Generate PDF**.

---

## Project structure
```
src/
  lib/firebase.ts        Firebase init (reads .env)
  types/index.ts         All data models
  logic/                 Pure math: calculations.ts, numberToWords.ts
  data/                  Firestore access: products, customers, quotations, sequences, settings
  context/AuthContext    Login state
  components/            Layout (sidebar), SearchSelect (master search)
  pdf/                   QuotationPDF (branded doc), filename, generatePdf (render+upload)
  pages/                 Dashboard, Products, Customers, QuotationMaker, History, Settings, Login
firestore.rules          DB access rules (auth required)
storage.rules            PDF file access rules (auth required)
```

## Key guarantees
- **Snapshot on save** — old quotations never change when masters are edited.
- **Internal price hidden** — Basic/Purchase price is never saved into a quotation or shown on the PDF.
- **No duplicate numbers** — quotation numbers use an atomic Firestore counter.
- **Everything configurable** — company info, terms, number format, and PDF filename live in Company Settings.
