# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.4.1] - 2026-10-21

### Documentação

- Licença MIT
- GIF de demonstração, novas capturas de tela e capa do repositório
- Correção do aviso da demo e da contagem de testes do frontend
- CHANGELOG com o histórico de versões
- Registros de decisão de arquitetura (ADRs) em `docs/adr`

## [1.4.0] - 2026-10-09

### Adicionado

- Conta de demonstração somente leitura para recrutadores, com preenchimento em um clique

## [1.3.0] - 2026-10-07

### Adicionado

- Refresh token com rotação e detecção de reuso
- Perfis de acesso admin e operador
- Renovação automática de sessão no frontend
- OpenAPI 3 completo, Swagger UI em /api/docs e testes de contrato
- Dockerfiles multi-stage, nginx, docker-compose e .env.example
- CI com piso de cobertura, npm audit e job de Docker

### Alterado

- CI fixado no Node.js 22

### Segurança

- Telefone fictício nos testes e .gitignore reforçado

## [1.2.0] - 2026-09-21

### Adicionado

- Validação segura de todos os campos de cliente, fornecedor, produto e conta
- Exclusão de produtos
- Toasts no próprio app no lugar de window.alert()
- Script de seed com dados fictícios para teste manual
- Testes de frontend

### Corrigido

- Listagem de clientes filtra apenas ativos por padrão
- Favicon quebrado e bug de UX no login

### Segurança

- Remove a dependência uuid não utilizada (vulnerável)
- Atualiza react-router-dom (corrige open redirect)

## [1.1.0] - 2026-09-19

### Adicionado

- Autenticação JWT completa e hardening de segurança
- Suíte de testes do backend com Vitest e Supertest contra PostgreSQL real
- Workflow de CI no GitHub Actions para backend e frontend

### Alterado

- Criação do app Express separada do listen, para permitir testes de integração

### Corrigido

- Deploy: vite-env.d.ts, lockfiles, SSL do Postgres e CORS
- Validação de entrada, controle de estoque, cálculo de vendas e recebimentos
- Frontend passa a exibir a mensagem de erro da API nas ações de gravação

## [1.0.0] - 2026-06-28

### Adicionado

- Primeira versão do sistema financeiro: backend Node.js/Express com PostgreSQL e frontend React
- Módulos de dashboard, clientes, fornecedores, produtos, estoque, vendas e contas a receber
- Configuração de deploy do frontend na Vercel (VITE_API_URL e rotas de SPA)

[1.4.1]: https://github.com/MatheusAnsel/syre/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/MatheusAnsel/syre/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/MatheusAnsel/syre/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/MatheusAnsel/syre/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MatheusAnsel/syre/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MatheusAnsel/syre/releases/tag/v1.0.0
