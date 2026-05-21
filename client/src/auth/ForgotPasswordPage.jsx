import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { http } from '../api/http.js';

export function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { usertype: 'Patient' }
  });

  async function onSubmit(values) {
    setError('');
    setMessage('');
    try {
      const { data } = await http.put('/auth/forgot-password', values);
      setMessage(data.response || data.message || 'Password recovery submitted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <select className="field" {...register('usertype')}>
        <option value="Patient">Patient</option>
        <option value="Clinic_Doctor">Clinic / Doctor</option>
      </select>
      <input className="field" placeholder="Username" {...register('username', { required: true })} />
      <input className="field" placeholder="Phone number or AFHOZ number" {...register('phoneOrAfhoz', { required: true })} />
      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-interpath-green">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-interpath-red">{error}</p>}
      <button className="btn-primary w-full" disabled={isSubmitting}>Recover password</button>
      <Link className="block text-center text-sm font-normal text-interpath-blue" to="/login">Back to sign in</Link>
    </form>
  );
}
