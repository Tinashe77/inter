import { useState } from 'react';
import { http } from '../api/http.js';

const reportOptions = [
  ['main', 'Main Report'],
  ['Clinics Summary', 'Clinics Summary'],
  ['Tests Count', 'Tests Count'],
  ['TAT Report', 'TAT Report']
];

export function ReportsPage() {
  const [reportName, setReportName] = useState('main');
  const [branch, setBranch] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  async function loadReport() {
    setError('');
    try {
      const endpoint = reportName === 'main' ? '/reports/main' : `/reports/${encodeURIComponent(reportName)}`;
      const { data } = await http.post(endpoint, { branch, dateFrom, dateTo, page: 1 });
      setReport(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band">
        <p className="text-sm font-normal text-interpath-blue">Employee reports</p>
        <h2 className="mt-1 text-2xl font-normal leading-tight sm:text-3xl">Reports</h2>
        <p className="text-sm text-slate-600">Employee-only operational reports.</p>
      </section>
      <section className="panel grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <select className="field" value={reportName} onChange={(event) => setReportName(event.target.value)}>
          {reportOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <input className="field" value={branch} onChange={(event) => setBranch(event.target.value)} />
        <input className="field" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <button className="btn-primary sm:col-span-2 xl:col-span-1" onClick={loadReport}>Run</button>
      </section>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}
      {report && <ReportTable report={report} reportName={reportName} />}
    </main>
  );
}

function ReportTable({ report, reportName }) {
  const header = report.ReportHeader || Object.keys(report.MainData?.[0] || {});
  const rows = report.ReportData || report.MainData || [];
  const csv = [header, ...rows.map((row) => header.map((key, cellIndex) => Array.isArray(row) ? row[cellIndex] : row[key]))]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');

  return (
    <section className="panel">
      <div className="mb-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{report.Message || `${rows.length} records`}</p>
        <a
          className="btn-secondary w-full sm:w-auto"
          download={`${reportName.replaceAll(' ', '_')}.csv`}
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
        >
          Export CSV
        </a>
      </div>
      <div className="grid gap-2 sm:hidden">
        {rows.map((row, index) => (
          <article className="result-card" key={index}>
            {header.map((key, cellIndex) => (
              <div className="border-b border-blue-50 py-2 last:border-0" key={key}>
                <p className="result-label">{key}</p>
                <p className="result-value">{Array.isArray(row) ? row[cellIndex] : row[key]}</p>
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>{header.map((cell) => <th className="py-2 pr-4" key={cell}>{cell}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="border-b border-slate-100" key={index}>
                {header.map((key, cellIndex) => <td className="py-2 pr-4" key={key}>{Array.isArray(row) ? row[cellIndex] : row[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
