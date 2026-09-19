import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { TEST_DATABASE_URL, assertBancoDeTeste } from './testConfig';

// Roda uma vez antes de todos os testes: garante que o schema do banco de testes está atualizado.
export default async function setup(): Promise<void> {
  assertBancoDeTeste(TEST_DATABASE_URL);

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();

  try {
    const dir = path.join(process.cwd(), 'migrations');
    const arquivos = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const arquivo of arquivos) {
      await client.query(fs.readFileSync(path.join(dir, arquivo), 'utf-8'));
    }
  } finally {
    await client.end();
  }
}
