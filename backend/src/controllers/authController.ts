import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import {
  ACCESS_TOKEN_TTL_SEGUNDOS,
  Perfil,
  emitirRefreshToken,
  encerrarSessao,
  gerarAccessToken,
  renovarSessao,
} from '../services/tokenService';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Informe email e senha' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email=$1 AND ativo=true',
      [String(email).toLowerCase().trim()]
    );
    const usuario = rows[0];

    // Resposta idêntica para usuário inexistente ou senha errada,
    // para não revelar quais emails estão cadastrados.
    if (!usuario) {
      await bcrypt.compare(senha, '$2a$10$invalidinvalidinvalidinvalidinvalidinva');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = gerarAccessToken({ id: usuario.id, email: usuario.email, perfil: usuario.perfil as Perfil });
    const refresh = await emitirRefreshToken(pool, usuario.id);

    res.json({
      token,
      refreshToken: refresh.token,
      expiresIn: ACCESS_TOKEN_TTL_SEGUNDOS,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Informe o refreshToken' });
    }

    const resultado = await renovarSessao(refreshToken);
    if (!resultado.ok) {
      // Mesma resposta para qualquer motivo: não ajuda quem estiver testando tokens.
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    res.json({
      token: resultado.accessToken,
      refreshToken: resultado.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEGUNDOS,
      usuario: {
        id: resultado.usuario.id,
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        perfil: resultado.usuario.perfil,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken === 'string' && refreshToken) {
      await encerrarSessao(refreshToken);
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const { rows } = await pool.query(
      'SELECT id, nome, email, perfil FROM usuarios WHERE id=$1',
      [userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}
