import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { http } from '../api/http.js';
import { getDeviceId, storeRegNumber } from './deviceRegistry.js';

export function DeviceRegistrationPage() {
  const [message, setMessage] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { deviceId: getDeviceId(), type: 'PWA', countryCode: '+263', defaultUserType: 'Patient' }
  });

  async function onSubmit(values) {
    const { data } = await http.post('/devices', values);
    storeRegNumber(data.regNumber);
    setMessage(data.regNumber ? `Device registered: ${data.regNumber}` : 'Device registration submitted.');
  }

  return (
    <form className="panel space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <input className="field" readOnly {...register('deviceId')} />
      <input className="field" placeholder="Type" {...register('type')} />
      <input className="field" placeholder="Country code" {...register('countryCode', { required: true })} />
      <input className="field" placeholder="Phone number" {...register('phoneNumber', { required: true })} />
      <select className="field" {...register('defaultUserType')}>
        <option value="Patient">Patient</option>
        <option value="Clinic_Doctor">Clinic / Doctor</option>
        <option value="Employee">Employee</option>
      </select>
      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-interpath-green">{message}</p>}
      <button className="btn-primary w-full" disabled={isSubmitting}>Register device</button>
      <Link className="block text-center text-sm font-normal text-interpath-blue" to="/login">Back to sign in</Link>
    </form>
  );
}
