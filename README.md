# Syre — Sistema de Controle Financeiro

Sistema financeiro full-stack com React, TypeScript, Node.js e PostgreSQL.

## Módulos

| Módulo | Descrição |
|---|---|
| Dashboard | KPIs, gráfico de vendas, top produtos |
| Clientes | Cadastro, busca, ativação/inativação |
| Fornecedores | Cadastro completo com CNPJ |
| Produtos | Cadastro com preços, estoque e fornecedor |
| Estoque | Ajuste manual (entrada/saída) e histórico de movimentações |
| Vendas | Criação com itens, desconto, cliente; alteração de status |
| Contas a Receber | Geração automática por venda, recebimento parcial/total |

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Recharts
- **Backend:** Node.js, Express, TypeScript
- **Banco:** PostgreSQL com UUID e triggers automáticos

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação

### 1. Banco de dados

```bash
createdb syre
psql -d syre -f backend/migrations/001_schema_inicial.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edite .env com as credenciais do seu banco
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend roda em `http://localhost:5173` e faz proxy para a API em `http://localhost:3001`.

## Variáveis de ambiente (backend)

```env
PORT=3001
DATABASE_URL=postgresql://usuario:senha@localhost:5432/syre
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=gere-um-valor-aleatorio-forte
```

## Autenticação

A API exige login (JWT) em todas as rotas `/api/*`, exceto `/api/auth/login`.

Crie o usuário inicial rodando (após aplicar as migrações):

```bash
cd backend
ADMIN_NOME="Seu Nome" ADMIN_EMAIL="voce@exemplo.com" ADMIN_SENHA='senha-forte' npm run create-admin
```

> Se a senha tiver `#`, `$` ou espaços, use aspas simples como no exemplo acima —
> sem aspas, o dotenv corta a variável no primeiro `#` ao ler o `.env`.

## Scripts

### Backend
| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Compila TypeScript |
| `npm start` | Inicia build de produção |
| `npm run migrate` | Aplica migrações SQL |

### Frontend
| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |

## API — Endpoints principais

```
GET    /api/dashboard
GET    /api/clientes
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id

GET    /api/fornecedores
POST   /api/fornecedores
PUT    /api/fornecedores/:id

GET    /api/produtos
POST   /api/produtos
PUT    /api/produtos/:id
POST   /api/produtos/:id/estoque
GET    /api/produtos/:id/movimentacoes

GET    /api/vendas
POST   /api/vendas
GET    /api/vendas/:id
PATCH  /api/vendas/:id/status

GET    /api/contas-receber
POST   /api/contas-receber
PATCH  /api/contas-receber/:id/receber
POST   /api/contas-receber/marcar-vencidas
```
