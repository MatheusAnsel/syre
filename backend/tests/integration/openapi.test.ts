import { describe, it, expect, afterAll } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import app from '../../src/app';
import { api, closeDb } from '../helpers';
import { OPENAPI_PATH, openApiSpec } from '../../src/docs/openapi';

afterAll(closeDb);

const METODOS = ['get', 'post', 'put', 'patch', 'delete'];

/** Percorre a pilha do Express e devolve "METODO /caminho/{param}" para cada rota registrada. */
function rotasRegistradas(): string[] {
  const rotas: string[] = [];
  const adicionar = (prefixo: string, pilha: any[]) => {
    for (const camada of pilha) {
      if (camada.route) {
        for (const metodo of Object.keys(camada.route.methods)) {
          rotas.push(`${metodo.toUpperCase()} ${prefixo}${camada.route.path}`.replace(/:(\w+)/g, '{$1}'));
        }
      } else if (camada.name === 'router' && camada.handle?.stack) {
        // o único router montado é o de /api (ver app.ts)
        adicionar('/api', camada.handle.stack);
      }
    }
  };
  adicionar('', (app as any)._router.stack);
  return rotas;
}

function rotasDocumentadas(): string[] {
  const rotas: string[] = [];
  for (const [caminho, item] of Object.entries<any>(openApiSpec.paths)) {
    for (const metodo of METODOS) {
      if (item[metodo]) rotas.push(`${metodo.toUpperCase()} ${caminho}`);
    }
  }
  return rotas;
}

describe('documentação OpenAPI', () => {
  it('é um documento OpenAPI 3 válido, com todas as referências resolvidas', async () => {
    await expect(SwaggerParser.validate(OPENAPI_PATH)).resolves.toBeTruthy();
  });

  it('documenta exatamente as rotas que a API registra (sem rota faltando nem rota fantasma)', () => {
    const registradas = rotasRegistradas()
      // as rotas do próprio Swagger UI e do spec não fazem parte da API de negócio
      .filter((r) => !r.includes('/api/docs') && !r.includes('/api/openapi.json'))
      .sort();
    const documentadas = rotasDocumentadas().sort();

    expect(registradas.length).toBeGreaterThan(25); // garante que a varredura encontrou as rotas
    expect(documentadas).toEqual(registradas);
  });

  it('toda rota protegida declara bearerAuth e toda rota pública não declara', () => {
    const publicas = ['/health', '/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];
    for (const [caminho, item] of Object.entries<any>(openApiSpec.paths)) {
      for (const metodo of METODOS) {
        const operacao = item[metodo];
        if (!operacao) continue;
        const protegida = Array.isArray(operacao.security) && operacao.security.length > 0;
        expect(protegida, `${metodo.toUpperCase()} ${caminho}`).toBe(!publicas.includes(caminho));
      }
    }
  });

  it('serve o spec em JSON sem exigir autenticação', async () => {
    const res = await api().get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('Syre API');
  });

  it('serve o Swagger UI sem scripts inline (compatível com o CSP padrão do helmet)', async () => {
    const res = await api().get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    const scripts = res.text.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.every((tag) => /\bsrc=/.test(tag))).toBe(true);
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
  });
});
