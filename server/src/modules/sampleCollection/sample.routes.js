import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { slisPut } from '../../services/slisApi.service.js';
import { writeAudit } from '../audit/audit.service.js';

export const sampleRouter = Router();

sampleRouter.put('/', requireAuth(['Clinic_Doctor']), async (req, res, next) => {
  try {
    const body = z.object({
      tests: z.string().min(1),
      phoneNumber: z.string().min(1),
      address: z.string().min(1)
    }).parse(req.body);

    const data = await slisPut(`/api/Main/${encodeURIComponent(req.user.token)}/${encodeURIComponent(body.tests)}/${encodeURIComponent(body.phoneNumber)}/${encodeURIComponent(body.address)}/na/na/na`);
    await writeAudit(req, 'SAMPLE_COLLECTION', { tests: body.tests, phoneNumber: body.phoneNumber });
    res.json(data);
  } catch (error) {
    next(error);
  }
});
