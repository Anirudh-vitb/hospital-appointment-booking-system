import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import dbReady from './middleware/dbReady.js';
import { sessionHandler } from './middleware/session.js';
import { loadUser } from './middleware/auth.js';
import { verifyCsrf } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import demoRoutes from './routes/demoRoutes.js';

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));

// Behind Render/Vercel the TLS connection ends at the platform proxy. Trusting
// one proxy hop lets Express see the original protocol (needed for Secure
// cookies) and the real client IP (needed for rate limiting).
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? (env.isProduction ? 1 : 0)));
app.set('view engine', 'ejs');
app.set('views', path.join(here, 'views'));
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    // Only the configured frontend origin(s) may call the API with cookies.
    origin(origin, callback) {
      if (!origin || env.frontendUrls.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);
if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.get('/', (req, res) => {
  res.json({ name: 'CarePoint API', health: '/api/health', demo: '/demo/server-info' });
});

app.use('/api/health', healthRoutes);
app.use('/demo', dbReady, demoRoutes);

const api = express.Router();
api.use(dbReady, sessionHandler, loadUser, verifyCsrf);
api.use('/auth', authRoutes);
api.use('/public', publicRoutes);
api.use('/patients', patientRoutes);
api.use('/departments', departmentRoutes);
api.use('/doctors', doctorRoutes);
api.use('/availability', availabilityRoutes);
api.use('/appointments', appointmentRoutes);
api.use('/admin', adminRoutes);
api.use(notFound);

app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

export default app;
