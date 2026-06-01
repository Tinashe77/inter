import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardList, FileBarChart, FlaskConical, Home, KeyRound, LogOut, Truck } from 'lucide-react';
import { useAuthStore } from '../auth/authStore.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { InstallAppButton } from '../components/InstallAppButton.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/visits', label: 'Visits', icon: ClipboardList },
  { to: '/sample-collection', label: 'Samples', icon: Truck, roles: ['Clinic_Doctor'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['Employee'] },
  { to: '/api-tester', label: 'Tester', icon: FlaskConical, roles: ['Employee'] },
  { to: '/change-password', label: 'Password', icon: KeyRound, roles: ['Patient', 'Clinic_Doctor'] }
];

export function AppLayout() {
  const navigate = useNavigate();
  const { user, loading, loadUser, logout } = useAuthStore();

  useEffect(() => {
    if (!user) loadUser();
  }, [loadUser, user]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, navigate, user]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user.usertype));

  return (
    <div className="app-bg min-h-screen text-interpath-text">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo compact />
            <div className="min-w-0">
              <p className="truncate text-sm font-normal text-interpath-text">{user.name || user.username}</p>
              <p className="truncate text-xs font-normal text-slate-500">{user.usertype}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InstallAppButton compact />
            <button className="btn-secondary px-3" onClick={logout} aria-label="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 px-3 pb-28 pt-3 sm:px-4 sm:pt-4 md:grid-cols-[220px_1fr] md:pb-8">
        <aside className="hidden md:block">
          <nav className="panel sticky top-24 space-y-2">
            {visibleItems.map((item) => <NavItem key={item.to} item={item} />)}
          </nav>
        </aside>
        <Outlet />
      </div>
      <nav className="safe-bottom mobile-scroll fixed bottom-0 left-0 right-0 z-20 flex gap-1 overflow-x-auto border-t border-white/80 bg-white/90 px-2 pt-2 shadow-2xl shadow-blue-950/15 backdrop-blur-xl md:hidden">
        {visibleItems.map((item) => <NavItem key={item.to} item={item} mobile />)}
      </nav>
    </div>
  );
}

function NavItem({ item, mobile = false }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => [
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal',
        mobile ? 'min-w-20 flex-1 flex-col py-2 text-[11px]' : '',
        isActive ? 'text-white shadow-lg shadow-blue-500/25 [background:linear-gradient(135deg,#2E3092,#2563EB,#38BDF8)]' : 'text-slate-500 hover:bg-white/70 hover:text-interpath-blue'
      ].join(' ')}
    >
      <Icon size={18} />
      {item.label}
    </NavLink>
  );
}
