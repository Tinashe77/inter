import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { http } from '../api/http.js';

export function SampleCollectionPage() {
  const [message, setMessage] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  async function onSubmit(values) {
    const { data } = await http.put('/sample-collection', values);
    setMessage(data.response || data.message || 'Submitted.');
  }

  return (
    <main className="space-y-4">
      <section>
        <h2 className="text-xl font-normal">Sample Collection</h2>
        <p className="text-sm text-slate-600">Notify the lab when samples are ready for pickup.</p>
      </section>
      <form className="panel space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <textarea className="field min-h-28" placeholder="Tests" {...register('tests', { required: true })} />
        <input className="field" placeholder="Phone number" {...register('phoneNumber', { required: true })} />
        <textarea className="field min-h-28" placeholder="Collection address" {...register('address', { required: true })} />
        {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-interpath-green">{message}</p>}
        <button className="btn-primary" disabled={isSubmitting}>Submit notification</button>
      </form>
    </main>
  );
}
