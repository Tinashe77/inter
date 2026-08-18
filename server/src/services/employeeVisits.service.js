import { slisGet } from './slisApi.service.js';
import { getClinicDirectory, resolveDoctorRecipient } from './clinicDirectory.service.js';
import { normalizeDateForSlis } from '../utils/formatters.js';
import { parseSlisListResponse } from '../utils/slisResponse.js';

const visitsCache = new Map();
const visitsInFlight = new Map();

export async function fetchEmployeeVisits({
  token,
  date,
  branch = 'ALL',
  forceRefresh = false
}) {
  const normalizedDate = normalizeDateForSlis(date);
  const normalizedBranch = encodeURIComponent(branch || 'ALL');
  const cacheKey = `${normalizedBranch}:${normalizedDate}`;
  const cached = visitsCache.get(cacheKey);
  const age = cached ? Date.now() - cached.cachedAt : Number.POSITIVE_INFINITY;
  const freshTtl = Number(process.env.SLIS_VISITS_CACHE_TTL_MS || 120000);
  const staleTtl = Number(process.env.SLIS_VISITS_STALE_TTL_MS || 600000);

  if (!forceRefresh && cached && age < freshTtl) {
    return cached.visits;
  }

  if (!forceRefresh && cached && age < staleTtl) {
    void refreshEmployeeVisits({
      token,
      normalizedDate,
      normalizedBranch,
      cacheKey
    }).catch(() => {});
    return cached.visits;
  }

  return refreshEmployeeVisits({
    token,
    normalizedDate,
    normalizedBranch,
    cacheKey
  });
}

function refreshEmployeeVisits({
  token,
  normalizedDate,
  normalizedBranch,
  cacheKey
}) {
  const currentRequest = visitsInFlight.get(cacheKey);
  if (currentRequest) return currentRequest;

  const request = loadEmployeeVisits({
    token,
    normalizedDate,
    normalizedBranch
  }).then((visits) => {
    visitsCache.set(cacheKey, { visits, cachedAt: Date.now() });
    pruneVisitsCache();
    return visits;
  }).finally(() => {
    visitsInFlight.delete(cacheKey);
  });

  visitsInFlight.set(cacheKey, request);
  return request;
}

async function loadEmployeeVisits({ token, normalizedDate, normalizedBranch }) {
  const timeout = Number(process.env.SLIS_VISITS_TIMEOUT_MS || 120000);
  const [rows, clinics] = await Promise.all([
    slisGet(`/api/List/${normalizedBranch}/${normalizedDate}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout
    }),
    getClinicDirectory(token).catch(() => [])
  ]);

  if (isEmptyListFailure(rows)) return [];
  const parsed = parseSlisListResponse(rows);
  const visits = normalizeListVisits(parsed.rows);
  return visits.map((visit) => ({ ...visit, ...resolveDoctorRecipient(visit, clinics) }));
}

function pruneVisitsCache() {
  const staleTtl = Number(process.env.SLIS_VISITS_STALE_TTL_MS || 600000);
  const cutoff = Date.now() - staleTtl;
  for (const [key, value] of visitsCache) {
    if (value.cachedAt < cutoff) visitsCache.delete(key);
  }
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
