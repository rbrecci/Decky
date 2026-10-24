# Passagem para finalizar a V2 do Decky

Atualizado em 24/10/2026. Este é o ponto de entrada para uma nova sessão. Substitui as instruções antigas de iniciar a implementação: os 15 itens têm código, web e backend V2 publicados e APK 2.0.0/build 7 instalado e conferido no Redmi. A GitHub Release e o download público do APK foram conferidos; o manifesto real e a landing foram publicados e conferidos no Pages. Lançamento completo e reset ainda não foram concluídos.

Este é o último estado observado. Conferir mudanças de Git, acessos e aparelho na retomada, sem presumir que sessões, tokens, salas de QA ou interfaces permaneceram iguais. Não refazer validações aprovadas só porque começou outra conversa.

Saker encerrou expressamente os pedidos adicionais de aparelhos nesta retomada. O ingresso novo QR web no lobby ao vivo não foi executado por indisponibilidade/dispensa, e fontes/teclado/login QA já tinham sido dispensados. Esses limites continuam sem prova adicional, sem aprovação implícita, mas não são pedidos aguardando participação. Não insistir nem reabrir as rodadas nesta sessão. A próxima ação Google fica limitada ao horário de Branding registrado abaixo.

## Fontes e ordem de leitura

1. Instruções AGENTS.md do ambiente e do projeto.
2. [VALIDACAO_V2.md](VALIDACAO_V2.md): entregas, evidências e pendências atuais.
3. [DISTRIBUICAO_V2.md](DISTRIBUICAO_V2.md): build aprovada, assinatura, publicação e manifesto.
4. [AUTH_V2.md](AUTH_V2.md), [UI_V2.md](UI_V2.md) e [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md): provas detalhadas e limites.
5. [VIRADA_V2.md](VIRADA_V2.md): inventário, backup e condições do reset.
6. [DeckyV2Spec.md](../DeckyV2Spec.md): requisitos CA-01 a CA-51. As fases de implementação são planejamento histórico, não trabalho ainda por começar.

## Último estado comprovado

- Web V2 em `https://decky-brecci.expo.app`, publicação EAS `z4wqijzjab`, exportada com o ambiente `production`.
- Supabase: `yfijjtibyblzuplhtxbd`. Migration `20261023230536` aplicada; `start-match` e `submit-action` ativas na versão 14. Dados antigos preservados e manutenção global desligada.
- MMR, descarte oculto, privacidade, histórico/notas e descoberta pública implementados. Concorrência comprovada com duas conexões PostgreSQL reais. Jogo, Realtime, Auth Admin, Storage e recusa de JWT de QA apagada tiveram provas hospedadas.
- Redirects e templates publicados; confirmação obrigatória habilitada. Dois cadastros confirmados pelo Gmail no Redmi; link realmente expirado recusado e reenvio confirmado. Recuperação chegou por SMTP; além da prova SDK, Saker relatou concluir o formulário e entrar com a nova senha. A QA teve mudança de conta, senha anterior recusada e identidade/perfil/ratings/histórico preservados. O aceite da senha nova ainda exige diferenciar login por senha de `verifyOtp`; a UI autenticada observada não identificou essa QA.
- Google completo passou no APK e na web do Chrome no Redmi com conta existente, sem duplicar perfil. Uma conta Google nova na web Chrome também passou: uma identidade/perfil, 500 em Duelo/Duplas, histórico vazio e AMR `oauth`. O mesmo cadastro foi depois reutilizado no APK, com duas sessões OAuth e nenhum perfil duplicado; o consentimento para recusa não apareceu. Sessão nativa existente persistiu após reabrir o processo; AndroidBack web voltou ao login sem travar.
- APK 2.0.0/build 7 instalado sobre a V1 sem desinstalar ou limpar dados, com assinatura e sessão preservadas. Recusa/concessão da primeira permissão de câmera passaram; background liberou a câmera e retorno manteve o leitor fechado.
- Leitura óptica no APK build 7 comprovada: lobby observado e servidor passou de um a dois participantes. O Chrome leu o QR e reentrou como participante existente sem duplicar lugar. Uma tentativa posterior no cenário de sala cheia mostrou recusa tratada no APK; não foi coletado código RPC para atribuir `room_full`. Sala removida foi recusada com UI/servidor, e QR externo sem abrir site foi relatado. Limites sem prova adicional, com rodadas encerradas: entrada QR web de outra identidade, recusa web de sala cheia e contagem de frames.
- Release [v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0), publicada por `rbrecci` em `2026-10-24T13:20:14Z`, com APK build 7. Download anônimo retornou HTTP 200, 132.618.708 bytes e hash/certificado esperados. Manifesto real no commit `0592451`; workflow Pages `40097789183` aprovado, com build/deploy `success` e página pública conferida sob `/Decky/`.
- Duas falhas de câmera corrigidas com vermelho/verde: consulta automática incompatível com WebKit e fechamento durante o diálogo Android. A correção Android foi comprovada fisicamente na build 7.
- Firefox e WebKit: 88 verificações por motor. Lobby/notas: 20 verificações por motor em três motores, com backend simulado. Zoom nativo Chromium de 200% nas telas principais e fixture do jogo.
- Suíte completa antes dos deploys: 39 arquivos/457 testes, exit 0. Após a última correção: app/motor em 32 arquivos/371 testes, exit 0. Não somar contagens, pois há sobreposição. Typecheck e diff-check passaram. Provas posteriores de concorrência/hospedagem são separadas.
- `npm audit`: oito alertas, três moderados e cinco altos, em cadeias transitivas. Dry-run sem solução compatível; não foram usados force, downgrade ou override sem validação.

## Git e autorizações

Na retomada, foram criados os commits `b3911cf` (configuração/dependências) e `c80a886` (fontes, testes e site) na branch `main`, com a autoria de Saker. `git push origin main` retornou exit 0, avançando `029e17e..c80a886`; a conferência encontrou `HEAD` e `origin/main` em `c80a88676fc8344bafa1d4f40a5921ce9cfeee84`. Depois, o manifesto real foi commitado e enviado como `0592451c510caff3c455554eefa64b338f906077`, e a metatag pública de propriedade como `bdaa8b34aefbec932900bcccbdc390f25fc87fd9`. A documentação registra as evidências e os limites desta retomada. Release e Pages foram publicados e conferidos, sem reset global. A exclusão de `.env.example` já existia antes da implementação e foi preservada fora desses commits.

Saker autorizou o trabalho possível de validação e publicação, incluindo os deploys, configuração Auth e testes do aparelho já registrados. Na retomada de 24/10/2026, autorizou explicitamente commit e push das mudanças V2 no seu nome e as publicações previstas após as verificações correspondentes. A pergunta anterior de commit/push foi respondida por esse pedido; não solicitar a mesma autorização novamente. A configuração Git conferida retorna `rbrecci` e `fbrecci@gmail.com`.

Autoria: `rbrecci`, `fbrecci@gmail.com`; conferir a configuração real antes de commitar e não adicionar coautoria. Reset segue condicionado às provas, ao roteiro e à janela aprovada; autorização geral não elimina pré-requisitos pendentes.

## Acessos e artefatos para reaproveitar

- Workspace: `C:\Users\fbrec\Documents\Claude\projects\Decky`.
- ADB: `C:\Users\fbrec\AppData\Local\Android\Sdk\platform-tools\adb.exe`, fora do PATH. Último dispositivo autorizado: Redmi `2201117SG`, serial `RKCYTC89R8SCEI95`; conferir novamente com `devices -l`.
- Apksigner: `C:\Users\fbrec\AppData\Local\Android\Sdk\build-tools\36.0.0\apksigner.bat`.
- GitHub autenticado como `rbrecci`, com acesso administrativo ao repo; Expo como `brecci`. CLI Supabase autenticada com participação de Saker. Conferir disponibilidade sem imprimir/extrair tokens.
- O MCP específico acessou o Decky; o conector antigo apontava para outro projeto. Confirmar URL/ref antes de qualquer operação remota.
- Build existente: `568db14c-0fbd-45d5-94c0-8f3ee9ccb8e9`, versão 2.0.0/build 7. Arquivo `.expo/validation-v2/decky-v2-build7.apk`, 132.618.708 bytes. SHA-256 `caedb4818a2895ef15742c832a8bcc678f3346f4b0d7712349d79ccde9e7e4b1`; certificado SHA-256 `448a4de74df9632cfba76880f51caa023a65b1cc6d4f6d61cc4e18ab7a893da3`.
- Metadados: `.expo/validation-v2/build-v2-camera-final.json`. CLI EAS estava em `C:\Users\fbrec\AppData\Local\npm-cache\_npx\e25a38a8cc65d08e\node_modules\eas-cli\bin\run`, executável com Node. Se o cache mudou, localizar o CLI; não reconfigurar projeto/keystore por suposição.
- Evidências privadas e programas de QA: `.expo/validation-v2/`. Reaproveitar relatórios de Auth, concorrência, jogo remoto, restauração, navegadores e aparelho. `qa-backend.json`, `qa-auth.json` e `qa-signup.json` contêm credenciais exclusivas de QA: não imprimir, commitar ou publicar.
- `docs/evidencias-v2/` usa demonstração. Não substituir por capturas pessoais do aparelho ou e-mail.
- CUA retornou inventário vazio de browsers/apps; isso não prova ausência de CLI, Playwright ou ADB. Houve testes com Playwright/Edge/Firefox/WebKit e controle do Redmi por ADB. Conferir ferramentas e respeitar handoff quando exigido.

## Pendências em ordem

### 1. Provas de aparelho e limites encerrados nesta retomada

Leitura óptica de QR comprovada no APK build 7 na retomada de 24/10/2026. Saker abriu o leitor, apontou para a imagem real emitida no chat e informou que entrou na sala. A árvore privada `.expo/validation-v2/qr-optical-apk.xml` confirmou o lobby; o servidor passou de um a dois participantes distintos, com um único convidado. A seção de QR em [UI_V2.md](UI_V2.md) registra evidências e limites.

Sala pública QA Duelo: código `CYV7ZL`, ID `9306dbb1-6077-4d25-9e90-e2f18165d542`; passou de um a dois participantes no projeto `yfijjtibyblzuplhtxbd`. A releitura web manteve dois lugares. Depois do novo login Google, uma terceira entrada relatada por Saker mostrou recusa tratada no APK, registrada em `qr-web-full.xml` (nome legado, pacote nativo). O SELECT posterior retornou lobby/1v1, dois participantes distintos e um convidado, que nesse momento era a nova conta Google. Não foi observado quando o convidado anterior saiu. A sala continua cheia; reentrada de participante não equivale a recusa de terceiro. Não há código RPC observado para atribuir `room_full`. Host é índice 0 em `qa-backend.json`; imagem `qr-room-CYV7ZL.png`. Limites registrados, sem rodada ativa: entrada QR web de outra identidade, recusa de cheia no leitor web e contagem de frames; os negativos de removida/externo estão abaixo. Reutilizar a build 7.

Negativos físicos concluídos no APK: Saker leu `qr-room-removed.png` e `qr-invalid-external.png` e informou recusa dos dois, sem abrir site externo. Sala removida `9H44T2` era QA sintética exclusiva, removida via `leave_room`, com SELECT zero; sala original e dados anteriores foram preservados. `qr-removed-current.xml`, às `13:43:21Z`, mostrou erro tratado e controles de retomada. `dumpsys media.camera` completo às `13:43:57Z` retornou exit 0 e nenhum cliente ativo, em `qr-removed-camera.txt`. QR externo/ausência de navegação têm relato, sem captura intermediária; não há contador de frames. A rodada combinada de fontes/teclado/login QA foi dispensada expressamente por Saker nesta sessão. Não reabrir esse pedido na retomada. Houve apenas leitura da escala `1.0`, tela física 1080x2400/densidade 440; o agente não mudou `font_scale`. Esses limites seguem sem prova adicional, sem aprovação implícita.

Auth: Saker relatou concluir o formulário e entrar com a nova senha após o envio SMTP às `13:20:34Z`. `recovery-ui-handoff.mjs check` retornou exit 0 às `13:23:45Z`: senha anterior recusada e mesmo usuário/perfil/ratings/histórico. O horário pode vir de `verifyOtp`, a UI não identificou a QA e o teste seguinte foi Google; falta aceite independente da senha nova por login. Credencial nova não foi coletada pelo agente. Conta Google nova na web passou por SQL/AMR e foi depois reutilizada no APK sem duplicar perfil, com 500/500 e histórico vazio. Limites registrados sem nova rodada de aparelhos: recusa explícita de consentimento (não apareceu), tipo Audience External não observado diretamente e conta fora dos testadores no estado público correto não comprovada. Saker informou `In production`; capturas posteriores mostram Data access dispensado e Branding não visível por falta de propriedade da homepage. A meta pública Search Console foi fornecida pelo usuário, inserida apenas no head e enviada no commit `bdaa8b34aefbec932900bcccbdc390f25fc87fd9`, push exit 0. Pages `40099508710` concluiu build/deploy com sucesso. A homepage exata retornou HTTP 200 e HTML igual ao local, com uma única meta no head e conteúdo literal conferido. Saker confirmou `Propriedade verificada com sucesso` no handoff. Horário conservador de registro: 24/10/2026 às 10:49 BRT (`13:49Z`), sem inspeção direta do painel. Próxima tentativa de Branding somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`); login externo após esse estado ainda falta. Ver [AUTH_V2.md](AUTH_V2.md).

Safari em aparelho Apple continua sem acesso apropriado nesta sessão; WebKit no Windows e user-agent simulado não substituem iPhone. A rodada adicional de teclado/fontes/login QA foi dispensada expressamente por Saker: registrar limites sem prova, não declarar aceite e não repetir esse pedido nesta retomada. O arquivo privado de handoff do e-mail ficou obsoleto e foi removido, com ausência confirmada; nenhum dos cinco alvos da limpeza rejeitada foi tocado. A matriz já aprovada permanece válida.

A prova de duas sessões com QR ao vivo passou no APK: Saker criou no computador a sala privada Duelo `Z3MD4W` com a primeira conta Google e relatou ler o QR do lobby com a segunda no APK. SQL confirmou lobby/1v1/private, dois participantes distintos, um host/convidado e entrada às `13:55:13.561358Z`; `qr-live-apk.xml`, de `13:55:56Z`, mostrou o lobby nativo. A exibição do host é relato, app e servidor têm observação independente. O ingresso novo pelo Chrome móvel no mesmo QR não foi executado: Saker informou indisponibilidade de outra conta e encerrou os pedidos adicionais de aparelhos nesta retomada. Não solicitar novamente essa rodada; a leitura óptica web com reentrada já observada permanece válida, sem aprovar o cenário de ingresso novo. A sala de QA criada por Saker deve permanecer registrada para retomada, sem limpeza incidental; não remover outras salas/dados.

### 2. Distribuição e publicação

Reutilizar APK build 7 enquanto não houver mudança que exija reconstrução. Commit/push estão explicitamente autorizados na retomada. Conferir diff, arquivos novos, exclusões preexistentes e segredos antes de registrar o código; preservar a exclusão local de `.env.example` fora do commit.

Seguir [DISTRIBUICAO_V2.md](DISTRIBUICAO_V2.md): release v2.0.0 publicada, asset anônimo conferido e `site/version.json` preenchido depois dessa prova com versão 2.0.0, build 7, URL definitiva e data real. Não repetir upload/build/deploy sem mudança. O Pages foi conferido com manifesto real idêntico ao local, dois CTAs para o APK e páginas informativas públicas; detalhes de cache em `DISTRIBUICAO_V2.md`.

Workflow `.github/workflows/pages.yml` é manual e publica só `site/`; Pages já selecionado para Actions. A execução `40097789183` concluiu build/deploy com `success`, alvo `0592451`. A landing `https://rbrecci.github.io/Decky/`, recursos sob `/Decky/`, páginas informativas e manifesto real foram conferidos. A CDN anuncia `max-age=600`; `fetch` sem cache retornou `Age: 0`/MISS na observação, sem garantia de propagação instantânea. Saker relatou salvar as URLs e publicar Branding, mas a captura posterior mostrou a marca não visível. Data access dispensa verificação, e `In production` é relato do responsável. A captura de `Verify branding` exige propriedade da homepage e espera de 24 horas. Preparado Search Console, mesma conta administradora, prefixo `https://rbrecci.github.io/Decky/` e método tag HTML. Meta pública fornecida e enviada em `bdaa8b34aefbec932900bcccbdc390f25fc87fd9`, push exit 0, somente no head. Pages `40099508710` aprovado; homepage exata HTTP 200/HTML igual ao local, meta única no head e literal conferido. Saker confirmou sucesso da propriedade no handoff, registrado em 24/10/2026 às 10:49 BRT (`13:49Z`), sem inspeção direta do painel. Manter a meta permanentemente; só repetir Branding a partir de 25/10/2026 às 10:49 BRT (`13:49Z`). Não declarar propriedade de `github.io`, `expo.app` ou `supabase.co`.

Falta prova publicada de atualização entre builds que tenham o verificador. A V1 distribuída não contém esse código e não ganhará aviso por alteração do manifesto. Comparação simulada não é aviso observado no APK. Para o Google, as URLs públicas e o roteiro estão em [AUTH_V2.md](AUTH_V2.md). O erro `Missing domain: "rbrecci.github.io"` foi resolvido, mas não comprova propriedade da homepage. As capturas `google-verification-center.png` e `google-branding-ownership-required.png` corrigem o relato inicial de publicação: Branding não visível, Data access dispensado e propriedade ainda exigida. Saker confirmou depois a propriedade em handoff, sem inspeção direta do painel; manter a meta e tentar Branding somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`); não contestar o bloqueio como incorreto nem contorná-lo. Não refazer provedor ou substituir segredo/callback.

### 3. Virada somente nas condições registradas

Reset global não ocorreu. Dados antigos e novos de QA continuam no projeto. Conferir inventário e separar recursos de teste; não excluir dados existentes como limpeza incidental.

Backup DPAPI `CurrentUser`: `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. Fotografia anterior aos testes posteriores, restaurada em PostgreSQL local com 47 tabelas/57 funções/23 políticas. Depende do mesmo perfil Windows. Não há prova de recuperação operacional completa do Supabase hospedado nem retenção definida.

Faltam recuperação operacional, retenção, backup atualizado na janela e aviso público com janela real. Seguir [VIRADA_V2.md](VIRADA_V2.md), sem `supabase db reset` em produção. Só executar o procedimento único após condições satisfeitas; conferir inventário, tokens antigos, contas novas em 500/modalidade, histórico vazio e reabertura. Deploy não dispara reset.

Revisão automática bloqueou limpeza dos dumps temporários e cluster local com `rejected: blocked by policy`, sem outro motivo. Tentativas pararam. Os cinco caminhos estão em `VIRADA_V2.md`; permanecem locais e ignorados. Não contornar a rejeição por outro shell, ferramenta ou método. Backup cifrado preservado.

## Fechamento da próxima sessão

Os pedidos adicionais de aparelhos desta retomada foram encerrados por Saker; não há handoff de teste de aparelho aguardando resposta. Manter os limites sem aprovação implícita. A ação Google futura é tentar Branding somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`). Nova conversa não justifica repetir 457 testes, reaplicar migration, refazer provedor, trocar assinatura ou gerar APK.

Manter documentação atualizada. Ausência de aparelho, aprovação ou prova não aprova critério. Entregar mudanças, comandos/resultados, links publicados e limites. Encerramento da V2 segue a seção 13 da especificação.

Varrer automaticamente U+2014, U+2013 e U+2212 em documentos/código: `LC_ALL=C.UTF-8 git grep -nP '[\x{2014}\x{2013}\x{2212}]'`, com extensões alteradas e exit 1 conferido; varrer novos arquivos também. Conferir `git diff --check`. Não commitar `.env`, `.expo/`, credenciais ou evidências privadas.
