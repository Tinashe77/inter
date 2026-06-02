import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { http } from '../api/http.js';

export function ClinicDetailPage() {
  const { clinicNo } = useParams();
  const { state } = useLocation();
  const [clinic, setClinic] = useState(state?.clinic || null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadClinicDetail() {
      setLoading(true);
      setError('');
      try {
        const params = state?.clinic?.ClinicName ? { clinicName: state.clinic.ClinicName } : {};
        const { data } = await http.get(`/clinics/${encodeURIComponent(clinicNo)}`, { params });
        setClinic(data.clinic || state?.clinic || null);
        setDetail(data.detail || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadClinicDetail();
  }, [clinicNo, state?.clinic]);

  const displayClinic = clinic || {};

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band">
        <Link className="mb-4 inline-flex items-center gap-2 text-sm font-normal text-interpath-blue" to="/clinics">
          <ArrowLeft size={16} />
          Back to clinics
        </Link>
        <div className="flex items-start gap-3">
          <span className="icon-bubble">
            <Building2 size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-normal text-interpath-blue">Clinic details</p>
            <h2 className="mt-1 break-words text-2xl font-normal leading-tight sm:text-3xl">{displayClinic.ClinicName || clinicNo}</h2>
            <p className="mt-2 text-sm text-slate-600">Clinic #{displayClinic.ClinicNo || clinicNo}</p>
          </div>
        </div>
      </section>

      {loading && (
        <section className="panel flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="animate-spin text-interpath-blue" size={18} />
          Loading clinic detail...
        </section>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}

      {!loading && !error && (
        <section className="panel grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="Clinic number" value={displayClinic.ClinicNo} />
          <Detail label="Clinic name" value={displayClinic.ClinicName} />
          <Detail label="Address" value={displayClinic.Address} />
          <Detail label="Doctor" value={displayClinic.Doctor} />
          <Detail label="Namas number" value={displayClinic.NamasNo} />
          <Detail label="Phone" value={displayClinic.phone} />
          <Detail label="Email" value={displayClinic.email} />
          <Detail label="Username" value={displayClinic.Username} />
          <Detail label="Commission" value={displayClinic.Commission} />
        </section>
      )}

      {!loading && detail && (
        <section className="panel space-y-2">
          <p className="text-sm font-normal text-slate-700">Raw SLIS response</p>
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(detail, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-normal text-slate-800">{value || '-'}</p>
    </div>
  );
}
