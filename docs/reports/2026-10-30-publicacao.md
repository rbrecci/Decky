# Publicação das melhorias de multiplayer

Data: 30/10/2026. Código publicado: `d98b822ecd1eb1c0b1247750b708886cf565fc40`.

## Backend existente

A integração GitHub do Supabase já havia aplicado o backend em 29/10. O inventário de 30/10 confirmou, por consulta com `read_only: true` e transação somente leitura:

- As cinco migrations `20261029100000` a `20261029140000` registradas.
- Tabelas e RPCs de presença, troca de lugares e espectadores presentes.
- Corpos remotos com `startsAt`, bloqueio `too_early`, lock da sala antes da partida e proteção de manutenção.
- `start-match` e `submit-action` ativas na versão 42, com atualização em 29/10.
- Realtime incluindo `seat_swap_requests`; manutenção desativada.

Nenhuma migration ou função foi reaplicada. A extensão `pg_cron` está ausente; a limpeza física continua dependendo da consulta à descoberta. Não foi executada descoberta nem limpeza global durante os ensaios.

## Cliente web

`eas env:exec production "npm run build:web" --non-interactive` terminou com exit 0, usando as variáveis de produção já cadastradas no EAS.

A publicação `wy3sdd4lfz` foi validada como prévia e promovida com `eas deploy:promote --id wy3sdd4lfz --prod --non-interactive --json`.

- Produção: https://decky-brecci.expo.app
- Prévia: https://decky-brecci--wy3sdd4lfz.expo.app
- Bundle principal: `entry-7d05c52733e544fd2f329d3c164ef52f.js`.
- SHA256: `7f80eaf978b233a674da3e592f082a976f1a947b393797a531173e2885370559`.

Os dois bundles remotos têm os mesmos SHA256 dos arquivos exportados localmente. As rotas `/`, `/login`, `/ranking` e `/history` retornaram HTTP 200 com o bundle atual.

## Android

A build EAS `c1287cfe-3b4f-4a6a-b151-beeee334b4c8` terminou com status `FINISHED`, versão `2.0.0`, `versionCode` 9 e identificador `br.senai.decky`. O perfil `apk` incrementou a build 8 para 9 e reutilizou o keystore existente.

- Release permanente: https://github.com/rbrecci/Decky/releases/tag/v2.0.0-build9
- APK: https://github.com/rbrecci/Decky/releases/download/v2.0.0-build9/decky-v2-build9.apk
- Tamanho: 147011185 bytes.
- SHA256: `55ac3c01d43e2fba9b39a63f52a595011bb5f1634096075a019f48169d259b03`.

`apksigner verify --print-certs` terminou com exit 0. O certificado SHA256 `448a4de74df9632cfba76880f51caa023a65b1cc6d4f6d61cc4e18ab7a893da3` é igual ao do APK anterior disponível nesta máquina. `aapt dump badging` confirmou identificador, versão e build, com Android mínimo API 24. O tamanho e o digest SHA256 do asset no GitHub conferem com o arquivo local.

A release inclui `decky-build9-validation.json`, com as evidências sanitizadas dos testes, do backend, da versão web e do APK. O manifesto `site/version.json` aponta para a build 9 e para o artefato permanente desta release.

## Verificações

- `npm run typecheck`: exit 0.
- `npm test`: exit 0, 54 arquivos e 520 testes aprovados em 363,68 segundos.
- Prévia web com Supabase simulado: 88 medições em oito dimensões, zero erros JavaScript e 11 capturas de tela.
- URLs de autenticação com respostas simuladas: quatro rotas sensíveis, nenhum consumo automático de token e uma verificação explícita simulada. Nenhum email foi enviado.
- Landing: imagens íntegras, dois links iguais ao manifesto público, teclado, fontes ampliadas e páginas legais conferidos. As cópias locais dos verificadores aguardam o carregamento das imagens lazy antes de chamar `decode` e aceitam o manifesto público válido, evitando premissas antigas dos scripts.

### Integração real no Supabase

Foram usadas contas temporárias criadas com confirmação administrativa, sem envio de email. Nenhum dado preexistente foi alterado.

O primeiro ensaio aprovado registrou 54 requests HTTP: sala privada 1v1, heartbeat autorizado para os jogadores, recusa a terceiro, troca consentida, evento Realtime entre sessões autenticadas, início pela Edge Function real, `startsAt` futuro e recusa de carta/auto antes da contagem. A carta após a contagem foi aceita. Mãos e tabelas privadas permaneceram inacessíveis a terceiro.

A partida terminou em 12x0 com uma carta e 12 folds legais. O vencedor passou de 500 para 510; o perdedor permaneceu em 500 pelo piso de MMR. Cada jogador leu somente o próprio registro de pontuação.

O segundo ensaio registrou 36 requests HTTP: espectador de partida pública recebeu o snapshot e uma revisão por Realtime, sem mão privada ou assento. Jogada e auto foram recusados com `not_member`. Sair revogou o acesso à partida, à sala e à inscrição.

Ambos os ensaios removeram suas contas, perfis, salas e partidas. Consultas administrativas somente leitura confirmaram zero registros de QA restantes. Uma tentativa inicial falhou por nome incorreto de coluna no coletor; a correção ficou restrita ao script de QA, com limpeza também comprovada.

## Limites

Não foram comprovados instalação em aparelho físico, partida entre celulares físicos, iPhone físico, concorrência PostgreSQL com conexões independentes ou desempenho sob carga. Realtime e requests autenticados reais foram exercitados por sessões programáticas; a matriz visual usou respostas simuladas. Um emulador temporário não estabilizou a inicialização e não conta como validação do APK. Ele foi encerrado, e o AVD de QA foi removido sem alterar os AVDs existentes.

Clientes Android antigos não enviam heartbeat e podem perder a sala após 120 segundos sem renovação. A atualização preserva identificador e keystore; não foi adicionado bloqueio obrigatório de versões antigas.

As evidências locais sanitizadas ficam em `.expo/validation-v2/public/`, ignorada pelo Git. Credenciais administrativas foram lidas do armazenamento local somente em memória e não fazem parte dos relatórios.
