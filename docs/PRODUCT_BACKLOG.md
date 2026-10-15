# Product Backlog

Dono do backlog: **Mariana Ribeiro (PO)**. Origem das histórias: [SPEC.md](../SPEC.md), seção 8.

Legenda de estado: **Planejado** = nada implementado ainda; **REVIEW** = código implementado, aguardando critério de aceite; **Implementado** = critério de aceite observado (ver [QA_DEMO.md](QA_DEMO.md)). Estimativa em pontos de esforço relativo: 1 (horas curtas), 2, 3, 5 (metade do dia ou mais), 8 (risco alto, dividir).

Prioridade: **P0** entra obrigatoriamente na demonstração. **P1** entra se o P0 estiver estável.

| ID | História | Prioridade | Estimativa | Proprietário | Depende de | Estado |
|---|---|---|---|---|---|---|
| US-01 | Cadastro e login | P0 | 3 | Nicoly (UI), Rafael (Auth) | contratos (T-00) | Planejado |
| US-02 | Criar sala | P0 | 3 | Caio (fluxo), Rafael (tabelas) | US-01 | Planejado |
| US-03 | Entrar na sala por código | P0 | 3 | Caio | US-02 | Planejado |
| US-04 | Iniciar partida | P0 | 5 | Rafael (RPC), Eduardo (distribuição) | US-03, regras em RULES.md | Planejado |
| US-05 | Ver só as minhas cartas | P0 | 5 | Rafael (privacidade), Nicoly (tela) | US-04 | Planejado |
| US-06 | Jogar carta na minha vez | P0 | 8 | Eduardo (validação), Rafael (transação), Caio (sync) | US-05 | Planejado |
| US-07 | Truco: pedir, aceitar, recusar, aumentar | P0 | 8 | Eduardo, Rafael | US-06, decisões da PO | Planejado |
| US-08 | Acompanhar vazas, mãos e vitória, com reconexão | P0 | 5 | Caio, Eduardo | US-06, US-07 | Planejado |
| US-09 | Gerenciar notas do histórico (CRUD) | P0 | 3 | Rafael (dados), Nicoly (tela) | US-01, partida encerrada ou fixture | Planejado |
| US-10 | Demonstração rastreável | P0 | 3 | Isabela, Mariana | todas | Planejado |
| US-11 | Modo mesa (quinto aparelho) | P1 | 5 | Caio | US-08 | Planejado |
| US-12 | QR code da sala | P1 | 1 | Caio | US-02 | REVIEW |

US-11 e US-12 vêm da seção 8 do SPEC ("P1"); os números são deste backlog, não do SPEC.

## Critérios de aceite observáveis

Cada critério é uma pergunta com resposta sim/não, executável por uma pessoa com os aparelhos em mãos.

### US-01 Cadastro e login (P0)
- [ ] E-mail sem formato válido é rejeitado no app, com mensagem, sem chamar o servidor.
- [ ] Senha fora da regra definida (mínimo de caracteres, ver T-NIC-03) é rejeitada com mensagem.
- [ ] Credenciais erradas mostram "e-mail ou senha incorretos", sem revelar qual dos dois falhou.
- [ ] Cadastro válido cria linha em `profiles` com o mesmo `id` de `auth.users`.
- [ ] Fechar e reabrir o app mantém a sessão; "Sair" a encerra.

### US-02 Criar sala (P0)
- [ ] "Criar sala" gera um código curto único (6 caracteres, sem 0/O/1/I), exibido e compartilhável.
- [ ] Existe linha em `rooms` com `host_user_id` igual ao usuário e `status = 'lobby'`.
- [ ] O dono já ocupa uma das 4 posições em `room_players`.

### US-03 Entrar por código (P0)
- [ ] Código válido coloca o usuário em uma posição livre; posição e dupla aparecem para todos.
- [ ] Código inexistente, sala cheia, sala já iniciada e entrada duplicada mostram mensagens distintas.
- [ ] Dois usuários tentando a mesma posição ao mesmo tempo: só um consegue (constraint `UNIQUE(room_id, seat)`).
- [ ] Posições 1 e 3 formam a dupla A; 2 e 4, a dupla B (assentos alternados).

### US-04 Iniciar partida (P0)
- [ ] O botão "Iniciar" só funciona para o dono, com 4 jogadores prontos; com 3, o servidor recusa.
- [ ] A chamada de início cria `matches`, `match_players` e 4 mãos de 3 cartas sem repetição, mais a vira.
- [ ] Chamar "iniciar" duas vezes seguidas não cria duas partidas (idempotência).

### US-05 Ver minhas cartas (P0)
- [ ] Cada jogador vê exatamente 3 cartas, diferentes das dos outros três.
- [ ] Com o token de outro jogador, consultar `private_hands` direto retorna zero linhas ou erro.
- [ ] Nenhum evento de Realtime recebido pelo jogador A contém cartas do jogador B (inspeção do payload).

### US-06 Jogar carta (P0)
- [ ] Na vez, tocar numa carta a joga; todos os 4 aparelhos mostram a carta na mesa e a nova vez.
- [ ] Fora da vez, carta que não é do jogador, carta já jogada e ação repetida são rejeitadas pelo servidor, e o app mostra o motivo.
- [ ] Reenviar a mesma ação (mesma revisão) não duplica a jogada.

### US-07 Truco (P0)
- [ ] Só aparecem botões legais para o estado atual (pedir, aceitar, recusar, aumentar).
- [ ] Apenas a dupla adversária responde; resposta da dupla errada é rejeitada.
- [ ] Recusa dá à dupla que pediu os pontos vigentes antes do pedido; aceite muda o valor da mão.
- [ ] O placar muda sem o cliente enviar pontuação.

### US-08 Acompanhar a partida (P0)
- [ ] Vazas, empates (conforme [RULES.md](RULES.md)) e fim de mão são resolvidos e mostrados.
- [ ] A partida termina ao chegar a 12 pontos, com vencedor e `ended_at` gravados.
- [ ] Matar o app de um jogador e reabrir restaura sua mão e o estado público sem ação duplicada.

### US-09 CRUD de notas (P0)
- [ ] CREATE: criar nota com título e texto ligada a uma partida.
- [ ] READ: listar as próprias notas, com a partida referenciada.
- [ ] UPDATE: editar título/texto; `updated_at` muda.
- [ ] DELETE: excluir pede confirmação e remove a linha.
- [ ] Usuário A não lê, edita nem exclui nota do usuário B (RLS).
- [ ] Editar a nota não altera placar nem resultado da partida.

### US-10 Demonstração (P0)
- [ ] README, SPEC e docs de Scrum estão no repositório e coerentes entre si.
- [ ] O histórico do Git mostra commits de cada integrante com dev, e PO/SM têm entregas registradas em [SCRUM.md](SCRUM.md).
- [ ] O roteiro de [QA_DEMO.md](QA_DEMO.md) foi ensaiado ao menos uma vez antes da apresentação.

### US-11 Modo mesa (P1)
- [ ] Um quinto aparelho entra na sala sem ocupar posição.
- [ ] Ele mostra mesa, vira, placar e turno, e nenhuma carta de mão.
- [ ] Consultar mãos com a sessão desse aparelho retorna zero linhas.

### US-12 QR code (P1)
- [ ] O código da sala também aparece como QR code, e ler o QR leva à entrada na sala com o código preenchido. Código implementado; falta escanear em aparelho.

## Observação de escopo

O SPEC pede partida completa e automática em um dia. Isso é a parte mais cara do projeto. A avaliação de custo e o plano de corte estão em [SPRINT_BACKLOG.md](SPRINT_BACKLOG.md), seção "Custo e corte".
