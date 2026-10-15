# Sprint Backlog

Sprint única de 1 dia (ver [SCRUM.md](SCRUM.md)). Meta: **fatia vertical funcionando em 4 aparelhos** (login, sala, mãos privadas, uma mão jogada, placar e CRUD), ampliando para partida inteira e mesa opcional só depois.

Status: `TODO`, `DOING`, `BLOCKED`, `REVIEW`, `DONE`. Em 08/10/2026 o código de todas as tarefas de desenvolvimento P0 foi escrito e passou nos testes automatizados (`npm test`); por isso estão em `REVIEW`. Viram `DONE` quando a verificação for observada no Supabase real e nos aparelhos. T-CAI-06 tem o modo mesa e o QR code implementados, mas ainda requer verificação em aparelhos. Só vira `DONE` depois que a coluna "Verificação" foi observada. Caminhos de arquivo são **sugestões**; o dono da tarefa pode ajustar, desde que avise no PR.

## Caminho crítico

`T-00 contratos` > `T-RAF-01/02 schema + auth` > `T-CAI-01 salas` > `T-RAF-03/T-EDU-03 iniciar e distribuir` > `T-RAF-04/T-EDU-04 jogar carta` > `T-EDU-05 truco e placar` > `T-RAF-06 CRUD` > `T-ISA-03 e T-MAR-03 ensaio de demo`

## Custo e corte

Partida completa e automática em um dia é o item de maior risco: exige motor testado, transação no servidor, privacidade das mãos e sincronização em 4 clientes. Estimativa honesta: a fatia "uma mão completa, sem truco" é viável; truco com 4 níveis, empates, mão de 11 e reconexão é o que pode não caber. Ordem de corte, do primeiro a sacrificar para o último:

1. Verificar QR code e modo mesa em aparelhos (P1).
2. Reconexão refinada (basta recarregar o estado persistido).
3. Mão de 11 e empates raros (documentar a limitação e a convenção adotada).
4. Truco além de 3 pontos (6, 9, 12).
5. Nunca cortar: login, sala, mãos privadas, jogar carta, placar do servidor, CRUD de `match_notes`, duas tabelas com PK/FK.

Se a partida ao vivo não fechar, a demonstração usa fixture identificada como tal (ver [QA_DEMO.md](QA_DEMO.md)).

## Contratos (primeira hora, todos juntos)

| ID | Tarefa | Responsável | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|---|
| T-DOC-00 | Documentação inicial de planejamento (README, SPEC, docs/) | Rafael (commit); revisão de Isabela e Mariana | nenhuma | Arquivos deste repo | `git diff --check` limpo, links relativos abrem | DONE (rascunho, revisão pendente) |
| T-00 | Fechar contratos: `UserProfile`, `Room`, `RoomSeat`, `PublicGameState`, `PrivateHand`, `GameAction`, `GameResult` e assinaturas das RPCs/Edge Functions | Caio, Eduardo, Rafael; Mariana aprova as regras | T-DOC-00 | `src/contracts/types.ts` e tabela de RPCs em `docs/ARCHITECTURE.md` | PR com as três aprovações; `tsc --noEmit` compila o arquivo | REVIEW |
| T-00b | Scaffold do app: Expo + TypeScript + Expo Router + Jest/Vitest | Nicoly | nenhuma | `app/`, `package.json`, `tsconfig.json` | App abre no Expo Go com tela em branco | REVIEW |

## Mariana Ribeiro (PO)

| ID | Tarefa | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|
| T-MAR-01 | Decidir as convenções pendentes de [RULES.md](RULES.md) (empate, mão de 11, desistência) | T-00 | Seção "Decisões" preenchida com data | Eduardo consegue escrever teste para cada decisão sem perguntar | TODO |
| T-MAR-02 | Revisar e aceitar critérios de [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md) | T-DOC-00 | Comentário de aceite no PR ou issue | Lista de critérios sem dúvidas abertas | TODO |
| T-MAR-03 | Executar o checklist de aceitação em 4 aparelhos | integração | Checklist de QA_DEMO marcado, com data | Itens marcados com evidência (foto, log) | TODO |
| T-MAR-04 | Roteiro de apresentação e divisão de falas | T-MAR-03 | `docs/QA_DEMO.md`, seção roteiro, com nomes por trecho | Ensaio cronometrado | TODO |

## Isabela Puzenato (Scrum Master)

| ID | Tarefa | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|
| T-ISA-01 | Criar issues no GitHub a partir desta tabela, com labels e responsáveis | T-DOC-00, handles verificados | Issues abertas, 1 por tarefa | Contagem de issues = contagem de linhas (sem duplicata) | TODO |
| T-ISA-02 | Conduzir Daily e registrar em [SCRUM.md](SCRUM.md) | início do dia | Registros reais, com hora | Entradas preenchidas por quem esteve presente | TODO |
| T-ISA-03 | Registrar impedimentos e riscos; reunir evidências de contribuição | contínua | Tabelas em SCRUM.md | Cada integrante tem pelo menos 1 evidência | TODO |
| T-ISA-04 | Sprint Review e Retrospective reais | fim do dia | Seções preenchidas em SCRUM.md | Registro assinado pelo grupo | TODO |

## Nicoly Ribeiro (UI, Auth, navegação)

| ID | Tarefa | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|
| T-NIC-01 | Design tokens e componentes base (botão grande, campo, feedback) | T-00b | `src/ui/theme.ts`, `src/ui/Button.tsx`, `src/ui/TextField.tsx` | Alvo de toque >= 44 x 44 pt medido; contraste >= 4,5:1 | REVIEW |
| T-NIC-02 | Componente de carta tradicional (naipe e valor por forma e texto, não só cor) | T-NIC-01 | `src/ui/Card.tsx` | As 40 cartas renderizam em tela de teste; legível com fonte ampliada | REVIEW |
| T-NIC-03 | Telas de cadastro e login com REGEX de e-mail e regra de senha | T-NIC-01, T-RAF-02 | `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `src/auth/validators.ts` | Testes unitários de `validators.ts`; e-mail inválido bloqueia envio | REVIEW |
| T-NIC-04 | Navegação: guarda de sessão, Home (Criar, Entrar, Histórico) | T-00b, T-NIC-03 | `app/_layout.tsx`, `app/index.tsx` | Sem sessão vai ao login; com sessão vai à Home | REVIEW |
| T-NIC-05 | Layout da tela de jogo dividida (mesa em cima, mão embaixo) com dados mockados tipados | T-00, T-NIC-02 | `app/game/[matchId].tsx`, `src/game/mocks.ts` | Cabe em tela de 360 x 640 sem rolagem horizontal | REVIEW |
| T-NIC-06 | Tela de histórico e formulário de nota (UI do CRUD) | T-NIC-01, T-RAF-06 | `app/history/*.tsx` | Criar, editar, excluir com confirmação funcionam na UI | REVIEW |

## Caio Yuri (salas e multiplayer)

| ID | Tarefa | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|
| T-CAI-01 | Criar sala e gerar código (cliente + chamada à RPC `create_room`) | T-00, T-RAF-01 | `src/rooms/api.ts`, `app/room/create.tsx` | Linha em `rooms` e `room_players` após criar | REVIEW |
| T-CAI-02 | Entrar por código e escolher posição | T-CAI-01 | `app/room/join.tsx` | Código inválido, sala cheia e duplicidade mostram mensagens distintas | REVIEW |
| T-CAI-03 | Lobby em tempo real: posições, duplas, pronto, botão Iniciar do dono | T-CAI-02 | `app/room/[code].tsx`, `src/rooms/useRoom.ts` | 4 aparelhos veem as mesmas posições em segundos | REVIEW |
| T-CAI-04 | Assinar estado público da partida e projetar em `PublicGameState` | T-00, T-RAF-03 | `src/game/usePublicState.ts` | Jogada de um aparelho aparece nos outros 3 | REVIEW |
| T-CAI-05 | Presença, estado "reconectando" e recarga do estado persistido | T-CAI-04 | `src/game/useConnection.ts` | Matar e reabrir o app restaura a vista sem ação duplicada | REVIEW |
| T-CAI-06 | (P1) Modo mesa e QR code | T-CAI-04, T-RAF-07 | `app/room/create.tsx`, `src/game/TableGame.tsx`, migration `20261008180000_table_mode.sql` | Aparelho extra vê estado público e nenhuma mão; QR abre entrada com código preenchido | REVIEW |
| T-CAI-07 | Mesa visual compartilhada, distribuição animada, seleção e confirmação da carta, controles de truco contextuais | T-CAI-04, T-EDU-05 | `src/game/components/`, `src/game/deal.ts` | Distribuição anima uma vez por mão e não repete ao reconectar; carta aparece na posição de quem jogou nos 4 aparelhos | REVIEW |

## Eduardo Zanetti (motor de regras)

| ID | Tarefa | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|
| T-EDU-01 | Baralho de 40, embaralhar com semente injetável, distribuir 3 cartas e vira | T-00 | `supabase/functions/_shared/engine/deck.ts` | Testes: 40 cartas únicas, 12 distribuídas sem repetição | REVIEW |
| T-EDU-02 | Força das cartas, manilha pela vira (com volta circular), desempate por naipe | T-EDU-01 | `.../engine/strength.ts` | Testes cobrindo vira 3 (manilha 4) e as 4 manilhas por naipe | REVIEW |
| T-EDU-03 | Máquina de estados da mão: turnos, vazas, quem vence a mão | T-EDU-02, T-MAR-01 | `.../engine/hand.ts` | Testes: 2 vazas vencem; empates conforme RULES.md | REVIEW |
| T-EDU-04 | Validação de jogada (vez, posse da carta, carta já jogada) | T-EDU-03 | `.../engine/validate.ts` | Testes: cada rejeição de US-06 tem caso | REVIEW |
| T-EDU-05 | Truco: pedido, aceite, recusa, aumento, quem responde, pontos | T-EDU-03, T-MAR-01 | `.../engine/truco.ts` | Testes: 3, 6, 9, 12; recusa dá pontos vigentes; sem pedidos simultâneos | REVIEW |
| T-EDU-06 | Placar e fim de partida em 12 pontos; mão de 11 | T-EDU-05, T-MAR-01 | `.../engine/score.ts` | Testes: 12 encerra; mão de 11 conforme decisão da PO | REVIEW |
| T-EDU-07 | Fachada `applyAction(state, action)` pura, usada por Rafael | T-EDU-04, T-EDU-05 | `.../engine/index.ts` | Rafael chama a fachada de uma Edge Function sem alterá-la | REVIEW |

O motor deve ser **TypeScript puro, sem Node nem Deno específicos**, para rodar nos testes e na Edge Function. Que o bundler da Edge Function resolve esse caminho precisa ser **verificado** por Eduardo e Rafael em T-00.

## Rafael Brecci (dados e backend)

| ID | Tarefa | Depende | Entregável | Verificação | Status |
|---|---|---|---|---|---|
| T-RAF-01 | Migrations: `profiles`, `rooms`, `room_players` com PK, FK, UNIQUE e CHECK | T-00 | `supabase/migrations/0001_rooms.sql` | Migration aplica em banco limpo; inserir seat duplicado falha | REVIEW |
| T-RAF-02 | Auth configurado, trigger/RPC que cria `profiles`, `.env.example` e `.gitignore` para segredos | T-RAF-01 | `supabase/config.toml`, `.env.example` | Cadastro cria linha em `profiles`; `git check-ignore .env` confirma | REVIEW |
| T-RAF-03 | Migrations de partida: `matches`, `match_players`, `match_events`, schema privado com `private_hands` | T-RAF-01 | `supabase/migrations/0002_matches.sql` | Papel `authenticated` não lê `private.private_hands` | REVIEW |
| T-RAF-04 | RPC/Edge `start_match` (idempotente) e `get_my_hand` | T-RAF-03, T-EDU-01 | `supabase/functions/start-match/`, `.../0003_rpc.sql` | Chamar duas vezes cria uma partida; jogador A não obtém mão de B | REVIEW |
| T-RAF-05 | RPC/Edge `submit_action` transacional: trava a partida, confere `revision`, chama `applyAction`, grava evento e estado | T-RAF-04, T-EDU-07 | `supabase/functions/submit-action/` | Duas ações simultâneas na mesma revisão: uma vence, a outra recebe conflito | REVIEW |
| T-RAF-06 | `match_notes` com RLS por autor e CRUD (RPC ou tabela direta) | T-RAF-03 | `supabase/migrations/0004_notes.sql`, `src/history/api.ts` | CREATE, READ, UPDATE, DELETE verificados; usuário B não acessa nota de A | REVIEW |
| T-RAF-07 | RLS das tabelas públicas e publicação Realtime sem dado sensível | T-RAF-03 | `supabase/migrations/0005_rls.sql` | Teste com 2 tokens: leitura cruzada negada; payload Realtime sem cartas | REVIEW |
| T-RAF-08 | Projeto Supabase, 4 usuários de teste e seed sem senha real no Git | T-RAF-02 | `supabase/seed.sql`, passo em README | 4 logins funcionam; nenhum segredo em `git log -p` | TODO |

## Dependências entre pessoas (resumo)

- Nicoly precisa de T-00b (próprio scaffold) e do contrato de tipos; trabalha com mocks até Rafael entregar T-RAF-02.
- Caio precisa de T-RAF-01 e T-RAF-03; antes disso usa tipos e mocks de `Room` e `PublicGameState`.
- Eduardo é independente até T-EDU-07; depende só das decisões da Mariana (T-MAR-01).
- Rafael é o gargalo de integração: T-RAF-04 e T-RAF-05 dependem da fachada do Eduardo. Combinar a assinatura de `applyAction` em T-00 evita espera.
