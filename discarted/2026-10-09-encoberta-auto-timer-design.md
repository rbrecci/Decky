# Carta escondida, jogada automática e limite de 20 s

Data: 2026-10-09. Estado: **implementado**, aguardando verificação em aparelhos.

Três funcionalidades sobre a arquitetura atual (servidor autoritativo: motor puro em
`supabase/functions/_shared/engine/`, Edge Function `submit-action`, Postgres com mãos em
`private.private_hands`). Nenhuma regra nova roda só no cliente.

## Regras novas (decididas com o time)

| ID | Regra |
|---|---|
| D-20 | Um jogador pode jogar a carta **escondida** (virada para baixo) **a partir da 2ª vaza** (`trickResults.length >= 1`); na 1ª vaza, `play_card` com `hidden: true` é recusado com `illegal_action`. Ela **mantém a força real**. |
| D-21 | A carta escondida é revelada para todos quando a vaza fecha (4ª carta). A vaza é resolvida com as cartas reais. |
| D-22 | Se a mão acabar antes de a vaza fechar (correr, recusa, timeout de truco), a carta escondida é descartada **sem ser revelada**, como as cartas que ficaram na mão. |
| D-23 | O jogador pode marcar **uma** carta da mão para jogada automática fora da vez. Na próxima vez dele em que jogar carta for legal (sem truco nem pedido de dupla em aberto), o servidor joga essa carta aberta e limpa a marcação. Na própria vez, a marcação não é aceita (vale a jogada normal). |
| D-24 | A marcação some quando a carta sai da mão, quando a mão acaba e quando a partida acaba. |
| D-25 | Cada decisão tem prazo de 20 s, contado no relógio do servidor. O prazo começa quando a vez passa a um jogador, quando um truco/aumento é pedido e quando um truco é aceito (a vez volta a contar do zero). Um pedido de confirmação da dupla **não** reinicia o prazo: ele corre dentro do prazo da decisão de baixo. |
| D-26 | Prazo de **jogar carta** vencido: o servidor joga a carta marcada para jogada automática, se ainda válida; senão, a carta de **menor força** da mão (desempate: a primeira na ordem da mão), aberta. |
| D-27 | Prazo de **responder truco/aumento** vencido: conta como **recusa**: a dupla que pediu ganha o valor vigente antes do pedido. Nunca vira aceite. Vale também para 6, 9 e 12, mesmo sendo decisões de dupla: o timeout é regra do jogo, não decisão de um jogador. |
| D-28 | Pedido de confirmação da dupla aberto quando o prazo vence: o pedido termina como `expired` (sem efeito) e a política da decisão de baixo (D-26 ou D-27) é aplicada na mesma ação. |

Mão de 11 e mão de ferro não mudam: sem truco nessas mãos, só há prazo de jogar carta.

## Modelo de dados

### Motor (`engine/types.ts`)

```ts
// Na mesa pública, a carta escondida não existe: só o lugar.
type PublicTableCard = { seat: Seat; card: Card; hidden?: false } | { seat: Seat; card: null; hidden: true };

interface TableCard { seat: Seat; card: Card; hidden?: boolean }   // lastTrick: sempre aberta, com a marca

interface ActionDeadline {
  kind: 'play' | 'truco';
  at: number;          // epoch ms do relógio do Postgres
  seat?: Seat;         // play: quem precisa jogar
  team?: Team;         // truco: dupla que responde
}

PublicGameState.tableCards: PublicTableCard[]
PublicGameState.deadline?: ActionDeadline | null   // opcional: partidas antigas não têm

MatchState.covered: (Card | null)[]   // por lugar: a carta escondida na vaza atual (só servidor)
MatchState.autoCards: (Card | null)[] // por lugar: carta marcada (só servidor)

GameAction += { type: 'play_card'; card: Card; hidden?: boolean }
GameAction += { type: 'expire'; at: number }   // `at` = prazo que o cliente viu

ProposalStatus += 'expired'
RuleError += 'too_early'
```

`applyAction(state, seat, action, rng, now)` passa a receber `now` (epoch ms). Continua pura.

### Banco (migration nova `20261009120000_hidden_auto_timer.sql`)

- `private.private_hands` ganha `covered jsonb` e `auto_card jsonb` (null por padrão).
- `get_my_hand` devolve também `covered` e `autoCard` (só do próprio lugar). A mesa continua recebendo `null`.
- `internal_get_match` devolve `covered`, `autoCards` (por lugar) e `now` (epoch ms do `now()` do banco).
- `internal_commit_action` passa a receber `p_events jsonb` (lista) no lugar de `p_event`, mais `p_covered`, `p_auto_cards` e `p_auto_used` (os valores de `auto_card` que o motor leu). Dentro do `FOR UPDATE`, ele confere se `auto_card` de cada lugar ainda é o valor lido. Se mudou, devolve `auto_changed` e não grava nada.
- `set_my_auto_card(p_match_id uuid, p_card jsonb)`: RPC para `authenticated`. Trava a partida, confere se a partida está em andamento, se o usuário é jogador, se a carta está na própria mão (ou `null` para cancelar) e se **não** é a vez dele com jogada livre. Grava só `auto_card`: **não muda a revisão** nem gera evento público. Devolve `{ ok, autoCard }`.
- `server_now()`: RPC para `authenticated`, devolve o epoch ms do `now()`.
- A assinatura antiga de `internal_commit_action` é removida (`drop function`): não há duas versões ativas.

## Fluxo no servidor

`submitActionService`:

1. `internal_get_match` (estado, mãos, `covered`, `autoCards`, `now`).
2. Confere a revisão; `applyAction(..., now)`.
3. Depois da ação, o motor roda `runAutoPlays`: enquanto a partida estiver em andamento, sem truco e sem pedido de dupla, e o lugar da vez tiver carta marcada que ainda está na mão, joga a carta por `executeRule` (a mesma validação da jogada manual). Cada jogada gera um evento. Limite de segurança: 4 jogadas por chamada.
4. O motor recalcula `deadline` a partir do estado final (função única `deadlineFor(prev, next, now)`).
5. `internal_commit_action` com a lista de eventos. Com `auto_changed`, o serviço recomeça do passo 1, até 2 vezes, sem erro para o usuário.
6. A resposta inclui `serverNow`, para o cliente acertar o relógio de graça.

`expire { at }`:

- `too_early` se `deadline` for null, se `deadline.at !== at` ou se `now < at`.
- Se houver pedido de dupla aberto, ele vira `expired`.
- `kind = 'play'`: aplica D-26 pelo lugar `deadline.seat` (o evento sai com o lugar de quem jogou, `timeout: true`).
- `kind = 'truco'`: aplica D-27 (`respond_truco` com `refuse`, pelo lugar seguinte a `truco.requestedBySeat`, que é sempre da dupla que responde, `timeout: true`), direto em `executeRule`, sem pedido de dupla.
- Qualquer membro jogador pode enviar `expire`; a mesa recebe `not_member`. Envios repetidos ou atrasados batem em `conflict` ou `too_early`.

Privacidade:

- Na jogada escondida, `tableCards` recebe `{ seat, card: null, hidden: true }`, a carta vai para `covered[seat]` e o evento público sai **sem** `card` (`hidden: true`).
- No fechamento da vaza, o motor monta as cartas reais (`covered` + abertas), resolve a vaza, grava `lastTrick` com `hidden: true` nas que estavam viradas e zera `covered`.
- `covered` e `auto_card` só existem em `private.private_hands`. O Realtime continua sem publicar o schema `private`.

## Cliente

### Relógio

- `useServerClock`: chama `server_now()` ao montar a tela e ao voltar do segundo plano. Calcula `offset = serverNow - (t0 + rtt/2)` e atualiza o offset com `serverNow` de cada resposta de `submit-action`.
- `remaining = deadline.at - (Date.now() + offset)`, limitado a [0, 20 s].

### `DeadlineBar` (componente novo)

- Recebe `deadline` e `offset`. É o **único** componente que redesenha com o tempo: o número muda uma vez por segundo (`useRerenderAt`), e a barra anima com um único `withTiming` na thread de UI até `at`. Nada acima dele redesenha.
- Nos últimos 5 s, troca para a laca vermelha (`theme`) com um pulso discreto (sem pulso com "reduzir movimento").
- Lugares: acima da fileira de ações na própria vez (`HandPanel`); nos controles de resposta ao truco e de confirmação da dupla; como anel no `SeatChip` de quem tem a vez (mesa compacta e mesa central). Não cobre carta, nome nem botão: ocupa uma faixa fixa de altura (a mesa não muda de tamanho quando ele aparece).

### Envio do `expire`

- `useDeadlineExpiry`: um único `setTimeout` por prazo (chave `at`), limpo ao trocar de prazo ou desmontar. Dispara em `at + 300 ms + (seat - 1) * 700 ms` (o lugar 1 tenta primeiro). Ignora `conflict` e `too_early`. Usa `clientActionId = expire-<at>-<seat>`, então o reenvio não duplica.

### Carta escondida

- Um botão de alternância "Virada" (ícone de olho cortado em `icons.tsx`) ao lado de Jogar, desabilitado na 1ª vaza (com a dica de acessibilidade "Só a partir da 2ª vaza"); a regra é do motor, o app só espelha (`getLegalActions` ganha `playHidden`). Ligado, a carta selecionada mostra o verso como prévia e Jogar envia `hidden: true`. Ele volta a desligar depois da jogada.
- Na mesa, `{ hidden: true }` aparece com o verso (`back.png`). O dono vê um selo pequeno de olho, porque ele sabe qual é a carta (a carta vem do `covered` da própria mão).
- `playedCardKey` passa a usar `seat` para a carta escondida (`hidden-<seat>`). No fechamento da vaza, a carta com `lastTrick.cards[i].hidden` faz uma virada (`rotateY` de 180° em 400 ms, com `withTiming`, a mesma técnica da vira), uma vez por revisão.

### Jogada automática

- O gesto fica em `HandPanel` com `PanResponder` (React Native, sem dependência nova). Ele só captura com `dy < -10` e `|dy| > |dx| * 1.5`; tocar continua selecionando. A carta segue o dedo por `Animated.Value`, sem `setState` durante o movimento. O limite é `max(56, 0.6 * alturaDaCarta)`. Ao cruzar o limite, aparecem o contorno e um "Automática" acima da carta. Ao soltar além do limite, chama `set_my_auto_card`. Antes do limite, a carta volta com uma mola curta.
- Fica desligado na própria vez com jogada livre, durante a distribuição e com o app sem mão.
- Indicador permanente: contorno azul-aço (`theme`) e selo com relâmpago no canto superior esquerdo (a manilha usa o direito). Na ativação, o selo entra com um pequeno estouro; no cancelamento, ele encolhe e some. O leitor de tela diz "jogada automática".
- Cancelar: arrastar a mesma carta para cima de novo ou tocar no selo. Marcar outra carta substitui a anterior.
- O estado vem de `get_my_hand.autoCard` (fonte da verdade). A tela mostra a marcação de forma otimista e volta atrás se o RPC falhar.

## Erros e casos limite

| Caso | Comportamento |
|---|---|
| Dois celulares enviam `expire` | Um vence; o outro recebe `conflict` ou `too_early`, e nada aparece ao usuário |
| `expire` atrasado depois de jogada válida | `deadline.at` mudou: `too_early` |
| Resposta ao truco chega depois do timeout | O truco já não existe: `illegal_action` ou `conflict`, sem efeito |
| Cancelou a jogada automática enquanto a jogada anterior era gravada | `auto_changed` no commit; o serviço reaplica com a marcação nova |
| Carta marcada já não está na mão | O motor só joga se `sameCard` achar a carta na mão; senão, limpa a marcação sem jogar nada |
| Reconexão | Lê `matches` (prazo absoluto) e `get_my_hand` (`covered`, `autoCard`); `server_now` refaz o offset |
| Todos os apps fechados | O prazo fica vencido no estado; o primeiro aparelho que voltar envia `expire`. Limitação conhecida, documentada |
| Partida antiga sem `deadline` | Sem relógio, como hoje |

## Testes

- `tests/engine/hidden.test.ts`: recusada na 1ª vaza e aceita na 2ª e na 3ª; a carta escondida não aparece em `public`; a vaza resolve com a força real; `lastTrick` com `hidden`; a carta é descartada no fim da mão no meio da vaza.
- `tests/engine/auto.test.ts`: encadeamento; parada com truco ou pedido de dupla; carta fora da mão; marcação limpa no fim da mão; nada joga duas vezes.
- `tests/engine/deadline.test.ts`: o prazo começa e reinicia nos momentos de D-25; `too_early`; D-26 com e sem marcação; D-27 com 3, 6, 9 e 12; D-28.
- `tests/sql/hidden-auto-timer.test.ts` (pglite + migrations): `matches.public_state` e `match_events` sem a carta escondida; mesa sem `covered`; `set_my_auto_card` recusa carta alheia, carta fora da mão e jogada na própria vez; `auto_changed`; `expire` duplicado.
- `tests/app/`: matemática do limite do gesto, cálculo do offset e de `remaining`, horário do `expire` por lugar, `playedCardKey` da carta escondida.
- Regressão: as suítes existentes (`npm test`) e `npm run typecheck`.

## Deploy

Exige aplicar a migration nova e **republicar `submit-action`**. Com a função antiga publicada e a migration aplicada, `internal_commit_action` antigo deixa de existir: as duas coisas precisam ir juntas.
