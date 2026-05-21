import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { slisReportPost } from '../../services/slisApi.service.js';
import { normalizeReportDate } from '../../utils/formatters.js';
import { assertSlisObjectSuccess } from '../../utils/slisResponse.js';

export const reportRouter = Router();

const reportSchema = z.object({
  branch: z.string().default('ALL'),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  page: z.number().optional()
});

reportRouter.post('/main', requireAuth(['Employee']), async (req, res, next) => {
  try {
    const body = reportSchema.parse(req.body);
    const data = await slisReportPost('/api/Reports', {
      Token: req.user.token,
      Branch: body.branch,
      DateFrom: normalizeReportDate(body.dateFrom),
      DateTo: normalizeReportDate(body.dateTo),
      Page: body.page || 1
    });
    res.json(assertSlisObjectSuccess(data));
  } catch (error) {
    next(error);
  }
});

reportRouter.post('/:reportName', requireAuth(['Employee']), async (req, res, next) => {
  try {
    const body = reportSchema.omit({ page: true }).parse(req.body);
    const data = await slisReportPost(`/api/Reports/${encodeURIComponent(req.params.reportName)}`, {
      Token: req.user.token,
      Branch: body.branch,
      DateFrom: normalizeReportDate(body.dateFrom),
      DateTo: normalizeReportDate(body.dateTo)
    });
    res.json(assertSlisObjectSuccess(data));
  } catch (error) {
    next(error);
  }
});
