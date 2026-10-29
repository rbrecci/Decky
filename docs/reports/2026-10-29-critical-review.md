# Relatório do agente crítico independente

Data: 29/10/2026. Repositório: rbrecci/Decky. Branch: codex/multiplayer-interface.

## Parecer final

**Aprovado com ressalvas de validação externa. Não há achados Crítico, Alto, Médio ou Baixo pendentes após as correções revisadas. A aprovação é local e não é aprovação irrestrita de produção.**

A auditoria foi realizada por subagentes independentes do implementador, somente em leitura e execução de testes. O primeiro revisor acompanhou as etapas iniciais; após a interrupção da sessão, outro revisor recebeu os requisitos e o histórico dos achados, revisou as etapas restantes e o diff integrado contra HEAD. Nenhum deles modificou código diretamente.

## Problemas encontrados, corrigidos e reavaliados

| Severidade | Problema | Correção verificada |
|---|---|---|
| Alto | A manutenção bloqueava heartbeat, mas a limpeza poderia expirar salas legítimas durante ou imediatamente após manutenção longa. | Limpeza pausa sob lock de app_settings; retomada renova presenças sob lock exclusivo e concede nova janela. Testes de manutenção e retomada passaram. |
| Médio | Descoberta bloqueava todas as salas a cada varredura. | Somente salas candidatas vencidas recebem lock, com revalidação e índice de expiração. Consulta ampla ainda requer medição sob carga. |
| Médio | Heartbeat preso mantinha pending sem permitir outra renovação. | Abort/timeout de dez segundos e liberação para nova tentativa, cobertos por teste. |
| Médio | Erros de troca eram genéricos e ficavam atrás do popup. | Traduções específicas e mensagem dentro dos dois diálogos, com nova tentativa. |
| Médio | Falha ao sair como espectador após o fim ficava atrás da sobreposição final. | Erro e loading também na sobreposição, proteção contra duplicatas e nova tentativa. |
| Médio | Jogo podia montar antes de calibrar o relógio, prejudicando a transição em aparelho adiantado ou atrasado. | Aguarda calibrated antes de montar jogo/contagem; testes de ±60 segundos, serialização, timeout e nova tentativa. |
| Médio | Limpeza adquiria sala antes da partida, enquanto commit podia adquirir partida antes da sala. | Migration 20261029140000_commit_room_lock.sql estabelece sala → partida, preservando manutenção, permissões e partida órfã. |
| Baixo | Destinos dos botões finais do espectador não correspondiam aos rótulos. | Voltar às salas e Início revogam inscrição e seguem destinos distintos; saída normal do espectador é identificada como Sair. |
| Baixo | Tooltip do ranking ficava cortado em viewport estreita. | Alinhamento à direita só no ranking; caixa medida dentro de 320, 390 e 1440 px. |
| Baixo | Dialog duplicava o papel acessível fornecido pelo Modal web. | Papel interno removido; nome acessível no Modal. Implementação instalada do React Native Web conferida. |

Os achados iniciais foram corrigidos e novamente revisados por etapa. O segundo revisor confirmou as correções integradas; a tabela preserva também o histórico documentado pelo primeiro revisor.

**A correção de locks foi verificada estruturalmente e por contratos; isso não equivale a um ensaio concorrente com duas conexões PostgreSQL.**

## Integridade e segurança

Não foi identificada exposição de mãos privadas aos espectadores. A inscrição tem RLS por usuário; acesso à partida exige inscrição válida em sala pública, e get_my_hand continua filtrando pelo proprietário. O serviço de ações exige participação como jogador.

As trocas revalidam destinatário, assentos, presença e estado sob o lock comum. A restrição de assentos fica diferida dentro da transação e volta a ser imediata antes da conclusão. Início, saída, mudança de modo e movimento cancelam pedidos pendentes.

A limpeza preserva partidas, mãos, notas e histórico sem atribuir resultado ou MMR por abandono. As funções privilegiadas novas usam search_path vazio e permissões explícitas.

## Verificações independentes

- **Suíte final completa: 54/54 arquivos e 520/520 testes aprovados**, exit 0, em 340,39 segundos, executada pelo agente crítico com npm.cmd test e configuração serial final.
- TypeScript independente: npx.cmd tsc --noEmit aprovado.
- Testes específicos repetidos durante as revisões de cada etapa, incluindo novas tentativas após as correções.
- Sete capturas examinadas pelo revisor: início mobile/desktop, ranking desktop, descoberta mobile, espectador mobile e duas apresentações da contagem.

Uma execução anterior paralela esgotou a memória do V8; uma tentativa encontrou restrição de escrita do sandbox. A execução final autorizada e serial terminou sem esses problemas.

O QA interativo web foi executado pelo implementador e relatado ao revisor: matriz de 25 combinações de telas/larguras, foco, Tab, Escape, restauração, barreira, erro de exclusão, atualização duplicada do ranking, navegação/logout e contagem entre duas páginas. **O backend desse QA era simulado.**

O build final não foi executado pelo agente crítico. O implementador executou a exportação web depois da suíte independente e informou exit 0, juntamente com TypeScript final aprovado.

## Status por requisito

| Nº | Requisito | Status e limite |
|---|---|---|
| 1 | Animação de início | **Aprovado com ressalvas:** instante e gates verificados; sincronização com Supabase e aparelhos reais pendente. |
| 2 | Salas abandonadas | **Aprovado com ressalvas:** limpeza e preservação verificadas localmente; cron real pendente. |
| 3 | Responsividade dos menus | **Aprovado no escopo web verificado:** densidade isolada em Screen, preservando geometria do jogo. |
| 4 | Ranking | **Aprovado no escopo local/web:** títulos, ícone, carregamento, repetição e respostas antigas tratados. |
| 5 | Ícones de página e logout | **Aprovado no escopo local/web:** endereço preservado, nomes acessíveis e tratamento de falha. |
| 6 | Espectadores | **Aprovado com ressalvas:** permissões e privacidade verificadas; Realtime real pendente. |
| 7 | Solicitação de troca | **Aprovado com ressalvas:** contratos e transação verificados; concorrência multiconexão pendente. |
| 8 | Popups personalizados | **Aprovado no escopo web verificado:** confirmações, cancelamento, erros e teclado cobertos; dispositivos nativos pendentes. |
| 9 | Texto Sair no lobby | **Aprovado:** alteração localizada; demais rótulos de navegação preservados. |

## Riscos residuais e testes adicionais

- Limpeza autônoma sem visitantes depende de pg_cron já habilitado. Sem extensão, ocorre em get_public_rooms. Conferir o job e sua execução real, inclusive manutenção longa/retomada.
- Aplicar as migrations em ambiente de teste e publicar as duas Edge Functions com cliente atualizado antes da validação operacional.
- Ensaiar entrega de Realtime com vários clientes, queda de rede, retorno e encerramento da sala.
- Ensaiar concorrência entre conexões PostgreSQL: heartbeat/limpeza, aceite/início, saída/aceite e última jogada/limpeza. PGlite não prova ausência de deadlocks multiconexão.
- Testar Android/iOS físicos e preferência de movimento reduzido dos sistemas.
- Medir custo da varredura sob carga; selecionar candidatos reduz contenção, mas não substitui ensaio de escala.

**Conclusão: resultado local revisado e testado, sem falhas conhecidas pendentes nas severidades auditadas; validação externa e implantação continuam pendentes.**
