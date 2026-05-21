import { translateSlisMessage } from '../utils/slisErrors.js';

export function createHttpError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export function errorHandler(error, _req, res, _next) {
  if (error.response) {
    const status = error.response.status;
    const slisMessage = error.response.data?.response || error.response.data?.Message || error.response.data?.message;
    const translated = slisMessage ? translateSlisMessage(slisMessage) : null;

    if (status === 404 && !translated) {
      return res.status(404).json({
        code: 'NO_RECORDS',
        message: 'No records were found for the selected filters.'
      });
    }

    return res.status(translated?.status || status || 502).json({
      code: translated?.code || 'SLIS_REQUEST_FAILED',
      message: translated?.message || 'The laboratory system could not complete the request.'
    });
  }

  const translated = error.slisMessage ? translateSlisMessage(error.slisMessage) : null;
  const status = error.status || translated?.status || 500;
  const message = error.code === 'INVALID_DATE'
    ? error.message
    : translated?.message || error.message || 'Something went wrong.';

  res.status(status).json({
    code: error.code || translated?.code || 'SERVER_ERROR',
    message,
    details: process.env.NODE_ENV === 'production' ? undefined : error.details
  });
}
