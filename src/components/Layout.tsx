// App shell: sidebar navigation + top bar. Wraps all authenticated pages.
// On desktop the sidebar is fixed; on mobile it collapses into a hamburger drawer.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, FilePlus2, History, Settings, LogOut, Menu, X,
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
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 transform flex-col bg-brand-900 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <div className="text-lg font-extrabold leading-tight">ProLift</div>
            <div className="text-[11px] text-brand-100/70">Material Handling</div>
          </div>
          <button className="text-white/70 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
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
        <div className="border-t border-white/10 p-3">
          <div className="truncate px-3 pb-2 text-[11px] text-brand-100/60">{user?.email}</div>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100/80 hover:bg-white/10">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-x-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-slate-600">
            <Menu size={22} />
          </button>
          <span className="text-lg font-extrabold text-brand-700">ProLift</span>
        </div>

        {!isFirebaseConfigured && (
          <div className="bg-amber-100 px-6 py-2 text-center text-xs font-medium text-amber-800">
            Demo Mode — data is saved in this browser only. Connect Firebase to go live and store data in the cloud.
          </div>
        )}
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
