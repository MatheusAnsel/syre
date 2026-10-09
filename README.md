<div align="center">

# Syre

**Sistema de controle financeiro full-stack** — clientes, fornecedores, estoque, vendas e contas a receber, com autenticação JWT (refresh token e perfis de acesso) e API REST documentada em OpenAPI.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens)](#)
[![CI](https://github.com/MatheusAnsel/syre/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusAnsel/syre/actions/workflows/ci.yml)
[![Cobertura](https://img.shields.io/badge/cobertura-m%C3%ADnimo%2092%25%20exigido%20no%20CI-brightgreen?style=flat-square)](#testes-e-integração-contínua)
[![Docker](https://img.shields.io/badge/Docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white)](#início-rápido-com-docker)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white)](#documentação-da-api)

[Demo ao vivo](https://syre-six.vercel.app) · [Portfólio](https://matheusansel-dev.vercel.app) · [LinkedIn](https://linkedin.com/in/matheusansel)

</div>

---

> A demo exige login (é a própria autenticação JWT em ação) e está com dados fictícios de demonstração. Se quiser acessar, me chame pelo LinkedIn.

## Screenshots

<table>
<tr>
<td><img src="docs/screenshots/dashboard.png" alt="Dashboard com KPIs e gráfico de vendas" width="420"/></td>
<td><img src="docs/screenshots/clientes.png" alt="Listagem de clientes" width="420"/></td>
</tr>
<tr>
<td><img src="docs/screenshots/produtos.png" alt="Listagem de produtos com estoque" width="420"/></td>
<td><img src="docs/screenshots/vendas.png" alt="Listagem de vendas por status" width="420"/></td>
</tr>
</table>

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

## Arquitetura

```mermaid
flowchart LR
    U[Navegador] -->|HTTPS| F[Frontend<br/>React + Vite]
    F -->|/api| A

    subgraph API [API Node.js + Express]
        direction TB
        A[helmet, CORS e rate limit] --> R[requireAuth<br/>JWT HS256]
        R --> P[requirePerfil<br/>admin / operador / demo]
        P --> C[Controllers<br/>validação de entrada]
        C --> S[Regras de negócio<br/>transações]
    end

    S -->|pg, SSL em produção| D[(PostgreSQL)]
    A -.->|público| DOC[Swagger UI<br/>/api/docs]
```

Camadas separadas de propósito: o frontend nunca fala com o banco, toda regra de negócio (cálculo de totais, baixa de estoque, geração da conta a receber) roda no servidor dentro de transação, e a autorização é checada na API, não na tela.

### Sessão e renovação do token

```mermaid
sequenceDiagram
    participant N as Navegador
    participant A as API
    participant B as PostgreSQL

    N->>A: POST /api/auth/login (email, senha)
    A->>B: valida a senha (bcrypt) e grava o hash do refresh token
    A-->>N: access token (15 min) + refresh token (7 dias)

    N->>A: GET /api/clientes (access token válido)
    A-->>N: 200

    N->>A: GET /api/clientes (access token vencido)
    A-->>N: 401
    N->>A: POST /api/auth/refresh (refresh token)
    A->>B: revoga o token usado e grava um novo na mesma sessão
    A-->>N: par novo de tokens
    N->>A: GET /api/clientes (repete com o token novo)
    A-->>N: 200

    Note over N,A: Reapresentar um refresh token já usado revoga a sessão inteira
```

### Modelo de dados

```mermaid
erDiagram
    usuarios ||--o{ refresh_tokens : "possui sessões"
    clientes ||--o{ vendas : realiza
    clientes ||--o{ contas_receber : deve
    vendas ||--|{ itens_venda : contém
    vendas ||--o{ contas_receber : gera
    produtos ||--o{ itens_venda : "é vendido em"
    produtos ||--o{ movimentacoes_estoque : movimenta
    fornecedores ||--o{ produtos : fornece

    usuarios {
        uuid id PK
        string email UK
        string perfil "admin, operador ou demo"
        bool ativo
    }
    refresh_tokens {
        uuid id PK
        uuid usuario_id FK
        uuid familia_id "uma por login"
        char token_hash UK "só o hash é guardado"
        timestamptz expira_em
        timestamptz revogado_em
    }
    produtos {
        uuid id PK
        string codigo UK
        numeric estoque_atual
        numeric estoque_minimo
        uuid fornecedor_id FK
    }
    vendas {
        uuid id PK
        int numero
        uuid cliente_id FK
        string status "pendente, concluida ou cancelada"
        numeric total
    }
    contas_receber {
        uuid id PK
        uuid venda_id FK
        uuid cliente_id FK
        numeric valor
        numeric valor_pago
        string status
    }
```

## Segurança

Ponto que tratei com atenção especial, por ser um sistema com dados de clientes e movimento financeiro:

- **Autenticação JWT** obrigatória em toda a API (públicas: login, renovação de sessão, logout e a documentação)
- **Access token de 15 minutos + refresh token de 7 dias com rotação**: cada renovação troca o par inteiro e invalida o anterior. Se um refresh token já usado for reapresentado (sinal de roubo), a sessão inteira é revogada. No banco fica só o hash SHA-256 do token, nunca o valor
- **Algoritmo do JWT fixado em HS256**, o que impede ataques de troca de algoritmo (`alg: none`)
- **Perfis de acesso**: `admin` tem acesso total; `operador` não exclui registros nem cancela vendas (403); `demo` só consulta (toda escrita retorna 403). O perfil vem do token assinado, não do corpo da requisição
- **bcrypt** para hash de senha, com resposta idêntica para "usuário não existe" e "senha errada" (evita enumeração de e-mails)
- **Validação de campos com regras reais, não só formato**: CPF e CNPJ passam pelo algoritmo de dígito verificador (módulo 11) — rejeita números como `111.111.111-11`, que têm o formato certo mas não existem; e-mail, CEP, telefone e UF (as 27 siglas) também validados antes de qualquer escrita no banco
- **Rate limiting**: geral na API, mais restrito no login (contra força bruta) e com limite próprio na renovação de sessão
- **Helmet** (headers HTTP de segurança) e **CORS** restrito à origem do frontend em produção
- Mensagens de erro genéricas em produção — detalhes internos (SQL, stack trace) nunca chegam ao cliente
- Conexão com PostgreSQL via SSL em produção (Supabase)

## Problemas reais encontrados e corrigidos

Nem tudo funcionou de primeira. Documentar isso é mais honesto (e mais interessante) do que fingir que não teve:

| Problema | Como foi encontrado | Correção |
|---|---|---|
| Cliente "excluído" continuava na listagem | O soft-delete funcionava (`ativo=false`), mas o `GET /clientes` só filtrava por ativo se o parâmetro fosse passado explicitamente | Listagem passou a filtrar `ativo=true` por padrão; adicionado teste de regressão cobrindo o cenário exato |
| Lockfile do frontend quebraria o deploy | `package-lock.json` commitado estava vazio (`{"packages": {}}`) — a Vercel roda `npm ci`, que falha se o lockfile não bate com o `package.json` | Lockfile regenerado com as dependências reais |
| Build falhava no Render | `NODE_ENV=production` (necessário em runtime) também afeta o `npm install` do build, que pula `devDependencies` — incluindo os `@types/*` que o `tsc` precisa | Build command ajustado para `npm install --include=dev` |
| CPF/CNPJ fictícios passavam a validação | Ao implementar o dígito verificador (módulo 11) de verdade, os próprios fixtures de teste usavam números como `111.111.111-11` — formato certo, mas inválidos | Validação com checksum real; fixtures de teste substituídos por números que realmente existem |
| Dependência não usada com vulnerabilidade | `npm audit` apontou uma falha em `uuid`, que nunca era importado no código (os IDs vêm do `uuid_generate_v4()` do próprio Postgres) | Removida em vez de só atualizada — eliminou a superfície de ataque |
| Login com senha errada mostrava "Sessão expirada" | Ao escrever o teste de integração da tela de login, o mock de credenciais inválidas (401) revelou que o cliente HTTP tratava *todo* 401 como sessão expirada, inclusive o de login — a mensagem real da API nunca chegava à tela | Rotas `/auth/*` excluídas desse tratamento; a mensagem que a API manda (`Credenciais inválidas`) agora chega ao usuário |

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router 7, Recharts, sistema de notificações (toast) próprio — sem lib externa; testes com Vitest + React Testing Library
- **Backend:** Node.js, Express, TypeScript, JWT, bcrypt, Helmet; testes com Vitest + Supertest
- **Banco:** PostgreSQL — 8 tabelas, UUIDs, triggers automáticos (baixa de estoque, `atualizado_em`)
- **Deploy:** Vercel (frontend) + Render (backend) + Supabase (PostgreSQL)

## Início rápido com Docker

Sobe PostgreSQL, API e frontend com um comando, sem instalar Node nem PostgreSQL:

```bash
cp .env.example .env      # preencha JWT_SECRET (openssl rand -hex 48) e ADMIN_SENHA
docker compose up --build
```

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:8080 |
| API | http://localhost:3001 |
| Documentação interativa | http://localhost:3001/api/docs |

A API aplica as migrações e cria o administrador inicial (dados do `.env`) na subida. O nginx do frontend encaminha `/api` para o backend, então o navegador usa um único endereço e não há CORS a configurar. O CI sobe esta mesma stack a cada push e testa login, dashboard e documentação.

## Pré-requisitos

- Node.js 22+
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

### Dados de teste (opcional)

Para popular o sistema com dados fictícios (10 clientes, 10 fornecedores, 12 produtos, 10 vendas com contas a receber geradas automaticamente, movimentações de estoque):

```bash
SYRE_API_URL=http://localhost:3001 SYRE_EMAIL=voce@exemplo.com SYRE_SENHA='sua-senha' node scripts/seed-teste.mjs
```

O script cria tudo através da própria API (respeitando autenticação e validações reais), não escreve direto no banco.

## Variáveis de ambiente (backend)

```env
PORT=3001
DATABASE_URL=postgresql://usuario:senha@localhost:5432/syre
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=gere-um-valor-aleatorio-forte
# DATABASE_SSL=false   # em produção a conexão usa SSL; desligue só para um Postgres local sem SSL
```

## Autenticação

A API exige login em todas as rotas `/api/*`, exceto `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` e a documentação. O login devolve um access token (15 minutos) e um refresh token (7 dias, uso único). O frontend renova a sessão sozinho quando o token vence.

Crie o usuário inicial rodando (após aplicar as migrações):

```bash
cd backend
ADMIN_NOME="Seu Nome" ADMIN_EMAIL="voce@exemplo.com" ADMIN_SENHA='senha-forte' npm run create-admin
```

> Se a senha tiver `#`, `$` ou espaços, use aspas simples como no exemplo acima —
> sem aspas, o dotenv corta a variável no primeiro `#` ao ler o `.env`.

O usuário criado por esse comando é `admin`. Novos usuários entram como `operador` por padrão.

### Conta de demonstração (para recrutadores)

A tela de login tem o botão **Preencher com acesso demo**: com um clique, e-mail e senha são preenchidos e basta entrar. A conta usa o perfil `demo`, que é **somente leitura**: dá para navegar por todas as telas, mas qualquer gravação (criar, editar, ajustar estoque, mudar status, excluir) é recusada pela API com 403, independentemente do que o frontend mostrar. As credenciais são públicas de propósito, justamente por isso.

Para ativar em um ambiente (depois de aplicar as migrações; a `004_perfil_demo.sql` libera o perfil):

```bash
cd backend
DEMO_SENHA='demo-syre-2026' npm run create-demo
```

O e-mail padrão é `recrutador@syre.dev` (`DEMO_EMAIL` e `DEMO_NOME` são opcionais). No Docker, a conta é criada na subida da API quando `DEMO_SENHA` está definida (o `docker-compose.yml` já traz o padrão). Para a conta ter o que mostrar, popule o ambiente com os dados fictícios (seção "Dados de teste"). O frontend usa `VITE_DEMO_EMAIL` e `VITE_DEMO_SENHA` se você trocar as credenciais, e `VITE_DEMO_DESATIVADO=true` esconde o botão.

### Atualizando uma instalação que já existe

A migração `003_refresh_tokens_perfis.sql` adiciona o perfil e a tabela de sessões. Rode as migrações **antes** de publicar a versão nova da API, senão o login falha por falta da coluna `perfil`:

```bash
DATABASE_URL="<sua-connection-string>" NODE_ENV=production npm run migrate
```

Os usuários que já existiam viram `admin` (eram os únicos que podiam operar o sistema), e isso acontece uma única vez, mesmo que a migração seja executada de novo. Quem estava logado com o token antigo precisa entrar novamente.

## Documentação da API

A documentação é um arquivo OpenAPI 3 ([`backend/openapi.yaml`](backend/openapi.yaml)) servido com Swagger UI em `/api/docs` (spec em JSON em `/api/openapi.json`). Um teste automatizado compara as rotas registradas no Express com as do arquivo e falha se houver rota sem documentação ou documentada sem existir, então ela não fica desatualizada.

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
3. Criar um **Web Service** no [Render](https://render.com) apontando para a pasta `backend/` deste repositório (build: `npm install --include=dev && npm run build`, start: `npm start`)

   > O `--include=dev` é necessário porque a variável `NODE_ENV=production` (configurada no passo 4) também vale durante o build, e o `npm install` sem essa flag pula as devDependencies — incluindo os `@types/*` que o `tsc` precisa para compilar. Sem isso, o build falha com erros `TS7016`/`TS2591`.
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

280 testes no total. Os 255 do backend (unitários e de integração, Vitest + Supertest) rodam contra um PostgreSQL real — verificam triggers, transações e restrições do banco, não apenas as rotas. Os 25 do frontend (Vitest + React Testing Library) cobrem login, proteção de rotas, renovação automática de sessão e o tratamento de erro da API — simulando digitação e clique reais, não só chamando funções isoladas.

| Cobertura do backend (out/2026) | Medido | Mínimo exigido no CI |
|---|---|---|
| Linhas e instruções | 95,6% | 92% |
| Branches | 89,0% | 85% |
| Funções | 100% | 95% |

Se a cobertura cair abaixo do mínimo, o CI falha.

Cobertura funcional principal (backend):

- autenticação, expiração e adulteração de token, rotação do refresh token (incluindo detecção de reuso e renovações simultâneas), perfis de acesso, rate limit do login e exigência de token em todas as rotas
- contrato da API: o spec OpenAPI é validado e comparado com as rotas reais
- vendas: cálculo no servidor, estoque insuficiente, atomicidade da transação e cancelamento com devolução de estoque
- contas a receber: recebimento parcial e total, limite de saldo e marcação de vencidas
- erros do banco convertidos em respostas 4xx com mensagens fixas, sem vazar detalhes internos

Para rodar localmente, crie um banco vazio chamado `syre_test` (os testes recusam qualquer banco cujo nome não termine em `_test`, porque apagam os dados):

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
```

O workflow em `.github/workflows/ci.yml` roda a cada push e pull request, em três jobs:

1. **Backend**: auditoria das dependências de produção, verificação de tipos, testes com cobertura (com o piso acima) e build.
2. **Frontend**: testes, verificação de tipos e build.
3. **Docker**: sobe o `docker-compose.yml` inteiro e faz um teste de fumaça (saúde da API, página do frontend, login pelo proxy do nginx, dashboard autenticado e Swagger UI).

A variável `TEST_DATABASE_URL` permite apontar para outro banco de testes.

## API — Endpoints principais

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dashboard

GET    /api/clientes
GET    /api/clientes/:id
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id

GET    /api/fornecedores
GET    /api/fornecedores/:id
POST   /api/fornecedores
PUT    /api/fornecedores/:id
DELETE /api/fornecedores/:id

GET    /api/produtos
GET    /api/produtos/:id
POST   /api/produtos
PUT    /api/produtos/:id
DELETE /api/produtos/:id
POST   /api/produtos/:id/estoque
GET    /api/produtos/:id/movimentacoes

GET    /api/vendas
POST   /api/vendas
GET    /api/vendas/:id
PATCH  /api/vendas/:id/status

GET    /api/contas-receber
GET    /api/contas-receber/:id
POST   /api/contas-receber
PATCH  /api/contas-receber/:id/receber
POST   /api/contas-receber/marcar-vencidas
```

(todas exigem `Authorization: Bearer <token>`, exceto login, refresh e logout. Excluir clientes, fornecedores e produtos e cancelar vendas exige o perfil `admin`. Contrato completo e testável em `/api/docs`.)

## Autor

**Matheus Ansel** — desenvolvedor full-stack

- GitHub: [@MatheusAnsel](https://github.com/MatheusAnsel)
- LinkedIn: [linkedin.com/in/matheusansel](https://linkedin.com/in/matheusansel)
- Portfólio: [matheusansel-dev.vercel.app](https://matheusansel-dev.vercel.app)
