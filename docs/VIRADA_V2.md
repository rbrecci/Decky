# Virada administrativa única da V2

Atualizado em 24/10/2026. O usuário autorizou avançar na entrega da V2. Backend e clientes têm publicação e validação registradas nos documentos próprios; a virada global de dados deste roteiro não foi executada, e a manutenção global não foi ativada. As provas abaixo usam recursos de QA ou restauração local e não dispensam as condições da janela.

## Condições antes da janela

Concluir as validações funcionais restantes dos clientes e conferir o inventário atualizado antes da operação. O backend V2 já foi publicado e houve provas com PostgreSQL isolado, jogo hospedado, Auth Admin, Storage e Realtime reais. O ensaio PGlite comprovou as migrations, cascatas dos dados de jogo, bloqueio por manutenção, recusa do identificador apagado e retorno de novos ratings em 500; os ensaios hospedados de 24/10 complementam essa evidência conforme a seção final.

Uma cópia privada já foi criada e restaurada em PostgreSQL local. O dump de `public`, `private`, `auth` e `storage`, fotografado em 24/10 às 03:44 UTC, está protegido por DPAPI `CurrentUser` em `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. A decifragem e a restauração local com `pg_restore --exit-on-error` retornaram exit 0, com 47 tabelas, 57 funções e 23 políticas. A proteção depende do mesmo perfil Windows; não foi preparado um procedimento independente de recuperação da chave.

Continuam pendentes uma cópia atual consistente no momento da janela, o procedimento de recuperação operacional dos serviços Supabase hospedados e a decisão de retenção. O backup existente precede os testes posteriores e não substitui a fotografia final. A restauração local comprova estrutura e dados, sem comprovar a recuperação operacional do serviço Auth/Storage hospedado. Depois de iniciar exclusões, manter manutenção em falha até concluir ou executar a restauração ensaiada.

Definir a janela real e publicar o aviso correspondente na landing antes da operação, explicando a exclusão de contas, histórico, notas e rankings. A publicação da V2 não é prova de aviso de reset. Não anunciar uma data que ainda não foi decidida.

## Inventário obrigatório

Executar `scripts/admin/inventory-v2.sql` no SQL Editor do projeto alvo, como administrador, sem alterar os dados. Conferir o ref `yfijjtibyblzuplhtxbd` e identificar qualquer dado que não pertença ao Decky.

O SQL lista tabelas de `public`, `private`, `auth` e `storage`, FKs e triggers. Conta usuários, identidades, sessões, refresh tokens e mãos privadas, além dos objetos por bucket. A lista de tabelas de jogo conhecida é: perfis, salas, participantes de sala, partidas, participantes de partida, eventos, notas, ratings, extratos e diretório de salas públicas. Se aparecer outra tabela dependente ou bucket com dados de usuário, adaptar e reensaiar antes de excluir.

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
2. Conferir novamente alvo, inventário, restauração e buckets. A ferramenta exige correspondência exata da URL com o ref e confirmação textual da exclusão. A flag `--execute` não é usada nos testes de produção desta entrega.
3. Rodar o comando abaixo somente na janela aprovada e no terminal administrativo:

```powershell
node scripts/admin/reset-v2.mjs --project yfijjtibyblzuplhtxbd --execute --confirm DECKY_V2_RESET_yfijjtibyblzuplhtxbd
```

Se houver buckets exclusivamente de usuários, acrescentar `--user-buckets` com seus IDs separados por vírgula, depois de classificá-los no inventário. A ferramenta não apaga buckets não aprovados e não apaga sua infraestrutura. Buckets mistos exigem um procedimento de objetos por dono reensaiado antes de prosseguir; não passar um bucket de assets públicos nessa opção.

4. A primeira mutação ativa `public.set_decky_maintenance(true)`, executável apenas por `service_role`. RLS restritiva bloqueia leituras/escritas diretas de clientes e as RPCs verificam manutenção e existência ativa do usuário. Depois são limpos objetos dos buckets aprovados, usuários por `auth.admin.deleteUser(id, false)` e sobras de partidas, salas e perfis pelas FKs.
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
