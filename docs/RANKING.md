# MMR, Elos e histórico

A V2 chama a pontuação de MMR. Elo identifica o título derivado desse número. Duelo (1v1) e Duplas (2v2) mantêm pontuação e estatísticas independentes. Todas as partidas novas são ranqueadas; a mesa não pontua.

## Regra aprovada

Novos perfis recebem 500 MMR em cada modalidade. O saldo final nunca fica abaixo de 500. RW é o MMR do vencedor no Duelo ou a média dos parceiros nas Duplas; RL representa o lado derrotado. A média não é arredondada.

```text
d = RL - RW
q = min(9, ceil(max(0, abs(d) - 100) / 100))
ganho = max(5, 10 + sign(d) * 5 * q)
delta nominal = +ganho para vencedor, -ganho para derrotado
saldo final = max(500, saldo anterior + delta nominal)
delta real = saldo final - saldo anterior
```

Diferenças de até 100 mantêm ganho 10. A diferença 101 concede 15 ao azarão e 5 ao favorito; 201 concede 20 ao azarão. A partir de 901, o azarão recebe 55. Uma diferença fracionária de 100,5 já ativa o primeiro degrau. O ganho está sempre entre 5 e 55 e não depende de placar, truco ou vazas.

Os dois parceiros recebem a mesma variação nominal. O piso pode limitar as perdas reais: em 500 a perda real é zero; em 506 uma perda nominal de 10 termina em 500, com delta real -6. O vencedor recebe seu ganho integral. O piso cria MMR líquido, portanto não há promessa de soma zero.

## Títulos

Cada divisão cobre 100 MMR, incluindo seus limites:

- Beta 1, 2 e 3: 500-599, 600-699 e 700-799.
- Delta 1, 2 e 3: 800-899, 900-999 e 1000-1099.
- Alfa 1, 2 e 3: 1100-1199, 1200-1299 e 1300-1399.
- Sigma 1, 2 e 3: 1400-1499, 1500-1599 e 1600-1699.
- Omega: 1700 ou mais, sem divisão e sem teto.

`src/ranking/elo.ts` deriva o título e rejeita números inválidos. Promoção e rebaixamento são imediatos após o resultado oficial, sem séries ou temporadas. Até a virada, saldo legado inferior a 500 é identificado como anterior à V2 na interface.

## Transação e auditoria

A modalidade e a participação no ranking ficam congeladas na criação da partida. Ao finalizar, o trigger trava os ratings dos participantes em ordem estável, captura as médias antes de escrever qualquer saldo e registra o extrato na mesma transação do resultado.

`match_ratings` registra `points_before`, `points_delta` real, `points_after`, `nominal_delta`, `rating_rule = decky-v2-step5`, `winner_average` e `loser_average`. A chave única por partida/jogador e a idempotência de ação impedem pontuação repetida. Falha posterior no commit reverte resultado e ratings integralmente.

O cliente não escreve ratings nem calcula seu próprio saldo. Partidas em andamento não recebem resultado presumido. Mesa, abandono e desconexão não geram pontuação nova por si sós. Excluir a sala mantém partidas e notas.

## Histórico e notas

`get_my_match_history(p_limit, p_offset)` retorna somente partidas da identidade atual, ordenadas por início e ID. O app pede seis registros, mostra cinco e usa o sexto para detectar próxima página. Não existe teto de cinquenta partidas na navegação.

`get_my_notes_page(p_limit, p_offset)` retorna notas do autor por criação e ID, já associadas aos metadados e ao extrato autorizado da partida. A página de notas é independente da página de partidas. O CRUD mantém RLS por autor e participação.

## Atualização da base e virada

A migration nova é `supabase/migrations/20261023230536_v2_mmr_public_rooms_history.sql`. Ela não altera migrations anteriores e não executa reset. Cria ratings ausentes em 500, sem sobrescrever saldos existentes. Registros antigos mantêm `rating_rule` e campos novos de auditoria nulos.

A constraint `player_ratings_mmr_floor` é criada como `NOT VALID`: protege toda nova escrita sem fingir que houve limpeza dos dados antigos. A validação completa dessa constraint pertence ao procedimento aprovado da virada, depois da exclusão dos dados de usuários/jogo. O piso dos novos resultados é aplicado desde a migration.

Em 24/10/2026, a migration V2 foi aplicada e `start-match` e `submit-action` foram publicadas na versão 14. A web V2 também foi publicada. Os registros anteriores do ranking V1, com inicial 1000 e K=32, são históricos: o PR #2 e a publicação web `mrjm92m7r8` não comprovam a V2. As evidências atuais estão em [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md).

Além do ensaio PGlite de uma conexão, duas conexões PostgreSQL reais comprovaram corrida pela última vaga, serialização de MMR, reenvio e rollback. Realtime entre duas identidades, consultas autenticadas, partida finalizada e seu extrato foram exercitados no Supabase hospedado com contas sintéticas segregadas. Essas provas não executam nem aprovam a virada global, que continua condicionada a [VIRADA_V2.md](VIRADA_V2.md).
