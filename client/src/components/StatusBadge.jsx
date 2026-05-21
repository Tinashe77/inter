export function StatusBadge({ status = '' }) {
  const normalized = status.toLowerCase();
  const className = normalized.includes('complete')
    ? 'bg-green-100 text-interpath-green ring-1 ring-green-200'
    : normalized.includes('partial')
      ? 'bg-amber-100 text-interpath-amber ring-1 ring-amber-200'
      : 'bg-blue-100 text-interpath-blue ring-1 ring-blue-200';

  return <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-normal ${className}`}>{status || 'Pending'}</span>;
}
