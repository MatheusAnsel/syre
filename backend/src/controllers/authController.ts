import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';

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

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não configurado no servidor');
    }

    const token = jwt.sign({ sub: usuario.id, email: usuario.email }, secret, {
      expiresIn: '12h',
    });

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const { rows } = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE id=$1',
      [userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}
