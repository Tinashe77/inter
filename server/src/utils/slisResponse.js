import { createHttpError } from '../middleware/errorHandler.js';

export function parseSlisListResponse(rows = [], options = {}) {
  if (!Array.isArray(rows)) {
    const message = rows?.response || rows?.Message || rows?.message || 'The laboratory system returned an unexpected response.';
    throwSlisError(message);
  }

  const first = rows[0];
  const status = String(first?.LabNumber || first?.status || first?.Status || '').trim();
  const message = first ? first.PatientName || first.Test || first.Result || first.response || first.Message || status : '';

  if (/^Status-Failed/i.test(status)) {
    throwSlisError(message || status);
  }

  if (/^Status-Success/i.test(status) && /no records found/i.test(message)) {
    return { message, rows: [], status };
  }

  const dataRows = /^Status-/i.test(status) ? rows.slice(1) : rows;
  return { message: /^Status-/i.test(status) ? message : null, rows: dataRows, status };
}

export function assertSlisObjectSuccess(data) {
  const status = String(data?.status || data?.Status || '').toLowerCase();
  if (status === 'failed' || status === 'fail') {
    throwSlisError(data.response || data.Message || data.message || 'SLIS request failed.');
  }
  return data;
}

function throwSlisError(message) {
  const error = createHttpError(502, 'SLIS_ERROR', message || 'The laboratory system returned an error.');
  error.slisMessage = message;
  throw error;
}
