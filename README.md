<div align="center">

# Syre

**Sistema de controle financeiro full-stack** — clientes, fornecedores, estoque, vendas e contas a receber, com autenticação JWT e API REST própria.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens)](#)

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
| **Vendas** | Múltiplos itens, desconto, baixa automática de estoque via trigger no banco |
| **Contas a Receber** | Geração automática por venda, recebimento parcial ou total, marcação de vencidas |

## Segurança

Ponto que tratei com atenção especial, por ser um sistema com dados de clientes e movimento financeiro:

- **Autenticação JWT** obrigatória em toda a API (só `/api/auth/login` é público)
- **bcrypt** para hash de senha, com resposta idêntica para "usuário não existe" e "senha errada" (evita enumeração de e-mails)
- **Rate limiting**: geral na API e mais restrito no login, contra força bruta
- **Helmet** (headers HTTP de segurança) e **CORS** restrito à origem do frontend em produção
- Mensagens de erro genéricas em produção — detalhes internos (SQL, stack trace) nunca chegam ao cliente
- Conexão com PostgreSQL via SSL em produção (Railway)

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Recharts
- **Backend:** Node.js, Express, TypeScript, JWT, bcrypt, Helmet
- **Banco:** PostgreSQL — 8 tabelas, UUIDs, triggers automáticos (baixa de estoque, `atualizado_em`)
- **Deploy:** Vercel (frontend) + Railway (backend/DB)

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

## Scripts

### Backend
| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Compila TypeScript |
| `npm start` | Inicia build de produção |
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
