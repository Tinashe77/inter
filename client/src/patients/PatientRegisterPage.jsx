import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '../api/http.js';

const schema = z.object({
  idNumber: z.string().min(1),
  patientName: z.string().min(2),
  dateOfBirth: z.string().min(8),
  phoneNumber: z.string().min(1),
  email: z.string().email(),
  gender: z.enum(['Male', 'Female']),
  password: z.string().min(8)
});

export function PatientRegisterPage() {
  const [message, setMessage] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'Male' }
  });

  async function onSubmit(values) {
    const { data } = await http.post('/patients/register', values);
    setMessage(data.response || data.message || 'Registration submitted.');
  }

  return (
    <form className="panel space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <input className="field" placeholder="ID number" {...register('idNumber')} />
      <input className="field" placeholder="Patient name" {...register('patientName')} />
      <input className="field" placeholder="Date of birth dd/MM/yyyy" {...register('dateOfBirth')} />
      <input className="field" placeholder="Phone number" {...register('phoneNumber')} />
      <input className="field" placeholder="Email" type="email" {...register('email')} />
      <select className="field" {...register('gender')}>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
      <input className="field" placeholder="Password" type="password" {...register('password')} />
      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-interpath-green">{message}</p>}
      <button className="btn-primary w-full" disabled={isSubmitting}>Create patient account</button>
      <Link className="block text-center text-sm font-normal text-interpath-blue" to="/login">Back to sign in</Link>
    </form>
  );
}
