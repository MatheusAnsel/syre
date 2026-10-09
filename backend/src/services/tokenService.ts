import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import pool from '../db/pool';

export type Perfil = 'admin' | 'operador' | 'demo';

export const ACCESS_TOKEN_TTL_SEGUNDOS = 15 * 60; // 15 minutos
export const REFRESH_TOKEN_TTL_DIAS = 7;

export interface UsuarioSessao {
  id: string;
  email: string;
  perfil: Perfil;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function segredo(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado no servidor');
  return secret;
}

export function gerarAccessToken(usuario: UsuarioSessao): string {
  return jwt.sign({ sub: usuario.id, email: usuario.email, perfil: usuario.perfil }, segredo(), {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SEGUNDOS,
  });
}

/** Grava um refresh token novo (aleatório, 384 bits) e devolve o valor em texto — a única vez que ele existe fora do cliente. */
export async function emitirRefreshToken(
  db: Pick<PoolClient, 'query'>,
  usuarioId: string,
  familiaId: string = crypto.randomUUID()
): Promise<{ token: string; id: string }> {
  const token = crypto.randomBytes(48).toString('base64url');
  const { rows } = await db.query(
    `INSERT INTO refresh_tokens (usuario_id, familia_id, token_hash, expira_em)
     VALUES ($1, $2, $3, NOW() + make_interval(days => $4))
     RETURNING id`,
    [usuarioId, familiaId, hashToken(token), REFRESH_TOKEN_TTL_DIAS]
  );
  return { token, id: rows[0].id };
}

export type ResultadoRenovacao =
  | { ok: true; accessToken: string; refreshToken: string; usuario: UsuarioSessao & { nome: string } }
  | { ok: false; motivo: 'invalido' | 'expirado' | 'reuso' | 'usuario-inativo' | 'concorrencia' };

/**
 * Renova a sessão trocando o refresh token por um par novo (rotação).
 * Se o token apresentado já foi usado, a família inteira é revogada.
 */
export async function renovarSessao(refreshToken: string): Promise<ResultadoRenovacao> {
  const { rows } = await pool.query(
    `SELECT rt.id, rt.familia_id, rt.usuario_id, rt.expira_em, rt.revogado_em,
            u.nome, u.email, u.perfil, u.ativo
       FROM refresh_tokens rt
       JOIN usuarios u ON u.id = rt.usuario_id
      WHERE rt.token_hash = $1`,
    [hashToken(refreshToken)]
  );
  const atual = rows[0];
  if (!atual) return { ok: false, motivo: 'invalido' };

  if (atual.revogado_em) {
    await revogarFamilia(atual.familia_id);
    return { ok: false, motivo: 'reuso' };
  }
  if (new Date(atual.expira_em) <= new Date()) return { ok: false, motivo: 'expirado' };
  if (!atual.ativo) return { ok: false, motivo: 'usuario-inativo' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const novo = await emitirRefreshToken(client, atual.usuario_id, atual.familia_id);
    const { rowCount } = await client.query(
      `UPDATE refresh_tokens SET revogado_em = NOW(), substituido_por = $2
        WHERE id = $1 AND revogado_em IS NULL`,
      [atual.id, novo.id]
    );
    if (rowCount === 0) {
      // Outra requisição consumiu este token entre a leitura e a troca.
      await client.query('ROLLBACK');
      return { ok: false, motivo: 'concorrencia' };
    }
    await client.query('COMMIT');

    const usuario = { id: atual.usuario_id, email: atual.email, perfil: atual.perfil as Perfil };
    return {
      ok: true,
      accessToken: gerarAccessToken(usuario),
      refreshToken: novo.token,
      usuario: { ...usuario, nome: atual.nome },
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function revogarFamilia(familiaId: string): Promise<void> {
  await pool.query(
    'UPDATE refresh_tokens SET revogado_em = NOW() WHERE familia_id = $1 AND revogado_em IS NULL',
    [familiaId]
  );
}

/** Encerra a sessão a partir do refresh token. Idempotente: token desconhecido não é erro. */
export async function encerrarSessao(refreshToken: string): Promise<void> {
  await pool.query(
    `UPDATE refresh_tokens SET revogado_em = NOW()
      WHERE revogado_em IS NULL
        AND familia_id = (SELECT familia_id FROM refresh_tokens WHERE token_hash = $1)`,
    [hashToken(refreshToken)]
  );
}
