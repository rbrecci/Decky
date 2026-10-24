# Autenticação da V2

Estado em 23/10/2026: código local implementado e verificado por testes automatizados. Naquela entrega, fluxos reais de SMTP, Google e APK continuavam pendentes e nenhuma configuração remota ou publicação havia sido executada. SMTP, cliente Web Google, Site URL e testadores já estavam configurados por Saker conforme [PREPARO_V2.md](PREPARO_V2.md). A validação hospedada de 24/10/2026 está registrada ao final deste documento.

## Contratos implementados

- Senha continua no Supabase Auth. Cadastro informa confirmação pendente; login oferece reenvio e recuperação, com bloqueio de solicitação duplicada e intervalo local mínimo de 60 segundos. O servidor continua sendo a autoridade de rate limit.
- Google usa Supabase OAuth com PKCE e navegador do sistema no APK. O cliente Web Google já criado atende esse fluxo; não há SDK nativo Google nem necessidade nova de SHA para ele.
- O callback aceita somente a origem/caminho esperados. Código repetido compartilha a troca em andamento; depois de consumido não restaura uma sessão encerrada. Falta de verifier exige iniciar Google novamente no mesmo aparelho.
- O verifier e a sessão Android ficam no SecureStore, em blocos para suportar sessões grandes. A sessão V1 em AsyncStorage é migrada e sua cópia antiga é removida após a escrita protegida. A web usa o armazenamento do navegador. Não há `service_role`, Client Secret ou senha SMTP no bundle.
- Quando o runtime nativo não oferece RNG ou SHA-256, a ponte `src/auth/crypto.ts` usa Expo Crypto para fornecer as operações exigidas pelo SDK. `fast-text-encoding` fornece TextEncoder UTF-8 se faltar no Hermes. Sem RNG, SHA-256 ou TextEncoder após a preparação do ambiente, Google é recusado com mensagem tratada; não se usa a alternativa `plain` do SDK.
- Um perfil sem nome Decky válido abre a escolha do nome antes do jogo. Nome Google utilizável pode preencher o campo. `set_my_display_name` usa a identidade autenticada no servidor e mantém os dados do mesmo perfil.
- Recuperação e confirmação usam páginas HTTPS do jogo, inclusive entre aparelhos. O token hash fica no fragmento do link, que não integra a requisição HTTP. A página conserva o token em memória e limpa a URL; só o botão explícito chama `verifyOtp`. Robô que apenas visita o link não consome o token.
- A recuperação usa um segundo cliente Supabase sem persistência, separado da sessão do jogo. Abrir o link de outra conta não sobrescreve a sessão existente antes da troca. Reload não reaproveita uma autorização de recuperação gravada no aparelho.
- A troca exige sessão emitida por `verifyOtp` com tipo `recovery`, identidade ainda válida no servidor, senha válida e confirmação igual. `type=recovery` na URL não autoriza a troca. O contexto é encerrado após o servidor aceitar a senha; as sessões locais dos dois clientes são encerradas para o novo login. Se o logout falhar depois de a senha ter sido salva, a tela informa os dois resultados separadamente e permite tentar encerrar de novo.
- Não há promessa de revogação instantânea de todos os access tokens antigos. A política efetiva do projeto ainda precisa ser validada em dois aparelhos.
- Ao iniciar ou voltar ao primeiro plano, o cliente confere o usuário pelo servidor. Conta removida ou token recusado encerra a sessão local e desmonta as telas protegidas; indisponibilidade da rede preserva a sessão salva para uma nova tentativa.

## Ações exatas de painel, após publicar e validar as rotas

Não repetir os cadastros iniciais nem substituir credenciais. Esta seção conserva o roteiro da preparação original; redirects, templates e confirmação já foram publicados e comprovados na continuação de 24/10/2026, registrada ao final. Na retomada, executar apenas os passos ainda pendentes: Branding depois da espera indicada, conta externa Google e as provas funcionais restantes. O relato inicial de Branding publicado foi corrigido pela captura posterior do console, conforme abaixo.

1. Publicar o bundle web V2 no EAS Hosting, por uma operação posteriormente autorizada. Verificar abertura direta e reload de `https://decky-brecci.expo.app/auth/callback`, `/auth/recovery` e `/auth/confirm`, sem 404. Não mudar os templates antes dessa prova.
2. No Supabase do projeto `yfijjtibyblzuplhtxbd`, abrir Authentication > URL Configuration. Manter Site URL `https://decky-brecci.expo.app`. Acrescentar somente estes Redirect URLs de produção:
   - `https://decky-brecci.expo.app/auth/callback`
   - `https://decky-brecci.expo.app/auth/recovery`
   - `https://decky-brecci.expo.app/auth/confirm`
   - `decky://auth/callback`
3. Para testar Google na web local, acrescentar temporariamente o callback da origem local realmente usada, como `http://localhost:8081/auth/callback`. Conferir a porta do servidor antes de salvar. Retirar os callbacks de desenvolvimento da configuração pública ao encerrar os testes. Não usar wildcard amplo de produção.
4. No Supabase > Authentication > Email Templates, trocar somente os templates abaixo, em português. Não usar `ConfirmationURL` nestes dois fluxos: ela valida antes de chegar à página e pode ser consumida por scanner de e-mail. O destino HTTPS abaixo é intencional também quando a solicitação começa no Android.
5. Em Authentication > Sign In / Providers > Email, habilitar confirmação de e-mail para o lançamento V2 somente depois de comprovar cadastro e reenvio completos. Não desligar a confirmação para demonstração.
6. Manter o Google client Web existente, callback Supabase já salvo e escopos `openid`, e-mail e perfil. A landing e as páginas informativas agora estão públicas e conferidas: homepage `https://rbrecci.github.io/Decky/`, privacidade `https://rbrecci.github.io/Decky/privacidade.html` e termos `https://rbrecci.github.io/Decky/termos.html`. Usar essas URLs em Branding, sem declarar propriedade de `expo.app` ou `supabase.co`. Salvar Branding mantém rascunho; cumprir o fluxo real `Verify Branding` > `Ready to publish` > `Publish branding` antes de tratar a marca como efetivamente publicada, conforme a [documentação oficial de verificação](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), consultada em 24/10/2026 e atualizada em 19/08/2026. Audience externo/produção é um estado separado, a conferir no console; configuração salva não prova login de conta externa. Propriedade só pode ser declarada sobre domínio sob controle do responsável.

### Recuperação: assunto e corpo

Assunto: `Redefina sua senha do Decky`

```html
<h2>Recuperar acesso ao Decky</h2>
<p>Você solicitou uma nova senha. Abra o Decky e confirme a troca na página:</p>
<p><a href="https://decky-brecci.expo.app/auth/recovery#token_hash={{ .TokenHash }}">Escolher nova senha</a></p>
<p>O link é individual e expira. Se você não solicitou a troca, ignore este e-mail.</p>
<p>A troca só ocorre depois de você preencher e confirmar a nova senha.</p>
```

### Confirmação: assunto e corpo

Assunto: `Confirme seu e-mail no Decky`

```html
<h2>Bem-vindo ao Decky</h2>
<p>Confirme seu endereço para entrar na sua conta:</p>
<p><a href="https://decky-brecci.expo.app/auth/confirm#token_hash={{ .TokenHash }}">Confirmar e-mail</a></p>
<p>Na página, toque em Confirmar e-mail. Se você não criou uma conta, ignore este e-mail.</p>
```

## Roteiro original de validação hospedada

A lista abaixo conserva a matriz preparada antes das provas reais. Cadastro/confirmação, recuperação, Google com conta existente e outros casos já têm evidências nas seções de 24/10/2026; não repetir toda a matriz por esse roteiro. As pendências atuais estão no fechamento deste documento.

- Cadastro com confirmação e reenvio, recebimento em caixa externa e spam, token expirado/usado e link aberto em outro aparelho. O recebimento SMTP anterior não prova estes fluxos da V2.
- Recuperar uma conta existente sem alterar seu ID, histórico ou MMR; provar senha antiga recusada e nova aceita. Conferir sessão anterior em outro aparelho e registrar o resultado real.
- Google web e APK: conta testadora, cancelamento, consentimento negado, callback com app aberto e fechado, persistência após reiniciar e logout. Expo Go não prova retorno do APK.
- Alternar senha/Google no mesmo e-mail verificado e conferir uma única identidade Supabase; testar separadamente conta não confirmada e e-mails diferentes. A vinculação automática é do Supabase, sem merge implementado pelo Decky.
- Testar uma conta externa depois do estado público correto do Google e validar a capacidade/entrega do Gmail escolhido para o lançamento. Configuração salva não comprova disponibilidade pública.

## Evidências automatizadas em 23/10/2026

Os testes de Auth usam mocks do SDK para exercitar contratos e transições; não comprovam execução do provedor, envio SMTP nem armazenamento real no Android.

- Vermelho inicial de comportamento: `npm test -- tests/app/auth-flow.test.ts --reporter=dot` retornou exit 1, `26 failed | 7 passed (33)`. Exemplo: `expected ... 'E-mail inválido' but got 'not_implemented'`; callback esperado `decky://auth/callback` devolvia string vazia.
- Vermelho do armazenamento: `npm test -- tests/app/auth-storage.test.ts` retornou exit 1, `5 failed (5)`, incluindo `expected null to be 'verifier'` e sessão V1 não migrada.
- Vermelho do isolamento: `npm test -- tests/app/auth-config.test.ts` retornou exit 1, `expected undefined to be defined` para o cliente de recuperação. A configuração final verifica cliente distinto, sem persistência e sem consumo automático da URL.
- Vermelho de cripto: `npm test -- tests/app/auth-crypto.test.ts` retornou exit 1, `3 failed | 1 passed (4)`; a ponte não fornecia RNG/SHA-256. O teste adicional de Google sem cripto falhou antes da guarda ser implementada.
- Vermelho da persistência do nome: o cenário de `saveDisplayName` exigiu refresh do token e falhou com `expected ... 1 times, but got 0 times`, antes de incluir `refreshSession` após a RPC.
- Vermelho do encerramento após troca: os dois cenários falharam antes da correção, com logout chamado uma vez em vez de duas e erro de rede indevidamente propagado como falha da troca já salva.
- Vermelho do TextEncoder: o teste com o global ausente falhou com `expected undefined to be defined` antes de adicionar o polyfill. Depois, codificou corretamente o vetor UTF-8 `João 🃏`.
- Integração local com SDK Supabase real: `signInWithOAuth` gerou `code_challenge_method=s256`, desafio correspondente ao digest simulado, redirect nativo correto e verifier persistido, sem fazer requisição de rede. Expo Crypto e armazenamento nativo permanecem simulados nesse teste; não é execução de APK.
- Verde final: `npm test -- tests/app/auth-flow.test.ts tests/app/auth-storage.test.ts tests/app/auth-config.test.ts tests/app/auth-crypto.test.ts` retornou exit 0, `4 passed (4)` e `47 passed (47)`.
- `npm run typecheck` retornou exit 0 após as alterações de autenticação.
- Regressão real encontrada no navegador: `history.replaceState` direto permitia ao Expo Router restaurar o fragmento original. O teste de URL limpa falhou por timeout antes da correção. O estado da rota agora é normalizado por `replaceParams`, e a limpeza preserva `history.state` depois do commit inicial do Router. Não há espera arbitrária para validar token.
- `node scripts/verify-auth-v2.cjs`, executado com o caminho local de Playwright e Edge headless, retornou exit 0: quatro rotas sensíveis com hash/query limpos, zero verificações automáticas, uma verificação após clique explícito, nenhuma exceção JS. Logo Decky e G Google decodificaram em `1254x1254` e `200x204`. O [registro do navegador](evidencias-v2/auth-web.json) identifica o ambiente simulado. Imagem ainda em carregamento não foi tratada como asset ausente.

As rotas públicas locais são `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/auth/recovery`, `/auth/confirm` e `/complete-profile`. As páginas de recuperação/confirmação sem token têm estado de novo envio e não chamam `verifyOtp` ao carregar.

## Fontes consultadas

- [Supabase: PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), incluindo a exigência de verifier no mesmo aparelho do início do OAuth.
- [Supabase: autenticação por senha](https://supabase.com/docs/guides/auth/passwords), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp) e [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser).
- [Supabase: Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) e [deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
- [Expo: WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/). A versão foi escolhida pelo mapa de compatibilidade do Expo instalado, não pela versão mais recente da documentação.
- [Expo Crypto do SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/) e código instalado de `@supabase/auth-js`, `generatePKCEVerifier` e `generatePKCEChallenge`, conferidos antes da ponte nativa.
- Ícone G obtido do [asset oficial do Google](https://developers.google.com/static/identity/images/g-logo.png), sem alteração de marca, usado no botão branco de identificação do provedor.
- [fast-text-encoding](https://github.com/samthor/fast-text-encoding), versão `1.0.6` conferida no registro npm antes da inclusão e fixada no lockfile. É usado somente como polyfill UTF-8; não gera números aleatórios nem implementa criptografia.
- Changelog Supabase consultado em 23/10/2026. A retirada anunciada de cifras CBC TLS 1.2 afeta clientes antigos; não muda os contratos JS usados aqui.

## Modern Web Guidance

- `autofill-sign-in-form`: usei formulário semântico na web, identificadores estáveis, senha com `current-password` e recuperação acessível. Regra aplicada: "Use autocomplete=\"current-password\" and id=\"current-password\" for an existing password".
- `autofill-sign-up-form`: usei `new-password` para cadastro e recuperação e preservei colagem de senha. Regra aplicada: "For a sign-up form, use autocomplete=\"new-password\"". A confirmação adicional foi mantida por ser requisito explícito da especificação.

## Validação hospedada em 24/10/2026

As operações abaixo foram autorizadas por Saker na continuação da publicação da V2. O login oficial da CLI Supabase foi concluído com a participação do usuário; `supabase whoami` confirmou `rbrecci`, exit 0. Tokens, chaves e senhas não fazem parte deste documento.

### Configuração efetiva

- A web publicada renderizou `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/auth/recovery` e `/auth/confirm` em Firefox real, com HTTP 200 e zero erros JS, conforme `.expo/validation-v2/public-routes-firefox.json`.
- Um diretório de configuração temporário e ignorado declarou apenas Site URL, os quatro redirects de produção, assuntos e conteúdos de confirmação/recuperação. `supabase config diff` confirmou que Google, SMTP e demais propriedades remotas não declaradas seriam preservados.
- `supabase config push` retornou exit 0 e informou cinco propriedades publicadas: redirects, dois assuntos e dois conteúdos HTML. O diff posterior não apresentou diferenças declaradas. Os templates usam `TokenHash` no fragmento HTTPS e os textos aprovados acima.
- Depois da prova real de confirmação e recebimento de recuperação, uma segunda alteração ativou somente `auth.email.enable_confirmations`. O diff registrou `false -> true`; o push retornou exit 0. A leitura pública de Auth retornou HTTP 200, `mailer_autoconfirm=false`, Google e e-mail habilitados e cadastro aberto. Nenhuma credencial Google ou SMTP foi substituída.

### E-mail, confirmação e recuperação

Foi criada uma conta de QA separada, com alias da caixa Gmail do próprio usuário. O programa administrativo criou essa conta sem confirmação, sem alterar contas existentes. `resend({ type: 'signup' })` retornou sem erro às `03:41:34Z`. Saker recebeu o e-mail real no Gmail do Redmi, com assunto e corpo preparados.

Antes de confirmar, o login da conta de QA foi recusado com HTTP 400 e `email_not_confirmed`. Depois de abrir o link no Redmi, a página exibiu o botão de confirmação e a consulta administrativa ainda retornou `confirmed=false`, às `03:43:14Z`. Depois do clique explícito, a página exibiu sucesso, o servidor retornou `confirmed=true` e o login com senha foi aceito. A solicitação começou no computador e a confirmação terminou no Redmi. Isso comprova confirmação entre aparelhos e ausência de consumo automático no GET observado.

A recuperação foi solicitada pelo SDK público às `03:43:52Z`, sem erro. O e-mail real chegou na caixa externa e seu link abriu a página `Nova senha` no Redmi, com os campos e a ação explícita. O formulário não foi preenchido nem submetido nessa observação.

A troca de senha foi exercitada separadamente por terminal com o SDK real, usando exclusivamente a conta de QA e um token de recuperação emitido pela API Admin. `verifyOtp` concedeu a sessão de recuperação e `updateUser` alterou a senha. A senha antiga foi recusada com `invalid_credentials`, a nova foi aceita e o token já consumido foi recusado com `otp_expired`. O UUID, o único perfil, os dois ratings de 500 e o histórico vazio permaneceram iguais. Isso prova a integração real Auth/SDK, mas não equivale à submissão do formulário de recuperação no Redmi nem ao consumo do token recebido por SMTP.

Uma sessão anterior, obtida em outro cliente antes da troca da senha de QA, também foi conferida diretamente por HTTP: `/auth/v1/user` retornou 403 com `session_not_found` e o refresh retornou 400 com `refresh_token_not_found`. O resultado vale para essa sessão e esses endpoints observados; não declara invalidação instantânea de todo canal Realtime, PostgREST ou JWT existente.

Depois de ativar confirmação global, `signUp` comum por cliente público criou um segundo alias de QA às `03:47:11Z`, sem sessão e com confirmação obrigatória. O envio retornou sem erro. O link original foi aberto e submetido no Redmi depois de mais de três horas; a página exibiu `Este link não está mais disponível. Solicite um novo link.`. A leitura administrativa às `07:02:43Z` confirmou que a conta continuava sem confirmação. Um único reenvio real foi solicitado às `07:02:44Z`, sem erro. O novo link foi confirmado no Redmi, que exibiu sucesso. A conferência às `07:12:10Z` provou confirmação no servidor, login com senha aceito, mesmo UUID de cadastro, exatamente um perfil, 500 MMR em Duelo e Duplas e histórico vazio. As capturas privadas são `.expo/validation-v2/signup-expired.png` e `signup-success.png`; o resultado administrativo está em `auth-config/signup-confirmed-real.json`.

### Google e limites

O início real de OAuth foi conferido sem escolher uma conta: tanto o redirect web quanto `decky://auth/callback` receberam HTTP 302 para `accounts.google.com`, com callback Supabase correto e PKCE `s256`.

Depois de instalar o APK V2, build 6, foi comprovada a migração da sessão anterior. Em seguida, o teste encerrou a sessão e abriu `Entrar com Google` pelo aplicativo. O navegador do sistema mostrou a conta já autenticada e o consentimento de nome, foto e e-mail. A continuação retornou ao Decky autenticado. Depois de force-stop e nova abertura, o aplicativo manteve a sessão. As árvores privadas `google-return.xml` e `google-persisted.xml` registram esse retorno e a persistência.

O fluxo próprio do site também foi exercitado no Chrome do Redmi: depois de sair da sessão QA, `Entrar com Google` abriu a escolha de conta. Voltar pelo Android retornou ao login com os controles habilitados. Uma nova tentativa com a conta autorizada concluiu o OAuth e retornou à sessão web autenticada. As árvores privadas `web-google-cancel.xml` e `web-google-final.xml` registram o cancelamento por navegação e a conclusão web. Essa prova não equivale a negar explicitamente o consentimento do provedor.

A leitura administrativa às `07:10:05Z` confirmou exatamente um usuário Auth e um perfil para o e-mail escolhido. As identidades `email` e `google` pertencem ao mesmo UUID; usuário e perfil foram criados antes da V2. Os ratings das duas modalidades e dez partidas anteriores à V2 continuam presentes. Esses registros provam vínculo com a conta existente, sem criação de uma segunda conta. A igualdade exata de saldos e histórico contra o backup anterior ao Google ainda não foi comparada nesta leitura; não confundir presença de dados antigos com comparação completa antes/depois. Nenhum ID, e-mail ou nome pessoal integra esta evidência pública.

Na retomada, Saker relatou um novo login Google concluído no Chrome do Redmi. O SQL confirmou uma única conta Google criada às `13:31:16.161788Z`, uma identidade Google, um perfil, 500 MMR em Duelo e Duplas, histórico vazio e uma sessão OAuth. A consulta de `auth.sessions` com `auth.mfa_amr_claims` identificou `client_kind=android_chrome` e `method=oauth`. Isso comprova criação de conta Google nova na web móvel; a reutilização posterior no APK está registrada ao final, separadamente.

Nas provas anteriores, o consentimento apresentou o domínio do projeto Supabase. Isso foi registrado como observação, sem classificar como defeito funcional. Na retomada, o inventário CUA continuou sem browsers/apps conectados. No handoff, Saker informou o erro literal `Missing domain: "rbrecci.github.io"`; foi orientado a acrescentar somente `rbrecci.github.io` em Authorized domains > Add domain, sem DNS ou troca de provedor/cliente/segredo/callback. Depois confirmou explicitamente: `links salvos e branding publicado, deu certo`. O salvamento das URLs públicas e a publicação de Branding estão registrados como relato do responsável; o agente não observou o console diretamente nesta sessão.

No handoff de Audience, Saker informou que o console está `In production`. Esse estado é relato explícito do responsável; o tipo External não foi inspecionado diretamente. A captura privada `.expo/validation-v2/google-verification-center.png`, fornecida pelo usuário e inspecionada, separou os dois estados: Branding não está sendo mostrado aos usuários; Data access dispensa verificação porque não há escopos sensíveis/restritos. Portanto, não há evidência de uma exigência geral de revisão dos escopos. O relato anterior de Branding publicado foi corrigido por essa captura: a marca continua sem publicação/visibilidade comprovada.

Ao usar `Verify branding`, o console exibiu que a homepage `https://rbrecci.github.io/Decky/` não está registrada ao responsável, exigiu comprovar propriedade e orientou aguardar 24 horas antes de tentar novamente. A captura é `.expo/validation-v2/google-branding-ownership-required.png`. O handoff preparado usa Search Console na mesma conta administradora, propriedade de prefixo `https://rbrecci.github.io/Decky/` e método de tag HTML, conforme a [documentação oficial de verificação de propriedade](https://support.google.com/webmasters/answer/9008080). Nenhuma propriedade do domínio `github.io`, `expo.app` ou `supabase.co` será declarada. A meta pública foi fornecida pelo usuário, inserida apenas no head de `site/index.html` e enviada no commit `bdaa8b34aefbec932900bcccbdc390f25fc87fd9`, push exit 0. Pages `40099508710` concluiu build/deploy com sucesso. A homepage exata foi conferida sem query, login, cookies ou autenticação: HTTP 200, hash HTML igual ao local e meta única no head com o valor literal fornecido. Saker confirmou depois `Propriedade verificada com sucesso` no handoff, sem inspeção direta do painel. O horário conservador de registro foi 24/10/2026 às 10:49 BRT (`13:49Z`). Manter a meta de verificação permanentemente. Repetir Branding somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`), nunca antes. Propriedade verificada não aprova Branding. Cumprir a espera indicada e as exigências reais; não selecionar contestação de erro ou contornar o bloqueio.

A [documentação oficial de status de publicação](https://support.google.com/cloud/answer/15549945?hl=en) separa produção e verificação; escopos básicos `openid`, e-mail e perfil podem autenticar durante testes. Por isso, o login Google novo das `13:31Z`, anterior à confirmação desse status, não comprova disponibilidade a conta externa depois da publicação. Ainda falta testar uma conta externa no estado público correto; a dispensa de Data access não aprova Branding nem esse teste.

As evidências privadas estão sob `.expo/validation-v2/auth-config/`: estados antes/depois da confirmação, envio de recuperação, troca de senha, política da sessão anterior, novo cadastro e início Google. Os arquivos de credenciais de QA permanecem ignorados e não devem ser publicados. O recebimento foi comprovado na caixa usada, sem ensaio de carga, capacidade de envio ou garantia de entrega para todo destinatário.

Na retomada, foi preparado um novo handoff de recuperação para a conta de QA de cadastro já existente. O snapshot anterior confirmou login aceito com a senha anterior, um perfil e histórico vazio. A solicitação pública de recuperação foi aceita pelo SMTP às `13:20:34Z`. Saker relatou concluir a entrada, confirmação e submissão da nova senha no formulário publicado: `Salvei e entrei com a nova senha`. O agente não coletou nem submeteu essa credencial.

`node .expo/validation-v2/recovery-ui-handoff.mjs check` retornou exit 0, com relatório às `13:23:45Z`: `sameIdentity`, `profileUnchanged`, `ratingsUnchanged` e `historyUnchanged` verdadeiros; `profileCount=1`, senha anterior recusada com `invalid_credentials`, `userUpdated=true` e `laterSignInObserved=true`. O último campo é apenas um horário posterior de autenticação; pode vir de `verifyOtp` e não prova login por senha. A árvore privada `.expo/validation-v2/recovery-ui-result.xml` mostrou o Chrome no domínio `decky-brecci.expo.app` e controles autenticados do início, mas não identificou a conta de QA. O relato posterior de uso da mesma conta do APK impede atribuir essa UI autenticada à recuperação da QA.

Saker relatou a conclusão do formulário real e o novo acesso. A prova independente confirma mudança da conta de QA, senha anterior recusada e identidade/perfil/ratings/histórico preservados. O teste posterior escolhido pelo usuário foi Google; o aceite da senha nova da QA pelo formulário de login continua sem prova independente. A consulta de sessões/AMR dessa QA não encontrou novas sessões depois de `13:20:34Z`, e o horário do relatório não foi tratado como método `password`. A UI autenticada não comprova esse aceite para a QA e não há captura da mensagem de sucesso da troca. O relatório `.expo/validation-v2/auth-config/recovery-ui-handoff.json` e seu baseline contêm dados privados, permanecem ignorados e não integram a publicação. Nenhuma credencial nova foi coletada ou submetida pelo agente.

A rodada adicional combinada de fontes ampliadas, teclado virtual e login por senha da QA foi dispensada expressamente por Saker nesta sessão. Não continuar esse teste nem solicitar novamente o handoff nesta retomada. Não houve verificação adicional nem aprovação implícita do aceite da senha nova; o agente não mudou a escala de fonte, apenas leu `1.0`.

Separadamente, Saker reutilizou no APK a conta Google criada na web e informou: `Entrei no APK; não apareceu consentimento para recusar`. A árvore privada `.expo/validation-v2/google-new-native.xml`, às `13:51:58Z`, mostrou o pacote `br.senai.decky`, com controles de início autenticado. O SQL do mesmo cadastro criado às `13:31:16.161788Z` confirmou uma identidade Google, um perfil, 500 em cada modalidade, histórico vazio e duas sessões OAuth; a mais recente foi criada às `13:51:02.189005Z`. A conta nova da web foi reutilizada no APK sem duplicar perfil, depois do relato de Audience `In production`.

O provedor não apresentou consentimento para recusa nessa tentativa; a recusa explícita continua não exercitada. Também não foi comprovado que a conta estava fora da lista de testadores, portanto esse login posterior não é atribuído a público externo irrestrito. O teste não reabriu fontes/teclado/login por senha QA.

Saker encerrou os pedidos adicionais de aparelhos nesta retomada. Não há teste de consentimento, conta externa ou novo login por senha aguardando participação; não insistir nem reabrir as rodadas nesta sessão. A dispensa não aprova os limites sem prova. A comparação exata dos dados pessoais contra o backup também não foi executada; não houve nova restauração para essa comparação. A ação Google futura é Branding somente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`).

Continuam sem prova nesta frente: aceite independente da senha nova da QA após o formulário de recuperação (rodada adicional dispensada pelo usuário), igualdade exata dos dados pessoais contra o backup pré-Google, recusa explícita do consentimento, Branding publicado após a espera de 24 horas e login de conta externa no estado público correto. `In production` foi relatado; Data access sem verificação necessária e Branding não visível foram observados nas capturas fornecidas. A conta Google nova na web móvel tem prova SQL/OAuth. A conclusão do formulário e o novo acesso foram relatados por Saker; mudança da conta, recusa da senha anterior e invariantes têm prova independente. O cancelamento por navegação e o login Google completo na web foram observados. O retorno e a persistência no APK também foram observados, sem inspeção direta do SecureStore. Os testes automatizados anteriores não aprovam os casos ainda abertos.
