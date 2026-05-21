import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Download, Loader2, MessageCircle } from 'lucide-react';
import { apiPath, http } from '../api/http.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function VisitDetailPage() {
  const { labNumber } = useParams();
  const { state } = useLocation();
  const visit = state?.visit;
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState('');
  const [covidMessage, setCovidMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadResults() {
      setLoading(true);
      setError('');
      setPayload(null);
      try {
        const { data } = await http.get(`/results/${labNumber}`);
        if (!active) return;
        setPayload(data);
      } catch (err) {
        if (!active) return;
        setError(err.message);
        setPayload({ results: [], message: err.message, metadata: null, pdfGenerated: false });
      } finally {
        if (active) setLoading(false);
      }
    }
    loadResults();
    return () => {
      active = false;
    };
  }, [labNumber]);

  const patientDetails = payload?.metadata?.patientDetails || {};
  const credentials = payload?.metadata?.credentials?.[0] || {};
  const displayVisit = { ...(visit || {}), ...patientDetails };
  const grouped = useMemo(() => groupResults(payload?.results || []), [payload]);
  const resultCount = payload?.results?.filter((row) => hasResultValue(row)).length || 0;

  async function shareWhatsApp() {
    const phone = sharePhone || displayVisit?.PhoneNumber || '';
    const { data } = await http.post(`/results/${labNumber}/share-whatsapp`, { phoneNumber: phone });
    const pdfLink = data.shareUrl;
    const text = `Good day ${displayVisit?.PatientName || 'Patient'}, your Interpath lab results for visit ${labNumber} are now available. Please find your result report here: ${pdfLink}. Kindly consult your doctor for interpretation of the results.`;
    setShareOpen(false);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  async function requestCovidCertificate() {
    try {
      const { data } = await http.get(`/results/${labNumber}/covid-certificate`);
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
      setCovidMessage(data.response || data.message || data.status || 'Certificate request completed.');
    } catch (err) {
      setCovidMessage(err.message);
    }
  }

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-normal">{displayVisit?.PatientName || labNumber}</h2>
            <p className="break-words text-sm text-slate-600">{labNumber} · {displayVisit?.VisitDate}</p>
          </div>
          {displayVisit?.Status && <StatusBadge status={displayVisit.Status} />}
        </div>
        {(visit || payload?.metadata?.patientDetails) && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <Detail label="Clinic" value={displayVisit.Clinic} />
            <Detail label="Doctor" value={displayVisit.Doctor} />
            <Detail label="Payment" value={displayVisit.PaymentMode} />
            <Detail label="OLB number" value={displayVisit.OLBNumber} />
            <Detail label="Phone" value={displayVisit.PhoneNumber} />
            <Detail label="Date of birth" value={displayVisit.DateOfBirth} />
            <Detail label="Sex" value={displayVisit.Sex} />
            <Detail label="Critical" value={displayVisit.Critical} />
            <Detail label="Clinical data" value={displayVisit.ClinicalData} />
            <Detail label="Tests" value={displayVisit.Tests} />
          </dl>
        )}
      </section>
      {loading && (
        <section className="panel flex items-center gap-3 text-sm text-slate-600">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-interpath-blue">
            <Loader2 className="animate-spin" size={18} />
          </span>
          <span>Pulling result details from SLIS...</span>
        </section>
      )}
      {!loading && (error || payload?.message) && <p className="rounded-lg bg-blue-50 p-3 text-sm text-interpath-blue ring-1 ring-blue-100">{payload?.message || error}</p>}
      {!loading && (payload?.pdfGenerated || payload) && (
        <section className="panel grid gap-2 sm:flex sm:flex-wrap">
          <a className="btn-primary w-full sm:w-auto" href={apiPath(`/api/results/${encodeURIComponent(labNumber)}/pdf?download=1`)} target="_blank" rel="noreferrer">
            <Download size={16} />
            Download PDF
          </a>
          {payload?.pdfGenerated && (
            <a className="btn-primary w-full sm:w-auto" href={payload.pdfUrl} target="_blank" rel="noreferrer">
              <Download size={16} />
              Preview PDF
            </a>
          )}
          <button className="btn-secondary w-full sm:w-auto" onClick={() => {
            setSharePhone(displayVisit?.PhoneNumber || '');
            setShareOpen(true);
          }} disabled={!payload?.pdfGenerated}>
            <MessageCircle size={16} />
            Share via WhatsApp
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={requestCovidCertificate}>Covid Certificate</button>
        </section>
      )}
      {!loading && payload?.metadata && (
        <section className="panel grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
          <Detail label="PDF status" value={payload.metadata.pdfStatus || 'Not generated'} />
          <Detail label="Reported by" value={payload.metadata.reportedBy} />
          <Detail label="Authorized by" value={payload.metadata.authorizedBy} />
          <Detail label="Report date" value={credentials.ReportDate} />
          <Detail label="Result values" value={resultCount || '-'} />
          {payload.metadata.resultsToFollow && <p className="rounded-lg bg-amber-50 p-3 font-normal text-interpath-amber sm:col-span-3">Some results are still pending.</p>}
        </section>
      )}
      {covidMessage && <p className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">{covidMessage}</p>}
      {shareOpen && (
        <section className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/50 px-3 pb-3 sm:items-center sm:px-4 sm:pb-0">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <h3 className="text-lg font-normal">Confirm sharing</h3>
            <p className="mt-2 text-sm text-slate-600">Only a secure PDF link will be shared. Raw medical result values will not be included in the WhatsApp message.</p>
            <label className="mt-4 block text-sm font-normal">Patient phone number</label>
            <input className="field mt-1" value={sharePhone} onChange={(event) => setSharePhone(event.target.value)} />
            <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
              <button className="btn-secondary" onClick={() => setShareOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={shareWhatsApp}>Open WhatsApp</button>
            </div>
          </div>
        </section>
      )}
      {!loading && payload && grouped.length === 0 && (
        <section className="panel text-sm text-slate-600">
          {displayVisit?.Status?.toLowerCase().includes('pending')
            ? 'This visit is still pending. Result values will appear here once SLIS has completed them.'
            : 'No result values are available for this visit yet. The visit information above is still available for review.'}
        </section>
      )}
      {!loading && grouped.map((departmentGroup) => (
        <section className="panel" key={departmentGroup.department}>
          <h3 className="font-normal text-interpath-blue">{departmentGroup.department}</h3>
          {departmentGroup.profiles.map((profileGroup) => (
            <div className="mt-4" key={profileGroup.profile}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-normal">{profileGroup.profile}</h4>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-interpath-blue">{profileGroup.resultCount} values</span>
              </div>
              <div className="grid gap-2 sm:hidden">
                {profileGroup.rows.map((row, index) => (
                  isCommentOnly(row) ? (
                    <p className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700 ring-1 ring-blue-100" key={`${row.Test || 'comment'}-${index}`}>
                      {row.Comment || row.Fcomment}
                    </p>
                  ) : (
                    <article className="result-card" key={`${row.Test}-${index}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-normal text-slate-900">{row.Test || 'Result item'}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.Range || 'No reference range'}</p>
                        </div>
                        {row.Flag ? <span className={flagClass(row.Flag)}>{row.Flag}</span> : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="result-label">Result</p>
                          <p className="result-value">{row.Result || '-'}</p>
                        </div>
                        <div>
                          <p className="result-label">Units</p>
                          <p className="result-value">{row.Units || '-'}</p>
                        </div>
                      </div>
                      {(row.Comment || row.Fcomment) && (
                        <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">{row.Comment || row.Fcomment}</p>
                      )}
                    </article>
                  )
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Test</th>
                    <th>Result</th>
                    <th>Units</th>
                    <th>Flag</th>
                    <th>Range</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {profileGroup.rows.map((row, index) => (
                    isCommentOnly(row) ? (
                      <tr className="border-b border-slate-100 bg-blue-50/50" key={`${row.Test || 'comment'}-${index}`}>
                        <td className="py-3 text-slate-600" colSpan={6}>{row.Comment || row.Fcomment}</td>
                      </tr>
                    ) : (
                      <tr className="border-b border-slate-100" key={`${row.Test}-${index}`}>
                        <td className="py-2">{row.Test}</td>
                        <td className="font-normal">{row.Result || '-'}</td>
                        <td>{row.Units || '-'}</td>
                        <td>
                          {row.Flag ? <span className={flagClass(row.Flag)}>{row.Flag}</span> : '-'}
                        </td>
                        <td>{row.Range || '-'}</td>
                        <td>{row.Comment || row.Fcomment || '-'}</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
              </div>
              {profileGroup.comments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {profileGroup.comments.map((comment, index) => (
                    <p className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700 ring-1 ring-blue-100" key={`${profileGroup.profile}-comment-${index}`}>
                      {comment}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="font-normal">{value || '-'}</dd>
    </div>
  );
}

function groupResults(rows) {
  const grouped = rows.reduce((acc, row) => {
    const department = row.Department || 'Other';
    const profile = row.Profile || 'General';
    acc[department] ||= {};
    acc[department][profile] ||= [];
    acc[department][profile].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([department, profiles]) => ({
      department,
      order: Math.min(...Object.values(profiles).flat().map((row) => Number(row.ProfileOrder ?? 9999))),
      profiles: Object.entries(profiles)
        .map(([profile, profileRows]) => {
          const sortedRows = [...profileRows].sort((a, b) => Number(a.ResultOrder ?? 9999) - Number(b.ResultOrder ?? 9999));
          const comments = uniqueValues(sortedRows.flatMap((row) => [row.autoComment, row.additionalComment, row.profileComment]).filter(Boolean));
          return {
            profile,
            order: Math.min(...sortedRows.map((row) => Number(row.ProfileOrder ?? 9999))),
            resultCount: sortedRows.filter((row) => hasResultValue(row)).length,
            rows: sortedRows,
            comments
          };
        })
        .sort((a, b) => a.order - b.order || a.profile.localeCompare(b.profile))
    }))
    .sort((a, b) => a.order - b.order || a.department.localeCompare(b.department));
}

function hasResultValue(row) {
  const value = String(row?.Result || '').trim();
  return Boolean(value && value !== '-');
}

function isCommentOnly(row) {
  return !String(row?.Test || '').trim() && !String(row?.Result || '').trim() && Boolean(String(row?.Comment || row?.Fcomment || '').trim());
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function flagClass(flag) {
  const abnormal = ['H', 'L'].includes(String(flag).toUpperCase());
  return abnormal
    ? 'rounded-full bg-red-50 px-2 py-1 text-xs font-normal text-interpath-red ring-1 ring-red-100'
    : 'text-slate-600';
}
