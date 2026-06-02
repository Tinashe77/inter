import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { http } from '../api/http.js';
import { useAuthStore } from '../auth/authStore.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function VisitsPage() {
  const user = useAuthStore((state) => state.user);
  const [visits, setVisits] = useState([]);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(() => defaultDateFrom(user?.usertype));
  const [dateTo, setDateTo] = useState(() => todayIso());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  async function loadVisits(range = {}) {
    setLoading(true);
    setHasLoaded(false);
    setError('');
    setMessage('');
    try {
      const from = range.dateFrom || dateFrom;
      const to = range.dateTo || dateTo;
      const endpoint = user.usertype === 'Patient'
        ? '/visits/mine'
        : user.usertype === 'Employee'
          ? `/visits?date=${formatSlisDate(to)}&branch=ALL`
          : `/visits?dateFrom=${from}&dateTo=${to}`;
      const { data } = await http.get(endpoint);
      if (range.logResponse && user.usertype !== 'Patient') {
        console.log('Visits date range JSON response:', data);
      }
      setVisits(data.visits || []);
      setMessage(data.message || '');
    } catch (err) {
      setVisits([]);
      setError(err.message);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.usertype !== 'Patient') {
      const nextDateFrom = defaultDateFrom(user.usertype);
      const nextDateTo = todayIso();
      setDateFrom(nextDateFrom);
      setDateTo(nextDateTo);
      loadVisits({ dateFrom: nextDateFrom, dateTo: nextDateTo });
      return;
    }
    loadVisits();
  }, [user?.usertype]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return visits.filter((visit) => [visit.PatientName, visit.LabNumber, visit.PhoneNumber, visit.VisitDate].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [query, visits]);

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-normal text-interpath-blue">{user.usertype === 'Employee' ? 'Daily result list' : 'Laboratory visits'}</p>
          <h2 className="mt-1 text-2xl font-normal leading-tight sm:text-3xl">{user.usertype === 'Employee' ? 'Results by date' : 'Patient visits'}</h2>
          <p className="mt-2 text-sm font-normal text-slate-600">
            {user.usertype === 'Employee' ? 'Select a date to pull SLIS results for all branches.' : 'Search visits and open result details.'}
          </p>
        </div>
        {user.usertype === 'Employee' && (
          <label className="w-full lg:w-56">
            <input className="field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        )}
        {user.usertype === 'Clinic_Doctor' && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
            <label>
              <input className="field" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              <input className="field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
        )}
        <button className="btn-primary w-full lg:w-auto" onClick={() => loadVisits({ logResponse: true })} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
          {loading ? 'Loading' : 'Refresh'}
        </button>
      </section>
      <div className="panel">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="field pl-10" placeholder="Search patient, lab number, phone, or date" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      {loading && <LoadingState label="Pulling visit data from SLIS..." />}
      {!loading && error && <p className="rounded-lg bg-blue-50 p-3 text-sm text-interpath-blue ring-1 ring-blue-100">{error}</p>}
      {!loading && !error && message && <p className="rounded-lg bg-blue-50 p-3 text-sm text-interpath-blue ring-1 ring-blue-100">{message}</p>}
      {!loading && hasLoaded && filtered.length === 0 && <p className="panel text-sm text-slate-600">No visits found.</p>}
      {!loading && (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((visit) => (
          <Link className="panel block min-w-0 transition hover:-translate-y-0.5 hover:border-interpath-blue" to={`/visits/${visit.LabNumber}`} state={{ visit }} key={visit.LabNumber}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-normal">{visit.PatientName}</p>
                <p className="truncate text-sm font-normal text-slate-600">{visit.LabNumber} · {visit.OLBNumber || visit.VisitDate}</p>
              </div>
              <StatusBadge status={visit.Status} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-normal text-slate-600">{visit.Tests}</p>
            {user.usertype === 'Employee' && (
              <div className="mt-3 grid gap-2 text-xs text-slate-500">
                <span className="truncate">{visit.VisitDate}</span>
                <span className="truncate">{visit.Clinic}</span>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-interpath-blue">{visit.PaymentMode || 'Payment n/a'}</span>
                  <span className="rounded-full bg-slate-50 px-2 py-1 text-slate-600">{visit.Sex || 'Sex n/a'}</span>
                </div>
              </div>
            )}
          </Link>
        ))}
      </section>
      )}
    </main>
  );
}

function LoadingState({ label }) {
  return (
    <section className="panel flex items-center gap-3 text-sm text-slate-600">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-interpath-blue">
        <RefreshCw className="animate-spin" size={18} />
      </span>
      <span>{label}</span>
    </section>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDateFrom(role) {
  const daysBack = role === 'Clinic_Doctor' ? 30 : 5;
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function formatSlisDate(value) {
  if (/^\d{8}$/.test(value)) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, yyyy, mm, dd] = match;
  return `${dd}${mm}${yyyy}`;
}
