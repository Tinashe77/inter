import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, LockKeyhole, LogIn, UserRound } from 'lucide-react';
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
    defaultValues: { usertype: 'Employee' }
  });

  async function onSubmit(values) {
    setError('');
    try {
      const user = await login(values);
      navigate(user?.usertype === 'Employee' ? '/branch-selection' : '/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="space-y-4 rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-2xl shadow-blue-950/15 backdrop-blur" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to securely access laboratory visits and results.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Account type</label>
        <div className="relative"><Badge className="pointer-events-none absolute right-10 top-3.5 z-10 text-interpath-blue" size={18} /><select className="field pr-16" {...register('usertype')}>
          <option value="Patient">Patient</option>
          <option value="Clinic_Doctor">Clinic / Doctor</option>
          <option value="Employee">Employee</option>
        </select></div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Username</label>
        <div className="relative"><UserRound className="pointer-events-none absolute right-4 top-3.5 text-interpath-blue" size={18} /><input className="field pr-11" {...register('username')} autoComplete="username" /></div>
        {errors.username && <p className="mt-1 text-xs text-interpath-red">{errors.username.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Password</label>
        <div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-3.5 text-interpath-blue" size={18} /><input className="field pr-11" type="password" {...register('password')} autoComplete="current-password" /></div>
        {errors.password && <p className="mt-1 text-xs text-interpath-red">{errors.password.message}</p>}
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}
      <button className="btn-primary w-full" disabled={isSubmitting}>
        <LogIn size={16} />
        {isSubmitting ? 'Signing in…' : 'Sign in securely'}
      </button>
      <div className="grid gap-2 text-center text-sm sm:flex sm:justify-between sm:text-left">
        <Link className="font-normal text-interpath-blue" to="/register">Patient registration</Link>
        <Link className="font-normal text-slate-600" to="/forgot-password">Forgot password</Link>
      </div>
    </form>
  );
}
