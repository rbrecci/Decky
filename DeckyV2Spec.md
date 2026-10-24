# Decky V2: especificação de atualização

Data: 23/10/2026. Solicitante: Saker. Repositório: [rbrecci/Decky](https://github.com/rbrecci/Decky).

Revisão complementar: reset de lançamento, recuperação de senha, Google, nova pontuação, responsividade, leitor QR e direção visual da landing. Fórmula e faixas aprovadas estão registradas na seção 7.3; esta cópia foi preparada localmente, sem publicação no GitHub.

Estado atual em 24/10/2026: web e backend V2 publicados, migration V2 aplicada, `start-match` e `submit-action` na versão v14 e APK 2.0.0/build 7 instalado e validado no Redmi. Google web/APK, e-mails reais, leitura óptica no APK e reentrada óptica na web móvel têm provas registradas. A [release v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0) está pública, com download do mesmo APK conferido, e o manifesto real foi enviado ao GitHub. Landing e manifesto estão publicados e conferidos em [GitHub Pages](https://rbrecci.github.io/Decky/). Isso não declara a V2 lançada: continuam pendentes os cenários restantes de QR, aceite independente da senha nova da QA após recuperação, Google com conta nova/Audience externo, Safari em aparelho Apple e a virada de dados. Não houve reset.

Para retomar, usar [docs/VALIDACAO_V2.md](docs/VALIDACAO_V2.md) como estado canônico e [docs/PREPARO_V2.md](docs/PREPARO_V2.md) como passagem viva. Na retomada de 24/10/2026, Saker autorizou explicitamente commit/push das mudanças V2 no seu nome e as publicações previstas após as verificações correspondentes, e participou da leitura óptica no Redmi. Os critérios de aceite deste documento continuam valendo; somente as provas observadas podem aprová-los.

Estado da entrega documental original em 23/10/2026: especificação para implementação futura. Nenhuma funcionalidade descrita aqui foi implementada por aquela entrega documental.

Registro histórico da implementação em 23/10/2026: fontes V2 preparadas localmente para revisão e testes, sem publicação ou reset naquela etapa. O estado e as evidências atuais estão em [docs/VALIDACAO_V2.md](docs/VALIDACAO_V2.md); as observações de entrega documental abaixo descrevem a revisão original desta especificação. Os critérios de produção continuam pendentes até sua execução real.

Registro histórico da preparação externa em 23/10/2026: acesso MCP ao Supabase validado, variáveis EAS conferidas por Saker, `.env` local conferido e ignorado pelo Git, recebimento SMTP comprovado, provedor Google configurado para testes, Site URL ajustado, Pages selecionado para Actions e keystore JKS existente no Expo comprovada por captura. Nome Decky e e-mail de suporte confirmados no Branding; páginas e domínios ainda vazios naquela preparação. Fórmula e faixas de MMR aprovadas. Evidências, limites e passagem atualizados em [docs/PREPARO_V2.md](docs/PREPARO_V2.md). Nenhum fluxo completo da V2, correspondência da assinatura instalada ou lançamento público havia sido validado naquela etapa.

Base histórica inspecionada para a especificação: branch `main`, commit `72a86f47ffa603cd7730b4eb337a71ddf58125ff`. As seções 3 e 10 preservam a fotografia do código e a organização proposta antes da implementação; expressões como "hoje", "atual" e "implementação futura" nesses registros não representam o estado de 24/10/2026. Conferir a validação e a passagem atuais antes de retomar o trabalho.
## 1. Objetivo e leitura deste documento

Corrigir a carta oculta, reduzir textos explicativos nas telas, separar pontuação MMR de títulos de Elo, permitir descoberta de salas públicas, melhorar o histórico e estabelecer uma página estável de distribuição e atualização do app.

Complemento confirmado: lançar a V2 com reset total dos dados de usuários e de jogo, início em 500 MMR, recuperação por e-mail, login Google, web responsiva, sublinhado proporcional ao título, leitura de QR dentro do app e landing com download imediato e demonstrações ao rolar. As seções revisadas substituem as restrições anteriores sobre preservar saldos e fórmula. O reset pertence à virada de lançamento, após validação de todas as funcionalidades, e não à publicação desta especificação.
Este arquivo registra o pedido completo. A publicação deste documento não implementa nem autoriza, por si só, alterações no app, migrations ou releases. Na implementação futura, manter a arquitetura existente: cliente Expo/React Native, regras no servidor e Supabase para autenticação, banco e sincronização.

Classificação das decisões:
- **Pedido confirmado:** comportamento explicitamente solicitado pelo usuário.
- **Decisão de especificação:** interpretação adotada para tornar o comportamento verificável. Pode ser corrigida pelo usuário antes da implementação.
- **Pendente de produto:** informação que não foi fornecida e que não deve ser inventada como requisito aprovado.
## 2. Cobertura do pedido
| ID | Entrega | Seção |
|---|---|---|
| V2-01 | Carta oculta descarta a carta e não disputa a vaza; primeira carta aberta | 4 |
| V2-02 | Landing no GitHub Pages, link mais recente e aviso de atualização no app | 5 |
| V2-03 | Remover textos da tela inicial e descrições dos botões | 6 |
| V2-04 | Remover explicações do Ranking | 6 |
| V2-05 | Pontuação chamada MMR e títulos Beta, Delta, Alfa, Sigma e Omega | 7 |
| V2-06 | Simplificar Criar Sala, textos dos papéis e capitalização dos modos | 6 |
| V2-07 | Remover explicação de Entrar na sala | 6 |
| V2-08 | Alternância Pública/Privada e listagem de salas públicas em tempo real | 8 |
| V2-09 | Histórico com voltar fixo, duas paginações de cinco e skeleton loading | 9 |
| V2-10 | Reset total de dados na virada de lançamento da V2 | 14 |
| V2-11 | Esqueci minha senha com recuperação por e-mail | 15 |
| V2-12 | Entrar com Google e instruções de configuração | 16 |
| V2-13 | Web responsiva em celular, tablet e computador | 17 |
| V2-14 | Risco dourado acompanha a largura do título | 18 |
| V2-15 | Leitor de QR code na tela Entrar na sala | 19 |

V2-05 inclui agora inicial/piso de 500 e nova fórmula/faixas aprovadas; V2-02 inclui a direção visual detalhada na seção 20.
## 3. O que existe hoje

Os pontos abaixo são evidência de leitura de código, não comprovação de funcionamento em produção.
| Área | Referência atual | Consequência para a mudança |
|---|---|---|
| Regras | `supabase/functions/_shared/engine/game.ts:405`, `:409`, `:429`; `docs/RULES.md`, D-20 a D-22 | Já proíbe oculta na primeira vaza e remove a carta da mão, mas considera sua força e revela ao fechar a vaza |
| Teste da regra anterior | `tests/engine/hidden-auto-timer.test.ts:87` | Há teste que exige a força real da carta oculta; substituí-lo pela nova regra, com evidência de falha antes do código |
| Início | `app/index.tsx:23` e `:29` | Tem aviso sobre Elo e descrições nos botões |
| Ranking | `app/ranking.tsx:35` e `:48`; `src/ranking/api.ts` | Tem as explicações solicitadas para remoção; consulta ranking separado por modo |
| Pontuação | `docs/RANKING.md:7`; `supabase/migrations/20261023150000_ranked.sql` | Inicial de 1000 por modalidade; fórmula atual usa K=32 e escala 400; tabelas `player_ratings` e `match_ratings` |
| Criação e entrada | `app/room/create.tsx:52`; `app/room/join.tsx:45`; `src/rooms/` | Criação já distingue jogador/mesa e 1v1/2v2; entrada atual é por código |
| Histórico | `app/history/index.tsx:73`; `src/history/api.ts:27` | Carrega 50 partidas e todas as notas; botão Voltar fica no fim; não há paginação visual |
| Paginação no banco | `supabase/migrations/20261023150000_ranked.sql:165` e `:201` | `get_my_match_history` já recebe `p_limit` e `p_offset`, com ordenação por data e ID |
| Notas | `src/history/api.ts`, `listNotes`; `app/history/index.tsx`, `matchById` | Metadados de nota dependem das partidas carregadas; paginar exige retirar essa dependência da página corrente |
| Versão e distribuição | `app.json`; `package.json`; `README.md`, APK e Web | Versão declarada 1.0.0; Android usa `br.senai.decky`; já existe app web no EAS Hosting |
| Comandos existentes | `package.json`, `scripts` | `npm test`, `npm run typecheck`, `npm run build:web` |
## 4. V2-01: carta oculta como descarte
### 4.1. Regra solicitada

Jogar uma carta oculta consome essa carta e a vez do jogador, mas seu valor não participa da disputa da vaza. Até uma manilha oculta deve perder para qualquer carta aberta válida. Isso equivale a passar aquela jogada, sem desistir da mão, sem conceder pontos por si só e sem executar a ação de correr.
**Decisão de especificação:** interpretar "a primeira carta não pode ser oculta" como a primeira vaza inteira de cada mão, preservando a restrição já existente. Portanto, todos jogam a primeira carta aberta. A segunda e a terceira carta de cada jogador podem ser ocultas. Não significa somente a primeira carta colocada na mesa por qualquer participante.
### 4.2. Comportamento detalhado
1. Na primeira vaza, o controle de ocultar fica indisponível e o servidor recusa uma requisição forjada com `hidden: true`, sem consumir carta, vez ou revisão.
2. Na segunda e terceira vazas, uma jogada oculta válida remove exatamente uma carta da mão e avança a vez normalmente.
3. Ao resolver a vaza, somente cartas abertas concorrem. Não representar descarte como carta de força zero: ele não pode vencer outro descarte nem entrar em desempate por valor ou naipe.
4. Se houver uma única carta aberta, seu jogador vence a vaza, independentemente do valor das ocultas.
5. Empates entre cartas abertas continuam seguindo as regras existentes.
6. **Decisão de especificação:** se todas as cartas da vaza forem ocultas, a vaza empata. Aplicar a mesma resolução de mão e definição do próximo a jogar já usada em uma vaza empatada.
7. **Decisão de especificação:** o descarte permanece de costas após fechar a vaza. Não há razão de disputa para revelar seu valor. Atualizar o caminho atual de revelação e impedir exposição em `lastTrick`, eventos e projeções públicas. O dono pode continuar vendo sua própria carta na informação privada existente.
8. Jogadas automáticas, reconexão, reenvio da mesma ação e prazos não podem recuperar a força da carta descartada ou consumi-la duas vezes.
9. Não alterar pontuação da mão, pedidos de truco, confirmação em dupla ou regras da mão de 11 como efeito colateral.
### 4.3. Critérios de aceite e provas
- **CA-01:** primeira vaza recusa oculta para todos os lugares, em 1v1 e 2v2; segunda e terceira aceitam na vez legal.
- **CA-02:** manilha oculta contra carta comum aberta não vence; repetir com naipe alto e carta comum forte.
- **CA-03:** em duplas, um descarte não impede a carta aberta do parceiro de vencer.
- **CA-04:** todas ocultas produzem empate sem comparação de cartas privadas e sem quebrar a conclusão da mão.
- **CA-05:** consumo, avanço de vez, idempotência e persistência são conferidos por integração com banco, além do teste puro do motor.
- **CA-06:** outro jogador e aparelho mesa não recebem identidade da carta descartada, inclusive depois de fechar a vaza ou reconectar.
- **CA-07:** interface mostra o descarte de costas e não executa a antiga animação de revelação.
Referências a revisar na implementação: motor, resolução de força/vaza, `match-service.ts`, componentes de carta na mesa, testes de privacidade, `tests/engine/hidden-auto-timer.test.ts`, `tests/engine/one-v-one.test.ts`, `tests/sql/flow.test.ts`, D-20/D-21/D-22 de `docs/RULES.md` e a seção de carta escondida em `docs/ARCHITECTURE.md`.
## 5. V2-02: landing e aviso de atualização
### 5.1. Landing solicitada

Criar página simples, responsiva e pública no próprio repositório Decky, hospedada no GitHub Pages. Ela deve apresentar o nome/logo do app, uma frase curta sobre o produto, a versão publicada e um botão destacado de download/atualização. Reutilizar a identidade visual existente, sem transformar a landing em um portal.

Complemento confirmado: primeira seção inspirada na hierarquia da página do Bootstrap, priorizando versão e download antes da rolagem. As seções seguintes apresentam o projeto com screenshots relacionadas ao conteúdo. Seguir a seção 20; a inspiração não obriga adotar Bootstrap como dependência.
O botão sempre aponta para a versão mais recente publicada para instalação. O responsável pela release fornece o link real, por exemplo do APK da release ou da build distribuída. Não usar URL fictícia nem link temporário sem verificar sua duração. Acesso ao app web existente pode aparecer como ação secundária.
**Decisão de especificação:** fontes estáticas em `site/`, com publicação somente desse diretório por GitHub Actions. Evita publicar toda a documentação de `docs/` e mantém a landing separada do bundle Expo em `dist/` e da hospedagem web existente. Arquivos previstos: `site/index.html`, estilo local, `site/version.json` e workflow em `.github/workflows/`. Não adicionar framework de site para essa página simples.
Endereço esperado, sujeito à configuração real do Pages: `https://rbrecci.github.io/Decky/`. Não tratar esse endereço como publicado antes de verificar o deploy. Recursos devem respeitar o prefixo `/Decky/`.
O GitHub Pages hospeda conteúdo estático e permite publicação por branch ou workflow. A opção por Actions acima é uma decisão para este projeto. Referências oficiais: [sobre o Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) e [configurar a origem de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
### 5.2. Uma fonte para a versão mais recente

**Decisão de especificação:** manter `site/version.json` como fonte única para a landing e a consulta do app. Ao atualizar a release, editar esse arquivo uma vez. A landing não deve ter outro link de download que possa ficar desatualizado.

Contrato Android implementado em `site/version.json`; os valores da release real e suas provas estão em [docs/DISTRIBUICAO_V2.md](docs/DISTRIBUICAO_V2.md):
| Campo | Tipo | Significado |
|---|---|---|
| `schemaVersion` | inteiro | Versão do contrato do manifesto, inicialmente 1 |
| `platform` | texto | `android` para a distribuição instalável inicial |
| `version` | texto | Versão pública da release, no formato numérico adotado pelo app |
| `buildNumber` | inteiro | Identificador crescente de build Android, inclusive em releases de mesma versão pública |
| `downloadUrl` | URL HTTPS | Link real da versão instalável mais recente |
| `publishedAt` | texto ISO 8601 | Data de publicação |
Não cadastrar uma release como atual antes de o artefato estar disponível. Se houver distribuição iOS futuramente, definir contrato por plataforma; não direcionar um iPhone ao APK. O app web continua acessível por seu endereço próprio.
### 5.3. Aviso dentro do app

O usuário pediu uma forma de avisar sobre atualização e um botão que abra a página. **Decisão de especificação:** aviso discreto na tela inicial com "Atualização disponível" e botão "Ver atualização", abrindo a landing no navegador. Não interromper uma partida com modal obrigatório.
- Consultar o manifesto ao abrir o app e ao retornar ao primeiro plano, com uma consulta em andamento por vez e intervalo mínimo de 15 minutos entre consultas de retorno.
- Comparar versão/build instalada com a publicação da mesma plataforma. Não comparar strings lexicograficamente: `1.10.0` precisa ser reconhecida como posterior a `1.9.0`.
- Mostrar aviso somente quando a versão/build publicada for superior. Mesma versão/build, publicação inferior, resposta inválida ou plataforma incompatível não geram aviso novo.
- Definir timeout de 5 segundos. Falha de rede não pode atrasar login, navegação ou partida. Na primeira consulta sem dados válidos, seguir sem aviso; um aviso já confirmado na sessão pode permanecer em falha posterior.
- Verificar o cache do manifesto na publicação e nas consultas para que uma release nova seja detectável sem reinstalar o app.
- Expor uma ação discreta "Página do Decky" na tela inicial para abrir a landing mesmo sem atualização detectada. Não reintroduzir as descrições de botões removidas na seção 6.
- Em build de desenvolvimento sem versão instalada confiável, não simular aviso de release disponível.
- Para web, a landing continua acessível; a detecção inicial de build instalável fica restrita ao Android. Não adicionar mecanismo de atualização automática de bundle web neste escopo.
Este fluxo é aviso e redirecionamento. Não instala APK automaticamente, não solicita atualização forçada e não implica adotar Expo Updates. Preservar identificador e assinatura Android para instalação sobre a versão existente, conforme a documentação atual do repo.
### 5.4. Rotina de publicação e aceite

1. Gerar e conferir o artefato instalável; anotar versão e build reais.
2. Publicar o artefato em um endereço acessível ao público alvo.
3. Atualizar o manifesto com versão, build, data e link conferidos.
4. Publicar a landing/manifesto pelo fluxo do Pages e verificar o resultado do workflow.
5. Abrir a página em celular, conferir versão e abrir o download.
6. Com app anterior, conferir aviso e botão; com app da mesma versão/build, conferir ausência do aviso.
- **CA-08:** landing funciona no caminho `/Decky/`, em celular e desktop, sem login.
- **CA-09:** mudar o manifesto altera o download da landing e a versão detectada no app, sem duplicação manual de links.
- **CA-10:** versão superior dispara aviso; versão igual/inferior não dispara; comparar também build de mesma versão.
- **CA-11:** rede ausente, timeout e JSON inválido não bloqueiam o app; destino do botão é a landing.
- **CA-12:** versão, manifesto e artefato publicados correspondem entre si; registrar URL verificada e evidência do deploy.
## 6. V2-03/04/06/07: redução de textos

Remover os textos, inclusive o espaço visual que ocupavam. Não substituir por explicações equivalentes. Manter títulos, controles, erros, estados de carregamento e recursos de acessibilidade necessários.
| Tela | Texto atual | Resultado solicitado |
|---|---|---|
| Inicial | "Toda partida nova vale Elo. Confira sua evolução no ranking." | Remover |
| Inicial, Criar sala | "Você joga ou este celular vira a mesa" | Remover descrição, manter botão |
| Inicial, Entrar na sala | "Com o código de 6 letras" | Remover descrição, manter botão |
| Inicial, Ranking | "Seu Elo no 1v1 e no 2v2" | Remover descrição, manter botão |
| Ranking | "Sua posição entre os jogadores do Decky." | Remover subtítulo |
| Ranking | Parágrafo iniciado por "O Elo começa em 1000." | Remover o parágrafo inteiro |
| Criar sala | "Como este celular vai participar?" | Remover subtítulo |
| Criar sala | "x jogadores. O formato fica fixo nesta sala." | Remover |
| Criar sala | "Dá para trocar o papel deste celular no lobby, antes de começar." | Remover texto, manter capacidade de troca |
| Criar sala, Vou jogar | Descrição atual do papel | "Você ocupa um dos x lugares" |
| Criar sala, Este celular será a mesa | Descrição atual do papel | "Este aparelho fica no centro e mostra só a mesa. Os x jogadores usam os próprios celulares" |
| Criar sala, modos | "1v1: duelo" e "2v2: duplas" | "1v1: Duelo" e "2v2: Duplas" |
| Entrar na sala | "Peça o código para quem criou a sala." | Remover subtítulo |
| Histórico | "Suas partidas e as notas que você escreveu." | Remover subtítulo |
O `x` das descrições é dinâmico: 2 no Duelo, 4 nas Duplas, sem contar o aparelho mesa. O pedido chama as opções de modais; o código atual as apresenta como opções em `app/room/create.tsx`. Alterar o componente real sem criar modais novos apenas por causa do nome usado no pedido.

**Decisão de especificação:** aplicar "1v1: Duelo" e "2v2: Duplas" também ao seletor equivalente no Ranking, para consistência.
- **CA-13:** nenhum dos textos removidos aparece nas respectivas telas; títulos e navegação continuam disponíveis.
- **CA-14:** alternar Duelo/Duplas atualiza os dois textos de papel para 2/4 corretamente, também nos rótulos de acessibilidade.
- **CA-15:** não sobra margem de um subtítulo vazio, descrição duplicada ou texto antigo em layout alternativo.
## 7. V2-05: MMR e títulos de Elo
### 7.1. Vocabulário e preservação dos dados

**Pedido confirmado:** o número antes chamado Elo passa a ser chamado **MMR**. **Elo** passa a designar o título/divisão alcançado com essa pontuação.
- Exibir "MMR", "Variação de MMR" e "MMR após a partida" onde hoje há referência ao número Elo, inclusive histórico, mensagens e acessibilidade.
- Mostrar título e divisão junto da pontuação no Ranking, tanto no próprio perfil quanto nas linhas de jogadores. Exemplo conforme as faixas aprovadas: `Delta 2 · 934 MMR`.
- Manter MMR e Elo independentes entre Duelo e Duplas, como os rankings atuais.
- Preservar separação das modalidades. Na virada de lançamento, apagar os saldos e históricos antigos conforme a seção 14 e iniciar todos com 500 MMR em cada modalidade. A fórmula anterior será substituída pela regra aprovada da seção 7.3. Não recalcular partidas antigas nem transportar seus pontos para a V2.
- Não substituir cegamente toda ocorrência de "Elo": o nome técnico do algoritmo pode continuar sendo explicado na documentação, enquanto o produto chama o saldo de MMR.
- Nomes técnicos existentes como `points`, `points_delta` e `points_after` podem ser preservados. Renomear tabelas ou colunas não é necessário para mudar o nome visível.
### 7.2. Hierarquia solicitada

| Ordem crescente | Elo | Divisões em ordem crescente de pontuação |
|---|---|---|
| 1 | Beta | Beta 1, Beta 2, Beta 3 |
| 2 | Delta | Delta 1, Delta 2, Delta 3 |
| 3 | Alfa | Alfa 1, Alfa 2, Alfa 3 |
| 4 | Sigma | Sigma 1, Sigma 2, Sigma 3 |
| 5 | Omega | Único, sem número/divisões |

São **13 classificações efetivas**, em cinco Elos. Respeitar a grafia solicitada: Alfa e Omega. A sequência vai de Beta 1 até Sigma 3 e depois Omega.
### 7.3. Inicial, piso, fórmula e faixas

**Pedido confirmado:** todos começam com 500 MMR. Diferença de até 100 pontos, inclusive, gera ganho/perda nominal de 10. Acima disso, o lado com menor MMR arrisca menos e pode ganhar mais; o favorito arrisca mais e pode ganhar menos.

**Decisão de especificação:** interpretar 500 como piso numérico, além de início no menor Elo, Beta 1. Nenhum saldo final fica abaixo de 500. Defaults, constraints, criação de perfil/rating e todas as escritas devem respeitar isso, inclusive criação tardia do rating de uma modalidade.

**Regra aprovada por Saker em 23/10/2026:** ajuste de 5 pontos por cada bloco iniciado de 100 MMR além da tolerância, mantendo o limite de 9 degraus. Vitória concede no mínimo 5 MMR; o ganho máximo é 55. O favorito recebe 5 quando a diferença ultrapassa 100; o azarão recebe 15 no primeiro degrau, 20 no segundo e assim por diante até 55.

No Duelo, usar os MMR dos jogadores. Nas Duplas, usar a média aritmética dos dois participantes de cada lado, sem arredondar a média; todos de um lado recebem a mesma variação nominal. Usar exclusivamente a modalidade da partida. Capturar os saldos de todos os participantes imediatamente antes do cálculo do resultado na mesma transação, com bloqueios em ordem estável; nenhuma atualização parcial pode influenciar outra dentro da mesma partida.

```text
RW = MMR do vencedor (ou média da dupla vencedora)
RL = MMR do perdedor (ou média da dupla perdedora)
d = RL - RW
q = min(9, ceil(max(0, abs(d) - 100) / 100))
g = max(5, 10 + sign(d) * 5 * q)

delta_nominal_vencedor = +g
delta_nominal_perdedor = -g
saldo_final_individual = max(500, saldo_anterior + delta_nominal)
delta_real_individual = saldo_final_individual - saldo_anterior
```

`sign(0) = 0`; `ceil` arredonda para cima. O vencedor recebe entre 5 e 55, e o derrotado perde nominalmente o mesmo valor. Diferença absoluta até 100 produz q=0; 101 a 200 produz q=1; 201 a 300 produz q=2; acima de 900 produz q=9. Médias fracionárias seguem a mesma fórmula: 100,5 já ultrapassa a tolerância. A contagem é por partida, sem multiplicar por pontos do placar, truco ou vazas.

| MMR menor / maior | Se o menor vencer | Se o maior vencer |
|---|---|---|
| 800 / 800 | +10 / -10 | -10 / +10 |
| 800 / 900 | +10 / -10 | -10 / +10 |
| 800 / 901 | +15 / -15 | -5 / +5 |
| 800 / 1000 | +15 / -15 | -5 / +5 |
| 800 / 1001 | +20 / -20 | -5 / +5 |
| 800 / 1300 | +30 / -30 | -5 / +5 |
| 800 / 1800 | +55 / -55 | -5 / +5 |

Os pares de deltas na tabela estão sempre na ordem menor / maior e pressupõem distância suficiente do piso. Exceção explícita ao -10 padrão: um jogador em 500 que perde continua em 500; em 506 que perderia 10 termina em 500, com delta real -6. O vencedor recebe seu ganho integral. Portanto o piso cria MMR líquido; não prometer soma zero nem estabilidade da distribuição ao longo do tempo. Nas Duplas, o piso pode fazer parceiros terem perdas reais diferentes, embora compartilhem a variação nominal.

Gravar e exibir saldo anterior, variação real e saldo final oficiais por participante. Guardar também a identificação da regra de pontuação e os valores usados no cálculo para auditoria. Aplicar uma única vez ao encerrar a partida, junto com o resultado; rollback integral em erro. Mesa não pontua. Não criar regra nova de derrota por desconexão ou abandono nesta revisão. Partidas não finalizadas não recebem pontuação presumida.

**Faixas aprovadas por Saker:** 100 MMR por divisão, sem teto em Omega. Com adversários equivalentes, uma divisão representa dez vitórias líquidas; de 500 a 1700 são 120 vitórias líquidas a +10, como referência, não previsão de progressão real.

| Elo e divisão | MMR inclusivo |
|---|---|
| Beta 1 | 500 a 599 |
| Beta 2 | 600 a 699 |
| Beta 3 | 700 a 799 |
| Delta 1 | 800 a 899 |
| Delta 2 | 900 a 999 |
| Delta 3 | 1000 a 1099 |
| Alfa 1 | 1100 a 1199 |
| Alfa 2 | 1200 a 1299 |
| Alfa 3 | 1300 a 1399 |
| Sigma 1 | 1400 a 1499 |
| Sigma 2 | 1500 a 1599 |
| Sigma 3 | 1600 a 1699 |
| Omega | 1700 ou mais |

MMR é inteiro; abaixo de 500 é estado inválido, não uma classificação adicional. Título derivado do MMR atual, com promoção/rebaixamento imediatos após resultado confirmado. Sem temporadas, série de promoção ou proteção adicional contra queda. O piso protege somente o mínimo. Fórmula e faixas estão aprovadas para implementação, incluindo início e piso de 500, ajuste de 5 por degrau e ganho mínimo de 5 por vitória.
### 7.4. Critérios de aceite
- **CA-16:** pontos numéricos são rotulados como MMR em todas as telas; posição no ranking continua sendo posição, e Elo passa a ser o título.
- **CA-17:** os 13 títulos respeitam a sequência acima; Omega nunca aparece como Omega 1, 2 ou 3.
- **CA-18:** testar cada limite imediatamente abaixo, no limite e imediatamente acima; início em 500 classifica como Beta 1; valores abaixo de 500 são rejeitados e Omega não tem teto.
- **CA-19:** vencer/perder atualiza MMR e título pela resposta oficial; erro ou ação reenviada não concede promoção adicional.
- **CA-20:** na V2, separação 1v1/2v2 e escrita exclusiva no servidor permanecem; histórico de variações reais é coerente com a nova fórmula e o piso. Não transportar os dados eliminados no reset.
- **CA-35:** testar diferenças 0, 99, 100, 101, 200, 201, 900, 901 e 1000, ambos os vencedores, médias fracionárias no 2v2, piso em 500/506 e combinação de parceiros com e sem perda limitada pelo piso.
- **CA-36:** finalizar duas partidas concorrentes com participante em comum serializa a pontuação; reenvio não duplica MMR, e falha transacional não registra resultado nem pontuação parcial.
Referências: `app/ranking.tsx`, `app/history/index.tsx`, `src/ranking/api.ts`, `src/contracts/types.ts`, `docs/RANKING.md`, `tests/app/ranking.test.ts`, `tests/sql/ranked.test.ts` e migration de ranking. Atualizar a documentação viva na implementação; manter registros históricos de execução identificados como históricos.
## 8. V2-08: salas públicas e privadas
### 8.1. Criação e compatibilidade

Adicionar na criação um controle de duas opções, **Pública** e **Privada**, independente do formato Duelo/Duplas e do papel jogador/mesa.

**Decisão de especificação:** Privada é o padrão, pois mantém o comportamento atual. Salas já existentes e clientes antigos que não enviem visibilidade também permanecem privados. Visibilidade é escolhida na criação; troca posterior não foi solicitada.
Sala privada mantém entrada por código/QR, capacidades, lugares, pronto, papel de mesa e início de partida existentes. Sala pública permite descoberta na listagem e também pode continuar sendo acessada pelo código.
### 8.2. Listagem em Entrar na sala

Manter entrada por código e adicionar seção "Salas públicas" na mesma tela. Cada item apresenta:

| Campo | Exibição/regra |
|---|---|
| Nome | `Sala de {nome do host}`; nome vem do perfil atual do dono |
| Ocupação | `x/2` em Duelo e `x/4` em Duplas |
| Modo | `Duelo` ou `Duplas` |
| Ação | Botão `Entrar` |
- Contar apenas jogadores que ocupam lugares. Host jogador conta; host mesa não conta e não aumenta a capacidade.
- **Decisão de especificação:** listar apenas salas públicas em lobby. Sala cheia continua visível com ocupação máxima e botão indisponível; iniciada, finalizada ou apagada sai da listagem.
- Ordenação estável por criação mais recente e ID como desempate. Não acrescentar busca, filtros ou matchmaking nesta entrega.
- Se o dono sair e o fluxo existente transferir a administração, atualizar o nome para o novo host e recalcular a ocupação pelo estado oficial.
- Mostrar carregamento, vazio e erro com ação de tentar novamente. Não apresentar falha de consulta como "nenhuma sala".
- Nome longo pode quebrar ou usar reticências sem esconder ocupação e botão. Não permitir que conteúdo do nome seja interpretado como HTML na web.
### 8.3. Sincronização e entrada segura

Atualizar a lista ao criar/remover sala pública, entrar/sair jogador, mudar papel do host, transferir dono ou iniciar partida. A contagem não pode exigir reabrir a tela para ficar correta.
Reutilizar o padrão existente de Realtime com releitura autorizada, reconciliação por polling e recarga ao voltar ao primeiro plano. **Decisão de especificação:** meta de aceite de até 3 segundos em rede estável para eventos em tempo real; na indisponibilidade do canal, recuperação no próximo polling, proposto em até 5 segundos enquanto a tela está ativa.
A lista tem informação indicativa. Ao clicar em Entrar, o servidor revalida sala, fase e capacidade dentro da operação de entrada. Se dois usuários disputarem a última vaga, exatamente um entra. Tratar sala cheia, iniciada ou removida com mensagem curta e recarregar a lista. Desabilitar o botão durante o envio para evitar duplo toque.
### 8.4. Banco, autorização e canais
- Persistir visibilidade da sala por migration nova, com valor padrão privado e restrição dos valores aceitos.
- Estender a criação sem quebrar chamadas antigas. Conferir assinatura e permissões das RPCs; não editar migrations já aplicadas para simular atualização de produção.
- Expor somente o resumo necessário das salas públicas para usuários autenticados ainda não participantes. Salas privadas não podem aparecer nessa consulta.
- Não liberar `room_players`, mãos, eventos ou estado privado para todos apenas para obter contagem. Preferir projeção/RPC limitada aos dados da lista.
- RLS atual protege leituras por participação. Planejar também como o não membro receberá invalidações da listagem: criar uma RPC de resumo sem um canal autorizado não basta para atualizar em tempo real.
- Se for necessário canal/projeção específico de descoberta pública, autorizar somente metadados públicos e manter polling de recuperação. Não usar chave de serviço no app.
- Mudanças nas permissões de descoberta não podem permitir ler/alterar outra sala privada, ocupar dois lugares ou iniciar partida sem ser host.
### 8.5. Critérios de aceite
- **CA-21:** criar sem selecionar visibilidade mantém sala privada; dados antigos também permanecem privados.
- **CA-22:** privada não aparece na lista, mas continua aceitando entrada por código; pública aparece para outra conta autenticada.
- **CA-23:** Duelo mostra capacidade 2 e Duplas 4; aparelho mesa não entra no numerador nem denominador.
- **CA-24:** duas contas/dispositivos observam nome e contagem atualizados após entrada, saída e troca de host, dentro das metas da seção 8.3.
- **CA-25:** sala cheia tem botão indisponível; iniciada/removida desaparece; clique com informação antiga retorna erro tratado.
- **CA-26:** corrida pela última vaga produz um ingresso e uma recusa, sem duplicar ocupação.
- **CA-27:** consulta e notificações não expõem sala privada nem cartas; testes incluem sessão anônima, não membro autenticado, membro e host.
## 9. V2-09: Histórico, notas e carregamento
### 9.1. Cabeçalho fixo

Colocar "Histórico" à esquerda e "Voltar" à direita no topo, na mesma linha. O cabeçalho fica fora da área rolável; o botão permanece visível ao rolar partidas ou notas. Respeitar área segura e tamanho de toque no celular. Retirar o botão duplicado do fim da lista.
Reutilizar ou estender o cabeçalho existente somente no necessário para esta tela, conferindo que outras telas não percam seu comportamento. Ao entrar por link sem tela anterior no histórico de navegação, voltar para a tela inicial.
### 9.2. Duas paginações independentes

**Pedido confirmado:** no máximo cinco partidas por página e o mesmo para notas. **Decisão de especificação:** manter as duas seções atuais, cada uma com sua página e controles independentes. Não dividir dez itens misturados em uma lista única.
- Partidas: 5 por página, mais recentes primeiro, desempate por ID. Substituir "Últimas 50 partidas" por "Partidas".
- Notas: 5 por página, por criação mais recente, desempate por ID, preservando a ordem principal atual.
- Não limitar a navegação às primeiras 50 partidas e não baixar todas as notas para depois fatiar no cliente. Paginar na consulta.
- Controles mínimos de cada seção: "Anterior", "Página N" e "Próxima". Anterior desabilitado na primeira; Próxima desabilitado quando não houver mais resultados. Não é necessário total de páginas se a API não o fornecer.
- Para detectar continuação sem consulta de contagem, pode buscar seis registros e renderizar apenas cinco. O sexto é somente sinal de próxima página.
- Alterar a página de partidas não altera a de notas, e vice-versa. Voltar da edição conserva as páginas válidas e recarrega os dados afetados.
- Ao excluir a única nota da última página, recuar para a página anterior válida. Criar nota pode reposicionar a seção de notas na primeira página para exibi-la.
- Metadados da partida associada à nota não podem depender de essa partida estar na página visível de partidas. Buscar os dados necessários por associação autorizada ou projeção da consulta de notas, sem carregar todo o histórico.
- Descartar respostas antigas que terminem depois de uma consulta mais recente e evitar avanço repetido enquanto a troca de página está carregando.
- Em atualização explícita ou retorno ao foco, reconciliar a página com os dados atuais. Não prometer fotografia imutável do histórico durante novas partidas; manter ordenação determinística e não duplicar itens na página renderizada.
- Preservar CRUD de notas e isolamento por autor. Variações novas usam MMR. Antes da virada, registros antigos mantêm sua identificação; após o reset não ficam disponíveis no histórico de produção.
### 9.3. Skeleton loading

Renderizar placeholders com dimensões próximas dos cards enquanto chegam dados, tanto no primeiro acesso quanto na troca de página. O cabeçalho e Voltar continuam utilizáveis.
- Estados independentes por seção: carregando, lista, vazio e erro. Falha nas notas não apaga partidas já carregadas.
- Durante carga inicial, não mostrar "nenhuma partida/nota" antes da resposta.
- Limitar skeletons ao tamanho de página, até cinco por seção. Não misturar placeholders com cards antigos que pareçam ser a página nova.
- Respeitar redução de movimento, sem piscar rapidamente; placeholders não recebem foco nem são anunciados como partidas reais.
- Em erro, encerrar o skeleton e oferecer tentativa novamente na seção afetada. Nunca manter carregamento infinito.
O pedido de skeleton está associado ao Histórico. Estender para todas as telas do app não faz parte desta entrega.
### 9.4. Critérios de aceite
- **CA-28:** após rolar até o fim, Voltar segue visível ao lado do título e navega corretamente.
- **CA-29:** testar 0, 1, 5, 6, 10 e 11 registros para cada seção; nenhuma página mostra mais de cinco itens.
- **CA-30:** navegar entre páginas de uma seção não muda a outra; mais de 50 partidas são alcançáveis.
- **CA-31:** excluir a última nota de uma página não deixa página inválida; editar/criar mantém o CRUD funcional.
- **CA-32:** nota de partida fora da página atual mantém seus metadados corretos.
- **CA-33:** com rede lenta, os skeletons aparecem antes dos dados; em vazio/erro desaparecem e mostram o estado correto.
- **CA-34:** navegação rápida e respostas fora de ordem não substituem a página atual por resultados antigos; sessão de outro usuário não reutiliza dados privados da anterior.
Referências: `app/history/index.tsx`, `app/history/note.tsx`, `src/history/api.ts`, `src/ui/Screen.tsx`, RPC `get_my_match_history`, tabela `match_notes`, `tests/app/match-history.test.ts`, `tests/app/history-web.test.ts` e testes SQL de histórico/ranking.
## 10. Organização para implementação futura

Este é um documento de requisitos. O plano executável deve ser detalhado contra o código existente quando o usuário pedir implementação, sem criar agora uma lista extensa de tarefas que pode ficar desatualizada.
### Fase 1: correção de regra e redução de textos

Frente pronta para detalhar ao retomar: escrever os testes que refutam a força/revelação da carta oculta; executar e guardar a falha; implementar no motor e servidor; ajustar apresentação e documentação das regras; aplicar a matriz de textos e o sublinhado dos títulos. Preservar proibição na primeira vaza e comprovar 1v1/2v2, privacidade e persistência. Implementar recuperação de senha e Google cedo, pois dependem de configuração externa e validação em aparelhos.
### Fase 2: descoberta pública de salas

Criar migration compatível e contrato mínimo de descoberta, com RLS e canal de atualização definidos juntos. Implementar seletor de visibilidade, listagem e fluxo de entrada. Validar concorrência da última vaga e sincronização com mais de uma sessão. Publicar backend compatível antes do cliente dependente.
### Fase 3: histórico e títulos

Implementar paginações, cabeçalho e skeletons com estados independentes e metadados de notas sem dependência da página de partidas. Aplicar as decisões aprovadas da seção 7.3, implementar fórmula, inicial/piso de 500 e os 13 títulos, testar limites e concorrência. Validar em ambiente de testes separado; não reiniciar dados de produção durante o desenvolvimento. Implementar leitor QR e revisão responsiva de todas as telas.
### Fase 4: distribuição e atualização

Implementar landing, manifesto e consulta de atualização. Gerar uma release coerente com versão/build, conferir o link e configurar Pages. Validar página publicada, detecção no app anterior, instalação Android, recuperação por e-mail e OAuth em produção. Com todos os requisitos prontos, executar a virada única de dados da seção 14 em janela de manutenção, com a V2 publicada e validada para acesso controlado, e reabrir somente após os checks finais. O app web continua no fluxo existente.
Na virada de cada fase: registrar resultado e desvios, atualizar documentos vivos e retirar apenas rascunhos efetivamente substituídos após conferir referências. Não mover esta especificação para `discarted/` enquanto houver requisitos pendentes.
## 11. Estratégia de verificação

Nenhum teste de funcionalidade foi executado para declarar esta especificação implementada. Os comandos abaixo são checks planejados para a implementação.
| Frente | Evidência exigida |
|---|---|
| Motor, validação, consultas e transformação de dados | Teste de comportamento novo falhando antes da alteração, output preservado; depois teste passando |
| Carta oculta | Motor + fluxo SQL/serviço + inspeção da projeção pública + conferência visual do descarte |
| Salas | Migration sobre banco existente + permissões + concorrência + duas sessões acompanhando a lista |
| MMR/Elos | Nova fórmula, piso, inicial, médias das duplas, fronteiras, concorrência e idempotência |
| Histórico/notas | Paginação real, CRUD, autorização, dados fora da página e respostas fora de ordem |
| Layout e textos | Screenshots em celular pequeno, orientação suportada e web; conferir textos removidos e cabeçalho fixo |
| Atualização | Comparação de versões/builds, falhas de rede, botão e manifesto publicado |
| Distribuição | Workflow Pages, URLs reais, download público e instalação por cima no Android |
| Reset | Ensaio isolado, inventário de dados, autenticação antiga recusada, zero dados antigos e novos cadastros em 500 |
| Autenticação | SMTP real, recuperação no mesmo e em outro aparelho, token inválido/expirado/usado, OAuth cancelado e identidade única |
| Web e QR | Matriz de tamanhos/navegadores, teclado/zoom, câmera permitida/negada/ausente e ingresso único |
Rodar os testes pertinentes pelo runner já existente, `npm run typecheck` e, nas mudanças de interface, `npm run build:web`. Não instalar dependências para testes que a stack atual já suporta. Checks locais não substituem validação autenticada no Supabase e em aparelhos; registrar essas limitações se não forem executadas.
Antes de entregar código, comparar o diff com esta especificação e varrer os arquivos alterados automaticamente pelos códigos Unicode U+2014, U+2013 e U+2212. Em Git Bash, usar `LC_ALL=C.UTF-8 git grep -nP "[\x{2014}\x{2013}\x{2212}]"` com os caminhos/extensões alterados e conferir o exit code: 1 é limpo, 0 indica ocorrência, 2 indica falha no comando. Incluir arquivos novos na conferência; `git grep` padrão não cobre arquivo ainda não rastreado.
## 12. Pendências e limites de escopo

### Decisões aprovadas e pendências de integração

Fórmula e faixas da seção 7.3 foram aprovadas. O inicial é 500 e corresponde a Beta 1. SMTP e Google têm configuração inicial registrada em `docs/PREPARO_V2.md`; não reiniciar o cadastro dos provedores. Implementar e testar os fluxos das seções 15/16, publicar páginas reais de privacidade/suporte, cadastrar retornos específicos e revisar publicação pública do Google. A distribuição V2 está direcionada a GitHub Releases e landing no Pages, preservando EAS Hosting para o jogo web. Conferir assinatura do APK instalado antes de gerar a atualização. As demais interpretações estão identificadas como decisões de especificação.
### Verificações técnicas antes de publicar

Conferir configuração e permissões reais do Pages, origem pública do artefato, versão/build instalada e assinatura Android. Verificar APIs oficiais das versões instaladas ao implementar leitura da versão e abertura de links. Nenhum segredo, chave de serviço ou dado privado pode entrar na landing/manifesto.
### Fora do pedido

Sem redesenho completo da identidade, matchmaking automático, chat, temporadas, recompensas de Elo, troca de visibilidade após criação, instalação automática ou mecanismo geral de atualização forçada. A nova fórmula, ajustes responsivos e reset de lançamento agora fazem parte do pedido. Durante a virada, impedir acesso às operações incompatíveis por clientes antigos sem introduzir esse bloqueio como atualização obrigatória recorrente. Não criar segunda hospedagem do app web ao publicar a landing.
## 13. Critério de encerramento da V2

A V2 estará concluída para o lançamento quando os critérios funcionais CA-01 a CA-36 e CA-39 a CA-51 tiverem evidências, fórmula/faixas decididas e backend/clientes compatíveis publicados e validados. A abertura pública exige também CA-37/38: virada única executada, sem dados antigos e com novos cadastros em 500. Não condicionar o reset à existência de dados de lançamento que só surgirão depois dele. Marcar separadamente implementação, testes locais e produção; não converter falta de teste em aprovação.
Esta entrega encerra somente a documentação: revisão de `DeckyV2Spec.md`, cobertura e varredura automática do arquivo. Eventual publicação no GitHub não representa conclusão das funcionalidades.

## 14. V2-10: reset único na virada de lançamento

**Pedido confirmado:** após concluir e lançar a V2, fazer reset total para eliminar contas duplicadas e permitir que todos recomecem com as mesmas funcionalidades e MMR inicial. Esta revisão especifica o procedimento futuro; não executa exclusões.

**Decisão de especificação:** "total" abrange contas do Supabase Auth, identidades vinculadas, sessões/refresh tokens, perfis, salas, participantes, partidas, eventos, mãos privadas, notas, ratings, estatísticas e demais dados de usuários/jogo identificados no inventário. Todos precisarão se cadastrar novamente ou entrar com Google, recebendo um novo perfil e 500 em cada modalidade. Também remover arquivos de usuários no Storage, se existirem, pelo serviço apropriado, conferindo dependências antes da exclusão de contas.

Preservar projeto Supabase, schema, migrations e seu histórico de aplicação, RLS, RPCs, Edge Functions, configurações de Auth/Google/SMTP, infraestrutura de Storage, assets públicos do produto, assinatura Android, repositório e releases. Reset de dados não significa apagar a infraestrutura ou editar migrations antigas. Não utilizar um comando genérico de reset do projeto de produção como substituto deste procedimento.

Roteiro obrigatório de lançamento:

1. Em ambiente isolado, implementar e validar todas as frentes, inclusive OAuth, recuperação real por e-mail, regras de MMR e novos cadastros em 500. Ensaiar a limpeza contra inventário de tabelas, FKs, triggers e serviços; identificar dados que não pertencem ao Decky antes de tocar neles.
2. Preparar um procedimento administrativo exclusivo de execução manual, fora das migrations de deploy automático. Ele registra projeto/ambiente alvo, etapa e resultado, permite retomada após falha e não carrega dados pessoais/segredos nos logs. Nenhum cliente pode executá-lo. Não repetir automaticamente em novas releases ou reinício do app.
3. Informar no produto/landing a janela de manutenção e que contas, histórico e ranking antigos serão apagados, exigindo novo cadastro. Não enviar comunicações externas por esta entrega documental.
4. Fechar operações e cadastros durante a virada no backend, não só na interface, para impedir escritas concorrentes. Publicar artefatos/clientes/backend V2 e conferir acesso controlado. Retirar seeds, fixtures e usuários de teste da produção aberta.
5. Executar a limpeza de dados e de Auth pelas interfaces administrativas suportadas, considerando cascatas e triggers. A operação entre Auth, banco e Storage não é uma única transação: manter manutenção em falha e retomar pelas etapas registradas. Conferir contagens de todos os recursos inventariados antes de reabrir.
6. Revogar sessões antigas e validar a recusa de JWTs ainda não expirados de contas apagadas em RPCs, Edge Functions, RLS e canais. Revogação de refresh token sozinha não invalida imediatamente todo access token; as operações devem verificar identidade ativa/autorizada. Reconciliação do cliente limpa sessão e caches privados locais ao detectar conta removida.
7. Conferir que clientes antigos não conseguem operar usando regras ou endpoints incompatíveis. Validar proteção no servidor, sem depender somente de versão informada pelo cliente. Abrir novamente cadastro, Google e partidas apenas com a virada concluída.
8. Verificar novo cadastro pelos dois métodos, 500 nas duas modalidades, histórico vazio e primeira partida com a regra nova. Remover dados das contas de QA ou reinicializá-las antes da abertura para não criar vantagem inicial. Registrar conclusão da operação única.

Falhas anteriores à exclusão permitem cancelar a janela. Depois de iniciada, manter manutenção até completar ou aplicar o plano de restauração definido no ensaio. Eventual cópia de recuperação operacional permanece privada, com retenção definida no procedimento; não constitui preservação de histórico acessível aos jogadores. Esta spec não presume backup disponível nem autoriza armazenamento indefinido de dados pessoais.

- **CA-37:** após a virada não existem usuários, sessões utilizáveis, salas, partidas, notas ou pontuações antigas; esquema e serviços da V2 seguem funcionais. Verificar todos os recursos do inventário e JWT antigo ainda válido temporalmente.
- **CA-38:** qualquer novo jogador começa com 500 em Duelo e Duplas e histórico vazio; repetir deploy não dispara limpeza novamente. Falha no meio da limpeza mantém manutenção e admite retomada controlada.

## 15. V2-11: esqueci minha senha por e-mail

Adicionar "Esqueci minha senha" ao login. A tela solicita e-mail, valida formato e chama Supabase Auth (`resetPasswordForEmail`). Para uma solicitação aceita, mostrar mensagem neutra: "Se houver uma conta para este e-mail, você receberá as instruções de recuperação." Não expor existência da conta; falhas de conexão, limite de envio ou indisponibilidade do serviço exibem erro tratado, sem afirmar entrega.

O e-mail leva a uma tela de nova senha e confirmação. Validar a política vigente do Supabase e a igualdade dos campos; salvar usando `updateUser({ password })` apenas após validar o token/sessão de recuperação. Mostrar sucesso somente após confirmação do servidor, encerrar o contexto de recuperação e permitir entrar com a nova senha. Token expirado, inválido ou já usado oferece novo envio. Conta inexistente não é criada pela recuperação. Um simples parâmetro `type=recovery` não é prova de autorização.

**Decisão de especificação:** priorizar recuperação por página HTTPS no app web existente, que funciona mesmo sem APK e pode ser aberta em outro aparelho. O fluxo precisa funcionar quando solicitado no celular e aberto no computador. Não depender exclusivamente de PKCE com verifier salvo apenas no dispositivo que solicitou. Opção técnica a validar: template com `TokenHash`, página dedicada e `verifyOtp` com tipo `recovery`, seguida de `updateUser`. Não trocar senha nem consumir token automaticamente em GET/prefetch de robôs de e-mail; exigir ação explícita na página antes de validar a recuperação. Proteger essa página contra envio de token por referrer, analytics ou logs, limpar a URL após consumo e não renderizar conteúdo externo nesse fluxo. O retorno direto ao APK pode ser complementar, sem eliminar o caminho web.

Limitar reenvios pela política do servidor e refletir cooldown na interface; desabilitar envio duplicado em andamento. Manter navegação, loading, erro e acessibilidade. Não registrar senhas, links de recuperação ou tokens. Usuários Google continuam podendo usar "Entrar com Google"; recuperar a senha do provedor Google pertence ao Google. Se o Supabase permitir definir uma senha local para uma identidade Google após recuperação válida, isso não altera a senha da conta Google e não cria outro perfil.

### 15.1. Configuração necessária pelo responsável

1. Escolher um provedor de e-mail que ofereça SMTP, por exemplo Resend, Brevo ou outro compatível. Criar conta e validar remetente/domínio conforme o provedor, incluindo registros DNS exigidos. Se ainda não houver domínio, verificar antes quais remetentes o serviço permite para envio público; não presumir que o modo de testes atende usuários externos.
2. Em Supabase, nas configurações de Authentication/e-mail, habilitar SMTP personalizado e cadastrar host, porta, usuário, senha SMTP e remetente "Decky". As credenciais ficam no painel, nunca em variável `EXPO_PUBLIC_*`, landing ou Git.
3. Configurar Site URL e lista de Redirect URLs para os destinos reais do app web e, se utilizado, deep link do app. Revisar template de recuperação junto com a implementação; não apontar para localhost em produção. Publicar a rota web e verificar abertura direta/reload no EAS Hosting antes de habilitar o template novo.
4. **Decisão de especificação:** habilitar confirmação de e-mail no cadastro por senha e implementar seu envio/reenvio e estado de confirmação. Isso ajuda a manter identidades verificadas para o Google. A instrução antiga do README de desligar confirmação para demonstração não vale para o lançamento V2. Validar este fluxo antes do reset.
5. Testar com destinatário externo à equipe, inspecionar recebimento real, spam e expiração. O SMTP padrão do Supabase é destinado a testes e possui restrições; não considerá-lo entrega pública validada.

- **CA-39:** uma conta por senha recupera acesso no mesmo aparelho e em outro dispositivo sem criar usuário nem perder histórico/MMR.
- **CA-40:** token inválido, usado/expirado, e-mail inexistente, falha SMTP, cooldown e resposta lenta têm estados corretos; nenhuma senha é alterada sem autorização válida. Pré-visualização do link pelo serviço de e-mail não inutiliza o fluxo.
- **CA-41:** cadastro com confirmação e recuperação chegam a uma caixa externa real; senha antiga deixa de autenticar após a troca e a nova funciona. Registrar a política efetiva de sessões após troca e não prometer invalidação instantânea sem verificá-la.

## 16. V2-12: entrar com Google

Manter login por e-mail/senha e adicionar botão "Entrar com Google", seguindo identificação visual e acessibilidade do provedor. Usar Supabase Auth como autoridade da sessão, com OAuth Google em navegador do sistema no app e redirecionamento na web. Não coletar senha Google na interface Decky nem embutir login em WebView.

**Decisão de especificação:** usar OAuth via navegador nesta V2, sem SDK de login nativo Google. Fluxo sugerido: `signInWithOAuth` com provider Google, PKCE, abertura de sessão de autenticação no sistema e troca do código no retorno. Guardar verifier de modo adequado, validar callback/estado pelo SDK e tratar retorno com app fechado ou aberto sem processar o código duas vezes. O scheme `decky` já está no `app.json` consultado; os caminhos finais do callback devem ser confirmados na implementação e cadastrados exatamente no Supabase. Validar em development build e APK instalável, sem depender do Expo Go como prova.

Criar perfil e ratings uma única vez para novo usuário. Se o Google não fornecer nome utilizável, pedir um nome antes de entrar no jogo. Troca de método com o mesmo e-mail verificado deve usar a vinculação suportada pelo Supabase e preservar ID, MMR e histórico. Não implementar merge de contas por nome ou e-mail declarado pelo cliente. Contas com e-mails diferentes permanecem distintas; esta V2 não promete eliminar toda possibilidade de contas alternativas. Tratar identidades não confirmadas conforme a política do Supabase e testar essa situação.

### 16.1. Passo a passo da sua parte: Google Cloud e Supabase

Você precisará de um **OAuth Client ID e Client Secret**, não de uma API key comum nem de uma service account. Para o fluxo por navegador aqui proposto, o cliente Google é do tipo **Web application**, inclusive para o APK que autentica via Supabase.

1. Acessar Google Cloud Console com a conta que administrará o Decky e criar/selecionar um projeto. Abrir Google Auth Platform (em alguns layouts, APIs e serviços > Tela de consentimento OAuth).
2. Configurar Branding: nome Decky, e-mail de suporte e contato do desenvolvedor. Informar homepage e políticas exigidas pelo console com URLs reais publicadas; não usar páginas fictícias. Se houver domínio próprio, cumprir a verificação solicitada pelo Google. A landing pode hospedar páginas informativas estáticas necessárias, sem receber tokens de autenticação.
3. Em Audience, selecionar público externo se o app for usado fora da organização. Durante testes, cadastrar os e-mails de testadores. Antes do lançamento público, mudar para produção e cumprir exigências que o Google apresentar; não presumir que o modo de testes permite qualquer usuário.
4. Em Data Access, solicitar somente identidade básica: `openid`, e-mail e perfil. Não é necessário habilitar API de Gmail, Drive ou Calendar para esse login.
5. No Supabase do Decky, abrir Authentication > Sign In / Providers > Google e copiar o callback exibido. Ele normalmente tem a forma `https://<project-ref>.supabase.co/auth/v1/callback`, mas o valor do painel é a fonte correta, inclusive com domínio personalizado.
6. Em Google Auth Platform > Clients, criar OAuth Client ID do tipo Web application. Adicionar o callback copiado em Authorized redirect URIs. Em Authorized JavaScript origins, quando aplicável ao cliente web configurado, usar a origem real, como `https://decky-brecci.expo.app`, sem caminho. Callbacks locais pertencem à configuração de testes correspondente.
7. Copiar Client ID e Client Secret para o provedor Google no painel Supabase e habilitá-lo. **Client Secret fica somente no Supabase**, nunca no aplicativo, manifesto de versão, screenshot, chat ou repositório. Não é necessário me enviar esse segredo.
8. Nas URL Configuration do Supabase, configurar o retorno **depois** da autenticação: callback HTTPS da web e callback `decky://...` acordado com o código. São diferentes do callback que foi cadastrado no Google. Restringir a lista aos destinos necessários; não permitir redirecionamento arbitrário em produção.
9. Testar conta permitida, cancelar consentimento, negar acesso, voltar ao app, sessão persistente, logout e login por senha/Google com mesmo e-mail verificado. Só abrir ao público após testar uma conta externa no estado de publicação correto.

No fluxo escolhido não é necessário configurar SHA-1/SHA-256 para SDK nativo Google. Se o escopo mudar para login nativo direto, será necessária outra configuração de clientes por plataforma e certificados; não aplicar essas instruções de navegador como se cobrissem esse cenário.

- **CA-42:** nova conta Google cria exatamente um perfil e 500 MMR em cada modalidade; login posterior reutiliza a mesma identidade e dados, no APK e na web.
- **CA-43:** cancelar, erro do provedor, callback inválido, repetido ou sem verifier não trava a tela nem autentica usuário indevido; logout encerra a sessão Decky.
- **CA-44:** alternar Google/senha para mesmo e-mail verificado preserva identidade e MMR; e-mails diferentes não são fundidos e nenhuma credencial secreta aparece no bundle ou na landing.

## 17. V2-13: responsividade do jogo web

**Pedido confirmado:** tornar a versão web utilizável de celular a computador, em todos os tamanhos de tela. **Decisão de especificação:** layouts fluidos, sem limitar o jogo web a uma coluna estreita de celular em monitores grandes. Isso não implica liberar rotação no aplicativo nativo, atualmente configurado em retrato.

Revisar autenticação e seus novos fluxos, início, criação/entrada, leitor QR, lobby, partida do jogador, modo mesa, ranking, histórico e notas. Usar largura/altura disponíveis para reorganizar componentes, limites de largura para leitura e áreas proporcionais para cartas/mesa. Em telas largas, priorizar mesa ampla e mão/controles legíveis, sem esticar textos e botões indefinidamente. Em telas baixas, permitir rolagem das telas de formulário e adaptar a partida sem cobrir ações. Respeitar privacidade no modo jogador com aparelho mesa.

Não depender só de hover, toque ou orientação retrato. Preservar uso por mouse, toque e teclado com foco visível; alvos de toque grandes, zoom, fonte ampliada, safe areas e teclado virtual. Cartas, QR, placar e controles não podem se sobrepor ou sair da área acessível. Modais/avisos devem caber na viewport; não resolver conteúdo cortado simplesmente escondendo overflow.

Matriz mínima em pixels CSS: 320x568, 375x667, 390x844, 667x375, 768x1024, 1024x768, 1366x768 e 1920x1080. Exercitar larguras intermediárias por redimensionamento contínuo e zoom a 200% em desktop. Cobrir Chrome/Edge e Firefox desktop, Safari desktop quando disponível, Safari no iPhone e Chrome Android. Quando um navegador/aparelho não estiver disponível, registrar a pendência em vez de declarar cobertura.

- **CA-45:** todas as telas são utilizáveis na matriz, com nomes longos, placar, três cartas e avisos ativos; sem corte ou rolagem horizontal global inesperada. Desktop usa o espaço adicional de forma legível.
- **CA-46:** redimensionar durante uma partida não reinicia animações já concluídas nem perde seleção/estado, não cria ações duplicadas e mantém o cabeçalho fixo do histórico utilizável com teclado/zoom.

## 18. V2-14: risco dourado proporcional ao título

**Pedido confirmado:** o pequeno risco dourado abaixo do título acompanha o tamanho do título em cada tela, preservando sua identidade visual.

**Decisão de especificação:** largura igual à caixa de layout do texto do título, sem incluir botões, margens ou largura total do cabeçalho. Espessura, cor e distância vertical permanecem consistentes. Usar medida real/layout, não estimativa pelo número de caracteres. Recalcular ao carregar a fonte e ao mudar texto, tamanho de fonte ou viewport. Em título quebrado, acompanhar a largura da caixa que contém as linhas e aparecer abaixo da última linha. Não sobrepor o botão Voltar.

- **CA-47:** títulos curtos/longos, fonte ampliada e carregamento da fonte ajustam o risco; a largura não inclui ações ao lado. Conferir todas as telas com esse elemento, nativas e web.

## 19. V2-15: câmera para entrar por QR code

Adicionar botão "Ler QR code" em Entrar na sala, junto da entrada por código e listagem pública. Ao tocar, pedir permissão de câmera e abrir leitor com câmera traseira por padrão, enquadramento e ação Fechar/Voltar. Não solicitar permissão ao simplesmente entrar na tela. Interromper câmera ao fechar, sair da tela ou colocar app em segundo plano.

Reutilizar o formato de QR que o lobby já produz: conferir parser e links existentes antes de implementar. Aceitar somente código/link Decky válido conforme contrato de sala. QR arbitrário não abre URL externa nem executa conteúdo. Não tratar leitura como autorização: reaproveitar a operação oficial de entrada, que revalida sala, capacidade e fase no servidor e trata visibilidade/papel conforme o fluxo existente.

Pausar novas leituras após um QR aceito e enquanto a entrada estiver em andamento; frames repetidos geram no máximo uma tentativa por vez. QR inválido permite tentar outro; sala cheia/iniciada/inexistente mostra erro curto e permite retomar o leitor ou digitar o código. Permissão negada/bloqueada e câmera indisponível oferecem orientação e mantêm entrada manual.

**Decisão de especificação:** incluir também o navegador quando `getUserMedia` estiver disponível em HTTPS e houver câmera. No computador, câmera ausente é estado suportado, sem impedir entrada manual. Selecionar biblioteca compatível com o Expo instalado, por exemplo Expo Camera, após verificar a versão; incluir permissões/config plugin e rebuild nativo necessários. Não enviar imagens da câmera a servidor nem manter gravação.

- **CA-48:** duas sessões reais, uma exibindo QR do lobby e outra lendo dentro do Decky, entram uma única vez na sala correta; cobrir Android e web móvel e registrar iOS quando disponível.
- **CA-49:** permissão negada, câmera ausente, QR inválido/externo, frames repetidos e sala removida/cheia têm tratamento; fechar libera a câmera e o código manual segue funcional.

## 20. Complemento V2-02: direção visual da landing

**Pedido confirmado:** entrada semelhante à hierarquia do site Bootstrap: primeira seção dá destaque imediato à versão atual e download; quem rolar encontra apresentação do projeto com imagens de demonstração relacionadas às seções. A identidade continua sendo Decky, com fundo escuro, dourado, tipografia e logo existentes. Não copiar marca, textos ou assets do Bootstrap nem obrigar instalação desse framework.

Estrutura proposta:

1. **Primeira seção:** logo, nome Decky, uma frase curta sobre Truco presencial, versão estável atual visível, botão principal "Baixar para Android" e secundário "Jogar no navegador". Em alturas usuais de celular/desktop, download e versão aparecem antes da rolagem. Em viewport muito baixa ou com fonte ampliada, manter acesso por rolagem sem cortar o conteúdo.
2. **Partidas presenciais:** explicar rapidamente Duelo/Duplas e mão privada com screenshot real da tela de jogador.
3. **Uma mesa para o grupo:** demonstrar modo mesa com screenshot da mesa e imagem complementar da mão no celular, sem sugerir que mãos privadas são compartilhadas.
4. **Entre e jogue:** sala, QR e descoberta pública, com imagem do lobby/entrada. Destacar que a partida precisa de internet.
5. **Sua evolução:** MMR/Elos e histórico, com captura das telas V2 e textos breves, sem prometer funcionalidades fora do escopo.
6. **Sobre o projeto e rodapé:** contexto SENAI, equipe/créditos, link do repositório, acesso ao download e páginas informativas de suporte/privacidade exigidas para autenticação/distribuição. Informar o reset de lançamento de forma clara no período correspondente.

Usar screenshots reais da V2 validada com contas/dados de demonstração identificados, sem e-mails pessoais, tokens, informações de autenticação ou segredos. Frames de aparelho são opcionais; texto alternativo útil, imagens responsivas sem distorção, dimensões reservadas contra saltos de layout, compressão e lazy loading abaixo da primeira seção. Em desktop, alternar texto/imagem quando melhorar leitura; em celular, empilhar com ordem coerente e texto breve.

Versão e todos os botões Android usam o mesmo `site/version.json` da seção 5, incluindo CTAs repetidos no rodapé. Não colocar imagem de versão que fique desatualizada. Em falha/manifesto inválido, mostrar indisponibilidade temporária, manter o acesso web e não oferecer link inventado. Em iPhone, priorizar "Jogar no navegador" e identificar claramente APK como exclusivo Android; não sugerir instalação de APK no iOS. Preservar acesso web também no computador. Não mudar a hospedagem do jogo.

- **CA-50:** primeira seção apresenta versão real e CTA adequado à plataforma, sem depender de ler o restante; todos os downloads usam o manifesto e apontam ao artefato validado.
- **CA-51:** rolar revela seções com screenshots correspondentes e sem dados privados; página funciona em celular/desktop, teclado e fonte ampliada, respeita `/Decky/` e mantém imagens/CTAs utilizáveis quando falha o manifesto.

## 21. Fontes e situação desta revisão

Referências consultadas em 23/10/2026 para orientar requisitos; conferir novamente versões do SDK e interfaces dos painéis ao implementar:

- [Supabase: Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
- [Supabase: autenticação por senha](https://supabase.com/docs/guides/auth/passwords) e [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).
- [Supabase: SMTP personalizado](https://supabase.com/docs/guides/auth/auth-smtp).
- [Supabase: deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) e [vinculação de identidades](https://supabase.com/docs/guides/auth/auth-identity-linking).
- [Bootstrap, referência de hierarquia da landing](https://getbootstrap.com/).
- Código consultado publicamente: `DeckyV2Spec.md`, `app.json` e `docs/RANKING.md` na main. O clone por Git falhou por indisponibilidade do proxy deste ambiente; esta revisão não afirma uma nova inspeção completa do código nem execução dos testes do app.

Entrega desta revisão: especificação consolidada preparada no workspace. Na entrega documental original, nenhum reset, cadastro de provedor, migration, alteração de app, build, release, deploy ou publicação no GitHub foi executado. Atualização em 23/10/2026: fórmula/faixas aprovadas explicitamente por Saker; configurações externas posteriores estão registradas em `docs/PREPARO_V2.md`.

Observação de estado em 24/10/2026: o parágrafo anterior descreve a entrega documental original, não a continuação autorizada que publicou web/backend e instalou o APK build 7. As provas e as pendências atuais estão em [docs/VALIDACAO_V2.md](docs/VALIDACAO_V2.md); a ordem de retomada e os bloqueios estão em [docs/PREPARO_V2.md](docs/PREPARO_V2.md). Os requisitos e critérios acima foram preservados.
