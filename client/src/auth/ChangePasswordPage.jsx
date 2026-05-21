import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { http } from '../api/http.js';
import { useAuthStore } from './authStore.js';

export function ChangePasswordPage() {
  const user = useAuthStore((state) => state.user);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { username: user?.username || '' }
  });

  async function onSubmit(values) {
    setError('');
    setMessage('');
    try {
      const { data } = await http.put('/auth/change-password', values);
      setMessage(data.response || data.message || 'Password changed.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (user?.usertype === 'Employee') {
    return <main className="panel text-sm text-slate-600">Employee password changes are handled by the SLIS ICT administrator.</main>;
  }

  return (
    <main className="space-y-4">
      <section>
        <h2 className="text-xl font-normal">Change Password</h2>
        <p className="text-sm text-slate-600">Update your SLIS mobile password.</p>
      </section>
      <form className="panel space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <input className="field" placeholder="Username" {...register('username', { required: true })} />
        <input className="field" placeholder="Current password" type="password" {...register('password', { required: true })} />
        <input className="field" placeholder="New password" type="password" {...register('newPassword', { required: true, minLength: 8 })} />
        {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-interpath-green">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}
        <button className="btn-primary" disabled={isSubmitting}>Change password</button>
      </form>
    </main>
  );
}
