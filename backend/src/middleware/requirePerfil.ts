import { Request, Response, NextFunction } from 'express';
import { Perfil } from '../services/tokenService';

/** Exige que o usuário autenticado tenha um dos perfis informados. Deve vir depois de requireAuth. */
export function requirePerfil(...permitidos: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perfil = (req as any).userPerfil as Perfil | undefined;
    if (!perfil || !permitidos.includes(perfil)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

/** Cancelar uma venda estorna estoque e financeiro, então fica restrito a administradores. */
export function exigirAdminParaCancelar(req: Request, res: Response, next: NextFunction) {
  if (req.body?.status === 'cancelada') return requirePerfil('admin')(req, res, next);
  next();
}
