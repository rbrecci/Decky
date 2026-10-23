# Ranking e histórico de partidas

Esta referência define a pontuação Elo do Decky. Toda nova partida participa do ranking da sua modalidade: **1v1** ou **2v2**. Não existe seleção de partida casual.

## Cálculo de Elo

Cada jogador começa com **1000 Elo em cada modalidade**, de forma independente. O cálculo usa `K = 32` e diferença de escala `D = 400`.

No 1v1, `RA` e `RB` são os Elos dos dois jogadores. No 2v2, são as médias dos Elos individuais de cada dupla. O servidor usa os valores anteriores à atualização daquela partida para calcular a expectativa de vitória de cada lado:

```text
EA = 1 / (1 + 10 ^ ((RB - RA) / 400))
EB = 1 - EA
ganho do vencedor = ROUND(32 * (1 - expectativa do vencedor))
perda do derrotado = -ganho do vencedor
```

Todos os jogadores da dupla recebem o mesmo delta, aplicado ao seu Elo individual. O Elo da dupla não é um cadastro separado: a média serve apenas para calcular a expectativa.

| Resultado | Variação do vencedor | Variação do derrotado |
|---|---|---|
| Dois lados com 1000 Elo | +16 | -16 |
| Lado com 1200 vence lado com 1000 | +8 | -8 |
| Lado com 1000 vence lado com 1200 | +24 | -24 |

A margem do placar não muda o Elo: vencer por 12 a 0 e por 12 a 11 tem o mesmo efeito quando os Elos anteriores são iguais. Não há pontuação fixa extra por vitória. O arredondamento pode produzir variação zero em confrontos de forças muito diferentes.

## Quais partidas contam

- Somente partidas finalizadas pelo servidor alteram o Elo.
- O aparelho que atua como mesa não ganha nem perde Elo.
- Partidas criadas antes da migration do ranking não recebem pontos retroativos. O histórico as identifica como **Anterior ao ranking**.
- Uma partida em andamento não recebe resultado presumido pelo tempo decorrido. Sair do aplicativo não conclui a partida nem aplica derrota automática.
- O ranking de 1v1 e o ranking de 2v2 têm pontuação e estatísticas independentes.

## Registro no servidor

O servidor registra a modalidade e a participação no ranking ao criar a partida. Ao finalizar, a atualização do Elo e o registro individual de cada participante fazem parte da mesma transação do resultado.

O registro individual é único por partida e jogador. Reenviar a mesma ação ou reler uma partida concluída não concede pontos novamente. O cliente exibe a variação e o saldo oficiais; não calcula nem envia um Elo escolhido pelo jogador.

As tabelas de pontuação e os registros individuais não aceitam escrita direta de usuários autenticados. As consultas respeitam a identidade da sessão: o ranking expõe a classificação e as estatísticas, enquanto o histórico retorna as partidas do próprio jogador. Excluir uma sala não apaga o histórico das partidas nem seus registros de Elo.

## Ranking e histórico no app

O ranking permite alternar entre 1v1 e 2v2 e mostra posição, Elo, partidas, vitórias e derrotas. A própria posição também aparece quando o jogador está fora do topo exibido.

O histórico mostra as **últimas 50 partidas**, com formato, resultado, placar, participantes, datas de início e fim e, quando houver, a variação oficial e o Elo após a partida. As notas pessoais continuam ligadas às partidas.

## Publicação e verificação

A mudança de banco fica em `supabase/migrations/20261023150000_ranked.sql`. Ela precisa ser aplicada no Supabase antes de publicar a interface que consulta o ranking. O cálculo fica no banco; esta mudança não exige republicar as Edge Functions `start-match` e `submit-action`.

Verificações registradas:

- `node node_modules/vitest/vitest.mjs run tests/app tests/engine --maxWorkers 1`: 262 testes aprovados.
- Testes SQL executados em grupos: 82 testes aprovados, incluindo os 14 de `tests/sql/ranked.test.ts`. Os casos cobrem atualização de banco existente, Elo, médias das duplas, idempotência, isolamento das leituras e reversão da pontuação quando a transação falha. Somando os grupos de app, motor e SQL, 344 testes foram aprovados; não foi uma execução única da suíte inteira.
- `npm run typecheck`: aprovado.
- `node ranked-smoke.cjs http://127.0.0.1:8091`: verificação local em WebKit aprovada nos tamanhos 390 x 844, 375 x 667 e 844 x 390. Ranking e histórico foram exercitados com respostas controladas, sem comprovar uma partida real no Supabase de produção.

A migration foi publicada pela integração do Supabase após o merge do [PR #2](https://github.com/rbrecci/Decky/pull/2), no commit `360c9a4`. O check de produção do Supabase terminou com `success`. As chamadas anônimas às RPCs `get_rankings` e `get_my_match_history` retornaram HTTP 401, código PostgreSQL `42501` (`permission denied`), confirmando que as funções existem e recusam acesso anônimo. Essa verificação não comprova as consultas autenticadas nem uma partida real em produção.

A interface web foi publicada no EAS Hosting (publicação `mrjm92m7r8`, promovida para produção) em https://decky-brecci.expo.app, com o bundle `entry-67620f107600d85d90ff588186cf79fc.js`. As rotas `/`, `/ranking` e `/history` retornaram HTTP 200 com esse bundle. A mesma conferência foi repetida ao fechar esta documentação.

O QA em WebKit na build publicada passou nos tamanhos 390 x 844, 375 x 667 e 844 x 390, sem erros de JavaScript, requisições falhas ou endpoints inesperados. Ele cobriu ranking e histórico com a sessão e as respostas do Supabase **controladas pelo Playwright**: não houve conta criada nem dado gravado no Supabase real. Isso valida a interface publicada, não substitui uma partida real contra o backend.

Pendências reais:

- [x] Aplicar a migration no projeto Supabase de produção.
- [x] Confirmar Elo e idempotência com as migrations reais nos testes SQL.
- [x] Conferir ranking e histórico na build web publicada (respostas controladas, ver acima).
- [ ] Concluir uma partida autenticada real e conferir os registros de Elo dos participantes. Não verificado: nenhuma partida real foi jogada no iPhone nem em outro aparelho.
- [ ] Recompilar e instalar o APK Android. Não verificado: o APK atual é anterior ao Elo (commit `83ce38e`) e não tem a interface de ranking. O backend novo já contabiliza partidas novas.
- [ ] Exercitar concorrência real entre conexões Postgres. Os testes cobrem idempotência e reversão, mas não carga concorrente.
