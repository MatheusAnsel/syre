-- Syre: sessões com refresh token e perfis de acesso.
-- As migrações são reaplicadas a cada execução, então tudo aqui é idempotente.

-- Perfis: 'admin' (acesso total) e 'operador' (sem exclusões nem cancelamento de vendas).
-- Usuários que já existiam antes desta migração eram todos administradores:
-- a coluna nasce com DEFAULT 'admin' (preenchendo as linhas atuais) e o default
-- passa a 'operador' logo depois. O bloco só roda uma vez, quando a coluna ainda não existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'perfil'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN perfil VARCHAR(20) NOT NULL DEFAULT 'admin';
    ALTER TABLE usuarios ALTER COLUMN perfil SET DEFAULT 'operador';
  END IF;
END $$;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_chk;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_chk CHECK (perfil IN ('admin', 'operador'));

-- Refresh tokens: só o hash SHA-256 é guardado (o token em si nunca vai para o banco).
-- Cada login abre uma "família"; cada renovação gera um token novo na mesma família
-- e revoga o anterior. Reapresentar um token já revogado indica roubo/reuso e
-- derruba a família inteira.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  familia_id      UUID NOT NULL,
  token_hash      CHAR(64) UNIQUE NOT NULL,
  expira_em       TIMESTAMPTZ NOT NULL,
  revogado_em     TIMESTAMPTZ,
  substituido_por UUID,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_familia ON refresh_tokens(familia_id);
