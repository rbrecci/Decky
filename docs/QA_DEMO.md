# QA e Demonstração

Nenhum item abaixo foi executado ainda. Marque `[x]` somente com evidência (foto, log, captura) anotada ao lado. Responsável pela execução: Mariana (aceite) com apoio de Isabela (registro).

## Pré-condições da demonstração

- [ ] Projeto Supabase criado, migrations aplicadas (Rafael).
- [ ] 4 usuários de teste criados, senhas fora do Git.
- [ ] 4 aparelhos ou emuladores com o app e internet.
- [ ] Dispositivo reserva com a fixture de partida (ver "Plano B").

## Requisitos da avaliação SENAI

| # | Requisito | Como provar | OK |
|---|---|---|---|
| 1 | Login/autenticação | Login válido entra; inválido mostra erro | [ ] |
| 2 | REGEX | E-mail inválido barrado antes de enviar; mostrar a expressão no código | [ ] |
| 3 | Navegação | Home, sala, jogo, histórico, voltar e sair | [ ] |
| 4 | UX/UI | Botões grandes, contraste, pouco texto, fonte ampliada ainda usável | [ ] |
| 5 | Banco com 2+ tabelas relacionadas | Mostrar `rooms` e `room_players` (PK/FK) no painel | [ ] |
| 6 | CRUD completo | CREATE, READ, UPDATE, DELETE em `match_notes` | [ ] |
| 7 | Mensagens de erro | Erros de login, sala cheia, código inválido, jogada ilegal | [ ] |
| 8 | Git/GitHub | Histórico com commits de cada integrante dev | [ ] |
| 9 | Scrum | Backlog, Daily, Review, Retrospective registrados em [SCRUM.md](SCRUM.md) | [ ] |
| 10 | README | Objetivo, equipe, tecnologias e execução batendo com a realidade | [ ] |
| 11 | Documento ABNT | Entregue pelo grupo, fora deste repositório | [ ] |

## Testes de aceitação por história

Cada história tem seus critérios em [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md). Aqui ficam os testes técnicos transversais.

### Modo 1v1

Estes itens exigem aparelhos e Supabase real; os testes automatizados não substituem esta verificação.

- [ ] Aplicar `20261022190000_duel.sql` e publicar `start-match` e `submit-action` juntas.
- [ ] Criar sala 1v1 com o dono jogando: mostrar apenas dois lugares; o segundo usuário entra e um terceiro recebe sala cheia.
- [ ] Dois jogadores prontos iniciam; cada um recebe somente as próprias três cartas e vê o adversário do outro lado da mesa.
- [ ] A vaza fecha na segunda carta; a distribuição seguinte e os turnos alternam apenas entre os dois jogadores.
- [ ] Pedir, aceitar e aumentar 3, 6, 9 e 12; correr e recusar sem aguardar parceiro.
- [ ] Conferir carta escondida na segunda vaza, jogada automática e prazo de 20 segundos.
- [ ] Jogar até 12 pontos, conferir histórico e iniciar outra partida na mesma sala.
- [ ] Reabrir o aplicativo durante a partida: restaurar o modo 1v1, a vez e a mão privada.
- [ ] Criar 1v1 com mesa dedicada em um terceiro aparelho; a mesa não recebe cartas privadas nem pode jogar.
- [ ] Criar uma sala 2v2 e conferir quatro lugares, início com quatro prontos e confirmação de parceiro nas decisões da dupla.

### Segurança das cartas

- [ ] Com o token do jogador A, `select` em `private.private_hands` falha ou retorna 0 linhas.
- [ ] Com o token de A, `get_my_hand(match_id)` retorna só a mão de A.
- [ ] Com o token de alguém que não está na partida, `get_my_hand` retorna vazio ou erro.
- [ ] Inspecionar o tráfego Realtime dos 4 aparelhos: nenhum payload contém cartas de outro jogador.
- [ ] `payload_public` de `match_events` não contém mão.
- [ ] Chave `service_role` não aparece no código, no bundle nem em `git log -p`.

### Turnos e concorrência

- [ ] Jogar fora da vez é rejeitado pelo servidor (chamada direta, sem a UI).
- [ ] Jogar carta que não é sua e carta já jogada são rejeitados.
- [ ] Duas ações na mesma `revision` ao mesmo tempo: uma passa, a outra recebe conflito.
- [ ] Reenviar o mesmo `clientActionId` não duplica a jogada.
- [ ] Dois usuários pegando a mesma posição: só um entra.
- [ ] `start_match` chamado duas vezes cria uma única partida.

### Truco e placar

- [ ] Pedido, aceite, recusa e aumento seguem a máquina de estados; botões ilegais não aparecem.
- [ ] Dupla errada tentando responder é rejeitada.
- [ ] Recusa pontua com o valor anterior ao pedido.
- [ ] O cliente não consegue enviar placar (tentativa direta é negada).

### Decisão em dupla (correr, 6, 9, 12)

Precisa de 4 aparelhos (ou 2 jogadores da mesma dupla em aparelhos diferentes). Na fixture local (`/dev/preview`) dá para ver as telas trocando de lugar e usar o atalho "Dupla ✓".

- [ ] Só um integrante toca em Correr: a mão não termina; o parceiro vê "Fulano quer correr" com Não e Confirmar; quem pediu vê "Aguardando … confirmar" e 1 de 2.
- [ ] Os dois confirmam correr: a outra dupla pontua e a mesa mostra "Corro!".
- [ ] O parceiro recusa: nada muda, a mesa mostra "Não!" e quem pediu vê o aviso.
- [ ] Pedido de SEIS, NOVE e DOZE (pedir e aumentar): só vira pedido para a outra dupla depois da confirmação.
- [ ] Aceite de SEIS, NOVE e DOZE: o placar ("Vale …") só muda depois da confirmação.
- [ ] Enquanto a dupla decide, ninguém joga carta (nem a outra dupla).
- [ ] Toque duplo em Confirmar não aplica duas vezes.
- [ ] Fechar e abrir o app no meio do pedido: o pedido continua igual, nada é confirmado sozinho.
- [ ] Os 4 aparelhos e a mesa mostram o mesmo resultado.

### Fluxo da partida

- [ ] Virada de vaza: depois da 4ª carta, a vaza resolve e abre a próxima.
- [ ] Fim de mão: placar soma e nova mão é distribuída.
- [ ] Vitória em 12: partida encerra, mostra vencedora e grava `ended_at`.
- [ ] Reconexão: matar e reabrir o app de um jogador restaura mão e estado, sem ação duplicada.

### Notas (CRUD) e RLS

- [ ] CREATE, READ, UPDATE, DELETE com confirmação na exclusão.
- [ ] Usuário B não vê, edita nem apaga nota de A.
- [ ] Editar nota não altera resultado da partida.

### Modo mesa (5 aparelhos)

- [ ] "Criar sala" > "Este celular será a mesa": o dono não ocupa lugar e os 4 lugares ficam livres.
- [ ] Os 4 jogadores entram e marcam pronto; a mesa inicia a partida.
- [ ] A mesa mostra placar das duplas com nomes, vez, vira, manilha, cartas jogadas e versos restantes, e nenhuma carta de mão.
- [ ] Os 4 celulares dos jogadores **não** mostram a mesa completa: só a própria mão (cartas maiores), os controles, placar, vez, vira/manilha, quem já jogou na vaza e as falas de truco. As cartas jogadas aparecem só na mesa central.
- [ ] Com o token da mesa, `get_my_hand` devolve vazio e `submit-action` devolve `not_member`.
- [ ] Fechar o app da mesa não interrompe a partida nos 4 celulares; reabrir mostra o estado atual.
- [ ] No lobby, o dono troca entre "quero jogar" e "este celular será a mesa".

### Mesa e distribuição animada

- [ ] Ao iniciar, as cartas saem do baralho para os 4 lugares; cada jogador vê as 3 cartas chegando; a vira é revelada e a manilha indicada.
- [ ] A partir da 2ª mão, a última vaza aparece por um instante antes da nova distribuição.
- [ ] Reabrir o app no meio da mão não repete a distribuição, nem faz as cartas da mesa entrarem voando de novo.
- [ ] Na troca de mão, a mão nova e a vira nunca aparecem abertas por um instante antes da distribuição.
- [ ] Quando a vaza fecha, as três primeiras cartas esmaecem no lugar (sem piscar) e a quarta entra voando.
- [ ] Sair da partida e voltar logo em seguida (pela sala) não mostra erro de canal ("cannot add postgres_changes callbacks").
- [ ] Tocar numa carta a seleciona; "Jogar" confirma; a carta sai da mão e aparece na posição de quem jogou nos outros aparelhos.
- [ ] Toque duplo rápido em "Jogar" envia uma jogada só.
- [ ] Sem carta escolhida, o botão diz "Escolha a carta" e não envia nada; fora da vez, "Aguarde a vez".
- [ ] "Correr" pede confirmação ("Continuar jogando" ou "Correr") e, confirmado, dá os pontos à outra dupla.
- [ ] Pedido de truco: a dupla adversária vê Aceitar, Correr e Pedir SEIS; o parceiro de quem pediu só aguarda; a mesa mostra o pedido.
- [ ] Pedidos de TRUCO, SEIS, NOVE e DOZE aparecem no centro da mesa como plaquinha vermelha com o valor e a escada da aposta, entrando do lado de quem pediu, e somem sozinhos em cerca de 2,5 s sem deixar resto.
- [ ] Aceitar mostra o selo dourado "ACEITO!" com o novo valor (só depois da confirmação) e o placar troca para "Vale N".
- [ ] Pedido e aceite em sequência rápida aparecem na ordem, um de cada vez; nenhum aviso aparece duas vezes.
- [ ] Reabrir o app ou voltar do segundo plano durante um pedido não reapresenta o aviso; o banner continua mostrando o pedido pendente.
- [ ] Com truco pendente, nenhum lugar fica destacado como "a vez".

### Manilha na mão

- [ ] Nenhuma carta mostra "manilha" escrito embaixo; as manilhas têm contorno dourado e selo com estrela.
- [ ] Antes de a vira abrir, nenhuma carta da mão é destacada.
- [ ] Mão com 1 manilha: brilho dourado, estrela central, pico e dissipação; fica o destaque.
- [ ] Mão com 2 e 3 manilhas: revelações uma depois da outra, da esquerda para a direita, valores legíveis.
- [ ] Mão sem manilha: nenhum efeito.
- [ ] Selecionar e jogar uma manilha durante a revelação funciona normalmente.
- [ ] Sair da partida e voltar, ou perder a conexão e voltar, não repete a revelação.
- [ ] A mesa central nunca mostra destaque de manilha em carta de mão (ela não tem mão).
- [ ] Com "reduzir movimento" ligado no aparelho, não há revelação, só o destaque.

### iOS

Verificado sem Mac (Windows): `expo install --check` sem pendências; `expo-doctor` 21/21; `expo export --platform ios` gera o bundle Hermes; `expo config --type introspect` gera o Info.plist com `UIUserInterfaceStyle Dark`, `UIRequiresFullScreen` e `ITSAppUsesNonExemptEncryption false`; typecheck e testes. Layout e animações conferidos no navegador (react-native-web) em 375 x 812.

Ainda precisa de iPhone ou simulador:

- [ ] Abrir pelo Expo Go num iPhone com notch e num com Dynamic Island: placar abaixo da barra de status, mão e botões acima da barra de gestos.
- [ ] iPhone SE (375 x 667): três botões de ação numa linha, cartas inteiras, selo da manilha visível.
- [ ] Login e cadastro: o teclado não cobre o campo; arrastar para baixo recolhe o teclado; e-mail sem correção automática; a sugestão de senha forte preenche os dois campos.
- [ ] Alertas ("Sair da mesa?") em tema escuro.
- [ ] Na partida, o gesto de voltar (deslizar da borda) não tira o jogador da mesa.
- [ ] Revelação da manilha fluida (sem travar a distribuição) e halos dourados visíveis (`boxShadow`).

### Layout da mesa e da sala

- [ ] Na sala, em celular pequeno e grande, nenhum lugar encosta no aro da bandeja; nomes longos quebram em duas linhas ou terminam em reticências.
- [ ] Na mesa (dedicada e compacta), nenhuma etiqueta passa por cima do trilho ou do couro, inclusive perto dos cantos.
- [ ] O pedido de truco não muda o tamanho da mesa (o banner tem altura fixa).

## Roteiro de demonstração (4 dispositivos)

Tempo-alvo e falas por pessoa ficam com a Mariana (T-MAR-04). Sequência:

1. Login inválido, depois válido; mostrar a REGEX. (Nicoly)
2. Criar sala e mostrar o código; três aparelhos entram. (Caio)
3. Iniciar partida; mostrar a distribuição animada, que cada aparelho vê 3 cartas diferentes e a vira pública. Se houver um quinto celular, criar a sala no modo mesa e deixá-lo no centro. (Caio e Rafael)
4. Jogar uma carta e ver a sincronização nos 4 aparelhos. (Eduardo)
5. Pedir truco, responder, e ver o placar mudar sozinho. (Eduardo)
6. Mostrar o fim de mão, ou o fim de partida se couber. (Eduardo)
7. Histórico: CREATE, READ, UPDATE, DELETE de uma nota. (Rafael e Nicoly)
8. No painel do banco: tabelas com PK/FK, RLS, e um teste de leitura cruzada negada. (Rafael)
9. Mostrar board de issues, commits e SCRUM.md. (Isabela)
10. Fechamento e limitações declaradas. (Mariana)

## Plano B se algo quebrar

Regra: **nunca fingir funcionalidade**. Se um trecho falhar:

- Avisar a plateia que aquele trecho é uma demonstração controlada.
- Usar a fixture: uma partida pré-criada no banco, em estado já avançado, identificada com título "FIXTURE" na tela e na fala.
- Para mostrar só a interface (sem servidor), a rota `/dev/preview` do build de desenvolvimento simula uma partida no próprio aparelho, com a barra "FIXTURE LOCAL · sem servidor" visível. Dizer em voz alta que é simulação.
- Se o motor falhar ao vivo, mostrar a suíte de testes unitários rodando e os casos cobertos.
- Mostrar a limitação correspondente de [RULES.md](RULES.md) quando a falha vier de regra não decidida.
