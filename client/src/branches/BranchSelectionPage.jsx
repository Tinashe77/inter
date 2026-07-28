import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../auth/authStore.js';

const quickBranches = ['HARARE', 'BULAWAYO', 'MUTARE', 'CHITUNGWIZA', 'GWERU', 'BINDURA', 'MASVINGO', 'KWEKWE', 'ALL'];

export function BranchSelectionPage() {
  const navigate = useNavigate();
  const currentBranch = useAuthStore((state) => state.employeeBranch);
  const setEmployeeBranch = useAuthStore((state) => state.setEmployeeBranch);
  const [branch, setBranch] = useState(currentBranch || 'ALL');
  const [error, setError] = useState('');

  function submitBranch(event) {
    event.preventDefault();
    const value = branch.trim();
    if (!value) {
      setError('Select or enter a branch before continuing.');
      return;
    }
    setEmployeeBranch(value);
    navigate('/visits');
  }

  return (
    <main className="space-y-3 sm:space-y-4">
      <section className="hero-band">
        <p className="text-sm font-normal text-interpath-blue">Employee branch</p>
        <h2 className="mt-1 text-2xl font-normal leading-tight sm:text-3xl">Select your branch</h2>
        <p className="mt-2 max-w-xl text-sm font-normal text-slate-600">Daily visits will be pulled from SLIS using the branch selected here.</p>
      </section>

      <form className="panel space-y-4" onSubmit={submitBranch}>
        <div className="metric-strip flex items-center gap-3">
          <span className="icon-bubble">
            <Building2 size={19} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-interpath-text">Current selection</span>
            <span className="block truncate text-xs font-normal text-slate-500">{branch || 'No branch selected'}</span>
          </span>
        </div>

        <div>
          <label className="mb-1 block text-sm font-normal">Branch or location</label>
          <input className="field" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="ALL, HARARE, BULAWAYO..." />
        </div>

        <div className="flex flex-wrap gap-2">
          {quickBranches.map((item) => (
            <button className="btn-secondary min-h-9 px-3 py-2 text-xs" type="button" onClick={() => setBranch(item)} key={item}>
              {item}
            </button>
          ))}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}

        <button className="btn-primary w-full sm:w-auto" type="submit">
          <CheckCircle2 size={16} />
          Continue to visits
        </button>
      </form>
    </main>
  );
}
