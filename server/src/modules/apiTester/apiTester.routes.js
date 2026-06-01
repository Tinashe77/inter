import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';

export const apiTesterRouter = Router();

const requestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  endpoint: z.string().min(1),
  params: z.record(z.string()).optional().default({}),
  headers: z.record(z.string()).optional().default({}),
  body: z.unknown().optional(),
  includeBearerToken: z.boolean().optional().default(true)
});

apiTesterRouter.post('/request', requireAuth(['Employee']), async (req, res, next) => {
  try {
    const body = requestSchema.parse(req.body);
    const startedAt = Date.now();
    const targetUrl = resolveSlisUrl(body.endpoint);
    const headers = {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'Mozilla/5.0 InterpathResultsPWA/1.0',
      ...body.headers
    };

    if (body.includeBearerToken) {
      headers.Authorization = `Bearer ${req.user.token}`;
    }

    const response = await axios.request({
      url: targetUrl.toString(),
      method: body.method,
      params: body.params,
      headers,
      data: ['GET', 'DELETE'].includes(body.method) ? undefined : body.body,
      timeout: 45000,
      validateStatus: () => true
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      requestedUrl: redactUrl(response.config.url),
      data: response.data,
      headers: {
        'content-type': response.headers['content-type'],
        date: response.headers.date
      }
    });
  } catch (error) {
    next(error);
  }
});

function resolveSlisUrl(endpoint) {
  const baseUrl = new URL(process.env.SLIS_BASE_URL);
  const targetUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? new URL(endpoint)
    : buildRelativeSlisUrl(baseUrl, endpoint);

  if (targetUrl.origin.toLowerCase() !== baseUrl.origin.toLowerCase()) {
    const error = new Error('This tester only allows requests to the configured SLIS server.');
    error.status = 400;
    error.code = 'INVALID_TEST_ENDPOINT';
    throw error;
  }

  return targetUrl;
}

function buildRelativeSlisUrl(baseUrl, endpoint) {
  const basePath = baseUrl.pathname.replace(/\/$/, '');
  const endpointPath = endpoint.replace(/^\//, '');
  return new URL(`${basePath}/${endpointPath}`, baseUrl.origin);
}

function redactUrl(value = '') {
  return String(value).replace(/Bearer%20[^&]+/gi, 'Bearer%20[hidden]');
}
