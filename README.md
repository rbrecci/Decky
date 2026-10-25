# Decky

Truco Paulista presencial com cartas no celular: Duelo (1v1), Duplas (2v2) e mesa pública opcional. Projeto iniciado no SENAI com React Native, Expo, TypeScript e Supabase.

**Projeto finalizado e publicado.** O responsável encerrou a entrega em 25/10/2026, mantendo os limites conhecidos de validação no histórico e o Branding Google como melhoria opcional fora do escopo concluído.

- [Jogar no navegador](https://decky-brecci.expo.app)
- [Conhecer o projeto e baixar o APK Android](https://rbrecci.github.io/Decky/)
- [Documentação completa em PDF](docs/Decky.pdf)

O manual reúne instalação, arquitetura, regras, MMR, critérios de aceite, testes, autenticação, publicação e operação. A referência é de 25/10/2026 e distingue provas reais, simulações e limites conhecidos. O encerramento da entrega não transforma testes não executados em provas. A fonte Markdown está incorporada ao próprio PDF para futuras atualizações.

## Desenvolvimento

Instale as dependências com `npm install` e crie `.env` com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Use somente a chave pública do Supabase; detalhes de configuração e backend estão no manual.

```sh
npm start
npm run web
npm run typecheck
npm test
npm run build:web
```

Os diretórios `app/` e `src/` contêm o cliente; `supabase/`, o backend e as migrations; `tests/`, os testes; `site/`, a landing publicada pelo GitHub Pages. Licenças distribuídas com assets permanecem junto dos arquivos correspondentes.

Documentos substituídos e saídas antigas de QA foram retirados da árvore ativa. O histórico Git preserva as versões publicadas anteriores; cópias locais de arquivo ficam em `discarted/`, ignorada pelo Git. Novas evidências dos verificadores ficam em `.expo/validation-v2/public/`, também ignorada.
