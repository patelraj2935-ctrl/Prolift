// ============================================================================
// Firebase initialization. All keys come from environment variables (.env),
// so no secrets are hard-coded. Plug your Firebase project keys in later.
// ============================================================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;

/** True only when all required keys are present — lets the UI warn nicely. */
export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID,
);

// When keys aren't set yet, fall back to harmless placeholders so the SDK
// initializes without throwing "auth/invalid-api-key" (which would blank the
// whole app). Real calls are gated behind isFirebaseConfigured elsewhere.
const firebaseConfig = isFirebaseConfigured
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }
  : {
      apiKey: 'placeholder-key',
      authDomain: 'placeholder.firebaseapp.com',
      projectId: 'placeholder',
      storageBucket: 'placeholder.appspot.com',
      messagingSenderId: '0',
      appId: 'placeholder',
    };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
