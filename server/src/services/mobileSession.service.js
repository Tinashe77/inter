import crypto from 'node:crypto';

const tokenVersion = 'v1';

export function createMobileSessionToken(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = sign(payload);
  return `${tokenVersion}.${payload}.${signature}`;
}

export function verifyMobileSessionToken(value) {
  const [version, payload, signature] = String(value || '').split('.');
  if (version !== tokenVersion || !payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  if (!constantTimeEqual(signature, expected)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function wantsMobileSession(req) {
  return String(req.get('X-Interpath-Client') || '').toLowerCase() === 'mobile';
}

function sign(payload) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
}

function getSecret() {
  return process.env.COOKIE_SECRET || process.env.SESSION_SECRET || 'interpath-dev-secret';
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

