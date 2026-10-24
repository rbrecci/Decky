# Distribuição e publicação da V2

Estado em 24/10/2026: web e backend V2 publicados, APK 2.0.0/build 7 instalado e conferido no Redmi após atualização sobre a V1. GitHub Release publicada e download anônimo conferido; manifesto real enviado ao GitHub. Landing e manifesto foram publicados e conferidos no Pages. Não houve reset global.

## Assinatura Android conferida

Em 23/10/2026, o aparelho conectado ao ADB tinha `br.senai.decky`, `versionName=1.0.0` e `versionCode=4`. A cópia de conferência ficou em `.expo/validation-v2/installed-v1.apk`, ignorada pelo Git. Essa primeira conferência foi somente de leitura; a instalação posterior da V2 está registrada ao final.

Comandos executados:

```powershell
adb shell dumpsys package br.senai.decky
adb shell pm path br.senai.decky
apksigner verify --print-certs .expo/validation-v2/installed-v1.apk
npx eas-cli credentials -p android
```

`apksigner` retornou exit 0. O certificado SHA-256 instalado é `448a4de74df9632cfba76880f51caa023a65b1cc6d4f6d61cc4e18ab7a893da3`. A tela de leitura de credenciais do EAS mostrou exatamente a mesma impressão para a JKS Default de `br.senai.decky`. A consulta foi encerrada sem entrar nas opções de criação, troca ou download da chave.

`eas build:list -p android --limit 3 --json --non-interactive` confirmou a build anterior finalizada, ID `4f9c8533-d054-4908-bc85-5b890f2c73a0`, versão 1.0.0, build 4. O identificador do app, projeto EAS e keystore foram preservados. `eas.json` continua com contador remoto e incremento automático. A build V2 atual é a 7; uma próxima build deve seguir o contador remoto, sem redefini-lo.

## Landing e manifesto

`site/` contém HTML, CSS e JavaScript estáticos, logo oficial, fontes locais com licença e páginas de privacidade, termos e suporte. O jogo continua em `https://decky-brecci.expo.app`. Nenhuma rota da landing recebe tokens de conta.

`site/version.json` é a única fonte dos links Android. Depois da prova do download público, recebeu versão `2.0.0`, build `7`, data `2026-10-24T13:20:14Z` e URL definitiva do APK: `https://github.com/rbrecci/Decky/releases/download/v2.0.0/decky-v2-build7.apk`. O commit `0592451c510caff3c455554eefa64b338f906077` foi enviado ao GitHub. O manifesto efetivamente servido no Pages retornou HTTP 200 e conteúdo idêntico ao arquivo local, inclusive versão/build/data. A landing publicada usa esse mesmo manifesto nos dois CTAs.

O contrato e a comparação numérica estão em `site/release.js`, compartilhado com o cliente. O Android usa versão/build nativos, ignora ambiente de desenvolvimento e consulta sem cache. Há timeout de 5 segundos, uma consulta em andamento e intervalo de 15 minutos nos retornos ao primeiro plano. Falha posterior conserva um aviso já confirmado na sessão. O botão abre a landing, sem instalar APK automaticamente.

As imagens de demonstração são capturas da interface V2 com dados locais identificados. Não são evidência de multiplayer ou de produção. Não substituir por imagens de versões antigas sem atualizar os textos.

## Procedimento de publicação

Saker autorizou a continuação dos testes e da publicação em 24/10/2026. Na retomada do mesmo dia, autorizou explicitamente commit/push das mudanças V2 no seu nome e as publicações previstas após as verificações correspondentes. A configuração Git confere com `rbrecci` e `fbrecci@gmail.com`; não adicionar coautoria. A passagem atual é [PREPARO_V2.md](PREPARO_V2.md). Os passos abaixo distinguem o que já aconteceu do que falta; não repetir operações concluídas sem uma mudança que justifique isso.

1. Consultar os testes e as pendências em `VALIDACAO_V2.md`, `AUTH_V2.md`, `UI_V2.md` e `VALIDACAO_SERVIDOR_V2.md`. Executar as validações restantes e registrar seus limites antes de encerrar o lançamento.
2. Já executado: migration `20261023230536` aplicada e `start-match`/`submit-action` publicadas como versão 14. As migrations anteriores não foram editadas. Conferir o remoto antes de qualquer nova alteração; não reaplicar a migration por estar sem commit local.
3. Já executado: export com ambiente EAS `production`, publicação no Hosting e renderização das rotas Auth. Produção é `https://decky-brecci.expo.app`; publicação atual `z4wqijzjab`. Se houver mudança web nova, exportar com o ambiente EAS e só então usar `npx eas-cli deploy --prod --environment production`.
4. Já executado: redirects e templates de `AUTH_V2.md` publicados; confirmação obrigatória habilitada e conferida com dois cadastros reais. O último estado observado é `mailer_autoconfirm=false`, Google/e-mail habilitados e cadastro aberto. Não refazer SMTP/Google nem desativar confirmação para facilitar demonstração.
5. Já executado: APK 2.0.0/build 7 gerado com o perfil `apk` e a keystore existente. Reutilizar esse artefato enquanto o código instalável permanecer igual. Se houver correção nativa ou mudança de código que exija nova build, usar `npx eas-cli build -p android --profile apk`, manter as credenciais e registrar o novo número remoto.
6. Já executado: certificado, versão/build e instalação sobre a V1 conferidos, sem desinstalar ou limpar dados. Sessão, Google e permissão/ciclo de vida da câmera passaram no Redmi. As provas de QR/Auth e seus limites estão nos documentos de validação; Saker encerrou os pedidos adicionais de aparelhos nesta retomada. A instalação aprovada não representa aprovação de todo critério funcional.
7. Criar uma GitHub Release com o APK aprovado, somente quando a publicação estiver autorizada. Abrir o asset sem autenticação e conferir download, tamanho e assinatura. Não usar URL temporária do EAS como endereço estável da V2.
8. Preencher `site/version.json` com `schemaVersion: 1`, `platform: "android"`, a versão/build reais, o link HTTPS público do APK conferido e `publishedAt` em ISO 8601. Não colocar Client Secret, chave de serviço ou dados pessoais nesse arquivo. Todos os CTAs e o app lerão essa mesma fonte.
9. No GitHub, depois do push autorizado, abrir Actions > Publicar landing Decky > Run workflow. O workflow `.github/workflows/pages.yml` é exclusivamente manual e publica apenas `site/`. Não publica `docs/`, `.env`, `dist/` ou o aplicativo web. Settings > Pages já está em GitHub Actions; não recriar o cadastro.
10. Conferir o job de deploy, abrir `https://rbrecci.github.io/Decky/`, testar os recursos sob `/Decky/` e consultar `/Decky/version.json` sem cache. Inspecionar `Cache-Control` e confirmar a nova resposta após cada alteração. A consulta cliente usa `cache: 'no-store'`; o cache da CDN ainda precisa ser verificado publicado.
11. Com a V1 e com a V2, conferir os comportamentos de atualização que cada versão realmente implementa. A V1 distribuída antes desta mudança não contém este verificador e não passará a exibir aviso por alteração do manifesto. O teste de aviso exige uma build que já inclua o verificador e manifesto posterior; não atribuir comportamento novo à V1 antiga.
12. Só após as páginas estarem públicas, completar o Branding Google com homepage `https://rbrecci.github.io/Decky/`, privacidade `/Decky/privacidade.html` e termos `/Decky/termos.html`. Revisar o texto preparado com o responsável e cumprir as exigências reais do console. Não declarar propriedade de `expo.app` ou `supabase.co`. A abertura pública do Google e uma conta externa continuam por validar.
13. Executar a virada de dados somente pelo roteiro administrativo separado `VIRADA_V2.md`, na janela aprovada. Publicação de código ou repetição de build não pode disparar reset.

## Execução em 24/10/2026

- Exportação com o ambiente EAS `production` e publicação web concluídas com exit 0. Produção: `https://decky-brecci.expo.app`. A publicação `z4wqijzjab` contém a correção do retorno de permissão de câmera. As rotas Auth renderizam nos testes publicados.
- Migration V2 aplicada e `start-match`/`submit-action` publicadas como versão 14. Configuração Auth, SMTP real, confirmação, recuperação por SDK e jogo hospedado estão documentados em `AUTH_V2.md` e `VALIDACAO_SERVIDOR_V2.md`.
- A primeira build Android V2, número 5, foi cancelada após a regressão WebKit ser encontrada. A build 6, ID `2159b1f9-fffd-47be-ad98-0e77012fd8c0`, terminou e gerou APK de 132.618.580 bytes. `apksigner verify --print-certs` retornou exit 0, com o mesmo SHA-256 do certificado V1 registrado acima.
- `adb install -r` da build 6 retornou `Success`. O pacote instalado passou a informar versão 2.0.0/build 6. A sessão original permaneceu ativa e persistiu após encerrar/reabrir o processo; nenhum dado do app foi limpo. O login Google completo voltou ao APK e também persistiu após reiniciar o processo.
- A câmera física abriu na build 6 com permissão já concedida. O primeiro pedido de permissão revelou que o diálogo Android fechava o leitor; o teste reproduziu a falha, a correção foi escrita e a build 7 foi iniciada com a mesma keystore. A validação da build 6 não aprova automaticamente esse caminho corrigido na build seguinte.
- Build 7: `568db14c-0fbd-45d5-94c0-8f3ee9ccb8e9`, perfil `apk`, versão 2.0.0, finalizada em `2026-10-24T07:20:07Z`. APK de 132.618.708 bytes, SHA-256 `caedb4818a2895ef15742c832a8bcc678f3346f4b0d7712349d79ccde9e7e4b1`. `apksigner` conferiu novamente o certificado anterior; `adb install -r` retornou `Success`, e o pacote instalado informou build 7. A sessão foi preservada. Negar a primeira solicitação de câmera manteve a mensagem e a opção de tentar novamente; permitir na nova tentativa abriu o leitor imediatamente, com cliente ativo `br.senai.decky` na câmera 0. As árvores privadas e a captura de recusa estão em `.expo/validation-v2/build7-*.xml` e `build7-denied.png`.
- Antes da release, nenhum asset V2 foi anunciado em `site/version.json`; os campos permaneceram nulos até a prova do download público registrada abaixo. A varredura pré-publicação examinou 204 arquivos de texto candidatos e não encontrou os formatos de segredo administrativo procurados; isso não substitui a exclusão por Git ignore de `.env` e `.expo/`.

### Release e manifesto na retomada

A release [v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0) foi publicada por `rbrecci`, com alvo `c80a886`, em `2026-10-24T13:20:14Z`. O APK build 7 foi reutilizado, sem reconstrução nem troca de keystore. O download sem autenticação retornou HTTP 200 e 132.618.708 bytes; SHA-256 `caedb4818a2895ef15742c832a8bcc678f3346f4b0d7712349d79ccde9e7e4b1`. `apksigner verify --print-certs` retornou exit 0 com o certificado já aprovado, e o pacote conferiu como `br.senai.decky`, versão 2.0.0/build 7. Evidência privada: `.expo/validation-v2/release-v2-public.json`.

Só depois desse download foi preenchido e enviado o manifesto real, no commit `0592451c510caff3c455554eefa64b338f906077`, com push exit 0. O workflow [40097789183](https://github.com/rbrecci/Decky/actions/runs/40097789183) concluiu build/deploy com `success`, alvo `0592451`. A landing pública é `https://rbrecci.github.io/Decky/`, com manifesto real HTTP 200 idêntico ao local. A conferência publicada encontrou dois CTAs para o APK, seis imagens decodificadas, privacidade/termos/suporte HTTP 200, recursos sob `/Decky/` sem falhas e `pageErrors: []`. O relatório privado é `.expo/validation-v2/pages-v2-public.json`; a captura de demonstração `pages-v2-public.png` foi inspecionada.

## Conferências ainda abertas

A leitura óptica da imagem real do convite passou no APK build 7, com lobby observado e um único convidado persistido. O Chrome do Redmi também leu o QR e reentrou como participante existente sem duplicar lugar. Uma terceira entrada no cenário de sala cheia teve recusa tratada observada no APK, sem código RPC coletado. Sala removida também foi recusada com UI/servidor; QR externo sem abrir site foi relatado pelo usuário. Limites registrados, sem rodada ativa: entrada QR web de outra identidade, recusa web de cheia e contagem de frames; ver [UI_V2.md](UI_V2.md). A liberação em background também passou na build 7. APK público, landing, recursos e manifesto servido estão conferidos. A CDN do Pages anuncia cache de até 600 segundos, conforme o registro abaixo. O relato inicial de Branding publicado foi corrigido por capturas: a marca não está visível, e a homepage precisa de propriedade verificada. `In production` foi relatado; Data access dispensa verificação pelos escopos atuais. A meta pública Search Console já foi fornecida e enviada no commit `bdaa8b34aefbec932900bcccbdc390f25fc87fd9`, push exit 0. Pages `40099508710` concluiu build/deploy com sucesso. A homepage exata retornou HTTP 200, HTML igual ao local e uma meta única no head com valor literal conferido. Saker confirmou sucesso da propriedade no handoff, sem inspeção direta do painel. Registro conservador em 24/10/2026 às 10:49 BRT (`13:49Z`); próxima tentativa de Branding somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`). A meta é permanente. Branding, conta externa depois desse estado e aviso entre builds com verificador continuam pendentes. A V1 antiga não contém esse recurso.

Saker relatou concluir o formulário real de recuperação e entrar com a senha nova; a QA teve senha anterior recusada e dados preservados. Horário posterior de autenticação e UI sem identificação da QA não provam, sozinhos, aceite da senha nova por login; ver [AUTH_V2.md](AUTH_V2.md). Saker dispensou a rodada adicional de fontes/teclado/login QA e encerrou os pedidos de aparelhos, incluindo ingresso novo QR web no host ao vivo por indisponibilidade de outra conta. Esses limites não foram aprovados e não são handoffs ativos nesta retomada. Safari em aparelho Apple continua indisponível. A restauração local do backup e os ensaios Auth Admin/Storage não representam autorização técnica para declarar a virada global concluída.

## Cache publicado e limite de atualização

Raiz e `version.json` retornaram `Cache-Control: max-age=600`, ETag e Last-Modified. A consulta sem cache observada retornou `Age: 0` e MISS, com manifesto idêntico ao arquivo local. O cliente usa `cache: 'no-store'`, mas isso não comprova propagação instantânea de uma próxima alteração pela CDN. Considerar a janela anunciada de até 600 segundos e conferir a resposta publicada depois de cada nova release; não apresentar a prova atual como aviso de atualização já observado entre duas builds.

Após a inserção da meta pública Search Console, o workflow [40099508710](https://github.com/rbrecci/Decky/actions/runs/40099508710) concluiu build/deploy com sucesso no commit `bdaa8b34aefbec932900bcccbdc390f25fc87fd9`. A homepage exata, sem query/login/cookies/autenticação, retornou HTTP 200 e hash HTML igual ao arquivo local. O parser confirmou uma única tag de verificação dentro do head, com o conteúdo literal de 43 caracteres fornecido pelo usuário. Evidência privada: `.expo/validation-v2/pages-google-verification.json`. Saker confirmou depois `Propriedade verificada com sucesso` em handoff, sem inspeção direta do painel. Horário conservador: 24/10/2026 às 10:49 BRT (`13:49Z`). Manter a meta permanentemente. Isso não aprova Branding: a próxima tentativa deve ocorrer somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`).

Nessa nova conferência, a homepage retornou `max-age=600`, `Age: 0` e MISS; o manifesto permaneceu HTTP 200/build 7, mas veio com `Age: 21` e HIT apesar da consulta cliente sem cache. Esse resultado comprova cache presente na CDN e reforça o limite de propagação; não houve mudança do manifesto ou nova build.

O workflow segue as ações oficiais [Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Versão e build nativas usam [Expo Application](https://docs.expo.dev/versions/v57.0.0/sdk/application/); assinatura segue [Android App Signing](https://developer.android.com/studio/publish/app-signing).
