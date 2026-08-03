import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { slisGet } from '../../services/slisApi.service.js';
import { normalizeDateForSlis } from '../../utils/formatters.js';
import { parseSlisListResponse } from '../../utils/slisResponse.js';
import { fetchEmployeeVisits } from '../../services/employeeVisits.service.js';

export const visitRouter = Router();

visitRouter.get('/mine', requireAuth(['Patient']), async (req, res, next) => {
  try {
    const rows = await slisGet(`/api/Main/${encodeURIComponent(req.user.token)}/na/na/na`);
    const parsed = parseSlisListResponse(rows);
    res.json({ message: parsed.message, visits: parsed.rows });
  } catch (error) {
    next(error);
  }
});

visitRouter.get('/', requireAuth(['Clinic_Doctor', 'Employee']), async (req, res, next) => {
  try {
    const query = z.object({
      date: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      branch: z.string().optional()
    }).parse(req.query);

    if (req.user.usertype === 'Employee') {
      const date = query.date || query.dateTo || query.dateFrom;
      const branch = query.branch || 'ALL';
      if (process.env.NODE_ENV !== 'production') {
        console.log(`SLIS employee list path: /api/List/${branch}/${date}`);
      }
      const visits = await fetchEmployeeVisits({
        token: req.user.token,
        date,
        branch
      });
      res.json({
        message: visits.length ? null : 'No records were found for the selected date.',
        visits
      });
      return;
    }

    if (!query.dateFrom || !query.dateTo) {
      const error = new Error('Clinic visit filters require dateFrom and dateTo.');
      error.status = 400;
      error.code = 'INVALID_DATE';
      throw error;
    }

    const from = normalizeDateForSlis(query.dateFrom);
    const to = normalizeDateForSlis(query.dateTo);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`SLIS visits path: /api/Main/${from}/${to}/[token]/na/na/na`);
    }
    const rows = await slisGet(`/api/Main/${from}/${to}/${encodeURIComponent(req.user.token)}/na/na/na`);
    const parsed = parseSlisListResponse(rows);
    res.json({ message: parsed.message, visits: parsed.rows });
  } catch (error) {
    next(error);
  }
});
