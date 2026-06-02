import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { requireAuth } from '../../middleware/requireAuth.js';
import { buildPdfUrl, slisGet } from '../../services/slisApi.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { ShareLink } from './shareLink.model.js';
import { parseSlisListResponse, assertSlisObjectSuccess } from '../../utils/slisResponse.js';

export const resultRouter = Router();

function normalizeResults(rows = []) {
  const metadata = {
    resultsToFollow: false,
    reportedBy: null,
    authorizedBy: null,
    pdfStatus: null
  };

  const dataRows = rows
    .map((row) => ({ ...row, Fcomment: row.Fcomment ?? row.FComment ?? '' }))
    .filter((row) => {
      const department = String(row.Department || '').trim();
      const labNumber = String(row.LabNumber || '').trim();

      if (department === 'RESULTS TO FOLLOW:') {
        metadata.resultsToFollow = true;
        return false;
      }
      if (department === 'Reported By :') {
        metadata.reportedBy = row.Profile || null;
        metadata.authorizedBy = row.Units || null;
        return false;
      }
      if (department === 'End of Report') return false;
      if (labNumber.startsWith('PDF Status')) {
        metadata.pdfStatus = labNumber;
        return false;
      }
      if (!labNumber || labNumber === '-') return false;
      return true;
    });

  const pdfGenerated = metadata.pdfStatus?.toLowerCase().includes('pdf status - generated') || false;
  return { results: dataRows, metadata, pdfGenerated };
}

resultRouter.get('/:labNumber', requireAuth(['Patient', 'Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const labNumber = req.params.labNumber;
    if (req.user.usertype === 'Employee') {
      const detail = await slisGet(`/api/Main/${encodeURIComponent(labNumber)}`, {
        params: { format: 'pdf' },
        headers: {
          Authorization: `Bearer ${req.user.token}`,
          format: 'pdf'
        }
      });
      await writeAudit(req, 'RESULT_VIEW', { labNumber });
      res.json(normalizeEmployeeResultDetail(labNumber, detail));
      return;
    }

    const rawRows = await slisGet(`/api/Main/${encodeURIComponent(labNumber)}/${encodeURIComponent(req.user.token)}/na/na/na`);
    const parsed = parseSlisListResponse(rawRows);
    await writeAudit(req, 'RESULT_VIEW', { labNumber });
    res.json({ labNumber, message: parsed.message, ...normalizeResults(parsed.rows), pdfUrl: `/api/results/${encodeURIComponent(labNumber)}/pdf` });
  } catch (error) {
    next(error);
  }
});

function normalizeEmployeeResultDetail(labNumber, detail = {}) {
  const status = String(detail.Status || detail.status || '').toLowerCase();
  const message = detail.Message || detail.response || detail.message || null;
  const profileRows = Array.isArray(detail.Profile) ? detail.Profile : [];
  const credentialRows = Array.isArray(detail.Credential) ? detail.Credential : detail.Credential ? [detail.Credential] : [];
  const patientDetails = detail.PatientDetailes || detail.PatientDetails || null;
  const pdf = detail.PDF || detail.Pdf || detail.pdf || '';

  if (status === 'failed') {
    return {
      labNumber,
      message: translateEmployeeDetailMessage(message),
      results: [],
      metadata: {
        patientDetails,
        credentials: credentialRows,
        pdfStatus: pdf ? 'PDF Status - Generated' : null,
        resultsToFollow: false,
        reportedBy: null,
        authorizedBy: null
      },
      pdfGenerated: Boolean(pdf),
      pdfUrl: pdf ? resolveSlisPdfUrl(pdf) : `/api/results/${encodeURIComponent(labNumber)}/pdf`
    };
  }

  return {
    labNumber,
    message,
    results: normalizeEmployeeProfileRows(profileRows, labNumber),
    metadata: {
      patientDetails,
      credentials: credentialRows,
      pdfStatus: pdf ? 'PDF Status - Generated' : null,
      resultsToFollow: false,
      reportedBy: credentialRows[0]?.ReportedBy || credentialRows[0]?.CapturedBy || null,
      authorizedBy: credentialRows[0]?.AuthorizedBy || null
    },
    pdfGenerated: Boolean(pdf),
    pdfUrl: pdf ? resolveSlisPdfUrl(pdf) : `/api/results/${encodeURIComponent(labNumber)}/pdf`
  };
}

function normalizeEmployeeProfileRows(rows, labNumber) {
  return rows.flatMap((profile, profileIndex) => {
    const tests = Array.isArray(profile.Tests) ? profile.Tests : Array.isArray(profile.Results) ? profile.Results : [];
    const profileName = profile.Profile || profile.ProfileName || 'General';
    const profileComments = {
      autoComment: profile.AutoComment || '',
      additionalComment: profile.AdditionalComment || '',
      profileComment: profile.ProfileComment || ''
    };

    if (tests.length === 0 && (profile.Test || profile.Result)) {
      return [{
        Department: profile.Department || 'Results',
        Profile: profileName,
        LabNumber: profile.LabNumber || labNumber,
        Test: profile.Test ?? profile.TestName ?? '',
        Result: profile.Result ?? '',
        Units: profile.Units || '',
        Flag: profile.Flag || '',
        Range: profile.Range || profile.ReferenceRange || '',
        Comment: profile.Comment || '',
        Fcomment: profile.Fcomment || profile.FComment || '',
        ProfileOrder: profileIndex,
        ResultOrder: 0,
        ...profileComments
      }];
    }

    return tests.map((test, testIndex) => ({
      Department: profile.Department || test.Department || 'Results',
      Profile: profileName || test.Profile || 'General',
      LabNumber: test.LabNumber || profile.LabNumber || labNumber,
      Test: test.Test ?? test.TestName ?? '',
      Result: test.Result ?? '',
      Units: test.Units || '',
      Flag: test.Flag || '',
      Range: test.Range || test.ReferenceRange || '',
      Comment: test.Comment || '',
      Fcomment: test.Fcomment || test.FComment || '',
      ProfileOrder: profileIndex,
      ResultOrder: testIndex,
      ...profileComments
    }));
  });
}

function translateEmployeeDetailMessage(message) {
  if (/connection.*current state is open/i.test(String(message || ''))) {
    return 'SLIS could not return the result detail right now. Please try again.';
  }
  if (/compatible file/i.test(String(message || ''))) {
    return 'The result detail is not available yet for this visit.';
  }
  return message || 'No result detail was returned for this visit.';
}

function resolveSlisPdfUrl(pdfUrl) {
  const resolvedUrl = new URL(pdfUrl, process.env.SLIS_BASE_URL);
  if (['localhost', '127.0.0.1'].includes(resolvedUrl.hostname)) {
    const slisBaseUrl = new URL(process.env.SLIS_BASE_URL);
    resolvedUrl.protocol = slisBaseUrl.protocol;
    resolvedUrl.host = slisBaseUrl.host;
  }
  return resolvedUrl.toString();
}

async function getGeneratedEmployeePdfUrl(labNumber, token) {
  const response = await axios.get(`${process.env.SLIS_BASE_URL}/api/Main/${encodeURIComponent(labNumber)}`, {
    responseType: 'json',
    params: { format: 'pdf' },
    headers: {
      Accept: 'application/json,text/plain,*/*',
      Authorization: `Bearer ${token}`,
      format: 'pdf',
      'User-Agent': 'Mozilla/5.0 InterpathResultsPWA/1.0'
    }
  });

  const pdfUrl = response.data?.PDF || response.data?.Pdf || response.data?.pdf;
  if (!pdfUrl) {
    const message = response.data?.Message || response.data?.response || response.data?.PatientName || 'SLIS did not generate a PDF URL for this visit.';
    const error = new Error(message);
    error.status = 502;
    error.code = 'PDF_NOT_AVAILABLE';
    throw error;
  }

  return resolveSlisPdfUrl(pdfUrl);
}

resultRouter.get('/:labNumber/pdf', requireAuth(['Patient', 'Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const labNumber = req.params.labNumber;
    if (req.user.usertype === 'Employee') {
      const absolutePdfUrl = await getGeneratedEmployeePdfUrl(labNumber, req.user.token);
      const pdfResponse = await axios.get(absolutePdfUrl, {
        responseType: 'stream',
        headers: {
          Accept: 'application/pdf,*/*',
          Authorization: `Bearer ${req.user.token}`,
          'User-Agent': 'Mozilla/5.0 InterpathResultsPWA/1.0'
        }
      });

      await writeAudit(req, 'PDF_DOWNLOAD', { labNumber });
      const dispositionType = req.query.download === '1' ? 'attachment' : 'inline';
      res.setHeader('Content-Type', pdfResponse.headers['content-type'] || 'application/pdf');
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${labNumber}_Test_Results.pdf"`);
      pdfResponse.data.pipe(res);
      return;
    }

    const response = await axios.get(buildPdfUrl(labNumber), { responseType: 'stream' });
    await writeAudit(req, 'PDF_DOWNLOAD', { labNumber });
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
    const dispositionType = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${labNumber}_Test_Results.pdf"`);
    response.data.pipe(res);
  } catch (error) {
    next(error);
  }
});

resultRouter.get('/:labNumber/covid-certificate', requireAuth(['Patient', 'Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const labNumber = req.params.labNumber;
    const mainPath = `/api/Main/${encodeURIComponent(labNumber)}/${encodeURIComponent(req.user.token)}/na/na/na/na/na/na`;
    const patientPath = `/Patient/${encodeURIComponent(labNumber)}/${encodeURIComponent(req.user.token)}/na/na/na/na/na/na`;

    try {
      res.json(assertSlisObjectSuccess(await slisGet(mainPath)));
    } catch (primaryError) {
      if (primaryError.response?.status || primaryError.code === 'SLIS_ERROR') {
        res.json(assertSlisObjectSuccess(await slisGet(patientPath)));
        return;
      }
      throw primaryError;
    }
  } catch (error) {
    next(error);
  }
});

resultRouter.post('/:labNumber/share-whatsapp', requireAuth(['Patient', 'Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const { labNumber, shareUrl } = await createResultShareLink(req);
    await writeAudit(req, 'WHATSAPP_SHARE', { labNumber, phoneNumber: req.body?.phoneNumber });
    res.json({ status: 'ok', shareUrl });
  } catch (error) {
    next(error);
  }
});

resultRouter.post('/:labNumber/share-link', requireAuth(['Patient', 'Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const { labNumber, shareUrl } = await createResultShareLink(req);
    await writeAudit(req, 'RESULT_SHARE_LINK', { labNumber, channel: req.body?.channel });
    res.json({ status: 'ok', shareUrl });
  } catch (error) {
    next(error);
  }
});

async function createResultShareLink(req) {
  const labNumber = req.params.labNumber;
  const token = crypto.randomBytes(32).toString('hex');
  const pdfUrl = req.user.usertype === 'Employee'
    ? await getGeneratedEmployeePdfUrl(labNumber, req.user.token)
    : buildPdfUrl(labNumber);

  await ShareLink.create({
    token,
    labNumber,
    pdfUrl,
    createdBy: req.user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  return {
    labNumber,
    shareUrl: `${req.protocol}://${req.get('host')}/api/results/share/${token}/pdf`
  };
}

resultRouter.get('/share/:token/pdf', async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findOne({ token: req.params.token, expiresAt: { $gt: new Date() } });
    if (!shareLink) {
      return res.status(404).json({ code: 'SHARE_LINK_EXPIRED', message: 'This result link has expired or is no longer available.' });
    }

    const pdfUrl = shareLink.pdfUrl || buildPdfUrl(shareLink.labNumber);
    const response = await axios.get(pdfUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${shareLink.labNumber}_Test_Results.pdf"`);
    response.data.pipe(res);
  } catch (error) {
    next(error);
  }
});
