import { slisGet } from './slisApi.service.js';
import { getClinicDirectory, resolveDoctorRecipient } from './clinicDirectory.service.js';
import { normalizeDateForSlis } from '../utils/formatters.js';
import { parseSlisListResponse } from '../utils/slisResponse.js';

export async function fetchEmployeeVisits({ token, date, branch = 'ALL' }) {
  const normalizedDate = normalizeDateForSlis(date);
  const normalizedBranch = encodeURIComponent(branch || 'ALL');
  const timeout = Number(process.env.SLIS_VISITS_TIMEOUT_MS || 120000);
  const rows = await slisGet(`/api/List/${normalizedBranch}/${normalizedDate}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout
  });

  if (isEmptyListFailure(rows)) return [];
  const parsed = parseSlisListResponse(rows);
  const visits = normalizeListVisits(parsed.rows);
  const clinics = await getClinicDirectory(token).catch(() => []);
  return visits.map((visit) => ({ ...visit, ...resolveDoctorRecipient(visit, clinics) }));
}

export function isCompletedVisit(visit) {
  const status = String(visit?.Status || '').trim().toLowerCase();
  return status.includes('complete')
    || status.includes('authorised')
    || status.includes('authorized')
    || status.includes('reported')
    || status.includes('result ready')
    || status === 'success'
    || status === 'final';
}

function normalizeListVisits(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    LabNumber: row.LabNumber || '',
    OLBNumber: row.OLBNumber || '',
    PatientName: row.PatientName || '',
    IDNumber: '',
    Sex: row.Sex || '',
    Address: '',
    PhoneNumber: '',
    DateOfBirth: row.DateOfBirth || '',
    VisitDate: row.VisitDate || '',
    PaymentMode: row.PaymentMode || '',
    Clinic: row.Clinic || '',
    ClinicName: row.ClinicName || row.Clinic || '',
    ClinicNo: row.ClinicNo || row.ClinicNumber || '',
    Branch: row.Branch || row.branch || '',
    Location: row.Location || row.location || row.Branch || '',
    CollectionPoint: row.CollectionPoint || row.CollectionCentre || row.CollectionCenter || '',
    Doctor: '',
    ClinicalData: row.Critical || '',
    Tests: row.Tests || '',
    Status: row.Status || '',
    Critical: row.Critical || ''
  }));
}

function isEmptyListFailure(rows = []) {
  if (!Array.isArray(rows) || rows.length !== 1) return false;
  const first = rows[0];
  return String(first?.LabNumber || '').startsWith('Status-Failed')
    && /object reference not set/i.test(String(first?.PatientName || ''));
}
