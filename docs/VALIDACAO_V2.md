# Estado e validação da V2

Data inicial: 23/10/2026. Atualização: 24/10/2026. Repositório: Decky. Estado: web e backend V2 publicados, autenticação hospedada validada parcialmente e APK 2.0.0/build 7 instalado e conferido no Redmi. Release pública do APK conferida e manifesto real e landing publicados e conferidos no Pages. A virada de dados e o lançamento completo continuam pendentes.

## Estado preservado

O Git iniciou em `main`, commit `029e17e`, com `.env.example` excluído, `DeckyV2Spec.md` modificado e `docs/PREPARO_V2.md` novo. Essas alterações foram preservadas durante a implementação. A preparação foi depois atualizada como passagem viva para finalizar a V2; a especificação continua registrando os requisitos aprovados.

Na implementação local inicial não houve commit, push, deploy, release, reset ou troca de credencial. A continuação autorizada publicou web/backend e instalou o APK no Redmi, conforme as evidências de 24/10 abaixo. `.env` e as evidências privadas continuam ignorados. Não houve reset dos dados existentes.

## O que foi implementado

- V2-01: carta oculta consome carta/vez, não compara força, não revela seu valor publicamente e empata se todas forem ocultas. A primeira vaza continua aberta. Motor, persistência, reenvio e projeção foram exercitados com migrations reais em PGlite.
- V2-02: landing estática em `site/`, páginas informativas, workflow manual de Pages, manifesto compartilhado e aviso Android com versão/build nativos, timeout, trava de requisição e intervalo de retorno. O manifesto não anuncia uma release inexistente. As capturas da página usam interface e dados de demonstração locais identificados.
- V2-03/04/06/07: textos removidos, papéis com capacidade dinâmica e nomes Duelo/Duplas. Mensagens de erro não afirmam capacidade fixa de quatro jogadores no Duelo.
- V2-05: MMR inicial/piso 500, ajuste de 5 por degrau, vitória entre 5 e 55, médias sem arredondar em duplas, 13 títulos e extrato de saldo anterior/variação real/saldo final. Escrita no servidor com locks e idempotência. Dados antigos não foram resetados nem recalculados nesta implementação.
- V2-08: visibilidade privada por padrão, criação pública opcional, projeção mínima autenticada, RLS, gatilhos, invalidações Realtime e recuperação por polling. Entrada segue a operação oficial com trava da sala e revalidação de capacidade/fase.
- V2-09: cabeçalho fixo, duas paginações independentes de cinco itens, sexto item apenas como sinal, skeleton por seção, recuo após página vazia e metadados de notas independentes da página de partidas. Respostas antigas e dados de outra identidade são descartados.
- V2-10: proteção de manutenção/identidade ativa, programa administrativo manual e ensaio SQL de limpeza, bloqueio, recusa de conta apagada e novo cadastro em 500. A operação de produção permanece exclusivamente na janela aprovada.
- V2-11/12: confirmação e reenvio, recuperação HTTPS entre aparelhos com TokenHash e ação explícita, Google PKCE, callbacks validados, sessão nativa em SecureStore, RNG/SHA-256 nativos e codificador UTF-8 para o SDK. A sessão de recuperação é isolada da sessão do jogo.
- V2-13/14: telas fluidas, partida usando espaço adicional, mão medida no painel, conteúdo rolável em telas baixas e risco dourado com a medida real do título. A seleção de carta permanece durante redimensionamento.
- V2-15: leitor de QR por câmera traseira, permissão apenas ao abrir, pausa/trava de frames, parser de convites Decky e liberação da câmera ao fechar, perder foco ou entrar em segundo plano. Entrada manual continua disponível.

## Evidências da implementação local de 23/10/2026

Registros detalhados dos testes vermelhos e verdes estão em `AUTH_V2.md`, `UI_V2.md` e `VALIDACAO_SERVIDOR_V2.md`. Os primeiros comandos que falharam por instalação incompleta não foram tratados como testes vermelhos funcionais.

- Servidor: oito arquivos SQL e 94 testes passaram, exit 0, em 214.26 segundos na execução consolidada do agente. A conferência adicional de ACL/manutenção passou em dois testes. A suíte inclui upgrade sem reset, fórmula/fronteiras/piso, rollback, reenvio, privacidade após vaza/reconexão, paginação e ensaio de reset. PGlite usa uma conexão e não prova concorrência física.
- App/motor: a execução de `npm test -- tests/app tests/engine --maxWorkers=1` retornou exit 0 com 31 arquivos e 362 testes após a integração inicial. A autenticação recebeu depois uma prova adicional com o SDK real de construção do authorize PKCE: `code_challenge_method=s256`, RNG/digest simulados e nenhuma chamada de rede. A bateria final conjunta está registrada abaixo.
- Atualização: seis testes passaram depois do vermelho com quatro falhas reais. Cobrem manifesto, versão numérica, build, HTTP/JSON inválido, rede, timeout, uma requisição em andamento, intervalo de 15 minutos e conservação de aviso. O prazo também termina se o fetch não reage ao abort.
- Administração: quatro testes do orquestrador passaram depois de quatro falhas por contrato ainda não implementado. Conferem alvo, confirmação, ordem, retomada e recusa de contagem restante. `node scripts/admin/reset-v2.mjs --help` retornou exit 0 sem rede ou exclusão.
- Integração de logout: dois testes falharam antes da correção, por rejeição de rede sem tratamento e dois envios simultâneos; depois passaram. O início apresenta erro e permite tentar novamente.
- Mensagens: dois testes falharam antes de retirar a capacidade fixa de duplas e identificar manutenção; depois passaram.
- Tipos: `npm run typecheck` retornou exit 0. `dist/`, `.expo/` e `web-build/` foram excluídos da entrada TypeScript para não analisar arquivos gerados enquanto o export os substitui.
- Export: `npm run build:web` retornou exit 0 e exportou `dist/`, com bundle principal de aproximadamente 2,6 MB. Isso comprova export local, não deploy ou funcionamento do backend V2 hospedado.
- Configuração: `npx expo install --check` retornou exit 0. `expo config --type introspect` confirmou versão 2.0.0, pacote `br.senai.decky`, scheme `decky`, logo oficial, câmera habilitada e permissão de áudio ausente.

## Evidência de navegador

`scripts/verify-web-v2.cjs` usa Edge headless e respostas Supabase simuladas, sem enviar operações de conta ou jogo ao projeto real. Executou 88 verificações de largura, com `pageErrors: []` e `tokenAutoConsumption: 0`. O relatório está em `evidencias-v2/web-matrix.json` e as capturas em `evidencias-v2/`.

Foram oito tamanhos por tela: 320x568, 375x667, 390x844, 667x375, 768x1024, 1024x768, 1366x768 e 1920x1080. As telas exercitadas foram login, cadastro, recuperação solicitada, recuperação por token, confirmação, início, criar sala, entrar/salas públicas, ranking, histórico e landing. A checagem mede overflow horizontal global, não garante que todo controle de todas as telas cabe simultaneamente sem rolagem.

O jogo foi exercitado separadamente na fixture local nas mesmas oito dimensões, com nomes longos e zero erros de página. A verificação de redimensionamento confirmou `aria-pressed=true` antes/depois; pedidos de truco ativos foram conferidos em quatro tamanhos. A refutação visual encontrou e corrigiu uma mesa que empurrava a mão para fora da primeira viewport de 390x844.

`scripts/verify-auth-v2.cjs` retornou exit 0: quatro URLs sensíveis limpas, nenhuma validação no GET, uma validação após clique, logos Decky/Google decodificados e zero erros JS. Os casos cobrem fragmento e query de recuperação/confirmacão. O relatório está em `evidencias-v2/auth-web.json`.

O smoke reproduziu a falha real de limpeza de URL antes de corrigi-la: o Router regravava o hash depois de `replaceState`. A correção sincroniza os parâmetros da rota e o histórico após o commit, conservando o token em memória. Nenhuma tentativa de corrigir essa URL consumiu um token real.

Para repetir os scripts de navegador, disponibilizar Playwright e Edge e definir `DECKY_PLAYWRIGHT_PATH` para o módulo instalado quando ele não estiver no projeto. Esta sessão reutilizou o Playwright já disponível no cache da ferramenta, sem adicioná-lo às dependências do app. Usar `DECKY_WEB_URL` e `DECKY_SITE_URL` para os servidores locais; padrões 8081 e 4173/site. Os testes não são configurados para usar uma URL de produção.

## Leituras reais durante a preparação local de 23/10/2026

Naquela etapa, o MCP específico retornou o projeto Supabase `yfijjtibyblzuplhtxbd`. `list_migrations` mostrou apenas as sete migrations anteriores; a migration V2 ainda estava local. A consulta pública de configurações Auth retornou HTTP 200, Google/e-mail habilitados e confirmação automática de cadastro ativa. Nenhuma configuração foi alterada naquela preparação. A publicação e a configuração de 24/10 estão registradas na continuação abaixo.

No Android, `apksigner` validou o APK instalado 1.0.0/build 4. Seu certificado SHA-256 coincidiu com a JKS Default do EAS. Essa leitura inicial não comprovava execução da V2. A geração, assinatura e instalação posteriores das builds 6 e 7 estão em `DISTRIBUICAO_V2.md`.

`npm audit` retornou oito alertas transitivos, três moderados e cinco altos, nas cadeias de ferramentas Expo e parser de query. A atualização compatível dos patches SDK 57 reduziu a contagem inicial de 11. `npm audit fix --dry-run --json` propôs zero mudanças compatíveis; não foi usado `--force`, downgrade de SDK ou override não validado. Esse resultado precisa ser considerado na revisão de distribuição.

## Pendências concretas antes do lançamento

1. Completar entrada QR web de identidade ainda fora da sala, frames repetidos, sala removida/cheia e duas sessões com o host exibindo o QR do lobby ao vivo. A leitura óptica no APK build 7 levou à sala correta com um convidado; a web móvel leu o QR e reentrou com participante existente sem duplicar lugar. O parser e o bloqueio de frames têm testes, mas essas observações não contam tentativas nem cobrem todos os cenários CA-48/49.
2. Completar as provas de Auth que continuam nomeadas em `AUTH_V2.md`: aceite independente da senha nova da QA após recuperação, Google com conta nova/recusa explícita de consentimento, Audience externo/produção e comparação pessoal pré-Google. Branding publicado foi relatado pelo responsável, sem observação direta do console nesta sessão. Saker relatou concluir o formulário e entrar com a senha nova; a recusa da senha anterior e os dados preservados têm prova independente. `last_sign_in_at` posterior e UI autenticada sem identificação da QA não provam login por senha. Google web completo e retorno após cancelamento por AndroidBack passaram no Chrome do Redmi.
3. Conferir Safari em aparelho Apple e os cenários restantes de teclado virtual/fontes ampliadas no uso real. Firefox e WebKit em Windows, lobby/notas simulados e zoom nativo Chromium de 200% já foram exercitados; não equivalem a Safari/iPhone físico.
4. Comprovar aviso de atualização entre builds que já contenham o verificador. Release pública v2.0.0, download anônimo do APK build 7, manifesto e landing Pages já foram publicados e conferidos. A CDN anuncia `max-age=600`; não prometer mudança instantânea do manifesto. Commit/push foram explicitamente autorizados e executados com a autoria do usuário.
5. Antes da virada: comprovar recuperação operacional dos serviços hospedados, definir retenção/aviso/janela e atualizar o backup. Auth Admin, Storage e recusa de JWT de QA apagada já foram exercitados sem reset global. O backup criptografado restaurou em PostgreSQL local; isso não comprova restauração completa do serviço hospedado. CA-37/38 continuam sem execução em produção.

Os critérios CA-01 a CA-51 permanecem rastreados na especificação; testes locais não aprovam automaticamente os critérios que exigem provedor real, canal Realtime, aparelhos ou publicação.

## Continuação autorizada em 24/10/2026

- A bateria completa foi repetida antes dos deploys: 39 arquivos, 457 testes, exit 0, duração de 202,61 segundos. Depois da primeira correção de câmera, app/motor passaram em 32 arquivos e 366 testes. Depois da correção nativa, a mesma frente passou em 32 arquivos e 371 testes, exit 0. Os testes vermelhos/verdes específicos estão em `UI_V2.md`. Não foi repetida a suíte SQL sem mudança de SQL.
- Web exportada com as variáveis EAS `production` e publicada no endereço existente. A publicação que contém a correção nativa de permissão é `https://decky-brecci--z4wqijzjab.expo.app`; produção permanece `https://decky-brecci.expo.app`.
- A migration `20261023230536` e as duas Edge Functions foram publicadas. PostgreSQL real comprovou corrida pela última vaga, serialização de MMR, reenvio e rollback. Jogo hospedado, privacidade, notas e Realtime passaram. Evidências e limites em `VALIDACAO_SERVIDOR_V2.md`.
- Redirects/templates e confirmação obrigatória foram configurados sem trocar SMTP/Google. Dois cadastros separados foram confirmados no Redmi; um link expirado foi recusado e seu reenvio confirmou. A recuperação chegou por SMTP e a troca por SDK real recusou a senha antiga e aceitou a nova. Google completo no APK reutilizou a conta existente, com um perfil e provedores e-mail/Google associados. Ver `AUTH_V2.md`.
- Firefox e WebKit passaram nas 88 verificações de largura por motor. Lobby e notas passaram em 20 verificações por motor, em três motores, com backend simulado. Zoom nativo Chromium de 200% passou nas telas principais e na fixture do jogo. Essas provas estão em `UI_V2.md` e distinguem simulação de multiplayer real.
- O APK 2.0.0/build 6 foi instalado sobre a V1 no Redmi sem desinstalar nem limpar os dados. O certificado SHA-256 coincide com o instalado anteriormente. A sessão original e a sessão Google persistiram após encerramento e reabertura do processo. A build 7 foi instalada em seguida com a mesma assinatura e sessão preservada. Depois de revogar apenas a câmera para repetir o primeiro uso, negar manteve o leitor e a mensagem de recusa; tentar novamente e permitir abriu a câmera física na mesma tentativa. Home liberou a câmera, comprovada sem cliente ativo em `dumpsys media.camera`; voltar ao app mostrou a entrada com o leitor fechado. A leitura óptica foi depois comprovada na retomada abaixo.
- O backup privado foi cifrado com DPAPI para o usuário Windows atual e restaurado em PostgreSQL local. A revisão automática rejeitou a limpeza dos temporários com `blocked by policy`, sem informar outro motivo. Cópias temporárias locais permanecem ignoradas pelo Git; nenhuma delas deve ser incluída na distribuição.
- `npm audit` foi conferido novamente: oito alertas transitivos, três moderados e cinco altos. A correção automática proposta inclui troca incompatível de SDK; não foi aplicada. O estado é o mesmo já registrado na preparação local.

## Retomada de validação e registro em 24/10/2026

Saker autorizou explicitamente commit/push da V2. A configuração Git retornou `rbrecci` e `fbrecci@gmail.com`, e os commits `b3911cf` e `c80a886` registraram configuração/dependências e fontes/testes/site com essa autoria. `git push origin main` retornou exit 0, avançando `029e17e..c80a886`; `HEAD` e `origin/main` foram conferidos em `c80a88676fc8344bafa1d4f40a5921ce9cfeee84`. Depois, o manifesto real foi enviado no commit `0592451c510caff3c455554eefa64b338f906077`, com push exit 0. Não houve nova build, reaplicação de migration, troca de keystore ou reset. A exclusão preexistente de `.env.example` permaneceu fora dos commits; `.env`, `.expo/` e evidências privadas continuam ignorados.

A release [v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0), publicada por `rbrecci` em `2026-10-24T13:20:14Z` com alvo `c80a886`, reutiliza o APK build 7. O download anônimo retornou HTTP 200, 132.618.708 bytes, hash esperado e assinatura aprovada por `apksigner`, exit 0. O manifesto só foi preenchido depois dessa prova. O workflow Pages [40097789183](https://github.com/rbrecci/Decky/actions/runs/40097789183) concluiu build/deploy com `success`, alvo `0592451`. A landing e o manifesto real retornaram HTTP 200; dois CTAs usam o APK conferido, seis imagens decodificaram, privacidade/termos/suporte retornaram HTTP 200 e não houve falha de recursos sob `/Decky/` nem erro JS. Cabeçalhos de raiz/JSON incluem `Cache-Control: max-age=600`, ETag e Last-Modified; `fetch` sem cache retornou `Age: 0` e MISS na observação. Isso não garante propagação instantânea de uma próxima release. O relatório privado é `.expo/validation-v2/pages-v2-public.json`, com captura de demonstração `pages-v2-public.png` inspecionada. Detalhes em [DISTRIBUICAO_V2.md](DISTRIBUICAO_V2.md).

Na frente de recuperação, um snapshot da conta de QA existente confirmou login aceito com a senha anterior, um perfil e histórico vazio. A solicitação pública de recuperação foi aceita pelo SMTP às `13:20:34Z`. Saker relatou concluir o formulário e entrar com a nova senha; o agente não coletou nem submeteu essa credencial. `node .expo/validation-v2/recovery-ui-handoff.mjs check` retornou exit 0 às `13:23:45Z`, confirmando identidade/perfil/ratings/histórico preservados, um perfil, senha anterior recusada com `invalid_credentials`, `userUpdated=true` e `laterSignInObserved=true`. O último campo deriva de horário posterior e pode corresponder a `verifyOtp`; não comprova login por senha. A UI autenticada do Chrome em `.expo/validation-v2/recovery-ui-result.xml` não identificou a QA, e o relato posterior indicou uso da mesma conta do APK. Não atribuir essa UI ao aceite da senha nova da QA. Relatório e baseline em `auth-config/recovery-ui-handoff.json` permanecem privados e ignorados. Falta distinguir um login por senha posterior da autenticação pelo token de recuperação.

Na prova óptica, Saker apontou o Redmi com APK build 7 para `.expo/validation-v2/qr-room-CYV7ZL.png`, imagem real emitida no chat, e informou que entrou na sala. O ADB leu a UI do lobby em `.expo/validation-v2/qr-optical-apk.xml`, com `Estou pronto` e `Aguardando quem criou a sala iniciar.`. A consulta MCP da sala passou de um participante para `participants=2`, `distinct_users=2`, `host_count=1` e `guest_count=1`, mantendo lobby Duelo. O log de câmera registrou conexão às 10:18:08 e desconexão às 10:18:10 no horário local. Isso comprova leitura física, destino correto e um único convidado persistido; não conta tentativas concorrentes/frames nem representa o host exibindo o QR ao vivo.

Depois, Saker confirmou leitura do QR na web móvel, indicando uso da mesma conta do APK. `.expo/validation-v2/qr-web-current.xml`, lido às `13:26:42Z`, mostrou o lobby no Chrome; a consulta privada às `13:27:03Z` manteve dois participantes/distintos, sem a QA do cadastro. É prova óptica web e reentrada do participante existente sem duplicar lugar. A listagem indicava sala cheia, mas esse participante já estava dentro; não há prova de recusa de uma terceira identidade ou de ingresso web de uma conta nova na sala. CA-48/49 permanecem parcialmente abertos.

## Limpeza e revisão de escopo

A passagem antiga de ranqueadas foi arquivada depois de conferir ausência de referências vivas. Os ícones placeholders foram retirados após a configuração passar a apontar para a logo oficial e a busca confirmar zero referências de runtime. A especificação e a preparação continuam ativas porque há validações pendentes.

Dependências novas se limitam a câmera, navegador de autenticação, armazenamento seguro, criptografia, identificação da versão instalada e o codificador UTF-8 necessário ao PKCE nativo. Seus nomes/versões foram consultados no registro e os módulos Expo seguem o SDK 57. Não há framework novo na landing, mecanismo de atualização forçada ou Expo Updates.

## Modern Web Guidance

Na landing apliquei `optimize-image-priority`: a imagem principal usa prioridade alta e as capturas abaixo da primeira seção carregam sob demanda, com dimensões reservadas. Regra aplicada: "at most 1-2 critical images to avoid network contention". O atributo é melhoria progressiva; browsers sem suporte mantêm o carregamento padrão.

Os guias de formulário e responsividade aplicados nas outras frentes estão identificados em `AUTH_V2.md` e `UI_V2.md` com as regras específicas consultadas.

## Fechamento integrado da implementação local de 23/10/2026

Esta seção conserva a evidência da primeira entrega local. O estado atual, os testes posteriores e as pendências restantes estão nas seções de 24/10 acima. A passagem operacional para outra sessão está em [PREPARO_V2.md](PREPARO_V2.md).

`npm test -- --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000` retornou exit 0: **39 arquivos e 457 testes aprovados**, duração 251.54 segundos. É a execução conjunta depois das correções de integração, incluindo Auth, SDK PKCE, motor, SQL, reset, atualizações, QR, paginação e mensagens.

`npm run typecheck` e `git diff --check` retornaram exit 0. `npm run build:web` exportou `dist/` com exit 0 depois da correção das rotas e inclusão do codificador UTF-8.

A repetição do smoke integrado passou nas 88 verificações e confirmou adicionalmente que Voltar conserva sua posição depois da rolagem do histórico e que avançar Partidas para a página 2 mantém Notas na página 1. Não houve erro JS nem consumo automático de token.

`node scripts/verify-site-v2.cjs` passou sob o prefixo local `/Decky/`: manifesto inválido sem download, dois CTAs usando o mesmo link quando o manifesto é válido, skip link por teclado, acesso web sem JavaScript, páginas informativas e zero recursos com erro. A prioridade web no iPhone foi exercitada por simulação de user-agent, não por aparelho iOS.

A prova de fonte 200% da landing falhou primeiro em 320 pixels. O cabeçalho passou a permitir quebra de linha e os títulos passaram a quebrar palavras que não cabem. O teste passou depois em 320 e 1366 pixels, sem esconder overflow. O relatório está em `evidencias-v2/site-web.json`. Isso não é teste de zoom real do navegador nas telas do jogo.

A varredura final usou `LC_ALL=C.UTF-8 git grep -nP '[\x{2014}\x{2013}\x{2212}]'` em todos os arquivos rastreados das extensões alteradas, incluindo CSS, e `rg` nos arquivos novos. Ambos retornaram exit 1, sem ocorrências; `git diff --check` retornou exit 0. Arquivos gerados e ignorados não fazem parte dessa entrega.
