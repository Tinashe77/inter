export function normalizeDateForSlis(date) {
  const value = String(date || '').trim();
  if (/^\d{8}$/.test(value)) return value;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throwDateError('Visit dates must be yyyy-mm-dd or ddmmyyyy.');
  }

  const [, yyyy, mm, dd] = match;
  if (!isValidDateParts(Number(yyyy), Number(mm), Number(dd))) {
    throwDateError('Visit dates must be yyyy-mm-dd or ddmmyyyy.');
  }

  return `${dd}${mm}${yyyy}`;
}

export function normalizeReportDate(date) {
  const value = String(date || '').trim();
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return value;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throwDateError('Report dates must be yyyy-mm-dd or yyyy/MM/dd.');
  }

  const [, yyyy, mm, dd] = match;
  if (!isValidDateParts(Number(yyyy), Number(mm), Number(dd))) {
    throwDateError('Report dates must be yyyy-mm-dd or yyyy/MM/dd.');
  }

  return `${yyyy}/${mm}/${dd}`;
}

function isValidDateParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function throwDateError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'INVALID_DATE';
  error.slisMessage = message;
  throw error;
}
