<div align="center">

# Syre

**Sistema de controle financeiro full-stack** — clientes, fornecedores, estoque, vendas e contas a receber, com autenticação JWT e API REST própria.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens)](#)
[![CI](https://github.com/MatheusAnsel/syre/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusAnsel/syre/actions/workflows/ci.yml)

[Portfólio](https://matheusansel-dev.vercel.app) · [LinkedIn](https://linkedin.com/in/matheusansel)

</div>

---

## Sobre o projeto

O Syre nasceu como um estudo de caso real: construir, do zero, um ERP financeiro simplificado cobrindo todo o ciclo — cadastro de clientes e fornecedores, controle de estoque, registro de vendas e cobrança de contas a receber — com a preocupação de deixá-lo pronto para produção, não só "funcionando na máquina local".

Isso significou ir além do CRUD: implementar **autenticação JWT em toda a API**, **triggers no banco** para manter estoque e datas sempre consistentes, **rate limiting** e **headers de segurança**, e validar o comportamento do sistema ponta a ponta antes de considerar o trabalho concluído.

## Funcionalidades

| Módulo | O que faz |
|---|---|
| **Dashboard** | KPIs, gráfico de vendas (Recharts), ranking de produtos |
| **Clientes** | Cadastro, busca, ativação/inativação |
| **Fornecedores** | Cadastro completo com CNPJ |
| **Produtos & Estoque** | Preços, fornecedor vinculado, ajuste manual de estoque com histórico de movimentações |
| **Vendas** | Múltiplos itens, desconto, total calculado no servidor, recusa venda sem estoque, baixa automática via trigger e devolução do estoque ao cancelar |
| **Contas a Receber** | Geração automática por venda, recebimento parcial ou total (nunca acima do saldo), marcação de vencidas |

## Segurança

Ponto que tratei com atenção especial, por ser um sistema com dados de clientes e movimento financeiro:

- **Autenticação JWT** obrigatória em toda a API (só `/api/auth/login` é público)
- **bcrypt** para hash de senha, com resposta idêntica para "usuário não existe" e "senha errada" (evita enumeração de e-mails)
- **Rate limiting**: geral na API e mais restrito no login, contra força bruta
- **Helmet** (headers HTTP de segurança) e **CORS** restrito à origem do frontend em produção
- Mensagens de erro genéricas em produção — detalhes internos (SQL, stack trace) nunca chegam ao cliente
- Conexão com PostgreSQL via SSL em produção (Supabase)

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Recharts
- **Backend:** Node.js, Express, TypeScript, JWT, bcrypt, Helmet
- **Banco:** PostgreSQL — 8 tabelas, UUIDs, triggers automáticos (baixa de estoque, `atualizado_em`)
- **Deploy:** Vercel (frontend) + Render (backend) + Supabase (PostgreSQL)

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação

### 1. Banco de dados

```bash
createdb syre
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edite .env com as credenciais do seu banco e um JWT_SECRET forte
npm install
npm run migrate
ADMIN_NOME="Seu Nome" ADMIN_EMAIL="voce@exemplo.com" ADMIN_SENHA='senha-forte' npm run create-admin
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

## Deploy em produção

Frontend, backend e banco em provedores separados — de propósito, para deixar explícito que cada camada é implantada de forma independente:

```
                    ┌──────────────┐
                    │    Vercel    │
                    │   Frontend   │
                    │ React + Vite │
                    └──────┬───────┘
                           │ HTTPS
                           ▼
                    ┌──────────────┐
                    │    Render    │
                    │   Backend    │
                    │ Node + Express│
                    └──────┬───────┘
                           │ PostgreSQL (SSL)
                           ▼
                    ┌──────────────┐
                    │   Supabase   │
                    │  PostgreSQL  │
                    └──────────────┘
```

**Por quê essa combinação:** o PostgreSQL gratuito do próprio Render expira após 30 dias; o Supabase Free oferece banco persistente (com pausa automática após 1 semana sem uso, reativada no primeiro acesso). Render Free é adequado para portfólio/demonstração, não para produção crítica — sofre cold start e restart.

**Passo a passo:**

1. Criar um projeto PostgreSQL no [Supabase](https://supabase.com) e copiar a *connection string* do modo **Transaction pooler** (Project Settings → Database)
2. Rodar as migrations e criar o usuário admin apontando `DATABASE_URL` para essa connection string:
   ```bash
   DATABASE_URL="<connection-string-do-supabase>" NODE_ENV=production npm run migrate
   DATABASE_URL="<connection-string-do-supabase>" ADMIN_NOME="Seu Nome" ADMIN_EMAIL="voce@exemplo.com" ADMIN_SENHA='senha-forte' npm run create-admin
   ```
3. Criar um **Web Service** no [Render](https://render.com) apontando para a pasta `backend/` deste repositório (build: `npm install && npm run build`, start: `npm start`)
4. Configurar as variáveis de ambiente no Render:
   ```env
   DATABASE_URL=<connection-string-do-supabase>
   JWT_SECRET=<valor-aleatorio-forte>
   FRONTEND_URL=https://seu-frontend.vercel.app
   NODE_ENV=production
   ```
5. Publicar o frontend na Vercel com `VITE_API_URL` apontando para a URL pública do Render
6. Testar login, vendas, estoque e contas a receber em produção

## Testes e integração contínua

O backend tem testes unitários (middlewares e validações) e de integração com Vitest e Supertest, executados contra um PostgreSQL real. Isso permite verificar triggers, transações e restrições do banco, não apenas as rotas.

Cobertura funcional principal:

- autenticação, expiração e adulteração de token, rate limit do login e exigência de token em todas as rotas
- vendas: cálculo no servidor, estoque insuficiente, atomicidade da transação e cancelamento com devolução de estoque
- contas a receber: recebimento parcial e total, limite de saldo e marcação de vencidas
- erros do banco convertidos em respostas 4xx com mensagens fixas, sem vazar detalhes internos

Para rodar localmente, crie um banco vazio chamado `syre_test` (os testes recusam qualquer banco cujo nome não termine em `_test`, porque apagam os dados):

```bash
cd backend
npm test
```

O workflow em `.github/workflows/ci.yml` executa verificação de tipos, testes com cobertura e build do backend, além do build do frontend, a cada push e pull request. A variável `TEST_DATABASE_URL` permite apontar para outro banco de testes.

## Scripts

### Backend
| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Compila TypeScript |
| `npm start` | Inicia build de produção |
| `npm test` | Roda os testes (exige o banco `syre_test`) |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run typecheck` | Verifica tipos do código e dos testes |
| `npm run migrate` | Aplica migrações SQL |
| `npm run create-admin` | Cria/atualiza o usuário administrador |

### Frontend
| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |

## API — Endpoints principais

```
POST   /api/auth/login
GET    /api/auth/me

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

(todas exigem `Authorization: Bearer <token>`, exceto `/api/auth/login`)

## Autor

**Matheus Ansel** — desenvolvedor full-stack

- GitHub: [@MatheusAnsel](https://github.com/MatheusAnsel)
- LinkedIn: [linkedin.com/in/matheusansel](https://linkedin.com/in/matheusansel)
- Portfólio: [matheusansel-dev.vercel.app](https://matheusansel-dev.vercel.app)
