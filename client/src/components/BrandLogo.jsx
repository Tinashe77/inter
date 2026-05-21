export function BrandLogo({ compact = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="logo-badge">
        <img src="/interpathmed_logo.png" alt="Interpath Medical Laboratories" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-normal leading-tight text-interpath-blue">Interpath</span>
          <span className="block truncate text-[11px] font-normal text-slate-500">Ultimate Diagnostic Solutions</span>
        </span>
      )}
    </div>
  );
}
