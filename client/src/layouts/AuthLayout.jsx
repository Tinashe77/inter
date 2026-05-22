import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { InstallAppButton } from '../components/InstallAppButton.jsx';

export function AuthLayout() {
  return (
    <main className="app-bg min-h-screen px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="hero-band mb-5">
          <div className="flex items-start justify-between gap-3">
            <BrandLogo />
            <InstallAppButton compact />
          </div>
          <h1 className="mt-8 max-w-xs text-3xl font-normal leading-tight text-interpath-text">Welcome back, ready to continue</h1>
          <p className="mt-3 text-sm font-normal text-slate-600">Secure laboratory results, visits, and reports in one clinical workspace.</p>
        </div>
        <Outlet />
      </div>
    </main>
  );
}
