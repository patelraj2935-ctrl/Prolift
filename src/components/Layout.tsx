// App shell: sidebar navigation + top bar. Wraps all authenticated pages.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, FilePlus2, History, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../lib/firebase';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/quotation/new', label: 'New Quotation', icon: FilePlus2 },
  { to: '/customers', label: 'Customer Master', icon: Users },
  { to: '/products', label: 'Product Master', icon: Package },
  { to: '/history', label: 'Quotation History', icon: History },
  { to: '/settings', label: 'Company Settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-brand-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-extrabold leading-tight">ProLift</div>
          <div className="text-[11px] text-brand-100/70">Material Handling</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-brand-100/80 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 pb-2 text-[11px] text-brand-100/60 truncate">{user?.email}</div>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100/80 hover:bg-white/10">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        {!isFirebaseConfigured && (
          <div className="bg-amber-100 px-6 py-2 text-center text-xs font-medium text-amber-800">
            Demo Mode — data is saved in this browser only. Connect Firebase to go live and store data in the cloud.
          </div>
        )}
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
