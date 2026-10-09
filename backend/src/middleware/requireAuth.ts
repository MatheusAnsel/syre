import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const token = header.slice('Bearer '.length);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não configurado');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  try {
    // Aceita só HS256: impede troca de algoritmo no cabeçalho do token.
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as {
      sub: string;
      email: string;
      perfil?: string;
    };
    (req as any).userId = payload.sub;
    (req as any).userEmail = payload.email;
    // Tokens sem perfil (emitidos antes dos perfis existirem) caem em 'operador'.
    // Qualquer valor desconhecido também: só 'admin' e 'demo' são reconhecidos explicitamente.
    (req as any).userPerfil =
      payload.perfil === 'admin' || payload.perfil === 'demo' ? payload.perfil : 'operador';
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}
