import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { InstallAppButton } from '../components/InstallAppButton.jsx';

export function AuthLayout() {
  return (
    <main className="mobile-login-bg min-h-screen px-5 py-5 sm:py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between gap-3 pb-7 text-white">
          <BrandLogo />
          <InstallAppButton compact />
        </div>
        <Outlet />
        <p className="mt-5 text-center text-xs font-semibold text-slate-500">Protected clinical access</p>
      </div>
    </main>
  );
}
