import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, History, Loader2, MapPin, MessageCircle, RefreshCw, RotateCcw, Search, Send, ShieldCheck, X, XCircle } from 'lucide-react';
import { http } from '../api/http.js';
import { useAuthStore } from '../auth/authStore.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

const RESULT_TABS = [
  { id: 'results', label: 'Results' },
  { id: 'bulk', label: 'Bulk send' },
  { id: 'history', label: 'Send history' }
];

export function VisitsPage() {
  const user = useAuthStore((state) => state.user);
  const employeeBranch = useAuthStore((state) => state.employeeBranch);
  const [visits, setVisits] = useState([]);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(() => defaultDateFrom(user?.usertype));
  const [dateTo, setDateTo] = useState(() => todayIso());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [reviewVisits, setReviewVisits] = useState([]);
  const [sendSummary, setSendSummary] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [retryingId, setRetryingId] = useState('');

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
          ? `/visits?date=${formatSlisDate(to)}&branch=${encodeURIComponent(employeeBranch || 'ALL')}`
          : `/visits?dateFrom=${from}&dateTo=${to}`;
      const { data } = await http.get(endpoint);
      setVisits(applyEmployeeBranchFilter(data.visits || [], user.usertype, employeeBranch));
      setSelected(new Set());
      setMessage(data.message || '');
    } catch (err) {
      setVisits([]);
      setError(err.message);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }

  async function loadAttempts() {
    if (user.usertype !== 'Employee') return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const { data } = await http.get('/results/whatsapp-attempts');
      setAttempts(data.attempts || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    const nextDateFrom = defaultDateFrom(user?.usertype);
    const nextDateTo = todayIso();
    setDateFrom(nextDateFrom);
    setDateTo(nextDateTo);
    loadVisits({ dateFrom: nextDateFrom, dateTo: nextDateTo });
  }, [employeeBranch, user?.usertype]);

  useEffect(() => {
    if (activeTab === 'history') loadAttempts();
  }, [activeTab]);

  const filtered = useMemo(() => filterVisits(visits, query), [query, visits]);
  const bulkEligible = useMemo(
    () => filterVisits(visits.filter((visit) => isCompleted(visit.Status) && visit.CanSendToDoctor === true), query),
    [query, visits]
  );
  const selectedEligible = bulkEligible.filter((visit) => selected.has(visit.LabNumber));
  const allSelected = bulkEligible.length > 0 && bulkEligible.every((visit) => selected.has(visit.LabNumber));

  function toggleSelected(labNumber) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(labNumber)) next.delete(labNumber);
      else next.add(labNumber);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allSelected) bulkEligible.forEach((visit) => next.delete(visit.LabNumber));
      else bulkEligible.forEach((visit) => next.add(visit.LabNumber));
      return next;
    });
  }

  function openBulkReview() {
    const chosen = selectedEligible;
    if (!chosen.length) return;
    setReviewVisits(chosen);
  }

  async function sendBulk(chosen) {
    if (!chosen.length || sending) return;
    setReviewVisits([]);
    setSending(true);
    setProcessingCount(chosen.length);
    setSendSummary(null);
    try {
      const { data } = await http.post('/results/bulk-whatsapp/send', {
        date: dateTo,
        branch: employeeBranch || 'ALL',
        labNumbers: chosen.map((visit) => visit.LabNumber)
      });
      const sentLabs = new Set((data.results || []).filter((item) => item.status === 'sent').map((item) => item.labNumber));
      setSelected((current) => new Set([...current].filter((lab) => !sentLabs.has(lab))));
      setSendSummary(data);
      await loadAttempts();
    } catch (err) {
      setSendSummary({ status: 'failed', sent: 0, failed: chosen.length, results: [], message: err.message });
    } finally {
      setSending(false);
      setProcessingCount(0);
    }
  }

  async function retryAttempt(attempt) {
    if (!window.confirm(`Retry ${attempt.labNumber} to ${attempt.recipientName} (${attempt.destination})? A new secure link will be created.`)) return;
    setRetryingId(attempt.id);
    setHistoryError('');
    try {
      await http.post(`/results/whatsapp-attempts/${encodeURIComponent(attempt.id)}/retry`);
      await loadAttempts();
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setRetryingId('');
    }
  }

  const showVisitControls = activeTab !== 'history';
  const visibleVisits = activeTab === 'bulk' ? bulkEligible : filtered;

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-normal text-interpath-blue">{user.usertype === 'Employee' ? 'Laboratory result centre' : 'Laboratory visits'}</p>
          <h2 className="mt-1 text-2xl font-normal leading-tight sm:text-3xl">{user.usertype === 'Employee' ? 'Results and delivery' : 'Patient visits'}</h2>
          <p className="mt-2 text-sm font-normal text-slate-600">{user.usertype === 'Employee' ? `Review results and send approved reports for ${employeeBranch || 'ALL'}.` : 'Search visits and open result details.'}</p>
        </div>
        {showVisitControls && user.usertype === 'Employee' && (
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[180px_220px]">
            <label className="field flex min-h-11 items-center gap-2 py-2 text-sm"><MapPin size={16} className="text-interpath-blue" /><span className="truncate">{employeeBranch || 'ALL'}</span><Link className="ml-auto text-xs text-interpath-blue" to="/branch-selection">Change</Link></label>
            <input className="field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        )}
        {showVisitControls && user.usertype === 'Clinic_Doctor' && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto"><input className="field" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><input className="field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div>
        )}
        {showVisitControls && <button className="btn-primary w-full lg:w-auto" onClick={() => loadVisits()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} size={16} />{loading ? 'Loading' : 'Refresh'}</button>}
        {activeTab === 'history' && <button className="btn-primary w-full lg:w-auto" onClick={loadAttempts} disabled={historyLoading}><RefreshCw className={historyLoading ? 'animate-spin' : ''} size={16} />Refresh statuses</button>}
      </section>

      {user.usertype === 'Employee' && (
        <nav className="panel grid grid-cols-3 gap-2 p-2" aria-label="Result sections">
          {RESULT_TABS.map((tab) => <button key={tab.id} className={`rounded-lg px-2 py-3 text-sm transition ${activeTab === tab.id ? 'bg-interpath-blue text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-blue-50'}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
        </nav>
      )}

      {showVisitControls && <div className="panel"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} /><input className="field pl-10" placeholder="Search patient, lab number, test, or clinic" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>}

      {activeTab === 'bulk' && !loading && (
        <section className="panel space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3"><input className="h-5 w-5 accent-interpath-blue" type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!bulkEligible.length} /><span><strong className="font-medium">Select all valid</strong><span className="block text-xs text-slate-500">{bulkEligible.length} completed result{bulkEligible.length === 1 ? '' : 's'} ready</span></span></label>
            <button className="btn-primary" onClick={openBulkReview} disabled={sending || selectedEligible.length === 0}><Send size={16} />{sending ? 'Processing results…' : `Send via WhatsApp (${selectedEligible.length})`}</button>
          </div>
          <p className="text-xs text-slate-500">Only completed results with exactly one server-validated doctor number appear here. Each recipient gets a separate secure report link through the official WhatsApp Cloud API.</p>
        </section>
      )}

      {sendSummary && activeTab === 'bulk' && <SendSummary summary={sendSummary} onHistory={() => setActiveTab('history')} />}
      {loading && showVisitControls && <LoadingState label="Pulling visit data from SLIS..." />}
      {!loading && showVisitControls && error && <Notice tone="error">{error}</Notice>}
      {!loading && showVisitControls && !error && message && <Notice>{message}</Notice>}
      {!loading && showVisitControls && hasLoaded && visibleVisits.length === 0 && <p className="panel text-sm text-slate-600">{activeTab === 'bulk' ? 'No completed results have one valid doctor number yet.' : 'No visits found.'}</p>}

      {!loading && showVisitControls && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleVisits.map((visit) => activeTab === 'bulk' ? (
            <BulkVisitCard key={visit.LabNumber} visit={visit} selected={selected.has(visit.LabNumber)} onToggle={() => toggleSelected(visit.LabNumber)} />
          ) : (
            <VisitCard key={visit.LabNumber} visit={visit} showEmployeeDetails={user.usertype === 'Employee'} />
          ))}
        </section>
      )}

      {activeTab === 'history' && <SendHistory attempts={attempts} loading={historyLoading} error={historyError} retryingId={retryingId} onRetry={retryAttempt} />}
      {reviewVisits.length > 0 && <BulkSendReviewModal visits={reviewVisits} onClose={() => setReviewVisits([])} onApprove={() => sendBulk(reviewVisits)} />}
      {sending && <SendingProgress count={processingCount} />}
    </main>
  );
}

function BulkSendReviewModal({ visits, onClose, onApprove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl shadow-blue-950/25" role="dialog" aria-modal="true" aria-labelledby="bulk-review-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="relative overflow-hidden border-b border-blue-100 px-5 py-5 sm:px-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-interpath-blue to-blue-500 text-white shadow-lg shadow-blue-500/25"><ShieldCheck size={24} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-interpath-blue">Secure approval</p>
              <h3 id="bulk-review-title" className="mt-1 text-xl font-medium text-slate-900">Review {visits.length} WhatsApp result{visits.length === 1 ? '' : 's'}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">Confirm each result is paired with the correct doctor before sending.</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900" aria-label="Close approval"><X size={19} /></button>
          </div>
        </header>

        <div className="max-h-[48vh] space-y-2 overflow-y-auto px-5 py-4 sm:px-6">
          {visits.map((visit) => (
            <article key={visit.LabNumber} className="rounded-2xl border border-blue-100 bg-gradient-to-r from-white to-blue-50/60 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate font-medium text-slate-900">{visit.PatientName || 'Unnamed patient'}</p><span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-interpath-blue">{visit.LabNumber}</span></div>
                  <p className="mt-2 text-sm text-slate-700">{visit.Doctor || visit.RecipientClinicName || 'Doctor'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">WhatsApp {maskPhone(visit.DoctorPhoneNumber)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="border-t border-blue-100 bg-slate-50/80 px-5 py-4 sm:px-6">
          <p className="mb-4 text-xs leading-5 text-slate-500">The server will verify every pairing again and create a separate secure report link for each recipient.</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr]">
            <button type="button" className="btn-secondary rounded-2xl" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary rounded-2xl" onClick={onApprove}><Send size={17} />Approve and send</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SendingProgress({ count }) {
  return (
    <aside className="pointer-events-none fixed bottom-5 left-3 right-3 z-40 sm:left-auto sm:right-6 sm:w-[380px]" role="status" aria-live="polite">
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-slate-950/90 p-4 text-white shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-300"><Loader2 className="animate-spin" size={22} /><span className="absolute inset-0 animate-ping rounded-xl border border-cyan-300/20" /></span>
          <div className="min-w-0 flex-1"><p className="font-medium">Processing {count} result{count === 1 ? '' : 's'}</p><p className="mt-1 text-xs leading-5 text-slate-300">Secure links are being prepared and submitted to WhatsApp. You can keep scrolling and using the app.</p></div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400" /></div>
      </div>
    </aside>
  );
}

function VisitCard({ visit, showEmployeeDetails }) {
  return <Link className="panel block min-w-0 transition hover:-translate-y-0.5 hover:border-interpath-blue" to={`/visits/${visit.LabNumber}`} state={{ visit }}>
    <VisitCardHeader visit={visit} />
    <p className="mt-3 line-clamp-2 text-sm font-normal text-slate-600">{visit.Tests}</p>
    {showEmployeeDetails && <div className="mt-3 grid gap-2 text-xs text-slate-500"><span className="truncate">{visit.VisitDate}</span><span className="truncate">{visit.Clinic}</span><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-interpath-blue">{visit.PaymentMode || 'Payment n/a'}</span><span className="rounded-full bg-slate-50 px-2 py-1 text-slate-600">{visit.Sex || 'Sex n/a'}</span></div></div>}
  </Link>;
}

function BulkVisitCard({ visit, selected, onToggle }) {
  return <button type="button" onClick={onToggle} className={`panel block min-w-0 text-left transition hover:-translate-y-0.5 ${selected ? 'border-interpath-blue ring-2 ring-interpath-blue/20' : 'hover:border-blue-200'}`}>
    <div className="flex items-start gap-3"><input className="mt-1 h-5 w-5 shrink-0 accent-interpath-blue" type="checkbox" checked={selected} onChange={onToggle} onClick={(event) => event.stopPropagation()} aria-label={`Select ${visit.LabNumber}`} /><div className="min-w-0 flex-1"><VisitCardHeader visit={visit} /><p className="mt-3 truncate text-sm text-slate-600">{visit.Tests}</p><p className="mt-3 text-sm text-emerald-700"><MessageCircle className="mr-1 inline" size={14} />To {visit.Doctor || visit.RecipientClinicName || 'Doctor'} · {maskPhone(visit.DoctorPhoneNumber)}</p></div></div>
  </button>;
}

function VisitCardHeader({ visit }) {
  return <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-normal">{visit.PatientName || 'Unnamed patient'}</p><p className="truncate text-sm font-normal text-slate-600">{visit.LabNumber} · {visit.OLBNumber || visit.VisitDate}</p></div><StatusBadge status={visit.Status} /></div>;
}

function SendSummary({ summary, onHistory }) {
  return <section className={`panel border-l-4 ${summary.failed ? 'border-l-amber-500' : 'border-l-emerald-500'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{summary.sent || 0} accepted by WhatsApp · {summary.failed || 0} failed</p><p className="mt-1 text-sm text-slate-600">Accepted means Meta received the request. Open Send history for confirmed delivery.</p>{summary.message && <p className="mt-2 text-sm text-red-600">{summary.message}</p>}</div><button className="btn-secondary" onClick={onHistory}><History size={16} />View send history</button></div>{summary.results?.some((item) => item.status !== 'sent') && <ul className="mt-3 space-y-1 text-sm text-red-600">{summary.results.filter((item) => item.status !== 'sent').map((item) => <li key={item.labNumber}>{item.labNumber}: {item.message || 'Not sent'}</li>)}</ul>}</section>;
}

function SendHistory({ attempts, loading, error, retryingId, onRetry }) {
  if (loading) return <LoadingState label="Loading WhatsApp delivery statuses..." />;
  const delivered = attempts.filter((item) => ['delivered', 'read'].includes(item.status)).length;
  const failed = attempts.filter((item) => item.status === 'failed').length;
  const pending = attempts.filter((item) => ['accepted', 'sent'].includes(item.status)).length;
  return <section className="space-y-3">{error && <Notice tone="error">{error}</Notice>}<div className="panel"><h3 className="font-medium">WhatsApp delivery tracking</h3><p className="mt-1 text-sm text-slate-600">Delivered and read are confirmed by Meta webhook updates.</p><div className="mt-4 grid grid-cols-3 gap-2"><HistoryMetric label="Successful" count={delivered} icon={CheckCircle2} tone="emerald" /><HistoryMetric label="Pending" count={pending} icon={Clock3} tone="blue" /><HistoryMetric label="Failed" count={failed} icon={XCircle} tone="red" /></div></div>{!attempts.length ? <p className="panel text-sm text-slate-600">No WhatsApp send attempts have been recorded yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{attempts.map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} retrying={retryingId === attempt.id} onRetry={() => onRetry(attempt)} />)}</div>}</section>;
}

function HistoryMetric({ label, count, icon: Icon, tone }) {
  const tones = { emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-interpath-blue', red: 'bg-red-50 text-red-600' };
  return <div className={`rounded-lg p-3 ${tones[tone]}`}><Icon size={17} /><strong className="mt-2 block text-xl font-medium">{count}</strong><span className="text-xs">{label}</span></div>;
}

function AttemptCard({ attempt, retrying, onRetry }) {
  const status = String(attempt.status || 'accepted').toLowerCase();
  const delivered = ['delivered', 'read'].includes(status);
  const failed = status === 'failed';
  const pending = ['accepted', 'sent'].includes(status);
  const age = Date.now() - new Date(attempt.createdAt).getTime();
  const canRetry = failed || (pending && age >= 2 * 60 * 1000);
  return <article className="panel"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{attempt.labNumber}</p><p className="mt-1 text-sm text-slate-600">{attempt.recipientName} · {attempt.destination}</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${delivered ? 'bg-emerald-50 text-emerald-700' : failed ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-interpath-blue'}`}>{status}</span></div><p className="mt-3 text-xs text-slate-500">Updated {formatTimestamp(attempt.statusTimestamp || attempt.createdAt)}</p>{attempt.errorMessage && <p className="mt-2 text-sm text-red-600">{attempt.errorMessage}</p>}{canRetry && <button className="btn-secondary mt-3 w-full" onClick={onRetry} disabled={retrying}><RotateCcw className={retrying ? 'animate-spin' : ''} size={15} />{retrying ? 'Retrying…' : 'Retry'}</button>}</article>;
}

function Notice({ children, tone = 'info' }) { return <p className={`rounded-lg p-3 text-sm ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-blue-50 text-interpath-blue ring-blue-100'}`}>{children}</p>; }
function LoadingState({ label }) { return <section className="panel flex items-center gap-3 text-sm text-slate-600"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-interpath-blue"><RefreshCw className="animate-spin" size={18} /></span><span>{label}</span></section>; }
function filterVisits(visits, query) { const term = query.trim().toLowerCase(); if (!term) return visits; return visits.filter((visit) => [visit.PatientName, visit.LabNumber, visit.PhoneNumber, visit.VisitDate, visit.Tests, visit.Clinic].some((value) => String(value || '').toLowerCase().includes(term))); }
function isCompleted(status) { const value = String(status || '').trim().toLowerCase(); return value.includes('complete') || value.includes('authorised') || value.includes('authorized') || value.includes('reported') || value.includes('result ready') || value === 'success' || value === 'final'; }
function maskPhone(value) { const digits = String(value || '').replace(/\D/g, ''); return digits.length < 7 ? digits : `+${digits.slice(0, 5)}•••${digits.slice(-3)}`; }
function formatTimestamp(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'recently' : date.toLocaleString(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function defaultDateFrom(role) { const daysBack = role === 'Clinic_Doctor' ? 30 : 5; const date = new Date(); date.setDate(date.getDate() - daysBack); return date.toISOString().slice(0, 10); }
function formatSlisDate(value) { if (/^\d{8}$/.test(value)) return value; const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return value; const [, yyyy, mm, dd] = match; return `${dd}${mm}${yyyy}`; }
function applyEmployeeBranchFilter(visits, usertype, branch) { const selectedBranch = normalizeLookupValue(branch); if (usertype !== 'Employee' || !selectedBranch || selectedBranch === 'all') return visits; return visits.filter((visit) => [visit.Branch, visit.branch, visit.Location, visit.location, visit.Clinic, visit.ClinicName, visit.CollectionPoint].map(normalizeLookupValue).filter(Boolean).some((value) => value === selectedBranch || value.includes(selectedBranch) || selectedBranch.includes(value))); }
function normalizeLookupValue(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
