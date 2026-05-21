import { BrandLogo } from './BrandLogo.jsx';

export function LoadingScreen() {
  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-6">
      <section className="loading-shell">
        <div className="loading-logo">
          <BrandLogo compact />
        </div>
        <div className="loading-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="text-sm font-normal text-slate-600">Loading your secure workspace</p>
      </section>
    </main>
  );
}
