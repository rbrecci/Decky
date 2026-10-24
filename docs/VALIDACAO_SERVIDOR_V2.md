# Evidências locais do servidor V2

Registro inicial: 23/10/2026. Atualização de publicação e validação: 24/10/2026. A etapa inicial foi local; a seção de 24/10 registra a migration e as funções já publicadas. Não houve commit ou reset de produção nesta frente. A exclusão inicial de `.env.example`, a alteração inicial da especificação e `PREPARO_V2.md` foram preservados.

## Implementado

- Descarte oculto consome carta/vez sem força e permanece de costas após a vaza. Primeira vaza recusa ocultas em todos os lugares de Duelo e Duplas. Todas ocultas empatam. Motor, projeções e tipos públicos usam a mesma representação.
- MMR inicial/piso 500, tolerância de 100, ajuste de 5 por degrau iniciado, até 9 degraus, vitória entre 5 e 55. Duplas usam média sem arredondar, congelada antes das escritas. Extrato guarda saldo anterior/final, delta real/nominal, médias e identificação da regra.
- Criação compatível de salas privadas por padrão e descoberta autorizada em `public_room_directory`. A projeção não contém participantes, mãos ou salas privadas. Triggers atualizam ocupação, nome do host e presença na lista; a publicação Realtime inclui somente esse resumo adicional.
- Histórico e notas paginam no banco por ordem determinística. Notas já trazem metadados da própria partida autorizada, sem depender da página de partidas. APIs solicitam seis itens para exibir cinco e detectar continuação.
- Títulos Beta, Delta, Alfa, Sigma e Omega derivados por `eloForMmr`. Limites, rejeição de saldo inválido e Omega sem teto cobertos em teste.
- Nome de perfil atualizado por RPC autenticada e restrita ao próprio usuário, refletindo `display_name` no perfil e metadata sem criar outra identidade ou duplicar ratings.
- Guarda de manutenção local, desligada por padrão, com toggle exclusivo de serviço. RPCs e políticas restritivas verificam identidade ativa; JWT de conta apagada não recupera acesso. Novo cadastro durante manutenção é recusado pelo trigger.

## Vermelhos executados antes da lógica

Motor e títulos:

```text
npx vitest run tests/engine/hidden-v2.test.ts tests/engine/hidden-auto-timer.test.ts tests/app/elo-v2.test.ts
exit 1: 5 testes falharam e 1 suíte falhou ao importar eloForMmr ausente.
Esperado B/tie nas ocultas, recebido A; teste legado esperava score.A 0, recebeu 1.
```

Dados e consultas:

```text
node node_modules/vitest/vitest.mjs run tests/sql/v2.test.ts tests/app/data-v2.test.ts --maxWorkers 1
exit 1: 11 testes falharam.
Novos perfis não tinham ratings em 500; RPCs V2 não existiam.
Histórico enviava limit 50/offset 0 em vez de limit 6/offset 55.
Listagem de notas não devolvia associação paginada e fetchPublicRooms não existia.
```

Guarda da virada:

```text
node node_modules/vitest/vitest.mjs run tests/sql/v2.test.ts --maxWorkers 1
exit 1: 2 testes falharam, 7 passaram.
set_decky_maintenance ausente e get_rankings ainda aceitando sub de conta apagada.
```

## Verificações verdes

```text
node node_modules/vitest/vitest.mjs run tests/sql/v2.test.ts tests/sql/ranked.test.ts tests/app/data-v2.test.ts tests/app/match-history.test.ts tests/app/elo-v2.test.ts tests/engine --maxWorkers 1
exit 0: 10 arquivos, 146 testes aprovados, duração 65.34s.

node node_modules/vitest/vitest.mjs run tests/sql/v2.test.ts tests/sql/flow.test.ts --maxWorkers 1
exit 0: 2 arquivos, 29 testes aprovados, duração 55.16s.

node node_modules/vitest/vitest.mjs run tests/sql --maxWorkers 1 --testTimeout 30000 --hookTimeout 30000
exit 0: 8 arquivos, 94 testes aprovados, duração 214.26s.

node node_modules/vitest/vitest.mjs run tests/sql/v2.test.ts --maxWorkers 1 --testTimeout 30000 --hookTimeout 30000 -t 'acesso durante virada'
exit 0: 2 testes aprovados, 9 ignorados pelo filtro, duração 5.45s.
```

A segunda execução inclui a projeção pública após fechar vaza/reconectar, reenvio sem consumo duplicado e paginação de 0/1/5/6/10/11 notas com associação independente e isolamento. A primeira inclui rollback posterior ao resultado, idempotência de pontuação, separação de modalidades, piso e guardas da virada.

Uma execução SQL concorrente com outras suítes foi cancelada após timeout de bootstrap do PGlite. O primeiro ensaio novo de reset também encontrou timeout de 5000 ms sob essa carga, sem conclusão lógica. A rodada consolidada de 94 testes acima passou com tempo explícito e um worker. Inclui upgrade V1 para V2 sem reset, média fracionária de 600,5 no trigger real e ensaio SQL de limpeza seguido de cadastro em 500.

A última conferência da guarda acrescenta prova de ACL: `ensure_profile(uuid)` continua sem `EXECUTE` para `anon` ou `authenticated` depois de `CREATE OR REPLACE`. O fim da migration reaplica explicitamente as permissões das três funções que mudaram de linguagem, impedindo herança de concessões indevidas. Também confirma RLS sem linhas para cliente em manutenção, recusa de novo cadastro e bloqueio de RPC interna com identidade apagada.

## Compatibilidade e ordem de publicação

A migration foi criada por `npx --yes supabase migration new v2_mmr_public_rooms_history`, CLI 2.122.0. Migrations antigas não foram alteradas. Aplicar o backend compatível antes de distribuir o cliente que consulta os novos campos/RPCs. Republicar as Edge Functions para disponibilizar o motor corrigido.

Ratings legados não são reescritos. O piso usa constraint `NOT VALID` para proteger novas escritas sem alegar limpeza histórica; validar a constraint após a virada aprovada. Valores anteriores a 500 recebem indicação de legado na interface. O lançamento elimina os dados antigos somente em sua operação explícita.

## Limites de evidência

PGlite aplica SQL/Postgres real e as migrations reais, mas usa uma conexão. Essa bateria isoladamente não comprova corrida física da última vaga, serialização entre conexões independentes ou infraestrutura Realtime em duas sessões. As provas adicionais de 24/10 abaixo usam conexões independentes em PostgreSQL e duas identidades no serviço hospedado.

O ensaio inicial de reset usa adaptador SQL local para o orquestrador administrativo. O stub local de Auth não reproduz provedores, identidades, sessões, refresh tokens ou Storage reais. Em 24/10 também foram exercitadas APIs hospedadas com recursos novos exclusivos de QA, conforme registrado abaixo. O inventário administrativo e o SQL antes/depois da virada continuam obrigatórios.

Na etapa de 23/10 não foram alterados cadastros SMTP/Google/EAS/Pages, segredos ou dados remotos, nem houve teste de partida autenticada ou canal Realtime real. Configuração salva e testes locais não são validação de produção. As mudanças posteriores desta frente estão delimitadas a seguir; autenticação e Android têm registros próprios.

## Publicação e provas adicionais em 24/10/2026

### PostgreSQL isolado e concorrência física

O ambiente temporário usa `embedded-postgres@17.10.0-beta.17`, nome e versão conferidos no registro npm antes da instalação. A ferramenta e suas dependências ficaram apenas em `.expo/validation-v2/backend-tools/`, ignorado pelo Git, sem alteração nas dependências do aplicativo. O servidor PostgreSQL 17.10 escutou somente em `127.0.0.1` e foi encerrado após o ensaio. Auth foi simulado apenas para fornecer usuários e papéis; as oito migrations do projeto foram aplicadas integralmente.

`node .expo/validation-v2/backend-concurrency.mjs` retornou exit 0 com cinco verificações:

- Aplicação das oito migrations reais.
- Duas conexões observadas simultaneamente em espera por lock da última vaga. Após liberar o lock, houve exatamente um ingresso e uma recusa `room_full`, com dois lugares ocupados no Duelo.
- Duas finalizações com participante comum, também observadas em espera por lock. O MMR serializou de 500 para 510 e 520, com dois extratos coerentes de saldo anterior, delta e saldo final.
- Reenvio da finalização não duplicou extrato nem MMR.
- Rollback deixou a partida em andamento, sem resultado ou pontuação parcial.

O primeiro ensaio chegou à corrida da vaga e parou por serialização incorreta de arrays JSON no próprio harness Node/pg. O harness passou a enviar esses argumentos como JSON; não houve alteração no código do aplicativo para fazer o teste passar. O relatório local está em `.expo/validation-v2/backend-concurrency.json`.

Uma repetição focada de `tests/sql/v2.test.ts`, `tests/sql/flow.test.ts` e `tests/engine/hidden-v2.test.ts`, com um worker e prazos de 30 segundos, retornou exit 0: três arquivos e 37 testes aprovados, em 69,11 segundos. A bateria integrada completa é registrada pelo coordenador em `VALIDACAO_V2.md`.

### Migration e Edge Functions publicadas

O alvo foi confirmado por `get_project_url`: `https://yfijjtibyblzuplhtxbd.supabase.co`. O banco hospedado usa PostgreSQL 17.11. Antes da publicação havia sete migrations, 22 contas, 22 perfis, 31 salas, 31 partidas, cinco notas, três ratings e quatro extratos.

`apply_migration` retornou `success: true` para `v2_mmr_public_rooms_history`. O timestamp inicialmente atribuído pelo MCP ao registro foi alinhado ao arquivo local `20261023230536`, sem reaplicar SQL. `list_migrations` confirmou os oito registros com a versão local correspondente.

`deploy_edge_function` publicou `start-match` e `submit-action` como `ACTIVE`, versão 14. `verify_jwt=false` foi preservado conforme a configuração existente: ambas passam pelo `http.ts`, que valida o token com `auth.getUser` antes de chamar a lógica. Cada upload incluiu o ponto de entrada e todas as dependências relativas de `_shared`.

A conferência imediata após a migration preservou contas, perfis, salas, partidas, notas e extratos. O backfill previsto aumentou ratings de três para 44, garantindo duas modalidades por perfil, sem reescrever saldos já existentes. As 31 salas legadas ficaram privadas, a manutenção permaneceu desligada, o default de MMR passou a 500, `ensure_profile(uuid)` continuou sem execução para `authenticated` e o diretório público apareceu na publicação Realtime.

### Duas identidades e jogo no Supabase hospedado

Foram criadas duas contas sintéticas de QA, sem envio de e-mail. As credenciais ficaram somente em arquivo local ignorado. `node .expo/validation-v2/backend-remote.mjs` retornou exit 0 com nove verificações:

- As duas Edge Functions recusaram chamadas sem autenticação com HTTP 401.
- Sala privada não apareceu na descoberta nem no canal da outra identidade.
- Sala pública chegou por Realtime em 185 ms, com somente os sete campos previstos no diretório.
- A ocupação foi atualizada por Realtime em 339 ms após a entrada da segunda conta.
- `start-match` iniciou um Duelo real e a sala iniciada saiu da descoberta.
- Carta oculta na primeira vaza foi recusada, sem consumo de carta ou alteração da revisão.
- Descarte oculto na segunda vaza manteve `card: null` na projeção pública e permaneceu privado ao fechar a vaza. Reenvio da mesma ação não consumiu outra carta.
- A partida foi finalizada pelas ações oficiais e gravou histórico com saldo 500, variação 10, saldo 510 e regra `decky-v2-step5`.
- Notas paginadas trouxeram metadados da própria partida e não apareceram para o outro autor.

O primeiro teste de Realtime esperava eventos antes da confirmação efetiva de `postgres_changes` e expirou. O diagnóstico recebeu INSERT/UPDATE reais; o harness passou a aguardar o evento de sistema com status `ok`. Não houve mudança no cliente do Decky para esse ajuste. O relatório final está em `.expo/validation-v2/backend-remote.json`; os recursos de jogo criados são exclusivamente de QA.

### Backup privado e restauração dos dados

O CLI autenticado forneceu acesso temporário ao banco para `pg_dump`, sem solicitar ou imprimir senha de banco. Os binários PostgreSQL 17.11 foram obtidos pela página oficial da EDB. O arquivo baixado teve SHA-256 `80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F`.

O dump customizado contém os schemas `public`, `private`, `auth` e `storage`: 395.548 bytes e 479 entradas selecionadas no índice. A cópia cifrada por DPAPI `CurrentUser` está em `C:\Users\fbrec\AppData\Local\Decky\backups\20261024\decky-pre-reset.dump.dpapi`. O roundtrip de cifrar e decifrar preservou SHA-256 `B5D6A8602B660132E8B7A6849722666E1632A254D26E414B0975BFBFDC9CFBB6` do dump original. A recuperação exige acesso ao mesmo perfil Windows ou um procedimento adicional de exportação de chave que não foi realizado.

`node .expo/validation-v2/backend-restore.mjs` decifrou a cópia e restaurou em PostgreSQL 17.10 isolado com `pg_restore --exit-on-error`, exit 0. A conferência encontrou 47 tabelas, 57 funções e 23 políticas, incluindo 25 contas, 25 identidades, 25 sessões e 58 refresh tokens da fotografia. A estrutura e os dados foram restaurados; isso não representa a restauração operacional de um projeto Supabase com seus serviços Auth/Storage hospedados.

A fotografia é de 24/10 às 03:44 UTC e precede os testes posteriores. Ela não substitui uma nova cópia consistente imediatamente antes de eventual reset. Não houve decisão de retenção definitiva nem publicação de janela de manutenção nesta frente.

A limpeza dos dumps temporários em texto claro e do cluster restaurado foi rejeitada pela revisão automática com a mensagem `rejected: blocked by policy`. Uma tentativa com arquivos exatos também foi rejeitada; não houve nova tentativa ou contorno. O coordenador recebeu os caminhos completos. Os temporários continuam locais e ignorados; o servidor de restauração está parado. Esses arquivos não podem entrar no pacote público ou no Git.

### Auth Admin e Storage reais com recursos exclusivos de QA

`node .expo/validation-v2/admin-delete-qa.mjs` retornou exit 0 em 24/10 às 07:01 UTC, com cinco verificações. Criou uma conta sintética nova e um bucket privado exclusivo de QA, gravou um objeto de sete bytes, listou e removeu o objeto, confirmou o bucket vazio e excluiu apenas essa conta pela API Admin com exclusão definitiva. Não alterou manutenção, não percorreu contas pessoais e não executou o orquestrador global de reset.

Após excluir a conta, um access token ainda dentro da validade temporal foi recusado pela RPC e pela Edge Function, enquanto RLS retornou lista vazia e refresh foi recusado. A consulta administrativa confirmou zero para usuário, identidade, sessões, refresh tokens, perfil e sala pertencentes a essa QA. A remoção dos objetos preservou inicialmente a infraestrutura do bucket, como exige o procedimento; depois o bucket temporário foi removido para não deixar recurso órfão.

Esse ensaio comprova as chamadas reais de Auth Admin/Storage e a recusa de token de uma conta QA excluída. Foi feito em recursos segregados dentro do projeto hospedado, sem criar outro projeto pago. Não equivale ao reset de produção ou à restauração hospedada. O relatório local está em `.expo/validation-v2/admin-delete-qa.json`.

Às 07:04 UTC, `node .expo/validation-v2/realtime-deleted-qa.mjs` retornou exit 0 com duas verificações adicionais. Duas identidades receberam o mesmo evento inicial pelo canal real `public_room_directory`. Após excluir somente a conta descartável recém-criada, uma nova sala pública chegou à identidade sobrevivente e não chegou à assinatura da conta apagada, cujo JWT ainda estava dentro da validade temporal. O relatório local está em `.expo/validation-v2/realtime-deleted-qa.json`. Não foi necessário encerrar sessões de outras contas ou ligar manutenção para essa prova.

### Inventário e limites restantes

Às 07:02 UTC, a consulta administrativa encontrou 26 contas e identidades, 30 sessões, 63 refresh tokens, 26 perfis, 37 salas, 32 partidas, seis notas, 52 ratings, seis extratos e zero buckets/objetos. A manutenção continua desligada. O crescimento após a fotografia corresponde às validações coordenadas de QA; não houve limpeza dos dados antigos.

Antes do reset ainda faltam uma cópia atual no momento da janela, procedimento de recuperação operacional no serviço hospedado, decisão de retenção e aviso público com janela real. Nenhum desses pontos é declarado aprovado por restauração somente em PostgreSQL local.

Os advisors após a migration registraram 17 RPCs `SECURITY DEFINER` autenticadas, duas tabelas privadas com RLS sem políticas e proteção contra senhas vazadas desativada. As RPCs são operações autenticadas deliberadas e as tabelas privadas não têm acesso direto de cliente; os testes acima conferem suas fronteiras. A configuração de proteção de senhas não foi alterada. Referências do advisor: [RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Documentação e varredura

`RULES.md`, `ARCHITECTURE.md` e `RANKING.md` atualizados. A passagem V1 foi arquivada após busca confirmar ausência de referências vivas; especificação e preparação V2 continuam ativas.

Varredura dos arquivos versionados alterados deste domínio com `LC_ALL=C.UTF-8 git grep -nP '[\x{2014}\x{2013}\x{2212}]'`: exit 1, limpo. Novos arquivos também foram conferidos por `rg`: exit 1, limpo. Repetir a conferência conjunta após a integração final dos agentes.
