const translations = [
  [/token.*expired/i, ['TOKEN_EXPIRED', 'Your session has expired. Please sign in again.', 401]],
  [/token.*not found|invalid token/i, ['TOKEN_NOT_FOUND', 'Your session is no longer valid. Please sign in again.', 401]],
  [/invalid username or password/i, ['INVALID_CREDENTIALS', 'Invalid username or password.', 401]],
  [/no records found/i, ['NO_RECORDS', 'No records were found for the selected filters.', 404]],
  [/lab number not found/i, ['LAB_NOT_FOUND', 'The lab number could not be found.', 404]],
  [/covid.*not.*requested|no covid tests were requested/i, ['COVID_NOT_REQUESTED', 'No Covid test was requested for this lab number.', 404]],
  [/covid.*not yet entered|no covid results/i, ['COVID_RESULTS_PENDING', 'Covid results are not available yet for this lab number.', 404]],
  [/access|only .* user|cannot access/i, ['ACCESS_DENIED', 'You do not have permission to access this information.', 403]],
  [/pdf.*not.*generated|pdf status/i, ['PDF_NOT_GENERATED', 'The official PDF report is not available yet.', 404]],
  [/date.*format|visit dates must|report dates must/i, ['INVALID_DATE', 'The date format is invalid.', 400]],
  [/object reference not set/i, ['SLIS_EMPTY_LIST_ERROR', 'The laboratory system could not return visits for the selected date.', 502]],
  [/no http resource|no type was found/i, ['SLIS_ENDPOINT_UNAVAILABLE', 'The SLIS reports endpoint is not available on the configured server.', 502]]
];

export function translateSlisMessage(message = '') {
  const match = translations.find(([pattern]) => pattern.test(message));
  if (!match) {
    return { code: 'SLIS_ERROR', message: message || 'The laboratory system returned an error.', status: 502 };
  }

  const [, [code, friendlyMessage, status]] = match;
  return { code, message: friendlyMessage, status };
}
