import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { isFirebaseConfigured } from './lib/firebase';
import { seedDemoData } from './lib/localdb';

// In demo mode (no Firebase yet), pre-load products/customers/settings so the
// app is immediately reviewable locally.
if (!isFirebaseConfigured) {
  try {
    seedDemoData();
  } catch (err) {
    console.error('Error seeding demo data:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
