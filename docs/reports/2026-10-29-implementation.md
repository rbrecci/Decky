# Relatório do agente implementador

Data: 29/10/2026. Repositório: https://github.com/rbrecci/Decky. Base: fbd0450081be17e833f3a8dd1648abdae863908c. Branch local: codex/multiplayer-interface. Checkout: C:\Projetos\decky-rbrecci.

## Entregas locais

1. **Início sincronizado:** contagem com cartas 3, 2 e Ás, oito cartas subindo com transform/opacity e preferência de movimento reduzido. O PostgreSQL grava o instante sob lock; o app calibra o relógio antes de montar a partida. Reconexão usa o tempo restante. Motor e RPC de jogada automática recusam interações antes da liberação. O prazo da primeira jogada começa após a transição e a folga existente de distribuição.
2. **Ciclo de vida das salas:** presença privada renovada a cada 20 segundos, com tolerância de 120 segundos. Limpeza no servidor remove abandono, transfere o host no lobby e preserva assentos durante desconexão parcial de partida. Host mesa conta como participante ativo, mesmo sem assento. Manutenção suspende expiração e concede nova tolerância na retomada.
3. **Menus responsivos:** densidade menor somente dentro de Screen no web a partir de 1024 px. Botões, campos, títulos e painéis menores; menu inicial em duas colunas e bloco de código/QR compacto no desktop. O jogo não recebe esse contexto.
4. **Ranking:** títulos “50 melhores jogadores · 1v1” e “50 melhores jogadores · 2v2”; atualização por ícone ao lado do título, feedback de carregamento e bloqueio síncrono de repetição. Dados antigos de outra modalidade/identidade não reaparecem.
5. **Atalhos iniciais:** globo e logout no canto superior esquerdo, com nomes acessíveis, foco, hover e tooltip. URL anterior e tratamento de erro/logout preservados. Avisos de atualização permanecem disponíveis.
6. **Espectadores:** listagem distingue lobby de partida pública em andamento. “Assistir” cria inscrição autorizada sem ocupar assento ou renovar presença de jogador. A tela recebe snapshot público e atualizações; não pede mão nem oferece jogadas. Ações manuais continuam recusadas no servidor. Saída revoga inscrição e oferece feedback de falha, inclusive após encerramento.
7. **Troca consentida:** pedido com prazo de 30 segundos, identificação do solicitante, aceitar/negar e feedback do resultado. Validações e troca atômica sob lock da sala, com unicidade diferida apenas na operação e revalidada ao final. Zera prontidão e cancela por saída, movimento, mudança de modo e início. Funciona em sala cheia 1v1/2v2.
8. **Popups:** componente compartilhado para confirmação, cancelamento e texto; substitui diálogos nativos de saída do jogo e exclusão de notas. Foco inicial, Tab, Escape, restauração de foco, barreira e erros no diálogo. As notas continuam usando formulário próprio para entrada/edição de texto; não havia prompt nativo a migrar.
9. **Saída do lobby:** “Voltar” passa a “Sair” somente nessa função. Espectador também ganha saída identificada; demais botões Voltar conservam o comportamento anterior.

## Causa das salas persistentes

A projeção public_room_directory contava linhas persistidas em room_players e não possuía presença expirá­vel. Fechar o navegador ou perder conexão removia o canal local, mas não os registros do servidor. A saída voluntária já limpava o lobby; não resolvia abandono. A solução acrescenta lease autenticado com horário do banco, limpeza e janela de reconexão.

## Decisões técnicas

- Migrations aditivas, reaproveitando RPCs, RLS, Realtime, polling e componentes existentes. Nenhuma dependência adicionada.
- Ordem de locks alinhada: sala → partida → projeções. A auditoria encontrou a inversão entre limpeza e commit final, corrigida em migration específica.
- Abandono não fabrica vencedor nem aplica MMR. A exclusão da sala mantém partidas, mãos, participantes e notas pelo contrato existente ON DELETE SET NULL.
- Espectadores têm inscrição separada; get_my_hand e internal_get_match continuam verificando o jogador real. Mãos privadas ficam fora de Realtime.
- pg_cron agenda limpeza por minuto apenas se já estiver habilitado. Sem a extensão, a descoberta limpa antes de responder. O processo não instala extensão no servidor.
- Os cinco testes SQL legados que mantinham instâncias abertas agora fecham PGlite após cada caso. Vitest usa um worker e prazo de 30 segundos para PostgreSQL/WASM e cenários que aguardam a contagem real. Asserções funcionais não foram removidas.

## Arquivos principais

- supabase/migrations/20261029100000_room_presence.sql
- supabase/migrations/20261029110000_seat_swaps.sql
- supabase/migrations/20261029120000_spectators.sql
- supabase/migrations/20261029130000_start_transition.sql
- supabase/migrations/20261029140000_commit_room_lock.sql
- supabase/functions/_shared/match-service.ts e engine/{game,types}.ts
- src/rooms/{api,useRoom,useRoomPresence,SeatPicker}.tsx/ts
- src/game/{api,useMatch,useServerClock,role,startTransition,PlayerGame,TableGame}.tsx/ts
- src/game/components/{StartTransition,FinishedOverlay,ScoreBar}.tsx
- src/ui/{Dialog,IconButton,Screen,Button,Panel,TextField,icons,menuDensity}.tsx/ts
- app/index.tsx, app/ranking.tsx, app/room/{join,[code]}.tsx, app/game/[matchId].tsx e app/history/{index,note}.tsx
- src/contracts/types.ts, src/lib/errors.ts, src/updates/{UpdateNotice,links}.tsx/ts
- testes SQL/UI/motor, vitest.config.mts e plano em docs/superpowers/plans.

## Verificação

- TypeScript e git diff --check passaram após as correções finais.
- Export web final passou após a suíte completa; TypeScript final também retornou exit 0. A exportação usa parâmetros fictícios de QA, sem credenciais reais; não é publicação nem artefato configurado para produção.
- Testes dirigidos cobrem presença/manutenção, trocas, espectadores/privacidade, relógio/contagem, modais, ranking e integração 1v1/2v2. A alteração do teste de duelo aguarda a contagem real; o prazo individual foi ampliado para comportá-la.
- A primeira suíte completa retornou 515/516; o cenário legado de duelo ainda tentava jogar durante a contagem. Ele foi adaptado, e os testes dirigidos subsequentes passaram. A suíte final independente aprovou 54/54 arquivos e 520/520 testes, exit 0, em 340,39 segundos.
- QA web local com backend simulado: início, criação, entrada, ranking e histórico em 320/390/768/1440/1920 px, sem overflow horizontal. Tooltip focado foi corrigido e medido dentro do viewport em 320/390/1440 px.
- Popup no navegador: foco inicial Cancelar; Tab percorre apenas ações do diálogo; Escape fecha e restaura foco; clique no botão coberto não dispara consulta; falha de exclusão permanece visível no popup.
- Duas páginas exibiram a mesma contagem, chegaram ao Ás e não repetiram ao recarregar. Movimento normal mostrou nove imagens; movimento reduzido, apenas a carta central.
- Duplo clique no ranking gerou uma requisição, com aria-busy; mudança de modalidade consultou 2v2 e atualizou o título. Globo abriu a URL anterior em rota interceptada de QA; logout fictício retornou ao login.
- Capturas locais, não versionadas: .expo/validation-multiplayer/.

## Fora do escopo executado e limitações

Não houve commit, push, PR, instalação de extensão, migration remota ou publicação de Edge Functions. A base do repositório anterior foi preservada; as mudanças de produto estão no clone correto.

Ainda é necessário aplicar as cinco migrations em ordem num Supabase de teste, publicar start-match e submit-action e disponibilizar o cliente atualizado com heartbeat. Não aplicar a limpeza isoladamente a clientes antigos que ainda não renovam presença. Conferir pg_cron se a limpeza física precisar ocorrer sem consultas à descoberta.

Não foram comprovados Realtime real, concorrência entre conexões independentes de PostgreSQL, comportamento em aparelhos Android/iOS físicos ou desempenho sob carga. PGlite valida SQL/RLS e fluxo local, mas não substitui esses ensaios. As salas abandonadas podem manter histórico de partida com status playing, sem vencedor/MMR artificial; essa preservação é intencional e não equivale a uma partida pública disponível.

A auditoria independente final aprovou o resultado local com ressalvas externas e sem achados pendentes. Isso não representa aprovação integral de produção.
