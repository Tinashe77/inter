import { Router } from 'express';
import { z } from 'zod';
import { slisPost } from '../../services/slisApi.service.js';

export const patientRouter = Router();

patientRouter.post('/register', async (req, res, next) => {
  try {
    const body = z.object({
      idNumber: z.string().min(1),
      patientName: z.string().min(2),
      dateOfBirth: z.string().min(8),
      phoneNumber: z.string().min(1),
      email: z.string().email(),
      gender: z.enum(['Male', 'Female']),
      password: z.string().min(8)
    }).parse(req.body);

    const data = await slisPost('/api/Main', {
      IDNumber: body.idNumber,
      PatientName: body.patientName,
      DateOfBirth: body.dateOfBirth,
      PhoneNumber: body.phoneNumber,
      Email: body.email,
      Gender: body.gender,
      Password: body.password
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});
