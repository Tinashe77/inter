import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuthStore } from './authStore.js';

const schema = z.object({
  usertype: z.enum(['Patient', 'Clinic_Doctor', 'Employee']),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { usertype: 'Patient' }
  });

  async function onSubmit(values) {
    setError('');
    try {
      await login(values);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="metric-strip flex items-center gap-3">
        <span className="icon-bubble">
          <ShieldCheck size={19} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-interpath-text">Secure access</span>
          <span className="block truncate text-xs font-normal text-slate-500">Protected SLIS session</span>
        </span>
      </div>
      <div>
        <label className="mb-1 block text-sm font-normal">User type</label>
        <select className="field" {...register('usertype')}>
          <option value="Patient">Patient</option>
          <option value="Clinic_Doctor">Clinic / Doctor</option>
          <option value="Employee">Employee</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-normal">Username</label>
        <input className="field" {...register('username')} autoComplete="username" />
        {errors.username && <p className="mt-1 text-xs text-interpath-red">{errors.username.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-normal">Password</label>
        <input className="field" type="password" {...register('password')} autoComplete="current-password" />
        {errors.password && <p className="mt-1 text-xs text-interpath-red">{errors.password.message}</p>}
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}
      <button className="btn-primary w-full" disabled={isSubmitting}>
        <LogIn size={16} />
        Sign in
      </button>
      <div className="grid gap-2 text-center text-sm sm:flex sm:justify-between sm:text-left">
        <Link className="font-normal text-interpath-blue" to="/register">Patient registration</Link>
        <Link className="font-normal text-slate-600" to="/forgot-password">Forgot password</Link>
      </div>
      <Link className="block text-center text-sm font-normal text-slate-600" to="/device-registration">Register this device</Link>
    </form>
  );
}
