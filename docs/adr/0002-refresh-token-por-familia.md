# 0002. Refresh token rotativo, organizado em famílias, com detecção de reuso

**Status:** aceita

## Contexto
Um JWT de acesso não pode ser revogado antes de expirar. Se ele durar muito, um token vazado vale por muito tempo. Se durar pouco, o usuário precisa logar de novo a toda hora. Um refresh token de longa duração resolve isso, mas vira o alvo principal: quem roubar esse token mantém a sessão indefinidamente.

## Decisão
- O token de acesso (JWT HS256) vale 15 minutos. O refresh token é aleatório (384 bits), vale 7 dias e só o hash SHA-256 dele vai para o banco (`backend/src/services/tokenService.ts`).
- Cada login abre uma família de tokens. Cada renovação emite um token novo na mesma família e revoga o anterior, guardando qual token o substituiu.
- Se um token já revogado for apresentado de novo, a API trata como roubo e revoga a família inteira. Tanto quem roubou quanto o usuário legítimo precisam logar de novo.
- A troca usa um `UPDATE ... WHERE revogado_em IS NULL` dentro de uma transação. Se duas renovações com o mesmo token chegarem juntas, só uma vence.
- O logout revoga a família inteira.

## Consequências
- Um vazamento do banco não entrega tokens utilizáveis, só hashes.
- Um refresh token roubado e usado é descoberto na próxima renovação do usuário legítimo, e a sessão cai para os dois.
- Há uma tabela de sessões para manter e consultar a cada renovação. É o custo de poder revogar sessões.
- O frontend precisa compartilhar uma única renovação em andamento entre as requisições que recebem 401 ao mesmo tempo, senão elas apresentariam o mesmo token várias vezes e só uma venceria. Isso é coberto por teste no frontend, e a corrida no servidor é coberta por teste de integração.
