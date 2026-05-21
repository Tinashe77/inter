import { Router } from 'express';
import { z } from 'zod';
import { slisPost, slisPut } from '../../services/slisApi.service.js';
import { createHttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { writeAudit } from '../audit/audit.service.js';

export const authRouter = Router();

const userTypes = ['Patient', 'Clinic_Doctor', 'Employee'];

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = z.object({
      usertype: z.enum(userTypes),
      username: z.string().min(1),
      password: z.string().min(1)
    }).parse(req.body);

    const data = await slisPost(`/api/Main/${body.usertype}`, {
      Username: body.username,
      Password: body.password
    });

    if (String(data.status).toLowerCase() !== 'success') {
      const error = createHttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      error.slisMessage = data.token || data.response;
      throw error;
    }

    const session = {
      token: data.token,
      id: data.id,
      usertype: data.usertype || body.usertype,
      username: data.username,
      name: data.name,
      createdAt: Date.now()
    };

    res.cookie('interpath_session', session, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    req.user = session;
    await writeAudit(req, 'LOGIN');

    res.json({ user: { id: session.id, usertype: session.usertype, username: session.username, name: session.name } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth(), (req, res) => {
  res.json({ user: { id: req.user.id, usertype: req.user.usertype, username: req.user.username, name: req.user.name } });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('interpath_session');
  res.json({ status: 'ok' });
});

authRouter.put('/change-password', requireAuth(['Patient', 'Clinic_Doctor']), async (req, res, next) => {
  try {
    const body = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      newPassword: z.string().min(8)
    }).parse(req.body);

    const data = await slisPut(`/api/Main/${req.user.usertype}/na`, {
      Username: body.username,
      Password: body.password,
      NewPassword: body.newPassword
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

authRouter.put('/forgot-password', async (req, res, next) => {
  try {
    const body = z.object({
      usertype: z.enum(['Patient', 'Clinic_Doctor']),
      username: z.string().min(1),
      phoneOrAfhoz: z.string().min(1)
    }).parse(req.body);

    const data = await slisPut(`/api/Main/${body.usertype}/${encodeURIComponent(body.username)}/${encodeURIComponent(body.phoneOrAfhoz)}`);
    res.json(data);
  } catch (error) {
    next(error);
  }
});
