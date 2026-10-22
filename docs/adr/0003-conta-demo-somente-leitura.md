# 0003. Conta de demonstração como perfil próprio, com escrita bloqueada para toda a API

**Status:** aceita

## Contexto
O sistema tem uma demo pública com login para recrutadores. Uma conta compartilhada com permissão de escrita seria apagada ou bagunçada em pouco tempo. Esconder os botões na tela não protege nada, porque qualquer pessoa pode chamar a API direto. Marcar rota por rota quais a demo pode usar deixaria uma rota nova desprotegida sempre que alguém esquecesse de marcar.

## Decisão
- Existe um perfil `demo`, ao lado de `admin` e `operador`, validado por uma constraint no banco (migração `004_perfil_demo.sql`).
- Um middleware único (`bloquearEscritaDemo`) fica na frente de todas as rotas autenticadas em `app.use('/api', ...)`. Para o perfil `demo`, ele recusa com 403 qualquer método que não seja `GET`, `HEAD` ou `OPTIONS`.
- Login, renovação e logout funcionam normalmente para a conta demo, porque ficam fora desse grupo de rotas.
- A conta só é criada quando `DEMO_SENHA` está definida, e o frontend permite esconder o botão de acesso à demo.

## Consequências
- Qualquer rota nova já nasce protegida para a demo, sem configuração extra.
- O recrutador vê o sistema com dados reais de exemplo, mas não altera nada.
- A regra depende de a API seguir o padrão REST: uma escrita feita por `GET` passaria pelo bloqueio. Por isso nenhuma rota altera dados por `GET`, e os testes conferem que as escritas são recusadas para a demo.
