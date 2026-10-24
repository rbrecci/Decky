# Decky

Aplicativo mobile que substitui as cartas físicas em partidas **presenciais** de Truco Paulista. Duas pessoas no modo **1v1**, ou quatro em duas duplas no modo **2v2**, entram na mesma sala pela internet. Cada jogador vê somente as próprias cartas; todos acompanham a mesa, a vira, as manilhas, a vez, os pedidos de truco e o placar. Opcionalmente, um aparelho adicional fica no centro como mesa.

Projeto da atividade de Desenvolvimento Mobile/Scrum do SENAI. Na sprint original do MVP, a apresentação estava prevista para **09/10/2026**.

> **Estado em 24/10/2026: web e backend V2 publicados; APK 2.0.0/build 7 disponível na [release v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0), com download público conferido.** O mesmo APK foi instalado e validado no Redmi. A migration V2 e as duas Edge Functions v14 estão publicadas. Google web/APK, e-mails reais e leitura óptica Android têm evidências. Manifesto e landing publicados e conferidos em [GitHub Pages](https://rbrecci.github.io/Decky/). A V2 ainda não está concluída e não houve reset.

Para retomar, começar pelo estado canônico em [docs/VALIDACAO_V2.md](docs/VALIDACAO_V2.md) e pela passagem de trabalho em [docs/PREPARO_V2.md](docs/PREPARO_V2.md). Os limites de aceite registrados incluem cenários restantes de QR, Branding após a espera de 24 horas e conta externa, Safari em aparelho Apple, aviso de atualização entre builds com verificador e reset de lançamento. Na retomada de 24/10/2026, Saker autorizou explicitamente commit/push da V2 no seu nome e participou da leitura óptica no APK e na web móvel com reentrada. Os registros da sprint original descrevem o MVP e não substituem o estado atual da V2.

Os pedidos adicionais de aparelhos foram encerrados por Saker nesta sessão, sem aprovação implícita dos limites que ficaram sem prova. Não há handoff de teste aguardando resposta. Branding só poderá ser tentado novamente a partir de 25/10/2026 às 10:49 BRT (`13:49Z`), após o prazo indicado pelo Google.

## Funcionalidades

- Cadastro com confirmação e reenvio, login por senha ou Google, recuperação de senha por e-mail e logout. Retornos e templates estão configurados; os fluxos reais aprovados e as provas ainda pendentes estão em [docs/AUTH_V2.md](docs/AUTH_V2.md).
- Criar sala com código curto escolhendo **1v1** ou **2v2** e o papel do dono: **jogador** ou **mesa**. O papel pode mudar no lobby; o formato da partida é escolhido na criação.
- Salas privadas por padrão ou públicas com descoberta em tempo real. Entrada por código ou leitor QR: dois lugares no 1v1, quatro lugares e duas duplas no 2v2.
- No 1v1, correr e pedir, aceitar ou aumentar as apostas são decisões individuais, sem confirmação de parceiro.
- Início de partida pelo dono da sala, com distribuição de cartas feita **no servidor**.
- Tela do jogador dividida: mesa pública em cima, mão privada embaixo, com seleção e confirmação da carta e controles de truco contextuais.
- Mesa central (modo mesa): só informações públicas, em tela cheia, sem mão e sem poder jogar (garantido pelo servidor). Nesse modo os 4 celulares dos jogadores mostram só a própria mão, os controles e o essencial público; a mesa completa fica no aparelho da mesa.
- Distribuição animada: as cartas saem do baralho até cada jogador, a vira é revelada e a manilha indicada; anima uma vez por mão e não se repete ao reconectar.
- Manilhas da própria mão com contorno, halo e selo de estrela dourados; ao receber uma manilha, uma revelação especial (brilho e estrela central) roda uma única vez no aparelho do dono da carta.
- Truco Paulista completo: manilha variável, vazas, pedidos 3/6/9/12, placar automático até 12 pontos.
- Carta oculta como descarte, sem disputar a vaza nem ser revelada aos demais depois dela; primeira vaza sempre aberta.
- MMR independente por modalidade, inicial e piso de 500, títulos de Beta 1 a Omega e extrato oficial por partida.
- Histórico com CRUD de notas, paginações independentes de cinco itens, skeleton e cabeçalho fixo.
- QR code no lobby para abrir a entrada da sala com o código preenchido.
- Interface web responsiva, landing estática em `site/` e aviso opcional de atualização Android. O manifesto registra o APK público 2.0.0/build 7; a landing publicada usa esse mesmo manifesto.

## Equipe

| Pessoa | Papel | Foco |
|---|---|---|
| Mariana Ribeiro | Product Owner | Escopo, regras, critérios de aceite, apresentação |
| Isabela Puzenato | Scrum Master | Backlog, issues, Daily, impedimentos, evidências |
| Nicoly Ribeiro | Dev | Design system, telas, navegação, cadastro e login |
| Caio Yuri | Dev | Salas, posições, duplas, presença e sincronização |
| Eduardo Zanetti | Dev | Motor de regras do Truco Paulista e testes |
| Rafael Brecci | Dev | Supabase, schema, RLS, RPC, histórico e CRUD |

## Stack

React Native, Expo, TypeScript e Expo Router no cliente, com `react-native-svg` para a mesa e Playfair Display (`@expo-google-fonts/playfair-display`) nos títulos. A identidade visual (cassino escuro, logo preservado) está descrita em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#identidade-visual). Supabase (Auth, PostgreSQL, Realtime, Edge Functions e/ou RPC) no servidor. O servidor é a fonte única da verdade; o cliente só envia intenções de jogada.

## Pré-requisitos

- Node.js LTS e npm.
- Aplicativo Expo Go num celular Android ou iPhone (a versão da loja precisa suportar o SDK 57 do projeto), ou um emulador Android. Simulador iOS só num Mac com Xcode.
- O projeto Supabase do grupo, com as migrations e as Edge Functions publicadas (ver "Backend").

## Como executar

1. `npm install`
2. Criar `.env` com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`, descritas abaixo. Usar a URL do projeto sem `/rest/v1/`. A exclusão local preexistente de `.env.example` foi preservada.
3. `npx expo start` e ler o QR code: no Android, com o Expo Go; no iPhone, com a câmera, que abre o Expo Go.

### APK Android instalável

O perfil `apk` de `eas.json` gera um aplicativo independente do Expo Go e do servidor de desenvolvimento. A partida continua precisando de internet e do projeto Supabase ativo.

O APK V2 2.0.0/build 7 foi instalado sobre a V1 no Redmi, com assinatura e sessão preservadas. Permissão de câmera, leitura óptica e liberação em background passaram no aparelho. O mesmo artefato está na [release v2.0.0](https://github.com/rbrecci/Decky/releases/tag/v2.0.0), com download anônimo, tamanho, hash e assinatura conferidos. O manifesto real e a landing estão publicados e conferidos no [Pages](https://rbrecci.github.io/Decky/). Provas e limites em [docs/VALIDACAO_V2.md](docs/VALIDACAO_V2.md) e [docs/DISTRIBUICAO_V2.md](docs/DISTRIBUICAO_V2.md).

1. O projeto EAS já está vinculado e as credenciais estão cadastradas. Conferir a conta existente; não refazer `build:configure` nem criar outra keystore. Para este projeto, seguir [docs/DISTRIBUICAO_V2.md](docs/DISTRIBUICAO_V2.md).
2. No projeto EAS, conferir as variáveis já cadastradas no ambiente `production`: `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. A segunda recebe a chave publicável do Supabase; o nome da variável foi mantido por compatibilidade com o código atual. Não cadastrar `service_role` no aplicativo.
3. Confirmar que as migrations e as Edge Functions do backend estão publicadas no projeto Supabase indicado pela URL.
4. Rodar `npx eas-cli build -p android --profile apk`. Ao terminar, abrir o link fornecido pelo EAS no celular e instalar o APK.

O identificador Android é `br.senai.decky`. Para futuras versões instalarem por cima da atual, manter esse identificador e a mesma chave de assinatura gerenciada pelo EAS.

### Web no navegador

[Abrir o Decky no navegador](https://decky-brecci.expo.app).

A versão web publicada já é a V2 e usa o mesmo Supabase e as mesmas salas do aplicativo Android. No iPhone, o acesso previsto é pelo Safari, sem instalar APK nem assinar o Apple Developer Program; a validação física nesse aparelho ainda está pendente. As dependências `react-dom`, `react-native-web` e `@expo/metro-runtime` já estão no projeto e são instaladas com `npm install`.

- Desenvolvimento: preencher o `.env` como acima e executar `npm run web`.
- Build local: `npm run build:web` exporta o site para `dist/`, usando as variáveis locais.
- Build de produção com as variáveis cadastradas no EAS: `npx eas-cli env:exec production "npm run build:web" --non-interactive`.
- Publicação no EAS Hosting, após conferir a build: `npx eas-cli deploy --prod --environment production`. Usar o endereço retornado pelo comando para compartilhar o acesso.

As variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` precisam estar disponíveis durante a build, pois entram no código público do navegador. Nunca usar `service_role`. A partida requer internet. A validação em Safari de um iPhone real ainda está pendente.

### iOS

O app é o mesmo nas duas plataformas (sem código nativo próprio). Configuração específica em `app.json`:

| Campo | Por quê |
|---|---|
| `userInterfaceStyle: "dark"` | O app é escuro; com `light`, alertas e teclado do iOS apareciam claros |
| `ios.bundleIdentifier: "br.senai.decky"` | Obrigatório para build nativo. Troque se o grupo tiver um domínio próprio, **antes** do primeiro envio à App Store |
| `ios.requireFullScreen: true` | App só em retrato com `supportsTablet`: sem isso a App Store recusa o envio (a multitarefa do iPad exige todas as orientações) |
| `ios.config.usesNonExemptEncryption: false` | Só HTTPS padrão: dispensa a pergunta de exportação de criptografia no TestFlight |

- Pelo Expo Go: `npx expo start` e o QR code, como acima.
- Simulador (Mac com Xcode): `npm run ios`.
- Build instalável: `npx eas-cli build -p ios` (EAS Build, o serviço de build na nuvem da Expo; precisa de conta Apple Developer).

O que foi verificado sem Mac e o que ainda precisa de aparelho Apple está em [docs/QA_DEMO.md](docs/QA_DEMO.md#ios).

### Backend

O Supabase está ligado ao repositório `rbrecci/Decky` pela integração GitHub. Quando `supabase/` chega na branch de produção de lá, as migrations são aplicadas e as Edge Functions de `supabase/config.toml` são publicadas. Detalhes e plano B em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#deploy).

A versão com modo mesa precisa da migration `20261008180000_table_mode.sql` e da **republicação das duas Edge Functions**.

O modo 1v1 precisa da migration `20261022190000_duel.sql` e da **republicação de `start-match` e `submit-action` juntas**. Salas e partidas anteriores continuam no modo 2v2. O checklist de validação em aparelhos está em [docs/QA_DEMO.md](docs/QA_DEMO.md#modo-1v1).

O ranking original usa a migration `20261023150000_ranked.sql`. A V2 acrescenta `20261023230536_v2_mmr_public_rooms_history.sql` para MMR, descoberta pública, paginação e proteção da virada. Essa migration já foi aplicada e `start-match`/`submit-action` estão publicadas na versão v14 para o descarte oculto. O cálculo está em [docs/RANKING.md](docs/RANKING.md); as provas do backend e seus limites estão em [docs/VALIDACAO_V2.md](docs/VALIDACAO_V2.md).

Na V2, confirmação de cadastro, retornos e templates já foram configurados e exercitados com e-mails reais, conforme [docs/AUTH_V2.md](docs/AUTH_V2.md). Saker relatou concluir a recuperação por formulário e entrar com a senha nova; a QA teve senha anterior recusada e identidade/dados preservados. O aceite independente da senha nova, fontes ampliadas e teclado continuam como limites sem prova adicional: Saker dispensou essa rodada nesta sessão, sem aprovação implícita, e o handoff não será repetido nesta retomada. Os demais cenários de Auth nomeados nesse documento continuam pendentes. O reset não foi executado: pertence à janela de lançamento aprovada, pelo procedimento [docs/VIRADA_V2.md](docs/VIRADA_V2.md), fora das migrations automáticas.

### Testes

`npm test` roda tudo (Vitest):

| Pasta | O que cobre |
|---|---|
| `tests/engine/` | Motor do truco: baralho, manilha, vazas, empates, truco 3/6/9/12, correr, mão de 11, 200 partidas aleatórias |
| `tests/sql/` | Migrations reais num Postgres em memória (PGlite): salas, modo mesa, RLS, mãos privadas, idempotência, conflito de revisão, CRUD de notas e, em `flow.test.ts`, o código das Edge Functions jogando com 5 aparelhos (incluindo uma partida inteira até 12) |
| `tests/app/` | REGEX de e-mail, senha e nome; textos da mesa; geometria sem sobreposição; distribuição (ordem, fases calculadas no render, chegada das cartas, uma vez por mão); manilhas na mão (identificação pela vira, destaque só com a vira aberta, revelação escalonada para 1 a 3 manilhas, sem repetição); controles de truco; papel do aparelho e tela do jogador com mesa dedicada; leituras repetidas sem re-render; canais Realtime únicos |

`npm run typecheck` confere os tipos do app e do motor. O projeto não tem lint configurado.

### Fixture visual (só desenvolvimento)

Com `npx expo start`, a rota `/dev/preview` mostra a mesa com uma partida **simulada no próprio aparelho** pelo motor de regras (barra "FIXTURE LOCAL · sem servidor"), com botões para ver como cada lugar ou como a mesa. Alterna entre "com mesa" (5 aparelhos) e "sem mesa" (4 aparelhos), mostra a seleção de lugares ("Sala") e tem atalhos que agem pelo lugar da vez sem trocar de visão ("Truco/+", "Aceitar", "Correr", "Jogar"), para ver os avisos de truco na própria mesa, além de "Nomes longos" para conferir truncamento. Serve para revisar layout e animação sem Supabase e sem 4 celulares. **Não é o multiplayer real** e não deve ser apresentada como tal. Em build de produção a rota só mostra "Indisponível".

### Variáveis de ambiente

Valores **nunca** entram no Git; o `.env` é ignorado pelo `.gitignore`:

| Variável | Uso |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave publishable/anon, a única que o app pode conter |

A chave `service_role` e quaisquer secrets de função ficam apenas no painel do Supabase, nunca no app nem no repositório.

## Documentação

| Documento | Conteúdo |
|---|---|
| [SPEC.md](SPEC.md) | Especificação do MVP |
| [docs/PRODUCT_BACKLOG.md](docs/PRODUCT_BACKLOG.md) | Histórias US-01 a US-10 com critérios de aceite |
| [docs/SPRINT_BACKLOG.md](docs/SPRINT_BACKLOG.md) | Tarefas por pessoa, dependências e verificação |
| [docs/SCRUM.md](docs/SCRUM.md) | Sprint de 1 dia, cerimônias e registros |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura, contratos, dados e segurança |
| [docs/RULES.md](docs/RULES.md) | Regras do Truco Paulista e pendências para a PO |
| [docs/QA_DEMO.md](docs/QA_DEMO.md) | Checklist de QA e roteiro de demonstração |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branches, commits, PRs e segredos |

O documento ABNT é produzido pelo grupo separadamente e não faz parte deste repositório.

Documentação da V2: [especificação](DeckyV2Spec.md), [estado canônico, evidências e pendências](docs/VALIDACAO_V2.md), [passagem para retomada](docs/PREPARO_V2.md), [autenticação e painéis](docs/AUTH_V2.md), [interface](docs/UI_V2.md), [servidor](docs/VALIDACAO_SERVIDOR_V2.md), [distribuição e assinatura](docs/DISTRIBUICAO_V2.md) e [virada administrativa](docs/VIRADA_V2.md). As notas datadas da implementação inicial são históricas; conferir o estado atual e a passagem antes de continuar a publicação.
