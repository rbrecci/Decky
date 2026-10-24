# Registro histórico V1: Decky web, Elo e histórico

Arquivado em 23/10/2026. Esta passagem foi substituída pela implementação V2 e pelos documentos ativos em `docs/`. Autorizações, caminhos locais, fórmulas e comandos abaixo registram somente aquela sessão da V1. Não são instruções para a virada V2.

Data: 2026-10-23.

## Onde continuar

- Repositorio: https://github.com/rbrecci/Decky
- Checkout utilizado: `C:\Users\Dev_2o_Ano\Desktop\VSCode\Claude\sandbox\Decky-work`.
- Existe outra copia em `C:\Users\Dev_2o_Ano\Desktop\VSCode\Decky`. Ela NAO foi usada para esta implementacao. Continue no checkout `Decky-work`.
- Branch atual: `main`, alinhada com `origin/main` na ultima consulta.
- HEAD: `360c9a4f06a1d78b4734e0c5a39f94e5d799f8da`.
- Site publicado: https://decky-brecci.expo.app
- Projeto Supabase: `yfijjtibyblzuplhtxbd`.
- Conta Expo: `brecci`; projeto EAS: `90161be0-e6bf-468a-a32f-23dadd7b779d`.

O usuario interrompeu o fechamento para pedir este documento e um prompt de continuacao. A implementacao e a publicacao ja aconteceram. O restante principal e fechar a documentacao, conferir o estado final e distinguir validacao simulada de uma partida real.

## Decisoes explicitas do usuario

1. Nao pagar assinatura Apple Developer. Disponibilizar o app pelo Safari.
2. Toda partida nova vale pontos. Nao criar escolha entre casual e ranqueada.
3. Usar Elo, com variacao dependente da forca dos adversarios.
4. Foram autorizados explicitamente commits, PR, merge e publicacao, na autoria do usuario.

Regras do ambiente continuam valendo: portugues do Brasil, nenhum caractere U+2014, U+2013 ou U+2212, sem `Co-Authored-By`, sem force push em main e sem afirmar conclusao sem evidencia. Autoria Git conferida: `rbrecci <fbrecci@gmail.com>`.

## O que foi implementado

### Versao web

- Dependencias oficiais: `react-dom`, `react-native-web` e `@expo/metro-runtime`, instaladas pela Expo.
- Script `npm run build:web`, equivalente a `expo export --platform web`.
- `app.json`: Metro, saida `single`, idioma pt-BR e tema escuro.
- `public/index.html`: viewport com area segura, altura dinamica da tela e metadados de acesso pelo iPhone.
- Confirmacoes web de saida da partida e exclusao de notas usam `window.confirm`; Android/iOS mantem `Alert.alert`.
- O mesmo Supabase atende Android e web. Nao foi criado outro backend.

### Elo e rankings

- Elo inicial 1000, independente em 1v1 e 2v2.
- Fator K32 e escala 400.
- No 1v1, comparar Elo individual. No 2v2, comparar a media dos Elos dos dois integrantes de cada dupla.
- Expectativa: `E = 1 / (1 + 10 ^ ((EloAdversario - EloProprio) / 400))`.
- Delta do vencedor: `ROUND(32 * (1 - expectativaDoVencedor))`.
- Delta do derrotado: negativo do mesmo valor. Cada integrante da dupla recebe o delta do time.
- Nao ha bonus por margem do placar. Lados com Elo igual trocam 16 pontos.
- Calculo no banco, dentro da transacao que finaliza a partida. O cliente nao envia nem calcula o Elo oficial.
- Mesa dedicada nao recebe Elo.
- Partidas anteriores a migration nao recebem pontuacao retroativa. Isso tambem vale para partidas que ja estavam em andamento quando a migration entrou.
- Partida em andamento nao pontua. Sair do aplicativo nao aplica derrota automatica.
- Ranking mostra os primeiros 50 e a propria colocacao, inclusive fora do topo, separado por modalidade.
- Empates usam `rank()` por Elo, vitorias e derrotas, com ordenacao estavel por usuario.

### Historico

- Ampliado o historico existente; notas pessoais foram preservadas.
- Mostra as ultimas 50 partidas: modalidade, participantes, resultado, placar, inicio/fim, delta e Elo apos a partida.
- Partidas antigas aparecem como `Anterior ao ranking`.
- Corrigido um problema preexistente: excluir a sala apagava partidas em cascata. A FK `matches.room_id` agora permite nulo e usa `ON DELETE SET NULL`.
- Resultados, participantes, notas e registros de Elo permanecem depois que a sala e removida.

## Arquivos importantes

| Area | Arquivos |
|---|---|
| Banco | `supabase/migrations/20261023150000_ranked.sql` |
| Testes SQL | `tests/sql/ranked.test.ts`, `tests/sql/db.ts` |
| Contratos | `src/contracts/types.ts` |
| Ranking | `src/ranking/api.ts`, `app/ranking.tsx`, `tests/app/ranking.test.ts` |
| Historico | `src/history/api.ts`, `app/history/index.tsx`, `tests/app/match-history.test.ts` |
| Navegacao | `app/index.tsx`, `app/_layout.tsx` |
| Web | `package.json`, `package-lock.json`, `app.json`, `public/index.html` |
| Confirmacoes web | `src/game/PlayerGame.tsx`, `src/game/TableGame.tsx`, `app/history/index.tsx`, `app/history/note.tsx` |
| Testes das confirmacoes | `tests/app/leave-game.test.ts`, `tests/app/history-web.test.ts` |
| Documentacao | `README.md`, `docs/RANKING.md` |

A migration cria `player_ratings`, `match_ratings`, triggers de snapshot/finalizacao e RPCs `get_rankings` e `get_my_match_history`. As tabelas de pontuacao nao aceitam escrita dos clientes. As RPCs exigem autenticacao; o historico usa `auth.uid()`, sem parametro para escolher outro usuario.

Nao foi necessario mudar ou republicar as Edge Functions. As RPCs existentes de criacao de sala e inicio de partida mantiveram suas assinaturas. `MatchView.roomId` passou a aceitar nulo para refletir a preservacao de partidas sem sala.

## Git e publicacao confirmados

O [PR #2](https://github.com/rbrecci/Decky/pull/2) foi integrado na main, produzindo `360c9a4`.

Commits de implementacao:

- `b51a973`: configuracao e dependencias web.
- `e8f250e`: confirmacoes de navegador com testes.
- `d15a3ea`: Elo, rankings, historico, migration e testes.
- `da22a9d`: documentacao web e regras de Elo.

Todos os quatro commits usam `rbrecci <fbrecci@gmail.com>`. O merge foi feito pela conta GitHub do usuario.

### Supabase

O check do Supabase para `360c9a4` terminou com `completed/success`, apontando para o projeto de producao. A integracao GitHub aplicou a migration.

Verificacao adicional contra o projeto real, usando apenas a chave publica e sem sessao:

```text
get_rankings -> HTTP 401, codigo 42501, permission denied for function get_rankings
get_my_match_history -> HTTP 401, codigo 42501, permission denied for function get_my_match_history
```

Isso comprova existencia das RPCs e recusa de acesso anonimo. NAO comprova uma consulta autenticada real ou uma partida real em producao.

### EAS Hosting

- Publicacao final: `mrjm92m7r8`, promovida para producao com sucesso.
- URL permanente: https://decky-brecci.expo.app
- URL desta publicacao: https://decky-brecci--mrjm92m7r8.expo.app
- Bundle conferido: `entry-67620f107600d85d90ff588186cf79fc.js`.
- `/ranking` e `/history` retornaram HTTP 200 com esse bundle.

Nao repetir migration ou criar outro site por presumir que a publicacao ficou pendente. Confira o estado antes de qualquer acao.

## Evidencias de verificacao

### Tipos e testes

- `npm run typecheck`: aprovado.
- `node node_modules/vitest/vitest.mjs run tests/app tests/engine --maxWorkers 1`: 18 arquivos, 262 testes aprovados.
- Todos os testes SQL foram cobertos em grupos: 82 aprovados.
  - `duel`, `matches`, `table-mode` e `flow`: 58 aprovados.
  - `ranked` e `rooms`: 24 aprovados.
- Total: 344 testes aprovados. Nao foi uma unica execucao de suite completa.
- Nos testes SQL, usar `--maxWorkers 1 --hookTimeout 30000` para evitar o timeout de inicializacao PGlite observado nesta maquina.

Houve testes vermelhos antes das implementacoes: confirmacoes Safari, API do historico, API/tela do ranking, migration Elo e suporte ao teste de upgrade. O teste de upgrade aplica as migrations antigas, cria partidas, aplica a migration nova e verifica preservacao dos dados e ausencia de Elo retroativo.

Os testes SQL cobrem favoritos/zebras, media do 2v2, isolamento entre modalidades, mesa, idempotencia, rollback posterior a atualizacao do resultado, RLS e historico depois de sair da sala. Regressao do motor/servicos joga partidas completas com os triggers instalados.

### WebKit

QA aprovado localmente e no site publicado nos tamanhos 390 x 844, 375 x 667 e 844 x 390.

Cobertura de ranking/historico: navegacao autenticada, ambos os modos, propria posicao fora do topo, nomes longos, empate, vazio, erro/retry e partidas com vitoria, derrota, legado e andamento. Sem erros JavaScript, requests falhos ou endpoints inesperados.

IMPORTANTE: nesse QA, a sessao e as respostas Supabase foram controladas pelo Playwright. Nao foram criadas contas nem gravados dados reais. Isso testa a interface publicada, nao substitui um jogo real contra o backend.

## Artefatos locais de QA

Pasta fora do repositorio: `C:\Users\Dev_2o_Ano\Desktop\VSCode\Claude\sandbox\decky-web-qa`.

- `ranked-smoke.cjs`: teste WebKit de ranking/historico com respostas controladas.
- `ranked-result-decky-brecci.expo.app.json`: `status: passed`; arrays `browserErrors`, `requestFailures` e `blockedRequests` vazios.
- Screenshots `decky-brecci.expo.app-ranked-*.png`.
- `smoke.cjs`: QA anterior de login, cadastro e convites.
- `server.cjs`: servidor local de teste com fallback SPA para `dist/`.
- `verify-ranked.cjs`: verificacao real das RPCs sem login. Le variaveis publicas do ambiente, nao imprime chaves.

Playwright e WebKit foram instalados nessa pasta e no cache de browsers do usuario, sem adicionar dependencia de QA ao app. O browser do ultimo QA foi encerrado. O servidor local 8091 usado no QA anterior tambem foi encerrado. Nao foram deixados processos CLI de consulta ao Supabase em execucao.

## Bloqueio do CLI Supabase

O usuario concluiu `npx supabase login`, e `projects list` encontrou o projeto Decky como saudavel.

Foram interrompidas tres tentativas de acessar o banco pelo CLI:

1. `db push --project-ref ... --dry-run --skip-vault --yes`: ficou em `Initialising login role...`.
2. `db query --linked --project-ref ...`: tambem ficou nessa etapa.
3. Consulta com referencia local e tentativa de evitar a conexao temporaria: retornou `DbConfigIpv6Error`, sem conexao IPv6/pooler configurada.

Nao houve aplicacao parcial pelo CLI. A publicacao foi feita pela integracao GitHub, com sucesso. Nao repetir indefinidamente esse caminho nem tratar o login do usuario como falho. A chave publica do app nao substitui credenciais administrativas do banco.

Foi criado apenas o metadado local ignorado `supabase/.temp/project-ref`. Nao foram persistidos tokens ou senhas nos arquivos de projeto.

## Estado pendente no momento da passagem

Atualizacao: os itens 1 a 3 foram concluidos na sessao seguinte (RANKING.md atualizado e documentacao versionada). Os itens 4 a 6 seguem pendentes e estao registrados em `docs/RANKING.md`.

1. `docs/RANKING.md` tem modificacao local NAO commitada. Ela ja registra o sucesso da migration, mas ainda diz que a publicacao web esta em andamento. Essa frase ficou desatualizada: EAS e QA publicado ja passaram. Atualizar usando as evidencias acima.
2. Este `docs/HANDOFF_RANQUEADAS.md` foi criado a pedido do usuario e ainda nao foi commitado. A verificacao final deve incluir ambos os arquivos.
3. Fechar documentacao e versionar as alteracoes restantes, respeitando a autorizacao ja dada para commits/PR/merge/publicacao e a autoria do usuario.
4. Nao foi verificada uma partida autenticada real entre aparelhos nem um iPhone fisico. Se nao houver acesso aos aparelhos/contas, declarar essa limitacao. Nao fabricar evidencia a partir de mocks.
5. Concorrencia entre conexoes Postgres reais nao foi exercitada. O codigo ordena locks por usuario e os testes verificam idempotencia/rollback, mas isso nao e um teste de carga concorrente real.
6. O APK Android NAO foi recompilado depois do Elo. O APK local `sandbox/decky-build/Decky-1.0.0-3.apk` e a versao anterior, gerada do commit `83ce38e`, instalada no Redmi antes destas mudancas. O backend novo contabiliza partidas novas, mas esse APK nao tem a interface nova de ranking. Nao afirmar que o Redmi recebeu esta interface.

Nao ha implementacao funcional conhecida faltando no codigo solicitado. Nao ampliar para matchmaking, ligas, temporadas ou outros recursos sem pedido.

## Comandos uteis para continuar

```powershell
Set-Location 'C:\Users\Dev_2o_Ano\Desktop\VSCode\Claude\sandbox\Decky-work'
git status --short --branch
git diff -- docs/RANKING.md
git config user.name
git config user.email
```

Para publicar uma futura mudanca de interface, se realmente houver codigo novo:

```text
npx eas-cli env:exec production "npm run build:web" --non-interactive
npx eas-cli deploy --prod --environment production --dev-domain decky-brecci --non-interactive --json
```

Nao e necessario reconstruir ou publicar novamente apenas para concluir a documentacao.

Antes de entregar arquivos, varrer caracteres proibidos e conferir o exit code. O arquivo de passagem ainda nao versionado precisa de varredura separada, pois `git grep` nao o inclui:

```powershell
$env:LC_ALL='C.UTF-8'
git grep -nP '[\x{2014}\x{2013}\x{2212}]' -- '*.md' '*.html' '*.ts' '*.tsx' '*.json' '*.sql'
# Exit 1 significa limpo; 0 encontrou; 2 falhou.
rg -n '[\x{2014}\x{2013}\x{2212}]' docs/HANDOFF_RANQUEADAS.md
# Tambem exigir exit 1.
git diff --check
```
