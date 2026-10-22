# 0001. Venda em uma única transação, com trava nos produtos e valores calculados no servidor

**Status:** aceita

## Contexto
Uma venda mexe em quatro tabelas: cria a venda e os itens, baixa o estoque dos produtos e gera a conta a receber. Se duas vendas do mesmo produto chegarem juntas e cada uma conferir o estoque antes de a outra gravar, as duas passam e o estoque fica negativo. Se o processo cair no meio, pode sobrar uma venda sem conta a receber. Além disso, o total não pode vir do navegador, e somar preços em ponto flutuante gera erros de centavos.

## Decisão
- Toda a venda roda em uma transação (`backend/src/controllers/vendasController.ts`). Qualquer erro faz `ROLLBACK` de tudo.
- Antes de conferir o estoque, a transação trava as linhas dos produtos com `SELECT ... FOR UPDATE`, sempre ordenadas por id. Uma segunda venda do mesmo produto espera a primeira terminar e já lê o estoque atualizado.
- Quantidades repetidas do mesmo produto na mesma venda são somadas antes da conferência. Faltando estoque, a API responde 409 dizendo o disponível e o pedido.
- O servidor calcula subtotais, descontos e total em inteiros (centavos para dinheiro, milésimos para quantidade). Qualquer subtotal enviado pelo cliente é ignorado.
- A baixa do estoque e o registro da movimentação são feitos por um trigger no banco ao inserir cada item (`trg_itens_venda_estoque`), dentro da mesma transação.
- A conta a receber nasce na mesma transação. O cancelamento segue o mesmo padrão: trava a venda e a conta a receber, recusa o cancelamento se já houver pagamento registrado, devolve o estoque com a movimentação correspondente e cancela a conta. Só o perfil `admin` pode cancelar.

## Consequências
- Não existe venda pela metade nem estoque negativo por corrida entre duas vendas.
- A ordem fixa das travas evita deadlock quando duas vendas têm os mesmos produtos em ordens diferentes.
- Vendas simultâneas do mesmo produto passam a ser processadas uma de cada vez. No volume de um pequeno comércio, essa espera não aparece.
- A regra fica dividida entre o controller (conferência e cálculo) e o trigger (baixa do estoque). O trigger garante que nenhum item entra sem baixar o estoque, mas fica menos visível para quem lê só o código TypeScript. Se as regras crescerem, o próximo passo é separá-las em uma camada de serviço testável sem banco.
