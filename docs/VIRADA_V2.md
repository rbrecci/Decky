# Virada administrativa única da V2

Atualizado em 24/10/2026. Saker autorizou expressamente apagar as contas e os dados antigos sem backup novo. O reset global foi executado entre `20:07:15Z` e `20:07:29.713Z`, com exit 0, e as verificações independentes posteriores estão registradas abaixo. Depois da limpeza das QA e das conferências finais, o serviço foi reaberto às `20:10Z` (`17:10 BRT`), com manutenção desligada e novos cadastros habilitados. Isso não declara a V2 concluída; os demais limites continuam em `VALIDACAO_V2.md`.

## Decisão atual: virada sem backup

Em 24/10/2026, Saker decidiu expressamente: `vamos seguir sem backup, me faz o passo a passo pra eu já colocar em manutenção`. A dispensa de backup final, retenção, segunda cópia e comprovação de restauração hospedada substitui as condições anteriores para esta virada. O descarte dos dados antigos foi aceito sem promessa de recuperação atual. Os backups e temporários existentes serão preservados; não são uma fotografia final nem uma garantia de reversão.

Antes da exclusão, Saker ativou a manutenção e informou sucesso. A conferência independente retornou `maintenance=true`; Auth respondeu HTTP 200 com `disable_signup=true`, Google/Email habilitados e confirmação de e-mail preservada. Depois, Saker autorizou explicitamente a execução do reset. O aviso público de manutenção foi enviado no commit `b807fd1`; o workflow Pages `40128299477` terminou com `success`, e a página retornou HTTP 200 com HTML igual ao publicado. A exclusão autorizada e suas provas estão na seção de execução global; não repetir essa operação em outro deploy.

## Ativação concluída: roteiro de referência

Esta sequência documenta a ativação anterior à exclusão. O serviço já foi reaberto; não executar novamente sem nova solicitação.

1. Abrir o [projeto Decky no Supabase](https://supabase.com/dashboard/project/yfijjtibyblzuplhtxbd) e conferir o ref `yfijjtibyblzuplhtxbd` antes de operar.
2. Abrir `SQL Editor`, criar uma consulta e selecionar a role `postgres`. A leitura administrativa confirmou `operator=postgres`, `function_owner=postgres` e `operator_can_execute=true`. Não executar com a role de cliente `authenticated` e não alterar grants para contornar erro de permissão.
3. Executar somente:

```sql
select public.set_decky_maintenance(true);
select maintenance from private.app_settings where singleton;
```

4. Conferir que a segunda consulta retorna uma linha com `maintenance=true`. A primeira função retorna `void`; a prova é o valor da segunda consulta. Se houver erro ou não aparecer `true`, manter a exclusão parada e registrar a mensagem exata, sem enviar credenciais.
5. Abrir `Authentication > Sign In / Providers`, desativar somente `Allow new users to sign up` e salvar. Preservar os provedores Google e Email, clientes, segredos, callbacks, SMTP e confirmação de e-mail. Não refazer cadastros de provedores nem trocar credenciais.
6. Registrar a confirmação de `maintenance=true` e do salvamento do bloqueio de novos cadastros. Parar aqui: nenhum usuário, sala, partida, nota ou pontuação é apagado por esses passos.

A manutenção bloqueia as operações de jogo e dados protegidas pelas RPCs/RLS do Decky. Não promete logout imediato, encerramento de toda sessão Auth ou uma tela automática de manutenção. Uma interface já aberta pode continuar exibindo dados carregados anteriormente.

## Estado após o reset e limite de conclusão

O reset único autorizado já ocorreu. As contas e salas descritas nos ensaios anteriores são registros históricos: seus dados foram removidos pela virada. Não reutilizar credenciais ou tokens antigos como se fossem sessões ativas. As QA novas da aceitação pós-reset também foram removidas depois dos testes.

As verificações pós-reset comprovaram limpeza, preservação da infraestrutura, recusa de tokens antigos, duas contas QA novas em 500 e primeira partida com a regra nova. Após remover as QA, o SQL das `20:09:59Z` confirmou todas as 15 contagens em zero, Storage vazio e estrutura preservada. Auth confirmou cadastros habilitados às `20:10:53Z`; o SQL das `20:10Z` confirmou `maintenance=false`, zero usuários e constraint de piso validada. A reabertura está comprovada, sem depender de nova participação do usuário.

Os limites funcionais em `VALIDACAO_V2.md` permanecem registrados. As rodadas adicionais de aparelhos encerradas por Saker não devem ser reabertas. A decisão de dispensar backup e o reset executado não transformam validações ausentes em aprovação nem declaram a V2 concluída.

Branding continua uma frente separada: somente em 25/10/2026 após 10:49 BRT, abrir o projeto Google existente em [Branding](https://console.developers.google.com/auth/branding), usar `Verify branding` e publicar se o console permitir. Preservar cliente, segredo, callback, escopos e metatag; não antecipar nem contornar a espera.

## Preparação técnica feita sem alterar produção

O inventário foi ampliado para PostgreSQL/horário, schemas e seus proprietários/ACLs, funções e permissões, roles sem hashes de senha, extensões, publicações Realtime e contagens das dez tabelas do jogo. Executa em uma transação `REPEATABLE READ READ ONLY`, incluindo `supabase_migrations`. A execução do SQL ampliado retornou `inventory_v2_read_only_completed` no projeto alvo.

Na leitura desta preparação, PostgreSQL informou `17.11`, o schema de migrations estava presente e a manutenção continuava desligada. Storage retornou zero buckets e zero objetos. Foram observados 27 usuários, 40 salas, 32 partidas e 6 notas. Essa fotografia antecede a janela e não substitui o inventário final; nenhum registro foi removido.

Como preparação anterior, o utilitário manual de backup foi criado em `scripts/admin/backup-v2.ps1`, com teste isolado em `tests/admin/backup-v2.test.ps1`. A ferramenta usa `pg_dump` 17, formato custom, e inclui `public`, `private`, `auth`, `storage` e `supabase_migrations`, preservando os metadados de owners/grants. Captura bytes em memória, cifra com DPAPI `CurrentUser`, confere a decifragem local e grava somente `.dump.dpapi` e JSON fora do repositório. O JSON contém hashes, tamanhos, horário, projeto, versão e limites, sem credenciais.

O teste vermelho anterior à implementação retornou exit 1 com `backup-v2.ps1 ainda nao implementado`. Depois, `powershell.exe -NoProfile -File tests/admin/backup-v2.test.ps1` retornou exit 0 com `PASS: 73 verificacoes sinteticas`. Os casos incluem bytes nulos/não UTF-8, stderr grande sem travar ou expor a senha sintética, alvo inválido, SSL, versão, destino, falha e timeout. A ferramenta não foi executada contra produção e não há backup final novo criado por ela nesta preparação.

O utilitário e seu teste permanecem disponíveis fora do fluxo desta virada. Não executar backup final, definir retenção, preparar segunda cópia ou ensaiar recuperação como condição desta janela: Saker dispensou expressamente essas etapas ao decidir seguir sem backup. Isso não apaga nem altera os arquivos existentes.

## Backup anterior preservado, fora do fluxo desta virada

Uma cópia privada já foi criada e restaurada em PostgreSQL local. O dump de `public`, `private`, `auth` e `storage`, fotografado em 24/10 às 03:44 UTC, está protegido por DPAPI `CurrentUser` em `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. A decifragem e a restauração local com `pg_restore --exit-on-error` retornaram exit 0, com 47 tabelas, 57 funções e 23 políticas. A proteção depende do mesmo perfil Windows; não foi preparado um procedimento independente de recuperação da chave.

Saker informou plano gratuito e backups indisponíveis no painel. Não contratar serviço nem pedir novamente essa conferência. O backup anterior precede testes posteriores e foi obtido sem manutenção; sua restauração local comprova estrutura e dados daquela fotografia, sem comprovar a recuperação dos serviços hospedados ou a reversão desta virada. Não contar com esse arquivo como garantia de recuperar os dados descartados pela virada.

## Inventário obrigatório

Executar `scripts/admin/inventory-v2.sql` no SQL Editor do projeto alvo, como administrador, sem alterar os dados. Conferir o ref `yfijjtibyblzuplhtxbd` e identificar qualquer dado que não pertença ao Decky.

O SQL lista os cinco schemas, FKs, triggers, owners/grants, roles sem senhas, extensões e publicações Realtime. Conta usuários, identidades, sessões, refresh tokens, mãos privadas e todas as dez tabelas de jogo, além dos objetos por bucket. A lista de tabelas de jogo conhecida é: perfis, salas, participantes de sala, partidas, participantes de partida, eventos, notas, ratings, extratos e diretório de salas públicas. Se aparecer outra tabela dependente ou bucket com dados de usuário, adaptar e reensaiar antes de excluir.

Manter schema, histórico de migrations, RLS, RPCs, Edge Functions, SMTP, Google, infraestrutura dos buckets, assets públicos e credenciais Android. Não usar `supabase db reset` em produção.

## Ferramenta administrativa

`scripts/admin/reset-v2.mjs` é um programa Node executado manualmente fora do aplicativo e das migrations automáticas. Usa a API Admin do Supabase, operações Storage e remoção de dados do jogo. Não há endpoint de reset no cliente.

As credenciais administrativas ficam apenas no ambiente do terminal responsável: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Não copiá-las para `.env` do app, variáveis `EXPO_PUBLIC_*`, chat ou Git. Não há motivo para enviar esses valores ao agente.

Ajuda, sem rede ou exclusão:

```powershell
node scripts/admin/reset-v2.mjs --help
```

Inventário REST, sem mutação, somente depois de configurar o ambiente administrativo:

```powershell
node scripts/admin/reset-v2.mjs --project yfijjtibyblzuplhtxbd
```

O inventário REST complementa o SQL, não o substitui. Os logs ficam no diretório ignorado `.expo/validation-v2/`, com projeto, horário, etapa e contagens. Não registram e-mails, senhas, tokens, IDs de usuários nem chaves.

## Execução global autorizada em 24/10/2026

O programa `scripts/admin/reset-v2.mjs` foi executado com `--execute --confirm DECKY_V2_RESET_yfijjtibyblzuplhtxbd` no projeto correto. Iniciou às `2026-10-24T20:07:15Z` e terminou às `20:07:29.713Z`, com exit 0. Não foi criado backup novo, conforme a dispensa expressa de Saker. O log privado `.expo/validation-v2/reset-yfijjtibyblzuplhtxbd.jsonl` não integra o Git. O comando registra uma operação única já executada; não repeti-lo como parte de deploy, nova conversa ou limpeza de QA.

Antes da exclusão, o inventário registrou 27 usuários, 27 perfis, 40 salas, 79 participantes de sala, 32 partidas, 118 participantes de partida, 1661 eventos, 6 notas, 54 ratings, 6 extratos e 6 entradas no diretório público. Ao concluir, o programa registrou zero usuários e zero nas dez tabelas de jogo.

O SQL independente das `20:07:46Z` confirmou também zero identidades Auth, sessões, refresh tokens, mãos privadas, objetos Storage e buckets. A comparação preservou 48 tabelas, FKs, funções, políticas, migrations, roles, extensões, publicações e triggers. As assinaturas MD5 de funções e políticas permaneceram respectivamente `18ee6ae0fea846eb59154d74e233dd7f` e `439b6144167cd4f86a059c73b5538a7e`. A constraint `player_ratings_mmr_floor` foi validada, com `convalidated=true`. Não houve reaplicação de migrations ou troca de infraestrutura para executar a virada.

Um token anterior à exclusão, ainda temporalmente válido, foi recusado: Auth retornou 403, a RPC retornou `not_authenticated`, RLS retornou `[]`, as duas Edge Functions retornaram 401 e o refresh foi recusado. Isso registra os endpoints observados, sem prometer que toda interface já aberta foi encerrada automaticamente.

O programa privado `global-reset-acceptance.mjs` executou entre `20:09:05Z` e `20:09:24Z`, com exit 0. Criou duas contas QA novas: login por senha aceito, perfil único, 500 em Duelo e Duplas e histórico vazio. No Realtime, a identidade de controle recebeu uma sala e a assinatura da conta apagada com token antigo não recebeu. A primeira partida pós-reset iniciou; a primeira vaza recusou descarte oculto e a segunda aceitou sem expor a carta.

As duas QA, a sala e a partida desse aceite foram removidas ao encerrar. A manutenção voltou a `true` e os cadastros públicos permaneceram bloqueados. Os relatórios privados `global-reset*.json` ficam sob `.expo/validation-v2/`, fora do Git. A conferência final e a reabertura pública foram executadas depois dessa etapa, conforme o registro abaixo; o sucesso do programa de reset sozinho não foi usado como prova de reabertura.

## Conferência final e reabertura comprovadas

O SQL das `20:09:59Z` confirmou zero em todas as 15 contagens após a remoção das QA, com Storage vazio e estrutura igual. O diff da configuração declarou somente `auth.enable_signup: false -> true`; o push foi executado sem recriar provedores, trocar segredos ou alterar confirmação de e-mail. A consulta imediatamente posterior ainda mostrou o valor antigo e a proteção religou manutenção enquanto a alteração propagava.

A segunda leitura independente, às `20:10:53Z`, confirmou `disable_signup=false`, Google e Email habilitados, confirmação obrigatória preservada e diff final com zero atualizações. O SQL das `20:10Z` confirmou `maintenance=false`, zero usuários e constraint de piso validada. O Decky foi reaberto às `17:10 BRT`, após o reset único das `17:07 BRT`, sem backup novo, reaplicação de migrations ou nova build Android.

O aviso de manutenção encerrada foi enviado no commit `fa62268`. O [workflow Pages 40128732321](https://github.com/rbrecci/Decky/actions/runs/40128732321) concluiu com `success`; às `20:12:55Z`, a homepage exata retornou HTTP 200, HTML igual ao local e o aviso de encerramento. `version.json` retornou HTTP 200 e JSON idêntico ao local, mantendo o APK build 7. Não houve nova build nem alteração de manifesto para executar o reset.

O aceite pós-reset comprovou login por senha nas duas QA novas. Um novo login Google depois da virada não foi exercitado; as provas anteriores do provedor e a configuração preservada não substituem esse teste. Registrar esse limite sem abrir nova rodada física. Branding após a espera de 24 horas e os demais limites da V2 continuam pendentes; reabertura não significa V2 integralmente concluída.

## Evidências anteriores à virada e seus limites

Os quatro testes do orquestrador falharam antes da implementação com `not_implemented`. Depois passaram: alvo/confirmacão, ordem de manutenção antes da exclusão, retomada após falha e rejeição de dados restantes. `tests/sql/reset-v2.test.ts` faz o ensaio com as migrations reais e o adaptador PGlite; faz parte dos 94 testes SQL aprovados.

`node .expo/validation-v2/admin-delete-qa.mjs` retornou exit 0 com cinco verificações contra o serviço hospedado. Criou uma conta sintética descartável e um bucket privado exclusivo de QA, gravou um objeto de sete bytes, listou e removeu esse objeto, confirmou o bucket vazio e executou `auth.admin.deleteUser(id, false)` somente para a conta recém-criada. A limpeza dos objetos preservou inicialmente a infraestrutura do bucket; o bucket temporário foi removido ao encerrar o ensaio.

Um JWT dessa conta ainda temporalmente válido foi recusado pela RPC e pela Edge Function; RLS retornou lista vazia e refresh foi recusado. A conferência administrativa encontrou zero para usuário, identidade, sessões, refresh tokens, perfil e sala dessa QA. Nenhuma conta pessoal foi apagada e não houve manutenção global ou execução do programa de reset contra todo o projeto.

`node .expo/validation-v2/realtime-deleted-qa.mjs` retornou exit 0 com duas verificações. Duas identidades receberam o mesmo evento inicial por Realtime. Depois de excluir somente a assinante descartável, uma nova sala pública chegou à identidade sobrevivente e não à assinatura da conta apagada, cujo JWT ainda estava dentro da validade temporal.

Esses testes foram feitos em recursos segregados no projeto hospedado, sem criar outro projeto pago. Comprovam as operações reais de Auth Admin/Storage e a recusa de token nos caminhos exercitados; não equivalem a uma virada global ou restauração operacional hospedada. O backup DPAPI foi restaurado em PostgreSQL isolado, conforme descrito acima. Comandos, contagens e limites estão em [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md).

As provas desta seção são anteriores à virada e não substituem a execução global registrada acima. Backup final e recuperação dos dados antigos foram dispensados por Saker; os backups e temporários existentes continuam preservados. O encerramento da V2 continua condicionado aos demais critérios e limites documentados.

## Limpeza local bloqueada pela revisão automática

A revisão automática rejeitou a limpeza dos temporários com a mensagem literal `rejected: blocked by policy`, sem fornecer motivo detalhado. Uma tentativa separada com arquivos exatos também foi rejeitada. As tentativas foram encerradas, sem contorno ou exclusão desses alvos.

Os cinco caminhos que continuam no disco local e precisam de resolução pelo usuário são:

- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\backups\decky-pre-reset-20261024.dump`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\backups\decrypted-restore.dump`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\db-dump-dry-run.sh`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\postgresql-17.11-windows.zip`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\restore-db-1792813665248`

Os dumps temporários e o cluster restaurado contêm a cópia local dos dados. O script de dump continha uma credencial efêmera, sem exposição de seu valor no chat. O servidor local restaurado está parado. Esses caminhos ficam ignorados pelo Git e não podem integrar a distribuição pública. A cópia DPAPI protegida fora do repositório permanece preservada, separada desses temporários e fora do fluxo atual, sem exigir decisão de retenção para esta virada.
