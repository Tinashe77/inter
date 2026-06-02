import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, RefreshCw, Search } from 'lucide-react';
import { http } from '../api/http.js';

export function ClinicsPage() {
  const [clinics, setClinics] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadClinics() {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get('/clinics');
      setClinics(data.clinics || []);
      setMessage(data.message || '');
    } catch (err) {
      setClinics([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClinics();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clinics;
    return clinics.filter((clinic) => [
      clinic.ClinicNo,
      clinic.ClinicName,
      clinic.Address,
      clinic.Doctor,
      clinic.phone,
      clinic.email
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [clinics, query]);

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-normal text-interpath-blue">Clinic directory</p>
          <h2 className="mt-1 text-2xl font-normal leading-tight sm:text-3xl">Clinics</h2>
          <p className="mt-2 text-sm font-normal text-slate-600">{message || `${clinics.length} clinics loaded from SLIS.`}</p>
        </div>
        <button className="btn-primary w-full lg:w-auto" type="button" onClick={loadClinics} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
          {loading ? 'Loading' : 'Refresh'}
        </button>
      </section>

      <section className="panel">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="field pl-10" placeholder="Search clinic, doctor, address, phone, or email" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}
      {loading && <LoadingState />}
      {!loading && !error && filtered.length === 0 && <p className="panel text-sm text-slate-600">No clinics found.</p>}

      {!loading && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((clinic) => (
            <Link
              className="panel block min-w-0 transition hover:-translate-y-0.5 hover:border-interpath-blue"
              key={clinic.ClinicNo || clinic.ClinicName}
              state={{ clinic }}
              to={`/clinics/${encodeURIComponent(clinic.ClinicNo || clinic.ClinicName)}`}
            >
              <div className="flex items-start gap-3">
                <span className="icon-bubble">
                  <Building2 size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-normal">{clinic.ClinicName || 'Unnamed clinic'}</p>
                  <p className="truncate text-sm text-slate-600">Clinic #{clinic.ClinicNo || '-'}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p className="line-clamp-2">{clinic.Address || 'Address not provided'}</p>
                <p className="truncate">{clinic.Doctor || 'Doctor not provided'}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

function LoadingState() {
  return (
    <section className="panel flex items-center gap-3 text-sm text-slate-600">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-interpath-blue">
        <RefreshCw className="animate-spin" size={18} />
      </span>
      <span>Loading clinics from SLIS...</span>
    </section>
  );
}
