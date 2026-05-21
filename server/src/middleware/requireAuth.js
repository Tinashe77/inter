import { createHttpError } from './errorHandler.js';

export function requireAuth(roles = []) {
  return (req, _res, next) => {
    const session = req.signedCookies?.interpath_session;
    if (!session?.token) {
      return next(createHttpError(401, 'AUTH_REQUIRED', 'Please sign in to continue.'));
    }

    const ageMs = Date.now() - Number(session.createdAt || 0);
    if (ageMs > 24 * 60 * 60 * 1000) {
      return next(createHttpError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.'));
    }

    if (roles.length > 0 && !roles.includes(session.usertype)) {
      return next(createHttpError(403, 'ACCESS_DENIED', 'You do not have permission to access this area.'));
    }

    req.user = session;
    next();
  };
}
