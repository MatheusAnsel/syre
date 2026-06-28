-- Syre: Schema completo
-- Migração inicial

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        VARCHAR(200) NOT NULL,
  cpf_cnpj    VARCHAR(18) UNIQUE,
  email       VARCHAR(150),
  telefone    VARCHAR(20),
  endereco    TEXT,
  cidade      VARCHAR(100),
  estado      VARCHAR(2),
  cep         VARCHAR(9),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS fornecedores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        VARCHAR(200) NOT NULL,
  cnpj        VARCHAR(18) UNIQUE,
  email       VARCHAR(150),
  telefone    VARCHAR(20),
  endereco    TEXT,
  cidade      VARCHAR(100),
  estado      VARCHAR(2),
  cep         VARCHAR(9),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUTOS / ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo            VARCHAR(50) UNIQUE,
  nome              VARCHAR(200) NOT NULL,
  descricao         TEXT,
  categoria         VARCHAR(100),
  unidade           VARCHAR(20) NOT NULL DEFAULT 'UN',
  preco_custo       NUMERIC(15,2) NOT NULL DEFAULT 0,
  preco_venda       NUMERIC(15,2) NOT NULL DEFAULT 0,
  estoque_atual     NUMERIC(15,3) NOT NULL DEFAULT 0,
  estoque_minimo    NUMERIC(15,3) NOT NULL DEFAULT 0,
  fornecedor_id     UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id    UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade    NUMERIC(15,3) NOT NULL,
  motivo        VARCHAR(200),
  referencia_id UUID,          -- venda_id ou compra_id
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero          SERIAL UNIQUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','concluida','cancelada')),
  desconto        NUMERIC(15,2) NOT NULL DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_venda (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id    UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id  UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade  NUMERIC(15,3) NOT NULL,
  preco_unit  NUMERIC(15,2) NOT NULL,
  desconto    NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(15,2) NOT NULL
);

-- ============================================================
-- CONTAS A RECEBER
-- ============================================================
CREATE TABLE IF NOT EXISTS contas_receber (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id      UUID REFERENCES vendas(id) ON DELETE SET NULL,
  cliente_id    UUID REFERENCES clientes(id) ON DELETE SET NULL,
  descricao     VARCHAR(300) NOT NULL,
  valor         NUMERIC(15,2) NOT NULL,
  valor_pago    NUMERIC(15,2) NOT NULL DEFAULT 0,
  vencimento    DATE NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'aberta'
                CHECK (status IN ('aberta','recebida','vencida','cancelada')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: atualizado_em automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','fornecedores','produtos','vendas','contas_receber']
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_upd
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();', t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: movimentação de estoque automática ao salvar item_venda
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_saida_estoque()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE produtos SET estoque_atual = estoque_atual - NEW.quantidade
  WHERE id = NEW.produto_id;

  INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, referencia_id)
  VALUES (NEW.produto_id, 'saida', NEW.quantidade, 'Venda', NEW.venda_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_itens_venda_estoque
AFTER INSERT ON itens_venda
FOR EACH ROW EXECUTE FUNCTION registrar_saida_estoque();

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_nome      ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome  ON fornecedores(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_nome      ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente     ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status      ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_cr_vencimento      ON contas_receber(vencimento);
CREATE INDEX IF NOT EXISTS idx_cr_status          ON contas_receber(status);
