import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';
import { login, me } from './controllers/authController';
import { requireAuth } from './middleware/requireAuth';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('ERRO FATAL: variável de ambiente JWT_SECRET não definida.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1); // necessário atrás do proxy do Railway p/ rate-limit funcionar

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

app.listen(PORT, () => {
  console.log(`🚀 Syre API rodando na porta ${PORT}`);
});

export default app;
