# Melhorias de multiplayer e interface

Objetivo: executar o briefing fornecido pelo usuário na base rbrecci/Decky, preservando o motor, 1v1, 2v2, MMR e medidas da mesa.

Arquitetura: migrations aditivas e RPCs autenticadas, com a linha da sala como lock comum. Realtime avisa mudanças e o polling cobre perdas. O cliente nunca autoriza ações ou entrega mãos alheias. Sem novas dependências.

## Implementação e aceite local

Os itens abaixo registram implementação e validação local. Realtime, cron, aparelhos físicos e concorrência entre conexões reais permanecem em checklist separado.
- [x] Presença: lease de 120 segundos no relógio do banco, renovação a cada 20 segundos no lobby e partida, limpeza no servidor, transferência de host, preservação de histórico e MMR. Testar abandono, janela de reconexão, usuário estranho e host mesa.
- [x] Trocas: pedido entre dois membros distintos no lobby, prazo de 30 segundos, somente destinatário responde, nenhum conflito ativo, troca transacional respeitando unicidade. Testar aceitar, negar, expirar, sair, alterar posições e início por contrato de locks; ensaio multiconexão real pendente.
- [x] Espectadores: descoberta de partidas públicas em andamento, ingresso autenticado sem assento, snapshot público e permissões de leitura restritas; nenhuma mão ou ação. Testar acesso a sala privada e tentativas de ações manuais.
- [x] Início: instante único persistido no servidor, contagem 3/2/A por relógio comum, comandos bloqueados também no servidor até liberação, sem repetir em reconexão. Testar prazo de jogada e redução de movimento.
- [x] Diálogos: modal compartilhado com confirmação/cancelamento/texto, teclado, foco e backdrop bloqueador, substituindo confirm/alert/prompt de jogo e notas.
- [x] Interface: densidade desktop somente em menus, ranking com atualização ao lado do título e proteção contra requisições duplicadas, ícones de website/logout, rótulo Sair somente no lobby.
- [x] Validação integrada local: testes, typecheck, export web e inspeção desktop/mobile; registrar limites sem declarar aprovação total onde não houve teste.

## Processo obrigatório por entrega
1. Escrever e executar teste que reproduz o requisito ausente.
2. Implementar a menor mudança compatível com os padrões existentes.
3. Executar testes pertinentes.
4. Pedir auditoria ao subagente crítico independente, somente leitura.
5. Corrigir achados e solicitar nova auditoria até eliminar Crítico/Alto e atender aceitação.

Não executar commit sem mensagem do usuário. Push, PR, migrations remotas e deploy dependem de confirmação. O clone atual é isolado e a branch é codex/multiplayer-interface.

## Validação externa pendente
- [ ] Aplicar migrations e publicar funções em Supabase de teste com cliente atualizado.
- [ ] Confirmar entrega Realtime entre aparelhos e reconexões reais.
- [ ] Confirmar job pg_cron e limpeza sem clientes na descoberta.
- [ ] Ensaiar locks com conexões PostgreSQL independentes e carga.
- [ ] Validar Android/iOS em aparelhos físicos.

## Evidência final local
Suíte independente: 54 arquivos, 520 testes, exit 0. Build web final, TypeScript e diff --check aprovados. Relatórios separados em docs/reports/. O checklist externo acima permanece pendente e a tarefa não é marcada como integralmente validada em produção.
