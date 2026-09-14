// Provides the logged-in user across the app and login/logout helpers.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// In demo mode (no Firebase yet) we auto-authenticate with this fake user so
// the whole app is reviewable locally without a login step.
const DEMO_USER = { email: 'demo@prolift.local', uid: 'demo' } as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isFirebaseConfigured ? null : DEMO_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Before Firebase keys are added, skip auth wiring and stay signed in as the
    // demo user so the app is fully usable locally.
    if (!isFirebaseConfigured) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    if (!isFirebaseConfigured) { setUser(DEMO_USER); return; } // demo: no real auth
    await signInWithEmailAndPassword(auth, email, password);
  };
  const logout = async () => {
    if (!isFirebaseConfigured) return; // demo mode: logout is a no-op
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
