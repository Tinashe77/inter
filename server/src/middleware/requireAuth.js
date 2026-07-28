import { createHttpError } from './errorHandler.js';
import { verifyMobileSessionToken } from '../services/mobileSession.service.js';

export function requireAuth(roles = []) {
  return (req, _res, next) => {
    const session = req.signedCookies?.interpath_session || getBearerSession(req);
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

function getBearerSession(req) {
  const authorization = String(req.get('Authorization') || '');
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) {
    return null;
  }

  return verifyMobileSessionToken(match[1]);
}
