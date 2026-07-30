import { slisGet } from './slisApi.service.js';

const clinicsEndpoint = process.env.SLIS_CLINICS_URL || 'https://www.interpathresults.com/slismob/api/clinics/na';
const cacheTtlMs = 10 * 60 * 1000;
let cachedDirectory = null;
let cachedAt = 0;

export async function getClinicDirectory(token) {
  if (cachedDirectory && Date.now() - cachedAt < cacheTtlMs) {
    return cachedDirectory;
  }

  const data = await slisGet(clinicsEndpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  cachedDirectory = Array.isArray(data?.Clinics) ? data.Clinics : [];
  cachedAt = Date.now();
  return cachedDirectory;
}

export function resolveDoctorRecipient(visit, clinics = []) {
  const rawClinic = String(visit.Clinic || '').trim();
  const clinicNo = normalizeText(
    visit.ClinicNo || visit.ClinicNumber || (/^\d+$/.test(rawClinic) ? rawClinic : '')
  );
  const clinicName = normalizeText(visit.ClinicName || (/^\d+$/.test(rawClinic) ? '' : rawClinic));
  const clinic = clinics.find((item) => {
    const itemNo = normalizeText(item.ClinicNo);
    const itemName = normalizeText(item.ClinicName);
    return (clinicNo && itemNo === clinicNo) || (clinicName && itemName === clinicName);
  });

  if (!clinic) return emptyRecipient();
  const phoneNumber = firstZimbabweMobile(clinic.phone || clinic.Phone || clinic.PhoneNumber);
  return {
    Doctor: String(clinic.Doctor || clinic.ClinicName || '').trim(),
    DoctorPhoneNumber: phoneNumber,
    RecipientClinicNo: String(clinic.ClinicNo || '').trim(),
    RecipientClinicName: String(clinic.ClinicName || '').trim(),
    CanSendToDoctor: Boolean(phoneNumber)
  };
}

function emptyRecipient() {
  return {
    Doctor: '',
    DoctorPhoneNumber: '',
    RecipientClinicNo: '',
    RecipientClinicName: '',
    CanSendToDoctor: false
  };
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function firstZimbabweMobile(value) {
  const candidates = String(value || '').split(/[\/,;|]+/);
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (/^07\d{8}$/.test(digits)) return `263${digits.slice(1)}`;
    if (/^7\d{8}$/.test(digits)) return `263${digits}`;
    if (/^2637\d{8}$/.test(digits)) return digits;
  }
  return '';
}
