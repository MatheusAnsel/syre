import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  const emProducao = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: emProducao ? 'Erro interno do servidor' : err.message || 'Erro interno do servidor',
  });
}
