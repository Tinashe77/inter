import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { buildPdfUrl, slisGet } from '../../services/slisApi.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { ShareLink } from './shareLink.model.js';
import { parseSlisListResponse, assertSlisObjectSuccess } from '../../utils/slisResponse.js';
import { sendWhatsAppResultTemplate } from '../../services/whatsappCloud.service.js';
import { WhatsAppMessage } from '../whatsapp/whatsappMessage.model.js';
import { fetchEmployeeVisits, isCompletedVisit } from '../../services/employeeVisits.service.js';

export const resultRouter = Router();
const bulkSendSchema = z.object({
  date: z.string().min(1),
  branch: z.string().min(1).default('ALL'),
  labNumbers: z.array(z.string().min(1)).min(1).max(50)
});

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

resultRouter.post('/bulk-whatsapp/send', requireAuth(['Employee']), async (req, res, next) => {
  try {
    const body = bulkSendSchema.parse(req.body || {});
    const requestedLabNumbers = [...new Set(body.labNumbers.map(normalizeLabNumber))];
    const visits = await fetchEmployeeVisits({
      token: req.user.token,
      date: body.date,
      branch: body.branch
    });
    const visitsByLabNumber = new Map(
      visits.map((visit) => [normalizeLabNumber(visit.LabNumber), visit])
    );

    const results = await mapWithConcurrency(requestedLabNumbers, 3, async (labNumber) => {
      const visit = visitsByLabNumber.get(labNumber);
      if (!visit) {
        return bulkFailure(labNumber, 'RESULT_NOT_FOUND', 'The selected result was not found for this branch and date.');
      }
      if (!isCompletedVisit(visit)) {
        return bulkFailure(labNumber, 'RESULT_NOT_COMPLETED', 'The result is not completed or authorised.');
      }
      if (!visit.CanSendToDoctor || !visit.DoctorPhoneNumber) {
        return bulkFailure(labNumber, 'RECIPIENT_UNAVAILABLE', 'A valid doctor mobile number with country code could not be resolved.');
      }

      try {
        const { shareUrl } = await createResultShareLink(req, {
          labNumber: visit.LabNumber,
          whatsappSafe: true
        });
        const recipientName = visit.Doctor || visit.RecipientClinicName || 'Doctor';
        const whatsapp = await sendWhatsAppResultTemplate({
          to: visit.DoctorPhoneNumber,
          recipientName,
          labNumber: visit.LabNumber,
          shareUrl
        });
        await recordWhatsAppMessage({
          whatsapp,
          labNumber: visit.LabNumber
        });
        await writeAudit(req, 'WHATSAPP_SHARE', {
          labNumber: visit.LabNumber,
          channel: 'meta-cloud-api-bulk',
          phoneNumber: visit.DoctorPhoneNumber,
          messageId: whatsapp.messageId
        });
        return {
          labNumber: visit.LabNumber,
          status: 'sent',
          recipientName,
          destination: visit.DoctorPhoneNumber,
          messageId: whatsapp.messageId
        };
      } catch (error) {
        return bulkFailure(visit.LabNumber, error.code || 'WHATSAPP_SEND_FAILED', error.message);
      }
    });

    const sent = results.filter((result) => result.status === 'sent').length;
    res.json({
      status: sent === results.length ? 'ok' : sent === 0 ? 'failed' : 'partial',
      requested: requestedLabNumbers.length,
      sent,
      failed: results.length - sent,
      results
    });
  } catch (error) {
    next(error);
  }
});

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

resultRouter.post('/:labNumber/send-whatsapp', requireAuth(['Patient', 'Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const { labNumber, shareUrl } = await createResultShareLink(req, { whatsappSafe: true });
    const destination = req.body?.phoneNumber;
    const patientName = req.body?.patientName || 'the patient';
    const whatsapp = await sendWhatsAppResultTemplate({
      to: destination,
      patientName,
      labNumber,
      shareUrl
    });

    await recordWhatsAppMessage({ whatsapp, labNumber });

    await writeAudit(req, 'WHATSAPP_SHARE', {
      labNumber,
      channel: 'meta-cloud-api',
      phoneNumber: destination,
      messageId: whatsapp.messageId
    });

    res.json({
      status: 'ok',
      destination,
      shareUrl,
      messageId: whatsapp.messageId
    });
  } catch (error) {
    next(error);
  }
});

async function createResultShareLink(req, options = {}) {
  const labNumber = options.labNumber || req.params.labNumber;
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
    shareUrl: `${getShareBaseUrl(req)}/api/results/share/${token}/pdf${options.whatsappSafe ? '#report' : ''}`
  };
}

async function recordWhatsAppMessage({ whatsapp, labNumber }) {
  if (!whatsapp.messageId) return;
  await WhatsAppMessage.findOneAndUpdate(
    { metaMessageId: whatsapp.messageId },
    {
      $set: {
        recipientWaId: whatsapp.contactWaId,
        labNumber,
        status: 'accepted',
        statusTimestamp: new Date()
      }
    },
    { upsert: true, new: true }
  );
}

function normalizeLabNumber(value) {
  return String(value || '').trim().toUpperCase();
}

function bulkFailure(labNumber, code, message) {
  return { labNumber, status: 'failed', code, message };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

function getShareBaseUrl(req) {
  return String(process.env.RESULT_SHARE_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
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
