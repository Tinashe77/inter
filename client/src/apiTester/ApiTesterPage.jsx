import { useMemo, useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { http } from '../api/http.js';

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function ApiTesterPage() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/clinics/na');
  const [includeBearerToken, setIncludeBearerToken] = useState(true);
  const [params, setParams] = useState([{ key: '', value: '' }]);
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [bodyText, setBodyText] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSendBody = !['GET', 'DELETE'].includes(method);
  const previewUrl = useMemo(() => buildPreviewUrl(endpoint, params), [endpoint, params]);

  async function sendRequest() {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const parsedBody = canSendBody && bodyText.trim() ? JSON.parse(bodyText) : undefined;
      const { data } = await http.post('/tester/request', {
        method,
        endpoint,
        params: pairsToObject(params),
        headers: pairsToObject(headers),
        body: parsedBody,
        includeBearerToken
      });
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band">
        <p className="text-sm font-normal text-interpath-blue">SLIS API tester</p>
        <h2 className="mt-1 text-2xl font-normal leading-tight sm:text-3xl">Test an endpoint</h2>
        <p className="mt-2 text-sm text-slate-600">Run authenticated SLIS requests without exposing the token in the browser.</p>
      </section>

      <section className="panel space-y-4">
        <div className="grid gap-3 lg:grid-cols-[160px_1fr]">
          <label>
            <span className="mb-1 block text-sm font-normal">Method</span>
            <select className="field" value={method} onChange={(event) => setMethod(event.target.value)}>
              {methods.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-normal">Endpoint</span>
            <input className="field" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="/api/clinics/na" />
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-lg bg-blue-50/70 px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeBearerToken} onChange={(event) => setIncludeBearerToken(event.target.checked)} />
          Include logged-in SLIS bearer token
        </label>

        <KeyValueEditor title="Query parameters" rows={params} setRows={setParams} />
        <KeyValueEditor title="Headers" rows={headers} setRows={setHeaders} />

        {canSendBody && (
          <label className="block">
            <span className="mb-1 block text-sm font-normal">JSON body</span>
            <textarea className="field min-h-36 font-mono text-sm" value={bodyText} onChange={(event) => setBodyText(event.target.value)} placeholder='{"Username":"..."}' />
          </label>
        )}

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <span className="block text-slate-500">Preview</span>
          <span className="break-all font-mono">{previewUrl}</span>
        </div>

        <button className="btn-primary w-full sm:w-auto" type="button" onClick={sendRequest} disabled={loading}>
          <Play size={16} />
          {loading ? 'Sending...' : 'Send request'}
        </button>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}

      {response && (
        <section className="panel space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <Detail label="Status" value={`${response.status} ${response.statusText || ''}`} />
            <Detail label="Duration" value={`${response.durationMs} ms`} />
            <Detail label="Content type" value={response.headers?.['content-type']} />
            <Detail label="Date" value={response.headers?.date} />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-slate-500">Requested URL</p>
            <p className="break-all rounded-lg bg-blue-50 p-3 font-mono text-xs text-interpath-blue">{response.requestedUrl}</p>
          </div>
          <pre className="max-h-[520px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(response.data, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

function KeyValueEditor({ title, rows, setRows }) {
  function updateRow(index, field, value) {
    setRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  function removeRow(index) {
    setRows(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-normal">{title}</h3>
        <button className="btn-secondary min-h-9 px-3 py-2 text-xs" type="button" onClick={() => setRows([...rows, { key: '', value: '' }])}>
          <Plus size={14} />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" key={index}>
            <input className="field" value={row.key} onChange={(event) => updateRow(index, 'key', event.target.value)} placeholder="Key" />
            <input className="field" value={row.value} onChange={(event) => updateRow(index, 'value', event.target.value)} placeholder="Value" />
            <button className="btn-secondary px-3" type="button" onClick={() => removeRow(index)} aria-label={`Remove ${title} row`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="break-words font-normal">{value || '-'}</p>
    </div>
  );
}

function pairsToObject(rows) {
  return rows.reduce((acc, row) => {
    const key = row.key.trim();
    if (key) acc[key] = row.value;
    return acc;
  }, {});
}

function buildPreviewUrl(endpoint, params) {
  const query = new URLSearchParams(pairsToObject(params)).toString();
  return `${endpoint || '/'}${query ? `?${query}` : ''}`;
}
