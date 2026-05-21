import { Router } from 'express';
import { z } from 'zod';
import { slisGet, slisPost } from '../../services/slisApi.service.js';

export const deviceRouter = Router();

deviceRouter.post('/', async (req, res, next) => {
  try {
    const body = z.object({
      deviceId: z.string().min(1),
      type: z.string().default('PWA'),
      phoneNumber: z.string().min(1),
      countryCode: z.string().min(1),
      defaultUserType: z.enum(['Patient', 'Clinic_Doctor', 'Employee'])
    }).parse(req.body);

    const data = await slisPost('/api/Devices', {
      RegNumber: '',
      DeviceID: body.deviceId,
      Type: body.type,
      PhoneNumber: body.phoneNumber,
      CountryCode: body.countryCode,
      DeviceStatus: '',
      DefaultUserType: body.defaultUserType,
      RegDate: ''
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

deviceRouter.get('/:deviceId', async (req, res, next) => {
  try {
    const data = await slisGet(`/api/Devices/${encodeURIComponent(req.params.deviceId)}`, {
      headers: { DeviceID: req.params.deviceId }
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});
