import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
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
    <main className="space-y-5">
      <section><p className="text-sm font-medium text-interpath-blue">Employee branch</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Select your branch</h2><p className="mt-2 text-sm text-slate-500">Daily visits will be requested from SLIS for this branch.</p></section>
      <form className="space-y-5" onSubmit={submitBranch}>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Branch or location</label>
          <div className="relative"><MapPin className="pointer-events-none absolute right-4 top-3.5 text-interpath-blue" size={19} /><input className="field pr-12" value={branch} onChange={(event) => setBranch(event.target.value.toUpperCase())} placeholder="ALL, HARARE, BULAWAYO..." /></div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickBranches.map((item) => (
            <button className={`min-h-10 rounded-2xl border px-4 py-2 text-xs font-semibold transition ${branch === item ? 'border-interpath-blue bg-interpath-blue text-white shadow-lg shadow-blue-500/20' : 'border-blue-100 bg-white text-slate-600'}`} type="button" onClick={() => setBranch(item)} key={item}>
              {branch === item && <CheckCircle2 className="mr-1 inline" size={14} />}{item}
            </button>
          ))}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}

        <button className="btn-primary w-full" type="submit">
          <CheckCircle2 size={16} />
          Continue to visits
        </button>
      </form>
    </main>
  );
}
