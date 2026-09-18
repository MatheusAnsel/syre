import bcrypt from 'bcryptjs';
import pool from './pool';

// Cria (ou atualiza a senha de) o usuário administrador inicial.
// Uso: ADMIN_NOME="Matheus" ADMIN_EMAIL="voce@exemplo.com" ADMIN_SENHA="senha-forte" npm run create-admin

async function createAdmin() {
  const nome = process.env.ADMIN_NOME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const senha = process.env.ADMIN_SENHA;

  if (!nome || !email || !senha) {
    console.error('Defina ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA como variáveis de ambiente.');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error('A senha deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, nome = EXCLUDED.nome`,
    [nome, email, senha_hash]
  );

  console.log(`✓ Usuário admin pronto: ${email}`);
  await pool.end();
}

createAdmin().catch((err) => {
  console.error('Erro ao criar admin:', err);
  process.exit(1);
});
