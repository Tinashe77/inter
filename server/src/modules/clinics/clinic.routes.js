import { Router } from 'express';
import { createHttpError } from '../../middleware/errorHandler.js';
import { slisGet } from '../../services/slisApi.service.js';

export const clinicRouter = Router();
const clinicsEndpoint = process.env.SLIS_CLINICS_URL || 'https://www.interpathresults.com/slismob/api/clinics/na';

clinicRouter.get('/', requireClinicAuth, async (req, res, next) => {
  try {
    const data = await getClinics(req.user.token);
    res.json(normalizeClinicsResponse(data));
  } catch (error) {
    next(error);
  }
});

clinicRouter.get('/:clinicNo', requireClinicAuth, async (req, res, next) => {
  try {
    const clinicNo = req.params.clinicNo;
    const clinicName = String(req.query.clinicName || req.get('Clinic') || '').trim();
    const listData = clinicName ? null : await getClinics(req.user.token);
    const clinicFromList = listData ? findClinic(normalizeClinicsResponse(listData).clinics, clinicNo) : null;
    const selectedClinicName = clinicName || clinicFromList?.ClinicName || '';
    const detailData = await getClinics(req.user.token, selectedClinicName);
    const normalized = normalizeClinicsResponse(detailData);
    const clinic = findClinic(normalized.clinics, clinicNo) || clinicFromList;

    res.json({
      status: normalized.status,
      message: normalized.message,
      clinic,
      clinics: normalized.clinics,
      detail: detailData
    });
  } catch (error) {
    next(error);
  }
});

function getClinics(token, clinicName = '') {
  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (clinicName) {
    headers.Clinic = clinicName;
  }

  return slisGet(clinicsEndpoint, { headers });
}

function normalizeClinicsResponse(data = {}) {
  return {
    status: data.status || data.Status || '',
    message: data.Message || data.message || '',
    clinics: Array.isArray(data.Clinics) ? data.Clinics : []
  };
}

function findClinic(clinics, clinicNo) {
  return clinics.find((clinic) => String(clinic.ClinicNo || '').trim() === String(clinicNo || '').trim()) || null;
}

function requireClinicAuth(req, _res, next) {
  const bearerToken = getBearerToken(req);
  if (bearerToken) {
    req.user = { token: bearerToken, usertype: 'Employee' };
    next();
    return;
  }

  const session = req.signedCookies?.interpath_session;
  if (!session?.token) {
    next(createHttpError(401, 'AUTH_REQUIRED', 'Please sign in to continue.'));
    return;
  }

  if (session.usertype !== 'Employee') {
    next(createHttpError(403, 'ACCESS_DENIED', 'You do not have permission to access this area.'));
    return;
  }

  req.user = session;
  next();
}

function getBearerToken(req) {
  const authorization = String(req.get('Authorization') || '');
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || '';
}
