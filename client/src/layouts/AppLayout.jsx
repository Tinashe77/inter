import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import { useAuthStore } from '../auth/authStore.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, loadUser, logout, employeeBranch } = useAuthStore();

  useEffect(() => {
    if (!user) loadUser();
  }, [loadUser, user]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!loading && user?.usertype === 'Employee' && !employeeBranch && location.pathname !== '/branch-selection') {
      navigate('/branch-selection');
    }
  }, [employeeBranch, loading, location.pathname, navigate, user?.usertype]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  const title = pageTitle(location.pathname);

  return (
    <div className="app-bg min-h-screen text-interpath-text">
      <header className="mobile-appbar">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo compact />
            <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {location.pathname !== '/' && <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-interpath-blue" onClick={() => navigate('/')} aria-label="Workspace"><Home size={18} /></button>}
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-interpath-blue" onClick={logout} aria-label="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <div className="mobile-app-rail">
        <Outlet />
      </div>
    </div>
  );
}

function pageTitle(pathname) {
  if (pathname.startsWith('/branch-selection')) return 'Select branch';
  if (pathname.startsWith('/visits')) return 'Results';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/clinics')) return 'Clinics';
  if (pathname.startsWith('/sample-collection')) return 'Sample collection';
  if (pathname.startsWith('/change-password')) return 'Password';
  if (pathname.startsWith('/api-tester')) return 'API tester';
  return 'Workspace';
}
