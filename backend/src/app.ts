import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { login, me } from './controllers/authController';
import { requireAuth } from './middleware/requireAuth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.set('trust proxy', 1); // necessário atrás do proxy da plataforma de deploy (Render, Railway etc.) p/ rate-limit funcionar

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
  })
);
app.use(express.json());

// Limite geral para toda a API
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Limite mais rígido no login, para dificultar força bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Syre API' }));

app.post('/api/auth/login', loginLimiter, login);
app.get('/api/auth/me', requireAuth, me);

app.use('/api', requireAuth, routes);

app.use(errorHandler);

export default app;
