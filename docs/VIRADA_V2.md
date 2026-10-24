# Virada administrativa única da V2

Atualizado em 24/10/2026. O usuário autorizou avançar na entrega da V2. Backend e clientes têm publicação e validação registradas nos documentos próprios; a virada global de dados deste roteiro não foi executada, e a manutenção global não foi ativada. As provas abaixo usam recursos de QA ou restauração local e não dispensam as condições da janela.

## Passo a passo do que depende de Saker

1. Em 25/10/2026 após 10:49 BRT, abrir o projeto Google existente em [Branding](https://console.developers.google.com/auth/branding). A propriedade da homepage já foi confirmada no Search Console. Usar `Verify branding` e, se ficar `Ready to publish`, `Publish branding`. Se houver pendência, registrar a mensagem exata e manter o bloqueio. Preservar cliente, segredo, callback, escopos e metatag. Não repetir as rodadas de aparelhos encerradas nesta sessão.
2. No painel Supabase do projeto `yfijjtibyblzuplhtxbd`, abrir `Database > Backups`. Anotar o plano efetivo, os backups disponíveis e seus horários, sem acionar restauração ou contratar recurso. A leitura de metadados pelo conector recusou permissão; o plano não foi confirmado nesta preparação.
3. Escolher retenção e segunda cópia recuperável. Informar por quantos dias após a virada o backup deve permanecer e onde ficará a segunda cópia. A DPAPI atual depende deste perfil Windows; copiar o arquivo para outro disco não demonstra recuperação se esse perfil for perdido. A forma de recuperação independente precisa ser definida antes do reset.
4. Informar uma janela proposta com data, início, fim e fuso BRT. A proposta ainda não autoriza exclusão: antes da aprovação final, precisam estar registrados o método de recuperação hospedada, o destino/retenção e o texto do aviso público. Nenhuma data de manutenção foi publicada nesta preparação.
5. Quando esses pré-requisitos estiverem comprovados, aprovar explicitamente a janela. Somente nessa janela serão fechados cadastros, ativada manutenção, capturado o backup final e executado o procedimento de exclusão abaixo. As confirmações de reabertura continuam obrigatórias, pois conferem o resultado dessa operação nova.

Para responder sem enviar credenciais:

```text
Plano Supabase e backups disponíveis:
Retenção do backup após a virada:
Destino da segunda cópia e recuperação se o perfil Windows for perdido:
Janela proposta em BRT, com início e fim:
```

## Preparação técnica feita sem alterar produção

O inventário foi ampliado para PostgreSQL/horário, schemas e seus proprietários/ACLs, funções e permissões, roles sem hashes de senha, extensões, publicações Realtime e contagens das dez tabelas do jogo. Executa em uma transação `REPEATABLE READ READ ONLY`, incluindo `supabase_migrations`. A execução do SQL ampliado retornou `inventory_v2_read_only_completed` no projeto alvo.

Na leitura desta preparação, PostgreSQL informou `17.11`, o schema de migrations estava presente e a manutenção continuava desligada. Storage retornou zero buckets e zero objetos. Foram observados 27 usuários, 40 salas, 32 partidas e 6 notas. Essa fotografia antecede a janela e não substitui o inventário final; nenhum registro foi removido.

O backup foi automatizado em `scripts/admin/backup-v2.ps1`, com teste isolado em `tests/admin/backup-v2.test.ps1`. A ferramenta usa `pg_dump` 17, formato custom, e inclui `public`, `private`, `auth`, `storage` e `supabase_migrations`, preservando os metadados de owners/grants. Captura bytes em memória, cifra com DPAPI `CurrentUser`, confere a decifragem local e grava somente `.dump.dpapi` e JSON fora do repositório. O JSON contém hashes, tamanhos, horário, projeto, versão e limites, sem credenciais.

O teste vermelho anterior à implementação retornou exit 1 com `backup-v2.ps1 ainda nao implementado`. Depois, `powershell.exe -NoProfile -File tests/admin/backup-v2.test.ps1` retornou exit 0 com `PASS: 73 verificacoes sinteticas`. Os casos incluem bytes nulos/não UTF-8, stderr grande sem travar ou expor a senha sintética, alvo inválido, SSL, versão, destino, falha e timeout. A ferramenta não foi executada contra produção e não há backup final novo criado por ela nesta preparação.

## Backup cifrado para a janela aprovada

Ajuda local, sem conexão:

```powershell
powershell.exe -NoProfile -File scripts/admin/backup-v2.ps1 -Help
```

Na janela, depois de ativar a manutenção e confirmar o bloqueio dos clientes:

1. Abrir `Connect` no projeto Supabase correto e escolher `Session pooler`, porta 5432, banco `postgres`. Copiar somente host e usuário para o ambiente administrativo. O usuário deve ser `postgres.yfijjtibyblzuplhtxbd`. Não usar o transaction pooler na porta 6543. Se a rede tiver IPv6, a conexão direta aceita host `db.yfijjtibyblzuplhtxbd.supabase.co` e usuário `postgres`.
2. Configurar `PGHOST`, `PGUSER`, `PGPORT=5432` e `PGDATABASE=postgres` no PowerShell administrativo. Usar os valores reais do painel, sem inventar hostname de pooler. Remover configurações herdadas `PGHOSTADDR`, `PGSERVICE` e `PGSERVICEFILE` desse terminal se estiverem presentes, pois o script recusa redirecionamento de alvo. A ferramenta usa SSL `require` no processo filho quando `PGSSLMODE` não está definido; também aceita `verify-ca` e `verify-full` com a configuração de certificados correspondente.
3. Informar a senha atual somente no terminal mascarado e chamar o script. Não redefinir senha do banco para viabilizar esta etapa, nem enviá-la ao chat ou gravá-la no `.env` do aplicativo.

Para a opção Session pooler, os valores não secretos podem ser definidos assim, usando o host real mostrado no painel:

```powershell
$env:PGHOST = Read-Host 'Host do Session pooler do Decky'
$env:PGUSER = 'postgres.yfijjtibyblzuplhtxbd'
$env:PGPORT = '5432'
$env:PGDATABASE = 'postgres'
```

Depois, no mesmo terminal:

```powershell
$deckyDbPassword = Read-Host 'Senha atual do banco Decky' -AsSecureString
try {
    $env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $deckyDbPassword).Password
    powershell.exe -NoProfile -File scripts/admin/backup-v2.ps1 -PgDumpPath '.expo/validation-v2/pg17-bin/pg_dump.exe'
    if ($LASTEXITCODE -ne 0) { throw 'Backup interrompido. Manter manutenção e não executar o reset.' }
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $deckyDbPassword.Dispose()
}
```

O `pg_dump.exe` 17.11 existe no caminho indicado nesta máquina. Caso deixe de existir, fornecer a localização real de um `pg_dump` 17 por `-PgDumpPath`; não substituir por executável não conferido. Sem `-OutputDirectory`, o destino é `%LOCALAPPDATA%/Decky/backups/AAAAMMDD` em UTC. O nome inclui horário e identificador único; arquivos anteriores não são sobrescritos. `-TimeoutSeconds` tem padrão 300. O diretório de saída precisa ficar fora do repositório e não pode usar junction/link.

4. Conferir exit 0 e os dois caminhos retornados, registrar os metadados e manter a manutenção. A conferência DPAPI comprova preservação dos bytes cifrados, mas não substitui a recuperação operacional hospedada exigida abaixo. Não reabrir o serviço apenas porque o arquivo foi criado.

## Cobertura e recuperação operacional

O arquivo custom contém os cinco schemas selecionados, dados e ACLs desses objetos. Não inclui definições globais de roles, configuração externa Google/SMTP, variáveis do EAS, segredos de Edge Functions ou binários do Storage. Esses componentes precisam permanecer recuperáveis pelos acessos administrativos existentes. Extensões, proprietários, permissões e publicações Realtime estão no inventário para comparação. Não publicar cópias de configurações secretas.

Segundo a [documentação de backups Supabase](https://supabase.com/docs/guides/platform/backups), backups de banco não incluem os arquivos do Storage e a restauração deixa o projeto indisponível. A fotografia atual de Storage vazio não exige exportar arquivos inexistentes; qualquer objeto novo na janela precisa de cópia própria. O plano efetivo e a disponibilidade de restauração pelo painel ainda dependem da conferência de Saker.

O [guia oficial de restauração lógica](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) descreve um projeto de destino novo. Não tratá-lo como comando pronto para sobrescrever Auth/Storage no Decky existente. Não foi criado ambiente pago, trocado provedor ou executada restauração hospedada nesta preparação. A [CLI também exclui schemas gerenciados no dump padrão](https://supabase.com/docs/reference/cli/supabase-db-dump), e exportar somente o comando básico não cobre este inventário.

Na falha da virada, manter o acesso bloqueado, selecionar a fotografia aprovada e usar o método de recuperação previamente comprovado para o serviço hospedado. Comparar inventário, owners/grants, Auth, funções, Realtime e Storage antes de reabrir. O backup de segurança final precisa ser capturado com `maintenance=true`: restaurar uma fotografia antiga com esse campo falso pode reabrir RPCs/RLS antes da conferência. Essa consequência decorre de `private.app_settings` integrar o schema restaurado. Não iniciar a exclusão contando apenas com o dump antigo, que foi obtido antes da manutenção.

Rascunho do aviso, a preencher e publicar somente após definir a janela real: `O Decky ficará em manutenção em DATA, de INICIO a FIM BRT. A virada para a V2 removerá contas, histórico, notas e rankings antigos. Após a reabertura, todos precisarão se cadastrar novamente ou entrar com Google e começarão com 500 MMR em Duelo e Duplas.`

## Condições antes da janela

Conferir o aceite funcional e os limites registrados em `VALIDACAO_V2.md`, além do inventário atualizado antes da operação. As rodadas adicionais de aparelhos encerradas por Saker permanecem encerradas; a dispensa não é evidência de aprovação. O backend V2 já foi publicado e houve provas com PostgreSQL isolado, jogo hospedado, Auth Admin, Storage e Realtime reais. O ensaio PGlite comprovou as migrations, cascatas dos dados de jogo, bloqueio por manutenção, recusa do identificador apagado e retorno de novos ratings em 500; os ensaios hospedados de 24/10 complementam essa evidência conforme a seção final.

Uma cópia privada já foi criada e restaurada em PostgreSQL local. O dump de `public`, `private`, `auth` e `storage`, fotografado em 24/10 às 03:44 UTC, está protegido por DPAPI `CurrentUser` em `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. A decifragem e a restauração local com `pg_restore --exit-on-error` retornaram exit 0, com 47 tabelas, 57 funções e 23 políticas. A proteção depende do mesmo perfil Windows; não foi preparado um procedimento independente de recuperação da chave.

Continuam pendentes uma cópia atual consistente no momento da janela, o procedimento de recuperação operacional dos serviços Supabase hospedados e a decisão de retenção. O backup existente precede os testes posteriores e não substitui a fotografia final. A restauração local comprova estrutura e dados, sem comprovar a recuperação operacional do serviço Auth/Storage hospedado. Depois de iniciar exclusões, manter manutenção em falha até concluir ou executar a restauração ensaiada.

Definir a janela real e publicar o aviso correspondente na landing antes da operação, explicando a exclusão de contas, histórico, notas e rankings. A publicação da V2 não é prova de aviso de reset. Não anunciar uma data que ainda não foi decidida.

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

1. Fechar cadastros no painel Supabase, inclusive Google, durante a janela. A migration também bloqueia criação de perfil/rating em manutenção, mas o painel impede novos fluxos de autenticação enquanto a operação percorre serviços diferentes.
2. Conferir alvo, inventário, recuperação hospedada e buckets. Ativar `public.set_decky_maintenance(true)` com a identidade administrativa, confirmar bloqueio dos clientes e então capturar o backup final cifrado conforme a seção acima. A cópia precisa conter manutenção ligada. Falha de backup ou ausência de método de recuperação aprovado impede a exclusão. A ferramenta de reset exige correspondência exata da URL com o ref e confirmação textual; a flag `--execute` não foi usada em produção nesta entrega.
3. Rodar o comando abaixo somente na janela aprovada e no terminal administrativo:

```powershell
node scripts/admin/reset-v2.mjs --project yfijjtibyblzuplhtxbd --execute --confirm DECKY_V2_RESET_yfijjtibyblzuplhtxbd
```

Se houver buckets exclusivamente de usuários, acrescentar `--user-buckets` com seus IDs separados por vírgula, depois de classificá-los no inventário. A ferramenta não apaga buckets não aprovados e não apaga sua infraestrutura. Buckets mistos exigem um procedimento de objetos por dono reensaiado antes de prosseguir; não passar um bucket de assets públicos nessa opção.

4. A primeira mutação interna da ferramenta confirma `public.set_decky_maintenance(true)`, executável apenas por `service_role`; o roteiro já a ativou antes do backup final. RLS restritiva bloqueia leituras/escritas diretas de clientes e as RPCs verificam manutenção e existência ativa do usuário. Depois são limpos objetos dos buckets aprovados, usuários por `auth.admin.deleteUser(id, false)` e sobras de partidas, salas e perfis pelas FKs.
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

Esse comando é administrativo. Habilitar cadastro e Google no painel para a conta controlada, comprovar entrada por senha/Google, um perfil, 500 em Duelo e Duplas, histórico vazio e primeira partida com a regra de descarte. Remover ou reinicializar os dados de QA antes da abertura pública para não conceder vantagem inicial.
11. Reabrir somente após inventário e verificações conclusivos. Registrar o resultado da operação única e atualizar o aviso da landing para informar o reset realizado, sem manter uma janela futura ou manutenção já encerrada. Um deploy posterior não executa este programa nem repete a limpeza.

## Evidências de 24/10/2026 e limites

Os quatro testes do orquestrador falharam antes da implementação com `not_implemented`. Depois passaram: alvo/confirmacão, ordem de manutenção antes da exclusão, retomada após falha e rejeição de dados restantes. `tests/sql/reset-v2.test.ts` faz o ensaio com as migrations reais e o adaptador PGlite; faz parte dos 94 testes SQL aprovados.

`node .expo/validation-v2/admin-delete-qa.mjs` retornou exit 0 com cinco verificações contra o serviço hospedado. Criou uma conta sintética descartável e um bucket privado exclusivo de QA, gravou um objeto de sete bytes, listou e removeu esse objeto, confirmou o bucket vazio e executou `auth.admin.deleteUser(id, false)` somente para a conta recém-criada. A limpeza dos objetos preservou inicialmente a infraestrutura do bucket; o bucket temporário foi removido ao encerrar o ensaio.

Um JWT dessa conta ainda temporalmente válido foi recusado pela RPC e pela Edge Function; RLS retornou lista vazia e refresh foi recusado. A conferência administrativa encontrou zero para usuário, identidade, sessões, refresh tokens, perfil e sala dessa QA. Nenhuma conta pessoal foi apagada e não houve manutenção global ou execução do programa de reset contra todo o projeto.

`node .expo/validation-v2/realtime-deleted-qa.mjs` retornou exit 0 com duas verificações. Duas identidades receberam o mesmo evento inicial por Realtime. Depois de excluir somente a assinante descartável, uma nova sala pública chegou à identidade sobrevivente e não à assinatura da conta apagada, cujo JWT ainda estava dentro da validade temporal.

Esses testes foram feitos em recursos segregados no projeto hospedado, sem criar outro projeto pago. Comprovam as operações reais de Auth Admin/Storage e a recusa de token nos caminhos exercitados; não equivalem a uma virada global ou restauração operacional hospedada. O backup DPAPI foi restaurado em PostgreSQL isolado, conforme descrito acima. Comandos, contagens e limites estão em [VALIDACAO_SERVIDOR_V2.md](VALIDACAO_SERVIDOR_V2.md).

Antes de executar este roteiro, ainda faltam fechar a recuperação operacional hospedada, retenção, backup atualizado e janela com aviso público. Não houve reset global nesta entrega.

## Limpeza local bloqueada pela revisão automática

A revisão automática rejeitou a limpeza dos temporários com a mensagem literal `rejected: blocked by policy`, sem fornecer motivo detalhado. Uma tentativa separada com arquivos exatos também foi rejeitada. As tentativas foram encerradas, sem contorno ou exclusão desses alvos.

Os cinco caminhos que continuam no disco local e precisam de resolução pelo usuário são:

- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\backups\decky-pre-reset-20261024.dump`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\backups\decrypted-restore.dump`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\db-dump-dry-run.sh`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\postgresql-17.11-windows.zip`
- `C:\Users\fbrec\Documents\Claude\projects\Decky\.expo\validation-v2\restore-db-1792813665248`

Os dumps temporários e o cluster restaurado contêm a cópia local dos dados. O script de dump continha uma credencial efêmera, sem exposição de seu valor no chat. O servidor local restaurado está parado. Esses caminhos ficam ignorados pelo Git e não podem integrar a distribuição pública. A cópia DPAPI protegida fora do repositório deve ser distinguida desses temporários; sua retenção ainda está por decidir.
