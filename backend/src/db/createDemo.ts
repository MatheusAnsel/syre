import bcrypt from 'bcryptjs';
import pool from './pool';

// Cria (ou redefine a senha d)a conta de demonstração, com perfil 'demo' (somente leitura).
// Uso: DEMO_SENHA='demo-syre-2026' npm run create-demo
// Opcionais: DEMO_NOME, DEMO_EMAIL (padrão: recrutador@syre.dev)
//
// As credenciais são públicas de propósito (aparecem no botão da tela de login):
// o middleware bloquearEscritaDemo recusa qualquer escrita (403), então a conta só consulta.

async function createDemo() {
  const nome = process.env.DEMO_NOME || 'Recrutador (demo)';
  const email = (process.env.DEMO_EMAIL || 'recrutador@syre.dev').toLowerCase().trim();
  const senha = process.env.DEMO_SENHA;

  if (!senha) {
    console.error('Defina DEMO_SENHA como variável de ambiente.');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error('A senha deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  // Nunca promove um usuário existente: se o e-mail já for de um admin/operador, aborta.
  const { rows } = await pool.query('SELECT perfil FROM usuarios WHERE email = $1', [email]);
  if (rows[0] && rows[0].perfil !== 'demo') {
    console.error(`O e-mail ${email} já pertence a um usuário com perfil '${rows[0].perfil}'. Use outro DEMO_EMAIL.`);
    await pool.end();
    process.exit(1);
  }

  await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
     VALUES ($1, $2, $3, 'demo', true)
     ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, nome = EXCLUDED.nome, ativo = true`,
    [nome, email, senha_hash]
  );

  console.log(`✓ Conta demo pronta: ${email}`);
  await pool.end();
}

createDemo().catch((err) => {
  console.error('Erro ao criar conta demo:', err);
  process.exit(1);
});
