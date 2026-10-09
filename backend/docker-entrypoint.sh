#!/bin/sh
set -e

echo "Aplicando migrações..."
node dist/db/migrate.js

# Cria (ou redefine a senha d)o administrador inicial quando as três variáveis estão definidas.
if [ -n "$ADMIN_NOME" ] && [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_SENHA" ]; then
  echo "Garantindo o usuário administrador inicial..."
  node dist/db/createAdmin.js
fi

# Conta de demonstração (somente leitura) para recrutadores: só é criada se DEMO_SENHA estiver definida.
if [ -n "$DEMO_SENHA" ]; then
  echo "Garantindo a conta de demonstração..."
  node dist/db/createDemo.js
fi

exec node dist/index.js
