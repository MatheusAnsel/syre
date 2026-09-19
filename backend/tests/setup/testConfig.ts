// Configuração compartilhada entre o vitest.config.ts e o globalSetup.
// Os testes de integração APAGAM dados, por isso só rodam contra um banco cujo nome termina em "_test".

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/syre_test';

export function assertBancoDeTeste(url: string): void {
  const nomeDoBanco = new URL(url).pathname.replace('/', '');
  if (!nomeDoBanco.endsWith('_test')) {
    throw new Error(
      `Testes recusados: o banco "${nomeDoBanco}" não termina com "_test". ` +
        'Os testes de integração apagam todas as tabelas; use um banco exclusivo (ex.: syre_test).'
    );
  }
}
