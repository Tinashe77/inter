import { Router } from 'express';
import { z } from 'zod';
import { checkSlisDevice, registerSlisDevice } from '../../services/deviceRegistration.service.js';

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

    const data = await registerSlisDevice(body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

deviceRouter.get('/check/:lookupType', async (req, res, next) => {
  try {
    const query = z.object({ device: z.string().min(1) }).parse(req.query);
    const lookupType = z.enum(['RegNumber', 'DeviceID']).parse(req.params.lookupType);
    const data = await checkSlisDevice({ lookupType, device: query.device });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

deviceRouter.get('/:deviceId', async (req, res, next) => {
  try {
    const data = await checkSlisDevice({ lookupType: 'DeviceID', device: req.params.deviceId });
    res.json(data);
  } catch (error) {
    next(error);
  }
});
