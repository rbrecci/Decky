# Interface da V2

Estado: implementação local em 23/10/2026. Não houve publicação nem validação multiplayer em produção nesta frente.

Atualização em 24/10/2026: a web V2 publicada foi exercitada em Firefox e WebKit, com consultas de conta/jogo simuladas nas verificações autenticadas. As rotas públicas também foram abertas sem simulação e sem envio de formulários. A seção de validação adicional abaixo registra a correção encontrada e as provas; não comprova multiplayer nem Safari em aparelho Apple.

## Skeleton loading antes da próxima publicação

Implementação local adicional de 24/10/2026, posterior ao reset e à publicação da build 7. O componente compartilhado `src/ui/Skeleton.tsx` reserva áreas do conteúdo com os tons grafite existentes, pulso discreto e `ReduceMotion.System`. Um único progresso acessível identifica cada grupo ocupado; os blocos são decorativos, sem controles falsos nem anúncios repetidos. Não há atraso mínimo artificial para prolongar a carga.

Bootstrap de fontes/sessão, ranking, salas públicas, lobby, partida, histórico, edição de nota, callback OAuth e convite usam placeholders. O lobby não inventa vagas, modalidade ou espera pelo host antes da primeira leitura. Criação de notas e formulários já disponíveis continuam abertos diretamente. Ações de login, salvar, jogar e similares mantêm feedback nos botões, sem cobrir a tela inteira. A partida e o lobby já carregados não são substituídos por skeleton durante Realtime ou polling.

Ranking e histórico preservam a última leitura da mesma identidade e consulta durante refresh, inclusive em falha recuperável. Troca de usuário, modalidade ou página oculta resultados antigos imediatamente. A lista pública também conserva o último resultado em falha do polling; código manual e leitor QR continuam utilizáveis enquanto a lista inicial carrega. O retry da partida permite rolar em tela horizontal, após revisão encontrar que `scroll={false}` o deixava fora da área visível.

Testes vermelhos anteriores à implementação: seis falhas no hook e sete nas telas novas. Verde consolidado: 38 testes em quatro arquivos, typecheck e exportações web/Android, todos exit 0. O script privado `.expo/validation-v2/skeleton-web-check.cjs` passou 18 verificações locais no Edge/Chromium, sem erros de página, com backend simulado e movimento normal/reduzido. Larguras exercitadas: 320, 390, 667 e 1366 px. A pulsação variou apenas sem movimento reduzido; labels de progresso, blocos ocultos da árvore assistiva, preservação no refresh, negativos de vazio prematuro e retry alcançável em 667x375 foram conferidos. As capturas `skeleton-ranking-*.png` e `skeleton-game-*.png` foram inspecionadas; relatório e imagens ficam privados e ignorados.

Os artefatos publicados não mudaram: web anterior e APK 2.0.0/build 7. Não foi gerado APK nem feito deploy ou ensaio físico desses skeletons. Bundle Android não substitui prova no aparelho. Uma build posterior será necessária quando o lote de ajustes estiver pronto. O planejamento visual dos Elos está em [RANKING.md](RANKING.md); ainda não há artes novas ou integração. Aparência do e-mail de recuperação e landing permanecem para etapas seguintes, com landing por último.

## Entregas

- Início, criação e ranking sem os textos removidos na especificação. Papéis da criação exibem capacidade dinâmica de 2 ou 4 jogadores; modos usam Duelo e Duplas.
- Criação privada por padrão, seletor Pública/Privada e descoberta de salas públicas autenticada pela projeção `public_room_directory`. A listagem reutiliza `useLiveRefresh`: uma leitura por vez, invalidação por Realtime, recuperação por polling de 4 segundos e releitura no retorno do segundo plano. Entrada continua pela RPC oficial, inclusive depois de ler QR.
- Ranking mostra título/divisão de Elo e saldo em MMR. Saldos legados abaixo de 500 aparecem como `Anterior à V2`, evitando chamar o classificador fora do contrato. Nenhum saldo foi reescrito pela interface.
- Histórico tem cabeçalho fora da rolagem, Voltar com retorno ao início quando não existe tela anterior, cinco itens por seção e paginações independentes. A consulta recebe a página e usa o sexto registro somente para detectar continuação. Notas carregam seus metadados associados; não dependem da página de partidas.
- `usePagedList` bloqueia navegação repetida durante carga, descarta resultados antigos, separa dados por identidade, recua páginas vazias e permite recarregar cada seção. Skeletons estáticos, sem animação, aparecem durante carga inicial e troca de página. Erros e vazios são independentes entre notas e partidas.
- Extrato apresenta MMR anterior quando disponível, variação real e MMR após a partida. Registros da regra antiga permanecem identificados até a virada.
- `RuledTitle` mede a caixa real do texto em `onLayout`; o risco recebe essa largura, separado de ações como Voltar. A mesma apresentação é usada no encerramento da partida.
- Partida usa espaço adicional em duas colunas a partir de 1000 pixels. Em telas baixas, o conteúdo mantém uma altura utilizável com rolagem. O painel privado mede sua própria largura, e o fim de partida é rolável. Redimensionamento mantém os componentes montados, sem trocar chaves por viewport. Fonte ampliada pode aumentar a altura dos botões.
- Descarte oculto não executa mais revelação. Outros espectadores veem o verso; o dono continua podendo ver a informação da própria carta recebida na projeção privada.
- Leitor QR abre somente após a ação explícita. Pede câmera, trata ausência/permissão, usa câmera traseira e apenas QR, pausa após convite aceito e libera a câmera ao fechar, perder foco ou entrar em segundo plano. Código manual continua disponível. O parser aceita somente seis caracteres do contrato ou links `decky://invite` e `https://decky-brecci.expo.app/invite`, com um único parâmetro `code`; nenhum QR abre URL externa.
- Home inclui o componente de atualização preparado na frente de distribuição.
- A propriedade `caption` do botão ficou com zero chamadores após a remoção das descrições do início, confirmado por `rg 'caption=' app src`. O ramo, a propriedade e suas cores/estilo sem consumidores foram retirados. Os botões mantêm rótulo e dica de acessibilidade.
- Campos podem declarar `required` explicitamente. Apenas na web são encaminhados `required`, `aria-required` e o `name` derivado do identificador estável; o padrão não torna obrigatórios os demais campos.

## Evidências locais

Antes da implementação do parser e do hook, `npm test -- tests/app/qr.test.ts tests/app/paged-list.test.ts` retornou exit 1: `Tests 12 failed (12)`, com `Error: not_implemented` nos contratos ainda sem lógica. A tentativa anterior havia falhado por dependências ausentes, portanto não foi contada como teste vermelho funcional.

Depois da implementação e correção da ordem de renderização no harness, o mesmo comando retornou exit 0: `Tests 12 passed (12)`.

A regressão de saldo legado foi reproduzida antes da correção: `npm test -- tests/app/ranking.test.ts` retornou exit 1, com `RangeError: invalid_mmr` ao renderizar saldo 90. Após a identificação explícita de legado na UI, retornou exit 0 e oito testes passaram.

O comando `npm test -- tests/app/paged-list.test.ts tests/app/qr.test.ts tests/app/ranking.test.ts tests/app/history-web.test.ts tests/app/leave-game.test.ts tests/app/privacy.test.ts tests/app/table.test.ts` retornou exit 0 com sete arquivos e 80 testes passando antes da ampliação dos testes do hook. A ampliação adicionou independência entre as seções, acesso à página 11 e resposta fora de ordem; `npm test -- tests/app/paged-list.test.ts` retornou exit 0 com 11 testes passando.

Na repetição final do comando das sete suites, os 82 testes passaram, exit 0. `npm run typecheck` também retornou exit 0, sem diagnósticos.

## Verificação visual local

O Edge em modo headless executou a fixture local `/dev/preview` nas oito dimensões de 320x568, 375x667, 390x844, 667x375, 768x1024, 1024x768, 1366x768 e 1920x1080. Todos os resultados tiveram `horizontal: false`; a captura de erros de página retornou `errors: []`. A fixture usou nomes longos. Isso comprova a renderização local exercitada, não uma partida real entre aparelhos.

As capturas estão em `docs/evidencias-v2/jogador-<largura>x<altura>.png`, `mesa-390x844.png` e `mesa-1366x768.png`. As versões `jogador-landing.png` e `mesa-landing.png` mantêm os componentes reais e uma identificação de demonstração; somente a barra de controle da fixture foi escondida para apresentar o produto.

A refutação visual detectou que a mesa crescia dentro da área rolável e deixava a mão fora da primeira viewport de 390x844. O topo do jogador passou a receber altura explícita, calculada pela viewport e pela altura medida do painel privado. Depois da correção, as três cartas ficaram entre `top: 550.1875` e `bottom: 719.578125`, inteiras nessa viewport. A matriz de oito tamanhos foi repetida e passou novamente.

O teste de redimensionamento selecionou uma carta e mediu `aria-pressed` antes e depois da mudança de 390 para 1366 pixels: `BEFORE_RESIZE true` e `RESIZE_SELECTION true`. A primeira tentativa de observar `aria-selected` não demonstrava o estado, pois o React Native Web instalado não encaminhava o objeto `accessibilityState` para esse atributo. A carta agora declara `aria-pressed` explicitamente, e os botões declaram os estados ARIA de indisponibilidade e carga.

Com pedido de truco ativo, uma segunda passagem em 320x568, 667x375, 1024x768 e 1920x1080 retornou `horizontal: false` e `ERRORS []`.

As varreduras dos arquivos rastreados e dos novos arquivos desta frente retornaram exit 1, sem os códigos U+2014, U+2013 ou U+2212.

## Limites sem prova adicional nesta retomada

- Limites sem prova física adicional: ingresso QR web com identidade ainda fora da sala, recusa de cheia no leitor web, falta de câmera e contagem de frames. Saker encerrou pedidos adicionais de aparelhos nesta retomada; não solicitar outra rodada. No Redmi, o APK build 7 entrou por leitura óptica; o Chrome reentrou sem duplicar lugar. O APK mostrou erro tratado nos cenários de sala cheia e removida, e Saker relatou recusa do QR externo sem abrir site. Não houve código RPC coletado nem contagem de frames; detalhes abaixo.
- Realtime hospedado entre duas identidades, descoberta de sala pública e atualização de ocupação já foram comprovados depois da publicação do backend V2, conforme [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md). A matriz visual simulada abaixo permanece uma prova separada e não substitui esse ensaio real.
- A rodada adicional de fontes ampliadas, teclado e novo login por senha QA foi dispensada por Saker. Esses limites permanecem sem prova adicional; não reabrir o handoff nesta retomada. A matriz simulada, teclado físico e zoom nativo de aba não comprovam teclado virtual.
- Safari desktop/iPhone e os cenários móveis ainda nomeados continuam pendentes. Login Google completo, cancelamento por AndroidBack e leitura óptica com reentrada já foram observados no Chrome do Redmi; isso não aprova toda a matriz visual ou entrada web de outra identidade. Firefox e o motor WebKit foram exercitados em Windows; WebKit não equivale ao Safari instalado num iPhone.

## Validação adicional em 24/10/2026

Os runtimes Firefox 156.0 e WebKit 26.6 foram instalados no cache Playwright já disponível. Não foram adicionados às dependências do projeto. O script auxiliar `.expo/validation-v2/cross-browser.cjs` exercitou o bundle de `https://decky-brecci.expo.app`, com o backend inteiramente simulado nas telas autenticadas e a landing servida localmente sob `/Decky/`.

Cada motor abriu `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/auth/recovery` e `/auth/confirm` por GET real, sem login nem envio de dados: seis HTTP 200 por motor, conteúdo renderizado e zero erros JS. Os relatórios são `.expo/validation-v2/public-routes-firefox.json` e `public-routes-webkit.json`.

A primeira matriz WebKit completou as 88 medições de largura, mas terminou com exit 1 por `NotSupportedError: Permissions::query does not support this API`. O erro vinha da consulta automática de permissão de câmera ao montar `RoomScanner`, antes de o usuário abrir o leitor. A biblioteca instalada trata `TypeError` nessa consulta, mas não o `NotSupportedError` retornado por esse motor.

O teste comportamental novo usa o `createPermissionHook` real do Expo com operações de câmera simuladas. Antes da correção, `npm test -- tests/app/room-scanner.test.ts --maxWorkers=1` retornou exit 1: um teste falhou e dois passaram; a consulta de permissão foi chamada uma vez durante a montagem. Depois de configurar `useCameraPermissions({ get: false })`, `npm test -- tests/app/room-scanner.test.ts tests/app/qr.test.ts --maxWorkers=1` retornou exit 0, com seis testes aprovados. Eles conferem ausência de consulta/solicitação na montagem, solicitação pelo botão e tratamento de recusa/erro. `npm run typecheck` retornou exit 0.

Após a publicação dessa correção, `node .expo/validation-v2/cross-browser.cjs` retornou exit 0: Firefox e WebKit passaram em 88 verificações cada, com `pageErrors: []` e `tokenAutoConsumption: 0`. Os relatórios estão em `.expo/validation-v2/firefox-matrix/web-matrix.json` e `webkit-matrix/web-matrix.json`.

`node .expo/validation-v2/lobby-notes-cross-browser.cjs` retornou exit 0 em Edge 156, Firefox 156 e WebKit 26.6, com 20 verificações por motor. Cobriu oito larguras no lobby e no formulário de nota, QR do lobby, mudança de prontidão, título vazio recusado sem PATCH, edição usando Tab/Enter e digitação, cancelamento/confirmação de exclusão e criação pela navegação do histórico. O relatório `.expo/validation-v2/lobby-notes-cross-browser.json` registra zero erros JS e quatro escritas simuladas por motor. Nenhuma operação chegou ao Supabase real. As duas falhas iniciais do script eram do harness: comparação exata que ignorava o ícone do erro e abertura direta do formulário em vez da navegação real pelo histórico; não foram tratadas como bugs do produto.

`node .expo/validation-v2/zoom-real.cjs` retornou exit 0 em Chromium isolado. Uma extensão temporária de QA, carregada somente num perfil ignorado do teste, chamou `chrome.tabs.setZoom` e confirmou `chrome.tabs.getZoom = 2`. Não houve alteração de CSS para simular zoom. Em dez telas principais, `outerWidth=1366`, `innerWidth=675` e `devicePixelRatio=2`, sem overflow horizontal e sem erros JS. O botão Voltar do histórico permaneceu fixo após rolagem. O relatório está em `.expo/validation-v2/zoom-real/report.json`.

`node .expo/validation-v2/fixture-zoom.cjs` também retornou exit 0, usando a fixture local na porta 8087. Com zoom nativo de 200%, nomes longos, jogador sem mesa dedicada, pedido de truco e mesa dedicada, não houve overflow horizontal nem erros JS; a seleção da carta permaneceu após mudar o zoom. O painel da mão pôde ser alcançado por rolagem. A barra de controles da fixture foi ocultada somente para medir/capturar os componentes do jogo; os dados continuaram simulados. As capturas de zoom usam `Page.captureScreenshot` sem recorte, pois o helper de captura do Playwright recortava a imagem em coordenadas inadequadas para o zoom nativo. O relatório é `.expo/validation-v2/zoom-real/game-report.json`.

Consultei Modern Web Guidance para permissões de câmera; os resultados eram guias genéricos de segurança/privacidade e não acrescentaram regra aplicável a essa correção de uma opção do hook existente. A opção foi conferida no código instalado de `expo-modules-core/src/PermissionsHook.ts`. Para as ferramentas de QA, conferi a documentação oficial de [navegadores Playwright](https://playwright.dev/docs/browsers), [extensões em contexto isolado](https://playwright.dev/docs/chrome-extensions) e [zoom nativo de abas](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom).

## Regressão no diálogo de câmera do Android

Na validação física do APK V2 build 6 no Redmi, negar ou conceder a primeira permissão fechava o modal do leitor e devolvia a tela de entrada sem mostrar o resultado. Com a permissão já concedida, o toque seguinte abria câmera e modal normalmente. Os registros privados `camera-denied.xml` e `camera-after-grant.xml`, em `.expo/validation-v2/`, mostram a tela de entrada sem o modal depois das duas respostas.

O listener de `AppState` fechava o leitor durante a suspensão temporária da Activity pelo diálogo Android. Esse fechamento zerava `opening.current`; quando a resposta de permissão chegava, `start()` a descartava. A correção preserva o modal durante a solicitação pendente e controla separadamente se o aplicativo está ativo. `CameraView` só é montada no estado `active`, inclusive quando a resposta chega antes do retorno do diálogo. Depois de iniciada a leitura, ir para background continua fechando o modal e desmontando a câmera, sem reabrir automaticamente no retorno.

Antes da correção, `npm test -- tests/app/room-scanner.test.ts --maxWorkers=1` retornou exit 1, com `Tests 4 failed | 4 passed (8)`. Os quatro casos de concessão/negação, com retorno `active` antes/depois da resposta, falharam em `Modal.visible`: esperado `true`, recebido `false`. Depois, `npm test -- tests/app/room-scanner.test.ts tests/app/qr.test.ts --maxWorkers=1` retornou exit 0, com 11 testes aprovados. `npm run typecheck` retornou exit 0.

Os testes também exigem ausência de `CameraView` enquanto o app está em background e fechamento/desmontagem ao suspender uma leitura já iniciada. Não foi repetida a matriz inteira de navegadores porque a mudança se limita ao ciclo de vida da solicitação e a câmera continua sem consulta automática na montagem.

A correção foi validada fisicamente no Redmi com APK 2.0.0/build 7. `apksigner` confirmou o certificado da V1; `adb install` retornou `Success`, a versão/build instalada foi conferida e a sessão Google permaneceu após a atualização. Para repetir o primeiro uso, somente a permissão `CAMERA` e suas flags foram reiniciadas, sem limpar dados do aplicativo.

Ao negar a permissão, o build 7 manteve o modal aberto com `Permita a câmera para ler o QR`, `Tentar novamente` e `Fechar`. Os registros são `.expo/validation-v2/build7-denied.xml` e `build7-denied.png`. Ao tocar `Tentar novamente` e permitir, a câmera abriu sem exigir um segundo toque em `Ler QR code`; `.expo/validation-v2/build7-camera.xml` e `dumpsys media.camera` comprovaram o cliente `br.senai.decky` ativo na câmera 0. A regressão de concessão/negação está aprovada nesse aparelho e artefato.

A liberação em background também foi validada fisicamente no APK build 7: após Home, `dumpsys media.camera` retornou `Active Camera Clients: []`, registrado em `.expo/validation-v2/camera-background.txt`. Ao voltar ao aplicativo, o dump `camera-return-background.xml` confirmou a tela de entrada com `scannerClosedOnReturn=true` e `joinScreen=true`, sem reabertura automática do leitor. O leitor foi reaberto depois dessa prova para aguardar a leitura óptica.

Na retomada do mesmo dia, Saker leu fisicamente a imagem real `.expo/validation-v2/qr-room-CYV7ZL.png`, emitida no chat, e confirmou a entrada. A árvore `.expo/validation-v2/qr-optical-apk.xml` mostrou o lobby, `Estou pronto` e `Aguardando quem criou a sala iniciar.`. O SELECT do projeto hospedado confirmou que a sala Duelo `CYV7ZL` passou de um para dois participantes distintos, com um host e um único convidado. O log da câmera registrou `CONNECT` às 10:18:08 e `DISCONNECT` às 10:18:10, no horário local. A prova usa o APK build 7 existente e não alterou dados do app.

Essa primeira observação comprova leitura óptica Android, entrada na sala correta e um único convidado persistido. Naquele momento, não instrumentou tentativas/frames nem cobriu sala removida/cheia; usou uma imagem emitida no chat, sem host exibindo o QR do lobby ao vivo.

Na sequência, Saker leu o QR real no Chrome do Redmi e informou que entrou, ressaltando que usava a mesma conta do APK e que a listagem mostrava a sala cheia. `.expo/validation-v2/qr-web-current.xml`, lido às `13:26:42Z`, mostrou o Chrome com `Aguardando quem criou a sala iniciar.` e `Sair da sala`. A consulta privada às `13:27:03Z` confirmou dois participantes e dois usuários distintos, sem presença da QA do cadastro. A prova cobre leitura óptica web e reentrada do participante existente sem duplicar lugar. Não demonstra recusa de sala cheia a uma terceira identidade nem entrada web de uma conta ainda fora da sala. CA-48/49 permanecem parcialmente abertos.

Depois do novo login Google na web, Saker relatou tentar um terceiro jogador e receber `Não foi possível entrar nesta sala. Tente ler outro QR ou digite o código.`. O arquivo privado `.expo/validation-v2/qr-web-full.xml`, apesar do nome, contém somente o pacote `br.senai.decky`, com 18 nós, a mensagem, `Tentar novamente` e `Fechar`: essa recusa foi observada no APK, sem prova de recusa no leitor web. O SQL posterior manteve a sala Duelo em lobby, com dois participantes distintos e um convidado; o convidado nesse momento era a conta Google recém-criada. A troca do convidado ocorreu em intervalo não observado, portanto não se afirma identidade imutável da ocupação. Relato, UI e capacidade confirmam o cenário de terceira entrada recusada com sala cheia, mas não foi coletado código de resposta RPC para afirmar `room_full` como causa específica. A mensagem e os controles de retomada foram observados. Naquele ponto, essa observação não comprovava clique em nova tentativa, sala removida ou contagem de frames; a prova posterior de sala removida está registrada abaixo.

As imagens privadas `qr-room-removed.png` e `qr-invalid-external.png` foram preparadas para os negativos físicos. A primeira usa somente a sala sintética recém-criada `9H44T2`, removida pela saída de seu único host, com SELECT posterior zero; a sala anterior e demais dados foram preservados. A preparação ficou em `qr-negative-fixtures.json`, de `13:39:22Z`. Saker leu as duas imagens e informou `Ambos recusados, sem abrir site externo`.

Para a sala removida, `.expo/validation-v2/qr-removed-current.xml`, de `13:43:21Z`, mostrou o APK com erro de entrada, `Tentar novamente` e `Fechar`; o servidor manteve zero para `9H44T2`. `dumpsys media.camera`, salvo integralmente em `qr-removed-camera.txt` às `13:43:57Z`, retornou exit 0 e nenhum cliente ativo. A tentativa anterior truncada por pipeline não foi usada como evidência de comando aprovado. A recusa de sala removida tem relato, UI e ausência no servidor; recusa de QR externo e ausência de abertura de site têm relato do usuário, sem captura do estado intermediário. Nenhuma dessas provas conta tentativas ou frames.

A rodada combinada de fonte ampliada, teclado e novo login por senha QA foi dispensada expressamente por Saker nesta sessão. Não prosseguir nem solicitar novamente esse handoff nesta retomada. A escala nativa foi apenas lida como `1.0`, tela física 1080x2400/densidade 440; o agente não mudou `font_scale`. Fonte ampliada, teclado virtual e aceite independente da senha nova continuam sem prova adicional, sem aprovação implícita.

Na prova posterior de duas sessões com QR ao vivo, Saker criou a sala privada Duelo `Z3MD4W` no computador, com a primeira conta Google, e confirmou a leitura do QR do lobby no APK da segunda conta. O SQL retornou `lobby`, `1v1`, `private`, dois participantes distintos, um host e um convidado, com entrada às `13:55:13.561358Z`. `.expo/validation-v2/qr-live-apk.xml`, de `13:55:56Z`, mostrou o pacote nativo, `Estou pronto`, espera pelo host e `Sair da sala`. A exibição do QR pelo host é relato de Saker; entrada no app e estado do servidor foram observados independentemente. Isso cobre o cenário Android de QR do lobby ao vivo, sem somar a reentrada web anterior como prova de ingresso web novo. O ingresso novo web no mesmo QR não foi executado por indisponibilidade de outra conta e encerramento dos pedidos adicionais de aparelhos por Saker. A leitura óptica web/reentrada anterior continua comprovada, sem aprovação implícita do ingresso novo. Não há handoff ativo desse teste nesta retomada; a sala foi preservada naquele ensaio e depois removida no reset global autorizado.

## Fontes de implementação

Conferi as APIs em [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [useWindowDimensions](https://reactnative.dev/docs/usewindowdimensions) e [View.onLayout](https://reactnative.dev/docs/view#onlayout), além dos tipos e código do pacote instalado.

Consultei a skill Modern Web Guidance e o guia `responsive-design`. A regra `Use aspect-ratio for media elements` orientou a moldura proporcional da câmera para reservar seu espaço. As demais sugestões CSS foram adaptadas ao layout de React Native, sem adicionar CSS de container queries onde não existe um elemento HTML equivalente controlado pelo componente.
