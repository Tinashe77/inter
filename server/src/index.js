import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { deviceRouter } from './modules/devices/device.routes.js';
import { patientRouter } from './modules/patients/patient.routes.js';
import { visitRouter } from './modules/visits/visit.routes.js';
import { resultRouter } from './modules/results/result.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { sampleRouter } from './modules/sampleCollection/sample.routes.js';
import { apiTesterRouter } from './modules/apiTester/apiTester.routes.js';
import { clinicRouter } from './modules/clinics/clinic.routes.js';

const app = express();
const port = process.env.PORT || 5001;
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDevelopment = process.env.NODE_ENV !== 'production';

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || (isDevelopment && isLocalhostOrigin(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(morgan('dev'));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), authRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/patients', patientRouter);
app.use('/api/visits', visitRouter);
app.use('/api/results', resultRouter);
app.use('/api/reports', reportRouter);
app.use('/api/sample-collection', sampleRouter);
app.use('/api/tester', apiTesterRouter);
app.use('/api/clinics', clinicRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'interpath-results-api' });
});

app.use(errorHandler);

await connectDatabase();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
