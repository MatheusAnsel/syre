-- Syre: autenticação
-- Tabela de usuários do sistema (acesso ao painel)

CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          VARCHAR(200) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  senha_hash    VARCHAR(200) NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_usuarios_upd
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
