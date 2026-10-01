import { slisGet } from './slisApi.service.js';
import { getClinicDirectory, resolveDoctorRecipient } from './clinicDirectory.service.js';
import { normalizeDateForSlis } from '../utils/formatters.js';
import { parseSlisListResponse } from '../utils/slisResponse.js';

const visitsCache = new Map();
const visitsInFlight = new Map();
const refreshTimers = new Map();
const visitPageCache = new Map();
const visitPageInFlight = new Map();

const freshTtl = () => Number(process.env.SLIS_VISITS_CACHE_TTL_MS || 300000);
const staleTtl = () => Number(process.env.SLIS_VISITS_STALE_TTL_MS || 1800000);
const maxCacheEntries = () => Number(process.env.SLIS_VISITS_CACHE_MAX_ENTRIES || 100);

export async function fetchEmployeeVisitsPage({ token, date, branch = 'ALL', page = 1 }) {
  const normalizedDate = normalizeDateForSlis(date);
  const normalizedBranch = String(branch || 'ALL').trim().toUpperCase();
  const normalizedPage = positiveInteger(page, 1);
  const cacheKey = `${normalizedBranch}:${normalizedDate}:page:${normalizedPage}`;
  const cached = visitPageCache.get(cacheKey);
  const age = cached ? Date.now() - cached.cachedAt : Number.POSITIVE_INFINITY;

  if (cached && age < freshTtl()) return cached.value;
  if (cached && age < staleTtl()) {
    void refreshEmployeeVisitPage({ token, normalizedDate, normalizedBranch, page: normalizedPage, cacheKey });
    return cached.value;
  }
  return refreshEmployeeVisitPage({ token, normalizedDate, normalizedBranch, page: normalizedPage, cacheKey });
}

function refreshEmployeeVisitPage({ token, normalizedDate, normalizedBranch, page, cacheKey }) {
  if (visitPageInFlight.has(cacheKey)) return visitPageInFlight.get(cacheKey);
  const request = loadEmployeeVisitPage({ token, normalizedDate, normalizedBranch, page })
    .then((value) => {
      visitPageCache.set(cacheKey, { value, cachedAt: Date.now() });
      if (visitPageCache.size > maxCacheEntries() * 5) visitPageCache.delete(visitPageCache.keys().next().value);
      return value;
    })
    .finally(() => visitPageInFlight.delete(cacheKey));
  visitPageInFlight.set(cacheKey, request);
  return request;
}

async function loadEmployeeVisitPage({ token, normalizedDate, normalizedBranch, page }) {
  const timeout = Number(process.env.SLIS_VISITS_TIMEOUT_MS || 120000);
  const headers = {
    Authorization: `Bearer ${token}`,
    Branch: normalizedBranch,
    Date: normalizedDate
  };
  let parsed;
  try {
    parsed = parsePagedEmployeeVisits(
      await slisGet(`/api/List/${page}`, { headers, timeout }),
      page
    );
    if (!parsed.rows) throw new Error('SLIS paginated visit response did not contain a records array.');
  } catch (error) {
    if (page !== 1 || process.env.SLIS_VISITS_LEGACY_FALLBACK === 'false') throw error;
    const rows = await slisGet(`/api/List/${encodeURIComponent(normalizedBranch)}/${normalizedDate}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout
    });
    parsed = { rows, page: 1, totalPages: 1, totalRecords: Array.isArray(rows) ? rows.length : null };
  }

  if (isEmptyListFailure(parsed.rows)) {
    return { visits: [], pagination: paginationFor(parsed, page, 0) };
  }
  const list = parseSlisListResponse(parsed.rows);
  const clinics = await getClinicDirectory(token).catch(() => []);
  const visits = normalizeListVisits(list.rows)
    .map((visit) => ({ ...visit, ...resolveDoctorRecipient(visit, clinics) }));
  return { visits, pagination: paginationFor(parsed, page, visits.length) };
}

function paginationFor(parsed, requestedPage, rowCount) {
  const pageSize = parsed.pageSize || 50;
  const page = parsed.page || requestedPage;
  const totalPages = parsed.totalPages || null;
  return {
    page,
    pageSize,
    totalPages,
    totalRecords: parsed.totalRecords || null,
    hasMore: totalPages ? page < totalPages : rowCount >= pageSize
  };
}

export async function fetchEmployeeVisits({
  token,
  date,
  branch = 'ALL',
  forceRefresh = false
}) {
  const normalizedDate = normalizeDateForSlis(date);
  const normalizedBranch = String(branch || 'ALL').trim().toUpperCase();
  const cacheKey = `${normalizedBranch}:${normalizedDate}`;
  const cached = visitsCache.get(cacheKey);
  const age = cached ? Date.now() - cached.cachedAt : Number.POSITIVE_INFINITY;
  if (cached) cached.lastAccessedAt = Date.now();

  if (!forceRefresh && cached && age < freshTtl()) {
    return cached.visits;
  }

  if (!forceRefresh && cached && age < staleTtl()) {
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
    const now = Date.now();
    visitsCache.set(cacheKey, {
      visits,
      cachedAt: now,
      lastAccessedAt: visitsCache.get(cacheKey)?.lastAccessedAt || now
    });
    pruneVisitsCache();
    scheduleRefresh({ token, normalizedDate, normalizedBranch, cacheKey });
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
    loadPaginatedEmployeeVisits({ token, normalizedDate, normalizedBranch, timeout }),
    getClinicDirectory(token).catch(() => [])
  ]);

  if (isEmptyListFailure(rows)) return [];
  const parsed = parseSlisListResponse(rows);
  const visits = normalizeListVisits(parsed.rows);
  return visits.map((visit) => ({ ...visit, ...resolveDoctorRecipient(visit, clinics) }));
}

async function loadPaginatedEmployeeVisits({ token, normalizedDate, normalizedBranch, timeout }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Branch: normalizedBranch,
    Date: normalizedDate
  };

  try {
    const firstPayload = await slisGet('/api/List/1', { headers, timeout });
    const firstPage = parsePagedEmployeeVisits(firstPayload, 1);
    if (!firstPage.rows) {
      throw new Error('SLIS paginated visit response did not contain a records array.');
    }

    const totalPages = Math.max(1, firstPage.totalPages || 1);
    if (totalPages === 1) return firstPage.rows;

    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
    const concurrency = positiveInteger(process.env.SLIS_VISITS_PAGE_CONCURRENCY, 4);
    const remainingPages = await mapWithConcurrency(pageNumbers, concurrency, async (page) => {
      const payload = await slisGet(`/api/List/${page}`, { headers, timeout });
      const parsed = parsePagedEmployeeVisits(payload, page);
      if (!parsed.rows) {
        throw new Error(`SLIS visit page ${page} did not contain a records array.`);
      }
      return parsed.rows;
    });

    return deduplicateVisits([firstPage.rows, ...remainingPages].flat());
  } catch (error) {
    if (process.env.SLIS_VISITS_LEGACY_FALLBACK === 'false') throw error;
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`SLIS paginated list unavailable; using legacy list endpoint: ${error.message}`);
    }
    return slisGet(`/api/List/${encodeURIComponent(normalizedBranch)}/${normalizedDate}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout
    });
  }
}

export function parsePagedEmployeeVisits(payload, requestedPage = 1) {
  if (Array.isArray(payload)) {
    return { rows: payload, page: requestedPage, totalPages: 1 };
  }
  if (!payload || typeof payload !== 'object') {
    return { rows: null, page: requestedPage, totalPages: null };
  }

  const containers = [payload, payload.pagination, payload.Pagination, payload.meta, payload.Meta]
    .filter((value) => value && typeof value === 'object');
  const rows = findRecordArray(payload);
  const page = firstNumber(containers, [
    'page', 'Page', 'pageNumber', 'PageNumber', 'currentPage', 'CurrentPage'
  ]) || requestedPage;
  const totalPages = firstNumber(containers, [
    'totalPages', 'TotalPages', 'totalNumberOfPages', 'TotalNumberOfPages',
    'numberOfPages', 'NumberOfPages', 'noOfPages', 'NoOfPages',
    'pageCount', 'PageCount', 'pages', 'Pages', 'lastPage', 'LastPage'
  ]);
  const totalRecords = firstNumber(containers, [
    'totalRecords', 'TotalRecords', 'totalNumberOfRecords', 'TotalNumberOfRecords',
    'numberOfRecords', 'NumberOfRecords', 'recordCount', 'RecordCount',
    'totalDayCount', 'TotalDayCount'
  ]);
  const pageSize = firstNumber(containers, [
    'pageSize', 'PageSize', 'recordsPerPage', 'RecordsPerPage',
    'numberOfRecordsPerPage', 'NumberOfRecordsPerPage',
    'recordsInPage', 'RecordsInPage', 'numberOfRecordsInPage', 'NumberOfRecordsInPage'
  ]);

  const pageRecordsCount = firstNumber(containers, [
    'pageRecordsCount', 'PageRecordsCount'
  ]) || (rows?.length ?? 0);

  return { rows, page, totalPages, totalRecords, pageSize, pageRecordsCount };
}

function findRecordArray(payload) {
  const keys = [
    'visits', 'Visits', 'patients', 'Patients', 'patientVisits', 'PatientVisits', 'records', 'Records',
    'results', 'Results', 'items', 'Items', 'list', 'List', 'data', 'Data'
  ];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  for (const key of ['data', 'Data', 'result', 'Result']) {
    const nested = payload[key];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue;
    for (const recordsKey of keys) {
      if (Array.isArray(nested[recordsKey])) return nested[recordsKey];
    }
  }
  return null;
}

function firstNumber(containers, keys) {
  for (const container of containers) {
    for (const key of keys) {
      const value = Number(container[key]);
      if (Number.isInteger(value) && value > 0) return value;
    }
  }
  return null;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function deduplicateVisits(visits) {
  const seen = new Set();
  return visits.filter((visit, index) => {
    const labNumber = String(visit?.LabNumber || '').trim().toUpperCase();
    const key = labNumber || `row:${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pruneVisitsCache() {
  const cutoff = Date.now() - staleTtl();
  for (const [key, value] of visitsCache) {
    if (value.cachedAt < cutoff) removeCacheEntry(key);
  }

  const overflow = visitsCache.size - maxCacheEntries();
  if (overflow > 0) {
    [...visitsCache.entries()]
      .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt)
      .slice(0, overflow)
      .forEach(([key]) => removeCacheEntry(key));
  }
}

function scheduleRefresh({ token, normalizedDate, normalizedBranch, cacheKey }, delay = freshTtl()) {
  const existingTimer = refreshTimers.get(cacheKey);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    refreshTimers.delete(cacheKey);
    const cached = visitsCache.get(cacheKey);
    if (!cached || Date.now() - cached.lastAccessedAt > staleTtl()) {
      removeCacheEntry(cacheKey);
      return;
    }

    void refreshEmployeeVisits({ token, normalizedDate, normalizedBranch, cacheKey })
      .catch(() => scheduleRefresh(
        { token, normalizedDate, normalizedBranch, cacheKey },
        Math.min(60000, freshTtl())
      ));
  }, Math.max(1000, delay));
  timer.unref?.();
  refreshTimers.set(cacheKey, timer);
}

function removeCacheEntry(cacheKey) {
  visitsCache.delete(cacheKey);
  const timer = refreshTimers.get(cacheKey);
  if (timer) clearTimeout(timer);
  refreshTimers.delete(cacheKey);
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
