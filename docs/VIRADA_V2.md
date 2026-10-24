# Virada administrativa única da V2

Atualizado em 24/10/2026. O usuário autorizou avançar na entrega da V2. Backend e clientes têm publicação e validação registradas nos documentos próprios. Saker executou o guia e a leitura posterior confirmou manutenção ligada e novos cadastros desativados. A exclusão global ainda não foi executada. As provas históricas abaixo usam recursos de QA ou restauração local; a decisão atual de seguir sem backup está registrada separadamente.

## Decisão atual: virada sem backup

Em 24/10/2026, Saker decidiu expressamente: `vamos seguir sem backup, me faz o passo a passo pra eu já colocar em manutenção`. A dispensa de backup final, retenção, segunda cópia e comprovação de restauração hospedada substitui as condições anteriores para esta virada. O descarte dos dados antigos foi aceito sem promessa de recuperação atual. Os backups e temporários existentes serão preservados; não são uma fotografia final nem uma garantia de reversão.

Saker executou os passos e informou sucesso. A conferência independente retornou `maintenance=true`; Auth respondeu HTTP 200 com `disable_signup=true`, Google/Email habilitados e confirmação de e-mail preservada. O inventário contou 27 usuários e perfis, 40 salas, 32 partidas, 6 notas e zero buckets/objetos Storage. O agente não executou reset nem exclusão. A autorização de preparar ou ativar manutenção não autoriza a exclusão: o reset exige autorização explícita da execução.

## Ativação concluída: roteiro de referência

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

## Próximo passo antes da exclusão

Conferir o inventário atualizado, os recursos que pertencem ao Decky e o estado de manutenção. Registrar o aviso público com a janela real, sem inventar horário de reabertura. Só executar o reset após autorização explícita de Saker para essa execução; o pedido atual termina na ativação da manutenção pelo usuário. As checagens de contagens, tokens antigos, novos cadastros em 500 e reabertura permanecem obrigatórias.

Os limites funcionais em `VALIDACAO_V2.md` permanecem registrados. As rodadas adicionais de aparelhos encerradas por Saker não devem ser reabertas. A decisão de dispensar backup não transforma validações ausentes em aprovação nem declara a V2 concluída.

Branding continua uma frente separada: somente em 25/10/2026 após 10:49 BRT, abrir o projeto Google existente em [Branding](https://console.developers.google.com/auth/branding), usar `Verify branding` e publicar se o console permitir. Preservar cliente, segredo, callback, escopos e metatag; não antecipar nem contornar a espera.

## Preparação técnica feita sem alterar produção

O inventário foi ampliado para PostgreSQL/horário, schemas e seus proprietários/ACLs, funções e permissões, roles sem hashes de senha, extensões, publicações Realtime e contagens das dez tabelas do jogo. Executa em uma transação `REPEATABLE READ READ ONLY`, incluindo `supabase_migrations`. A execução do SQL ampliado retornou `inventory_v2_read_only_completed` no projeto alvo.

Na leitura desta preparação, PostgreSQL informou `17.11`, o schema de migrations estava presente e a manutenção continuava desligada. Storage retornou zero buckets e zero objetos. Foram observados 27 usuários, 40 salas, 32 partidas e 6 notas. Essa fotografia antecede a janela e não substitui o inventário final; nenhum registro foi removido.

Como preparação anterior, o utilitário manual de backup foi criado em `scripts/admin/backup-v2.ps1`, com teste isolado em `tests/admin/backup-v2.test.ps1`. A ferramenta usa `pg_dump` 17, formato custom, e inclui `public`, `private`, `auth`, `storage` e `supabase_migrations`, preservando os metadados de owners/grants. Captura bytes em memória, cifra com DPAPI `CurrentUser`, confere a decifragem local e grava somente `.dump.dpapi` e JSON fora do repositório. O JSON contém hashes, tamanhos, horário, projeto, versão e limites, sem credenciais.

O teste vermelho anterior à implementação retornou exit 1 com `backup-v2.ps1 ainda nao implementado`. Depois, `powershell.exe -NoProfile -File tests/admin/backup-v2.test.ps1` retornou exit 0 com `PASS: 73 verificacoes sinteticas`. Os casos incluem bytes nulos/não UTF-8, stderr grande sem travar ou expor a senha sintética, alvo inválido, SSL, versão, destino, falha e timeout. A ferramenta não foi executada contra produção e não há backup final novo criado por ela nesta preparação.

O utilitário e seu teste permanecem disponíveis fora do fluxo desta virada. Não executar backup final, definir retenção, preparar segunda cópia ou ensaiar recuperação como condição desta janela: Saker dispensou expressamente essas etapas ao decidir seguir sem backup. Isso não apaga nem altera os arquivos existentes.

## Backup anterior preservado, fora do fluxo desta virada

Uma cópia privada já foi criada e restaurada em PostgreSQL local. O dump de `public`, `private`, `auth` e `storage`, fotografado em 24/10 às 03:44 UTC, está protegido por DPAPI `CurrentUser` em `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. A decifragem e a restauração local com `pg_restore --exit-on-error` retornaram exit 0, com 47 tabelas, 57 funções e 23 políticas. A proteção depende do mesmo perfil Windows; não foi preparado um procedimento independente de recuperação da chave.

Saker informou plano gratuito e backups indisponíveis no painel. Não contratar serviço nem pedir novamente essa conferência. O backup anterior precede testes posteriores e foi obtido sem manutenção; sua restauração local comprova estrutura e dados daquela fotografia, sem comprovar a recuperação dos serviços hospedados ou a reversão desta virada. Não contar com esse arquivo para recuperar os dados que serão descartados.

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

## Execução futura, exclusivamente após autorização da janela

1. Confirmar `maintenance=true` pelo SQL acima e o salvamento de `Allow new users to sign up` desligado. Preservar os provedores Google e Email e suas configurações; o bloqueio é de novos cadastros, sem promessa de encerrar sessões existentes.
2. Conferir alvo, inventário, buckets e autorização explícita da execução do reset. Saker dispensou backup e recuperação dos dados antigos nesta virada; não gerar cópia final nem exigir retenção, segunda cópia ou prova de restauração. A ferramenta exige correspondência exata da URL com o ref e confirmação textual; a flag `--execute` não foi usada em produção nesta entrega.
3. Rodar o comando abaixo somente na janela aprovada e no terminal administrativo:

```powershell
node scripts/admin/reset-v2.mjs --project yfijjtibyblzuplhtxbd --execute --confirm DECKY_V2_RESET_yfijjtibyblzuplhtxbd
```

Se houver buckets exclusivamente de usuários, acrescentar `--user-buckets` com seus IDs separados por vírgula, depois de classificá-los no inventário. A ferramenta não apaga buckets não aprovados e não apaga sua infraestrutura. Buckets mistos exigem um procedimento de objetos por dono reensaiado antes de prosseguir; não passar um bucket de assets públicos nessa opção.

4. A primeira mutação interna da ferramenta confirma `public.set_decky_maintenance(true)`, executável apenas por `service_role`; a manutenção já precisa estar confirmada antes da execução. RLS restritiva bloqueia leituras/escritas diretas de clientes e as RPCs verificam manutenção e existência ativa do usuário. Depois são limpos objetos dos buckets aprovados, usuários por `auth.admin.deleteUser(id, false)` e sobras de partidas, salas e perfis pelas FKs.
5. Em falha, a manutenção permanece ligada. Corrigir a causa e repetir o mesmo comando: cada etapa relê o estado atual e as exclusões admitem retomada. Não tratar linhas antigas do log como prova de que o estado atual está limpo. A ferramenta não reabre o serviço automaticamente.
6. Rodar novamente o inventário SQL completo. Exigir zero para contas/identidades/sessões/refresh tokens antigos, tabelas de jogo e `private.private_hands`. Conferir objetos Storage dos usuários removidos. Qualquer sobra impede reabertura, mesmo se o programa terminou sua contagem REST.
7. Testar um access token antigo ainda temporalmente válido contra RPC, RLS, Edge Function e Realtime. A conta apagada precisa ser recusada; o app deve limpar sessão/caches ao validar a identidade. Revogar refresh tokens ou apenas apagar dados de jogo não prova recusa de todo JWT antigo.
8. Conferir o cliente antigo contra o backend V2. O servidor é a autoridade de cartas, resultados, MMR, ocupação e fase. Se houver caminho antigo incompatível ainda acessível, corrigi-lo e validar antes de reabrir.
9. Validar a constraint após a limpeza:

```sql
alter table public.player_ratings validate constraint player_ratings_mmr_floor;
```

10. Em acesso controlado, liberar a manutenção para o teste de contas novas:

```sql
select public.set_decky_maintenance(false);
```

Esse comando é administrativo. Reabilitar somente `Allow new users to sign up` para o acesso controlado, preservando os provedores existentes, e comprovar entrada por senha/Google, um perfil, 500 em Duelo e Duplas, histórico vazio e primeira partida com a regra de descarte. Remover ou reinicializar os dados de QA antes da abertura pública para não conceder vantagem inicial.
11. Reabrir somente após inventário e verificações conclusivos. Registrar o resultado da operação única e atualizar o aviso da landing para informar o reset realizado, sem manter uma janela futura ou manutenção já encerrada. Um deploy posterior não executa este programa nem repete a limpeza.

## Evidências de 24/10/2026 e limites

Os quatro testes do orquestrador falharam antes da implementação com `not_implemented`. Depois passaram: alvo/confirmacão, ordem de manutenção antes da exclusão, retomada após falha e rejeição de dados restantes. `tests/sql/reset-v2.test.ts` faz o ensaio com as migrations reais e o adaptador PGlite; faz parte dos 94 testes SQL aprovados.

`node .expo/validation-v2/admin-delete-qa.mjs` retornou exit 0 com cinco verificações contra o serviço hospedado. Criou uma conta sintética descartável e um bucket privado exclusivo de QA, gravou um objeto de sete bytes, listou e removeu esse objeto, confirmou o bucket vazio e executou `auth.admin.deleteUser(id, false)` somente para a conta recém-criada. A limpeza dos objetos preservou inicialmente a infraestrutura do bucket; o bucket temporário foi removido ao encerrar o ensaio.

Um JWT dessa conta ainda temporalmente válido foi recusado pela RPC e pela Edge Function; RLS retornou lista vazia e refresh foi recusado. A conferência administrativa encontrou zero para usuário, identidade, sessões, refresh tokens, perfil e sala dessa QA. Nenhuma conta pessoal foi apagada e não houve manutenção global ou execução do programa de reset contra todo o projeto.

`node .expo/validation-v2/realtime-deleted-qa.mjs` retornou exit 0 com duas verificações. Duas identidades receberam o mesmo evento inicial por Realtime. Depois de excluir somente a assinante descartável, uma nova sala pública chegou à identidade sobrevivente e não à assinatura da conta apagada, cujo JWT ainda estava dentro da validade temporal.

Esses testes foram feitos em recursos segregados no projeto hospedado, sem criar outro projeto pago. Comprovam as operações reais de Auth Admin/Storage e a recusa de token nos caminhos exercitados; não equivalem a uma virada global ou restauração operacional hospedada. O backup DPAPI foi restaurado em PostgreSQL isolado, conforme descrito acima. Comandos, contagens e limites estão em [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md).

Antes de executar a exclusão, confirmar manutenção, bloqueio de novos cadastros, inventário, aviso público e autorização explícita da execução. Backup final e recuperação dos dados antigos foram dispensados por Saker; as provas anteriores permanecem históricas. Não houve reset global nesta entrega.

## Limpeza local bloqueada pela revisão automática

A revisão automática rejeitou a limpeza dos temporários com a mensagem literal `rejected: blocked by policy`, sem fornecer motivo detalhado. Uma tentativa separada com arquivos exatos também foi rejeitada. As tentativas foram encerradas, sem contorno ou exclusão desses alvos.

Os cinco caminhos que continuam no disco local e precisam de resolução pelo usuário são:

- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\backups\decky-pre-reset-20261024.dump`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\backups\decrypted-restore.dump`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\db-dump-dry-run.sh`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\postgresql-17.11-windows.zip`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\restore-db-1792813665248`

Os dumps temporários e o cluster restaurado contêm a cópia local dos dados. O script de dump continha uma credencial efêmera, sem exposição de seu valor no chat. O servidor local restaurado está parado. Esses caminhos ficam ignorados pelo Git e não podem integrar a distribuição pública. A cópia DPAPI protegida fora do repositório permanece preservada, separada desses temporários e fora do fluxo atual, sem exigir decisão de retenção para esta virada.
