# Decky V2: especificação de atualização

Data: 23/10/2026. Solicitante: Saker. Repositório: [rbrecci/Decky](https://github.com/rbrecci/Decky).

Estado: especificação para implementação futura. Nenhuma funcionalidade descrita aqui foi implementada por esta entrega documental.

Base inspecionada: branch `main`, commit `72a86f47ffa603cd7730b4eb337a71ddf58125ff`. Conferir novamente os caminhos e contratos antes de implementar caso o repositório tenha avançado.

## 1. Objetivo e leitura deste documento

Corrigir a carta oculta, reduzir textos explicativos nas telas, separar pontuação MMR de títulos de Elo, permitir descoberta de salas públicas, melhorar o histórico e estabelecer uma página estável de distribuição e atualização do app.

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

O botão sempre aponta para a versão mais recente publicada para instalação. O responsável pela release fornece o link real, por exemplo do APK da release ou da build distribuída. Não usar URL fictícia nem link temporário sem verificar sua duração. Acesso ao app web existente pode aparecer como ação secundária.

**Decisão de especificação:** fontes estáticas em `site/`, com publicação somente desse diretório por GitHub Actions. Evita publicar toda a documentação de `docs/` e mantém a landing separada do bundle Expo em `dist/` e da hospedagem web existente. Arquivos previstos: `site/index.html`, estilo local, `site/version.json` e workflow em `.github/workflows/`. Não adicionar framework de site para essa página simples.

Endereço esperado, sujeito à configuração real do Pages: `https://rbrecci.github.io/Decky/`. Não tratar esse endereço como publicado antes de verificar o deploy. Recursos devem respeitar o prefixo `/Decky/`.

O GitHub Pages hospeda conteúdo estático e permite publicação por branch ou workflow. A opção por Actions acima é uma decisão para este projeto. Referências oficiais: [sobre o Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) e [configurar a origem de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

### 5.2. Uma fonte para a versão mais recente

**Decisão de especificação:** manter `site/version.json` como fonte única para a landing e a consulta do app. Ao atualizar a release, editar esse arquivo uma vez. A landing não deve ter outro link de download que possa ficar desatualizado.

Contrato proposto para Android, ainda sem valores de release:

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
- Mostrar título e divisão junto da pontuação no Ranking, tanto no próprio perfil quanto nas linhas de jogadores. Exemplo de formato, sem definir faixa: `Delta 2 · 1234 MMR`.
- Manter MMR e Elo independentes entre Duelo e Duplas, como os rankings atuais.
- Não zerar pontuação, recalcular partidas antigas, juntar modalidades nem alterar a fórmula existente por causa da renomeação.
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

### 7.3. Decisão de produto ainda necessária

**Pendente de produto:** os 12 limites de transição entre as 13 classificações não foram informados. Também não foi definido em qual classificação o MMR inicial de 1000 deve cair. Não publicar faixas arbitrárias como se tivessem sido aprovadas.

Ao retomar essa frente, apresentar uma tabela de limites completa para decisão do usuário antes de implementar a classificação. A tabela deve cobrir o domínio real de MMR sem lacunas nem sobreposições, incluindo valores abaixo do primeiro corte e todos os valores acima do corte de Omega. Não introduzir piso de MMR apenas para encaixar faixas sem antes verificar o domínio aceito pelo banco.

**Decisão de especificação:** título derivado do MMR atual, com promoção e rebaixamento imediatos após resultado confirmado. Sem temporada, série de promoção, proteção contra queda ou recompensa. Se o usuário desejar essas regras, elas exigem especificação própria.

É possível implementar a troca de rótulos para MMR sem a tabela. A entrega completa de Elos fica bloqueada pela definição das faixas; esse bloqueio não impede as demais frentes.

### 7.4. Critérios de aceite

- **CA-16:** pontos numéricos são rotulados como MMR em todas as telas; posição no ranking continua sendo posição, e Elo passa a ser o título.
- **CA-17:** os 13 títulos respeitam a sequência acima; Omega nunca aparece como Omega 1, 2 ou 3.
- **CA-18:** após aprovação dos cortes, testar cada limite imediatamente abaixo, no limite e imediatamente acima; testar início em 1000 e valores extremos válidos.
- **CA-19:** vencer/perder atualiza MMR e título pela resposta oficial; erro ou ação reenviada não concede promoção adicional.
- **CA-20:** pontuação, histórico de variações, separação 1v1/2v2 e garantias de escrita no servidor permanecem preservados.

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
- Preservar criação, leitura, edição e exclusão de notas e o isolamento por autor. Resultados antigos continuam com a identificação "Anterior ao ranking"; variações novas passam a usar MMR.

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

Frente pronta para detalhar ao retomar: escrever os testes que refutam a força/revelação da carta oculta; executar e guardar a falha; implementar no motor e servidor; ajustar apresentação do descarte e documentação das regras; aplicar a matriz de textos. Preservar proibição na primeira vaza e comprovar 1v1/2v2, privacidade e persistência. Trocar rótulos numéricos para MMR sem inventar os limites de Elo.

### Fase 2: descoberta pública de salas

Criar migration compatível e contrato mínimo de descoberta, com RLS e canal de atualização definidos juntos. Implementar seletor de visibilidade, listagem e fluxo de entrada. Validar concorrência da última vaga e sincronização com mais de uma sessão. Publicar backend compatível antes do cliente dependente.

### Fase 3: histórico e títulos

Implementar paginações, cabeçalho e skeletons com estados independentes e metadados de notas sem dependência da página de partidas. Após decisão das faixas, adicionar classificação dos 13 títulos e testar todos os limites, sem alterar os saldos existentes.

### Fase 4: distribuição e atualização

Implementar landing, manifesto e consulta de atualização. Gerar uma release coerente com a versão/build, conferir o link e configurar Pages. Validar separadamente página publicada, detecção em app anterior e instalação Android. O app web continua no fluxo de hospedagem existente.

Na virada de cada fase: registrar resultado e desvios, atualizar documentos vivos e retirar apenas rascunhos efetivamente substituídos após conferir referências. Não mover esta especificação para `discarted/` enquanto houver requisitos pendentes.

## 11. Estratégia de verificação

Nenhum teste de funcionalidade foi executado para declarar esta especificação implementada. Os comandos abaixo são checks planejados para a implementação.

| Frente | Evidência exigida |
|---|---|
| Motor, validação, consultas e transformação de dados | Teste de comportamento novo falhando antes da alteração, output preservado; depois teste passando |
| Carta oculta | Motor + fluxo SQL/serviço + inspeção da projeção pública + conferência visual do descarte |
| Salas | Migration sobre banco existente + permissões + concorrência + duas sessões acompanhando a lista |
| MMR/Elos | Preservação dos cálculos existentes + testes de fronteira após faixas aprovadas |
| Histórico/notas | Paginação real, CRUD, autorização, dados fora da página e respostas fora de ordem |
| Layout e textos | Screenshots em celular pequeno, orientação suportada e web; conferir textos removidos e cabeçalho fixo |
| Atualização | Comparação de versões/builds, falhas de rede, botão e manifesto publicado |
| Distribuição | Workflow Pages, URLs reais, download público e instalação por cima no Android |

Rodar os testes pertinentes pelo runner já existente, `npm run typecheck` e, nas mudanças de interface, `npm run build:web`. Não instalar dependências para testes que a stack atual já suporta. Checks locais não substituem validação autenticada no Supabase e em aparelhos; registrar essas limitações se não forem executadas.

Antes de entregar código, comparar o diff com esta especificação e varrer os arquivos alterados automaticamente pelos códigos Unicode U+2014, U+2013 e U+2212. Em Git Bash, usar `LC_ALL=C.UTF-8 git grep -nP "[\x{2014}\x{2013}\x{2212}]"` com os caminhos/extensões alterados e conferir o exit code: 1 é limpo, 0 indica ocorrência, 2 indica falha no comando. Incluir arquivos novos na conferência; `git grep` padrão não cobre arquivo ainda não rastreado.

## 12. Pendências e limites de escopo

### Decisão que exige o usuário na retomada

Definir os 12 cortes de MMR e a classificação inicial de quem começa em 1000. Sem isso, não considerar a frente de títulos concluída. As demais interpretações deste documento estão explicitadas como decisões de especificação para permitir revisão sem perguntas antecipadas.

### Verificações técnicas antes de publicar

Conferir configuração e permissões reais do Pages, origem pública do artefato, versão/build instalada e assinatura Android. Verificar APIs oficiais das versões instaladas ao implementar leitura da versão e abertura de links. Nenhum segredo, chave de serviço ou dado privado pode entrar na landing/manifesto.

### Fora do pedido

Sem redesenho completo do app, mudança da fórmula de pontuação, matchmaking automático, chat, temporadas, recompensas de Elo, troca de visibilidade após criação, atualização forçada ou instalação automática. Não criar uma segunda hospedagem do app web ao publicar a landing.

## 13. Critério de encerramento da V2

A V2 estará pronta quando os critérios CA-01 a CA-34 tiverem evidências registradas, as faixas de MMR tiverem sido decididas, o backend e os clientes compatíveis estiverem publicados e o fluxo real de atualização tiver sido conferido. Marcar separadamente o que foi implementado, testado localmente e verificado em produção. Não converter falta de teste em aprovação.

Esta entrega encerra somente a documentação: criação de `DeckyV2Spec.md`, revisão de cobertura e varredura automática do arquivo. Sua publicação no GitHub não representa conclusão das funcionalidades.
