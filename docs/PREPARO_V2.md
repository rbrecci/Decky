# Passagem para finalizar a V2 do Decky

Atualizado em 24/10/2026. Este é o ponto de entrada para uma nova sessão. Substitui as instruções antigas de iniciar a implementação: os 15 itens têm código, web e backend V2 publicados e APK 2.0.0/build 7 instalado e conferido no Redmi. A GitHub Release e o download público do APK foram conferidos; o manifesto real e a landing foram publicados e conferidos no Pages. Lançamento completo e reset ainda não foram concluídos.

Este é o último estado observado. Conferir mudanças de Git, acessos e aparelho na retomada, sem presumir que sessões, tokens, salas de QA ou interfaces permaneceram iguais. Não refazer validações aprovadas só porque começou outra conversa.

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
- Redirects e templates publicados; confirmação obrigatória habilitada. Dois cadastros confirmados pelo Gmail no Redmi; link realmente expirado recusado e reenvio confirmado. Recuperação chegou por SMTP; além da prova SDK, Saker concluiu o formulário publicado por handoff e entrou com a nova senha. Servidor e UI autenticada confirmaram o novo acesso; senha anterior recusada e identidade/perfil/ratings/histórico da QA preservados.
- Google completo passou no APK e na web do Chrome no Redmi com conta existente. Um usuário e um perfil têm identidades e-mail/Google; registros antigos continuaram presentes. Sessão nativa persistiu após encerrar/reabrir o processo. Cancelamento web por AndroidBack voltou ao login sem travar.
- APK 2.0.0/build 7 instalado sobre a V1 sem desinstalar ou limpar dados, com assinatura e sessão preservadas. Recusa/concessão da primeira permissão de câmera passaram; background liberou a câmera e retorno manteve o leitor fechado.
- Leitura óptica no APK build 7 comprovada na retomada: Saker leu a imagem real de convite e confirmou entrada; a UI mostrou o lobby e o servidor passou de um a dois participantes, com um único convidado. Isso não encerra os cenários web móvel, frames repetidos, sala cheia/removida nem a prova de duas sessões com o host exibindo o QR ao vivo.
- Release [v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0), publicada por `rbrecci` em `2026-10-24T13:20:14Z`, com APK build 7. Download anônimo retornou HTTP 200, 132.618.708 bytes e hash/certificado esperados. Manifesto real no commit `0592451`; workflow Pages `40097789183` aprovado, com build/deploy `success` e página pública conferida sob `/Decky/`.
- Duas falhas de câmera corrigidas com vermelho/verde: consulta automática incompatível com WebKit e fechamento durante o diálogo Android. A correção Android foi comprovada fisicamente na build 7.
- Firefox e WebKit: 88 verificações por motor. Lobby/notas: 20 verificações por motor em três motores, com backend simulado. Zoom nativo Chromium de 200% nas telas principais e fixture do jogo.
- Suíte completa antes dos deploys: 39 arquivos/457 testes, exit 0. Após a última correção: app/motor em 32 arquivos/371 testes, exit 0. Não somar contagens, pois há sobreposição. Typecheck e diff-check passaram. Provas posteriores de concorrência/hospedagem são separadas.
- `npm audit`: oito alertas, três moderados e cinco altos, em cadeias transitivas. Dry-run sem solução compatível; não foram usados force, downgrade ou override sem validação.

## Git e autorizações

Na retomada, foram criados os commits `b3911cf` (configuração/dependências) e `c80a886` (fontes, testes e site) na branch `main`, com a autoria de Saker. `git push origin main` retornou exit 0, avançando `029e17e..c80a886`; a conferência encontrou `HEAD` e `origin/main` em `c80a88676fc8344bafa1d4f40a5921ce9cfeee84`. Depois, o manifesto real foi commitado e enviado como `0592451c510caff3c455554eefa64b338f906077`. A documentação permanece em atualização. A release já foi publicada; Pages foi publicado e conferido, sem reset global. A exclusão de `.env.example` já existia antes da implementação e foi preservada fora desses commits.

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

### 1. Testes que dependem do aparelho

Leitura óptica de QR comprovada no APK build 7 na retomada de 24/10/2026. Saker abriu o leitor, apontou para a imagem real emitida no chat e informou que entrou na sala. A árvore privada `.expo/validation-v2/qr-optical-apk.xml` confirmou o lobby; o servidor passou de um a dois participantes distintos, com um único convidado. A seção de QR em [UI_V2.md](UI_V2.md) registra evidências e limites.

Sala pública QA Duelo: código `CYV7ZL`, ID `9306dbb1-6077-4d25-9e90-e2f18165d542`; antes da leitura, o SELECT confirmou `status=lobby`, `game_mode=1v1` e um participante no projeto `yfijjtibyblzuplhtxbd`. Depois, retornou dois participantes e dois usuários distintos, um host e um convidado. A sala está cheia para Duelo nesse último estado; não presumir vaga disponível. Host é índice 0 em `qa-backend.json`. Imagem: `.expo/validation-v2/qr-room-CYV7ZL.png`. Restam frames repetidos, sala removida/cheia, leitor web móvel e o cenário de host exibindo o QR ao vivo. Não criar outra build para repetir essas provas sem mudança de código.

Auth: a submissão do formulário real de recuperação passou por handoff com Saker, após envio SMTP às `13:20:34Z`. `recovery-ui-handoff.mjs check` retornou exit 0 às `13:23:45Z`: senha anterior recusada, mesmo usuário/perfil/ratings/histórico e evento posterior de login. A UI do Chrome mostrou o início autenticado. Credencial nova não foi coletada ou submetida pelo agente; relatório/baseline privados continuam ignorados. Restam Google com conta nova, recusa explícita de consentimento, Branding/público externo e os limites exatos de [AUTH_V2.md](AUTH_V2.md).

Safari em aparelho Apple e cenários restantes de teclado virtual/fontes ampliadas exigem acesso apropriado. WebKit no Windows e user-agent simulado não substituem iPhone. Registrar indisponibilidade como limite, sem declarar aceite nem repetir toda a matriz aprovada.

### 2. Distribuição e publicação

Reutilizar APK build 7 enquanto não houver mudança que exija reconstrução. Commit/push estão explicitamente autorizados na retomada. Conferir diff, arquivos novos, exclusões preexistentes e segredos antes de registrar o código; preservar a exclusão local de `.env.example` fora do commit.

Seguir [DISTRIBUICAO_V2.md](DISTRIBUICAO_V2.md): release v2.0.0 publicada, asset anônimo conferido e `site/version.json` preenchido depois dessa prova com versão 2.0.0, build 7, URL definitiva e data real. Não repetir upload/build/deploy sem mudança. O Pages foi conferido com manifesto real idêntico ao local, dois CTAs para o APK e páginas informativas públicas; detalhes de cache em `DISTRIBUICAO_V2.md`.

Workflow `.github/workflows/pages.yml` é manual e publica só `site/`; Pages já selecionado para Actions. A execução `40097789183` concluiu build/deploy com `success`, alvo `0592451`. A landing `https://rbrecci.github.io/Decky/`, recursos sob `/Decky/`, páginas informativas e manifesto real foram conferidos. A CDN anuncia `max-age=600`; `fetch` sem cache retornou `Age: 0`/MISS na observação, sem garantia de propagação instantânea. Completar Branding/Audience Google com essas URLs reais, sem declarar propriedade sobre `expo.app` ou `supabase.co`. O inventário CUA atual segue sem browsers/apps; essa configuração não foi alterada nesta rodada e aguarda handoff.

Falta prova publicada de atualização entre builds que tenham o verificador. A V1 distribuída não contém esse código e não ganhará aviso por alteração do manifesto. Comparação simulada não é aviso observado no APK. Para o Google, as URLs públicas e o roteiro de Branding estão em [AUTH_V2.md](AUTH_V2.md): salvar rascunho não equivale a `Publish branding`, e Audience externo/produção deve ser conferido separadamente. Não criar domínio ou propriedade fictícia para vencer exigência do console.

### 3. Virada somente nas condições registradas

Reset global não ocorreu. Dados antigos e novos de QA continuam no projeto. Conferir inventário e separar recursos de teste; não excluir dados existentes como limpeza incidental.

Backup DPAPI `CurrentUser`: `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. Fotografia anterior aos testes posteriores, restaurada em PostgreSQL local com 47 tabelas/57 funções/23 políticas. Depende do mesmo perfil Windows. Não há prova de recuperação operacional completa do Supabase hospedado nem retenção definida.

Faltam recuperação operacional, retenção, backup atualizado na janela e aviso público com janela real. Seguir [VIRADA_V2.md](VIRADA_V2.md), sem `supabase db reset` em produção. Só executar o procedimento único após condições satisfeitas; conferir inventário, tokens antigos, contas novas em 500/modalidade, histórico vazio e reabertura. Deploy não dispara reset.

Revisão automática bloqueou limpeza dos dumps temporários e cluster local com `rejected: blocked by policy`, sem outro motivo. Tentativas pararam. Os cinco caminhos estão em `VIRADA_V2.md`; permanecem locais e ignorados. Não contornar a rejeição por outro shell, ferramenta ou método. Backup cifrado preservado.

## Fechamento da próxima sessão

Trabalhar nas pendências, corrigir apenas falhas reproduzidas e verificar proporcionalmente às mudanças. Nova conversa não justifica repetir 457 testes, reaplicar migration, refazer provedor, trocar assinatura ou gerar APK.

Manter documentação atualizada. Ausência de aparelho, aprovação ou prova não aprova critério. Entregar mudanças, comandos/resultados, links publicados e limites. Encerramento da V2 segue a seção 13 da especificação.

Varrer automaticamente U+2014, U+2013 e U+2212 em documentos/código: `LC_ALL=C.UTF-8 git grep -nP '[\x{2014}\x{2013}\x{2212}]'`, com extensões alteradas e exit 1 conferido; varrer novos arquivos também. Conferir `git diff --check`. Não commitar `.env`, `.expo/`, credenciais ou evidências privadas.
