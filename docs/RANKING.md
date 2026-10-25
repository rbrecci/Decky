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

## Identidade visual dos 13 símbolos de Elo

O planejamento de 24/10/2026 foi seguido pela geração e integração autorizadas por Saker. Em 25/10, Saker aprovou a prancha mais detalhada e a substituição dos 13 PNGs pelos símbolos refinados. Os arquivos atuais estão em `assets/ranks/`, de `beta-1.png` a `sigma-3.png` e `omega.png`. `src/ranking/EloBadge.tsx` continua selecionando os mesmos nomes pelo título retornado por `eloForMmr`, e `app/ranking.tsx` exibe a arte nas duas modalidades. Nomes, divisões, faixas e cálculo acima permanecem iguais.

### Direção vigente aprovada: símbolos refinados

A prancha detalhada aprovada é a referência vigente. Ela usa metal, biséis, facetas e gravações decorativas em relevo 2.5D controlado, preservando os naipes e a ordem Beta, Delta, Alfa, Sigma e Omega. Beta tem ouros facetado em moldura metálica; Delta tem espadas marfim com gravações e contorno de metal; Alfa tem copas vermelha facetada entre cartas decoradas; Sigma tem paus dourado facetado com cartas; Omega reúne os quatro naipes numa coroa dourada gravada. Divisões continuam com uma, duas ou três barras, e Omega não tem barras.

As restrições do brief flat inicial, como não usar relevo, textura, biséis ou detalhes de carta, são históricas e não devem achatar ou substituir essa direção aprovada. Para uma extração futura, usar a prancha refinada e preservar materiais, geometria e contagem das marcas, removendo apenas fundo e rótulo externo. Não redesenhar os emblemas como naipes planos.

### Geração e conferência da versão refinada

Os 13 PNGs refinados foram extraídos individualmente pela ferramenta integrada `image_gen`, com transparência real, e substituíram os arquivos nos mesmos caminhos de `assets/ranks/`, sem alteração de TypeScript. Cada arquivo tem 1254x1254 px, formato RGBA e alfa de 0 a 255; o conjunto atual soma 15.583.100 bytes. Os pixels dos originais gerados foram preservados. A prancha escolhida está na cópia privada `.expo/validation-v2/elo-refined-approved-board.png`; os prompts reais estão em `elo-refined-generation-prompts.json`, no mesmo diretório.

A galeria privada `.expo/validation-v2/elo-refined-gallery.png` foi inspecionada com amostras de 44 e 64 px. Os naipes e as marcas de divisão foram identificados nesses tamanhos. Uma análise somente leitura dos componentes conectados do canal alfa, com limiar de 240 na faixa inferior das imagens, confirmou uma, duas e três barras nas 12 artes divididas; Omega foi conferido visualmente sem barra. Metadados em `.expo/validation-v2/elo-refined-assets.json`. O ZIP atual `.expo/validation-v2/decky-elos-refinados-13-png.zip` tem 14.756.193 bytes e contém os 13 PNGs idênticos aos fontes, com integridade conferida.

`node .expo/validation-v2/elo-refined-ranking-check.cjs` retornou exit 0 em oito verificações, sem erros de página, em `2026-10-25T04:46:50Z` (`25/10 às 01:46 BRT`). A captura `elo-refined-ranking-390.png`, no mesmo diretório privado, foi inspecionada com os novos símbolos em 44/64 px. As exportações web e Android retornaram exit 0; o bundle Android contém os 13 PNGs refinados entre seus 96 assets. Os hashes SHA-256 dos 13 arquivos exportados para web coincidiram com os fontes. Os 13 assets refinados foram enviados ao GitHub no commit `d92bba1`, com autoria de Saker. Essas conferências foram justificadas pela substituição dos PNGs, sem repetir os testes de lógica anteriores de 15/15 ou de skeletons de 38/38, pois não houve alteração TypeScript.

O componente mantém `contain`, 64 px na classificação pessoal e 44 px na lista, com os mesmos espaços nos skeletons. O nome textual de Elo/MMR continua adjacente; a arte é decorativa para leitura assistiva. Legados abaixo de 500 continuam sem imagem, e ausência de partidas continua em Beta 1/500. As provas antigas de lógica não foram repetidas para essa troca exclusiva dos PNGs. As novas conferências de arte não equivalem a um APK instalado ou à publicação da web: os artefatos públicos continuam anteriores às novas artes.

### Histórico: primeira versão flat

A primeira versão, agora substituída, foi produzida por `image_gen` com cinco bases a partir da prancha flat: Beta 1, Delta 1, Alfa 1, Sigma 1 e Omega. Oito edições das bases produziram as divisões 2 e 3, pedindo alterar somente a quantidade de barras. Os prompts antigos estão no arquivo privado `.expo/validation-v2/elo-generation-prompts.json`. Os originais flat foram preservados em `.expo/validation-v2/elo-original-pngs/` e no histórico Git, para comparação A/B. O roteiro inicial previa Gemini, mas Saker depois autorizou a geração pelo agente.

O conjunto flat anterior tinha 13 PNGs de 1254x1254 px, RGBA e alfa de 0 a 255, somando 6.605.417 bytes. A saída diferia dos 512x512 pedidos no brief; os arquivos originais foram preservados, sem alterar seus pixels por Python. A integração inicial estabeleceu os tamanhos 64/44, leitura assistiva decorativa, legado sem badge e fallback Beta 1/500, mantidos pela substituição refinada.

`node .expo/validation-v2/elo-ranking-check.cjs` retornou exit 0 em oito verificações locais, com backend simulado. Conferiu 14 imagens na tela, correspondentes aos 13 assets mais a classificação pessoal, todos decodificados em 1254x1254, dimensões de exibição 64/44, semântica decorativa, ausência de ícone no legado 490, fallback Beta 1/500 e ausência de overflow em 320x568, 390x844, 667x375 e 1366x768. Os testes de ranking e loading passaram 15/15; typecheck e exportações web/Android retornaram exit 0. O bundle Android incluiu os 13 PNGs entre seus 96 assets. Fonte, imagens e ajustes dos mocks de teste foram enviados no commit `789c16b`, com autoria de Saker. A galeria `.expo/validation-v2/elo-gallery.png` e a captura `elo-ranking-390.png` foram inspecionadas e permanecem ignoradas. O ZIP opcional `.expo/validation-v2/decky-elos-13-png.zip`, de 5.176.169 bytes, contém os 13 PNGs e também fica ignorado.

A inspeção anterior de 24/32 px reconheceu as famílias flat, com um limite: as barras de Beta 3 ficavam finas em 24 px. Essa observação pertence à versão flat, não é prova da legibilidade da versão refinada em 24 px. O nome textual adjacente permanece obrigatório. O APK público 2.0.0/build 7 continua sem os símbolos novos.

### Direção do brief inicial flat, somente histórica

A sequência acompanha a força real das manilhas: ouros < espadas < copas < paus, conforme [RULES.md](RULES.md). Assim, Beta usa ouros, Delta usa espadas, Alfa usa copas e Sigma usa paus. A evolução também muda construção, massa e silhueta: Beta é um losango compacto de um plano; Delta é vertical e agudo, com duas facetas largas e base em V; Alfa fica mais largo, com a copa sobre duas formas curtas de cartas chanfradas; Sigma abre um leque de três cartas sob um paus maior; Omega reúne os quatro naipes em coroa. Não basta recolorir um naipe simples com barras para representar os cinco patamares.

As divisões 1, 2 e 3 acrescentam uma, duas ou três barras curtas na mesma base, com tamanho, cor e espaçamento constantes entre todas as famílias. Dentro de cada família, toda a construção permanece igual entre divisões; somente a contagem das barras muda. A progressão entre Elos precisa aparecer também em uma única cor, pelas facetas, camadas e recortes grandes, sem depender de textura ou detalhes pequenos.

Omega é único, sem número ou barras de divisão: uma coroa feita dos próprios naipes, com paus no topo central, espadas à esquerda, copas à direita e ouros formando a base. As formas se unem em uma silhueta compacta, sem quatro miniaturas dentro de um medalhão. Uma mandala com miolos pequenos perderia os naipes em 24 px; não seguir essa direção. A coroa precisa conservar os recortes dos naipes, em vez de virar uma coroa real genérica.

A identidade parte do logo e da [paleta do app](../src/ui/theme.ts): creme `#FBF6EC`, vermelho `#C8102E`, metal `#9A9EA5`, tinta `#16181B` e ouro envelhecido `#C9A45C`. Beta usa metal; Delta, creme; Alfa, vermelho com borda creme para destacar no fundo escuro; Sigma, ouro envelhecido; Omega, ouro e creme. Contornos seguem a tinta escura do logo. Não usar `#EBC66E`, reservado à manilha. A cor é apoio: cada família e a contagem das divisões precisam continuar legíveis em uma única cor.

### Prompt mestre flat, somente histórico

Este é o brief flat inicial, preservado para comparação e histórico, sem precedência sobre a prancha refinada aprovada. Não o usar para substituir as artes atuais ou repetir a geração de todos os arquivos em uma retomada. Na execução flat, as oito edições de divisão pediam manter o desenho e alterar somente a contagem das barras. A versão refinada tem sua referência e seus prompts registrados acima.

```text
Crie uma única insígnia de Elo para Decky, jogo de Truco Paulista. Siga o brief no fim deste pedido. Entregue um PNG RGBA de 512 x 512 px, com fundo realmente transparente, sem quadrado branco, cenário ou quadriculado desenhado. Não crie uma prancha com várias insígnias.

O desenho deve parecer parte de uma família de naipes de baralho: formas chapadas, curvas e pontas limpas, silhueta forte, poucos planos de cor e contorno firme. Precisa ser reconhecível quando reduzido para 24 e 32 px. Mantenha toda a arte nos 80% centrais da tela, sem cortar pontas. Não use filetes ou vãos menores que aproximadamente 32 px na arte de 512 px. Sem textura, relevo 3D, brilho externo, sombra projetada ou gradientes pesados.

Use a cor principal indicada no brief e contorno #16181B; creme #FBF6EC pode dar contraste. Alfa deve ter borda creme. Omega combina ouro #C9A45C e creme. Não use o amarelo #EBC66E. Preserve a silhueta reconhecível mesmo sem cor.

As famílias precisam mostrar evolução estética real: Beta é compacto e simples, de um plano; Delta é mais vertical e agudo, com duas facetas largas e base em V; Alfa é mais largo, com uma copa entre duas formas curtas de cartas chanfradas; Sigma tem um paus maior acima de um leque de três cartas curtas; Omega une os quatro naipes em coroa. As formas de carta são planos geométricos largos de suporte, sem índices, letras, mini-naipes ou filetes. Não as transforme em asas. Os contornos externos e vãos largos devem distinguir esses patamares mesmo em uma única cor; as camadas não podem existir só como linhas internas que somem ao reduzir.

Nas famílias Beta, Delta, Alfa e Sigma, o naipe central continua sendo a forma dominante. A divisão é indicada somente por uma, duas ou três barras retangulares curtas sob toda a construção, separadas dela, na mesma linha e centradas. Todas as barras são creme #FBF6EC com contorno #16181B; mantenha 48 x 32 px por barra e 32 px de vão na arte de 512 px. Não transforme as barras em texto ou números. Forma, camadas, escala, posição e peso visual ficam iguais entre as três divisões da mesma família. Se houver referência aprovada dessa família, altere apenas a quantidade de barras.

Omega não tem barras de divisão. Sua coroa é construída pela união dos quatro naipes descrita no brief, com recortes amplos. Não desenhe uma coroa comum decorada com quatro símbolos minúsculos.

Sem letras, palavras, números, símbolos gregos, marca-d'água, cartas completas com índices ou molduras finas, escudo militar ou asas. Permita somente as formas curtas derivadas de cartas pedidas para Alfa e Sigma e a base angular de Delta. Não copie insígnias, cores de progressão ou composições de Rocket League ou de outro jogo. O nome do brief serve só para identificar o pedido, nunca deve aparecer na imagem.

BRIEF: cole aqui um único item da lista abaixo.
```

### Briefs individuais flat, somente históricos

- **Beta 1:** um losango de ouros, compacto e simétrico, quatro pontas firmes, metal `#9A9EA5`; uma barra na base.
- **Beta 2:** o mesmo ouros de Beta 1, sem acrescentar ornamentos; duas barras na base.
- **Beta 3:** o mesmo ouros de Beta 1, com a mesma escala e silhueta; três barras na base.
- **Delta 1:** espada alta de baralho, creme `#FBF6EC`, com dois ombros recortados, duas facetas largas chapadas e base curta em V derivada de cantos de carta. Silhueta vertical mais aguda que Beta, sem arma real ou moldura fina; uma barra sob a construção.
- **Delta 2:** toda a construção de Delta 1, com a mesma espada, facetas e base em V; duas barras na base.
- **Delta 3:** toda a construção de Delta 1, sem aumentar pontas ou criar camadas novas; três barras na base.
- **Alfa 1:** copa larga de dois lóbulos, vermelho `#C8102E` com borda creme, à frente de duas formas curtas de cartas chanfradas. Os cantos amplos aparecem dos dois lados, mantendo leitura de cartas e copa, sem parecer asas. Construção mais larga e estratificada que Delta; uma barra sob o conjunto.
- **Alfa 2:** toda a construção de Alfa 1, preservando a copa e exatamente duas formas de carta; duas barras na base.
- **Alfa 3:** toda a construção de Alfa 1, com a mesma largura, recortes e camadas; três barras na base.
- **Sigma 1:** paus grande de três lóbulos, ouro envelhecido `#C9A45C`, encimando um leque de exatamente três cartas curtas abertas. Cantos chanfrados e separações amplas formam uma silhueta trilobada mais robusta que Alfa, com massa no topo e abertura na base; uma barra sob o conjunto.
- **Sigma 2:** toda a construção de Sigma 1, preservando o paus e exatamente três cartas em leque; duas barras na base.
- **Sigma 3:** toda a construção de Sigma 1, sem aumentar a quantidade de cartas ou criar adornos; três barras na base.
- **Omega:** coroa compacta dos quatro naipes, ouro envelhecido e creme: paus central mais alto, ponta de espadas à esquerda, dois lóbulos de copas à direita e losango de ouros formando a base. Integrar as formas em uma silhueta só, equilibrada apesar dos lados diferentes, com recortes amplos. Sem círculo externo, joias, raios, miniaturas ou barras de divisão.

### Critérios do brief flat, somente históricos

Conferir os 13 PNGs juntos e em tamanho real de 24 e 32 px, sobre o fundo `#0A0A0B` do app e sobre creme. Primeiro comparar uma arte de cada Elo sem barras e sem cor: a evolução de losango simples para espada facetada, copa com duas cartas, paus com três cartas e coroa precisa continuar clara. Depois conferir se cada divisão permite contar as barras. As facetas e cartas devem reforçar a hierarquia, sem competir com o naipe; se sumirem em 24 px, aumentar os recortes e reduzir detalhes, em vez de aceitar ornamento só visível na arte grande. Se Omega perder os quatro traços de naipe ao reduzir, simplificar os recortes da mesma composição antes de aprová-lo; não compensar aumentando só o brilho.

Na versão flat, foram conferidos canal alfa, ausência de texto, margens, contornos e marcas. Uma prévia grande bonita não aprovava a versão pequena; o limite de Beta 3 em 24 px foi registrado. Os mesmos nomes de arquivo continuam na integração refinada, mas essas provas antigas não substituem a conferência da nova arte. Os originais escolhidos de cada etapa permanecem disponíveis para comparação, sem placeholders vazios.

## Transação e auditoria

A modalidade e a participação no ranking ficam congeladas na criação da partida. Ao finalizar, o trigger trava os ratings dos participantes em ordem estável, captura as médias antes de escrever qualquer saldo e registra o extrato na mesma transação do resultado.

`match_ratings` registra `points_before`, `points_delta` real, `points_after`, `nominal_delta`, `rating_rule = decky-v2-step5`, `winner_average` e `loser_average`. A chave única por partida/jogador e a idempotência de ação impedem pontuação repetida. Falha posterior no commit reverte resultado e ratings integralmente.

O cliente não escreve ratings nem calcula seu próprio saldo. Partidas em andamento não recebem resultado presumido. Mesa, abandono e desconexão não geram pontuação nova por si sós. Excluir a sala mantém partidas e notas.

## Histórico e notas

`get_my_match_history(p_limit, p_offset)` retorna somente partidas da identidade atual, ordenadas por início e ID. O app pede seis registros, mostra cinco e usa o sexto para detectar próxima página. Não existe teto de cinquenta partidas na navegação.

`get_my_notes_page(p_limit, p_offset)` retorna notas do autor por criação e ID, já associadas aos metadados e ao extrato autorizado da partida. A página de notas é independente da página de partidas. O CRUD mantém RLS por autor e participação.

## Atualização da base e virada

A migration nova é `supabase/migrations/20261023230536_v2_mmr_public_rooms_history.sql`. Ela não altera migrations anteriores e não executa reset. Cria ratings ausentes em 500, sem sobrescrever saldos existentes. Registros antigos mantêm `rating_rule` e campos novos de auditoria nulos.

A constraint `player_ratings_mmr_floor` foi criada como `NOT VALID` para proteger novas escritas antes da limpeza dos dados antigos. Na virada de 24/10/2026, foi validada depois da exclusão dos dados de usuários/jogo, com `convalidated=true` conferido por SQL independente. O piso dos novos resultados é aplicado desde a migration.

Em 24/10/2026, a migration V2 foi aplicada e `start-match` e `submit-action` foram publicadas na versão 14. A web V2 também foi publicada. Os registros anteriores do ranking V1, com inicial 1000 e K=32, são históricos: o PR #2 e a publicação web `mrjm92m7r8` não comprovam a V2. As evidências atuais estão em [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md).

Além do ensaio PGlite de uma conexão, duas conexões PostgreSQL reais comprovaram corrida pela última vaga, serialização de MMR, reenvio e rollback. Realtime entre duas identidades, consultas autenticadas, partida finalizada e seu extrato foram exercitados no Supabase hospedado com contas sintéticas segregadas. A virada global foi executada em 24/10/2026 às 17:07 BRT, sem backup novo por dispensa expressa de Saker e preservando as cópias anteriores. SQL independente comprovou a exclusão dos dados antigos; a QA posterior confirmou 500 MMR nas duas modalidades e histórico vazio. O serviço foi reaberto às 17:10 BRT. Procedimento, evidências e limites estão em [VIRADA_V2.md](VIRADA_V2.md).
