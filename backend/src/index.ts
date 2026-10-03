import 'dotenv/config';
import app from './app';

if (!process.env.JWT_SECRET) {
  console.error('ERRO FATAL: variável de ambiente JWT_SECRET não definida.');
  process.exit(1);
}

if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
  console.error('ERRO FATAL: variável de ambiente FRONTEND_URL não definida (necessária para o CORS em produção).');
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Syre API rodando na porta ${PORT}`);
});
