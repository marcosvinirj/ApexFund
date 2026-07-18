# ApexFund — Trading & Risk Suite

Plataforma premium de gestão de risco, plano de crescimento de banca e diário de
trading. Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Framer
Motion · Recharts · libsql (SQLite).

## Funcionalidades

- **Autenticação** multi-utilizador (registo, login, sessões em cookie httpOnly,
  hashing `scrypt`), com dados isolados por utilizador.
- **Plano de Crescimento de Capital** — simulação de juro composto em tempo real,
  marcos, comparação real vs. projeção.
- **Dashboard**, **Operações** (CRUD), **Diário SMC**, **Metas** (conquistas),
  **Estatísticas** (drawdown, distribuição de R), **Relatórios** (CSV / PDF),
  **Configurações**.
- Modo escuro/claro, mobile-first, microinterações.

## Desenvolvimento

```bash
npm install
npm run dev          # http://localhost:3000
```

Conta demo pré-carregada: **demo@apexfund.app** / **demo1234**.

Sem configuração, a app usa um ficheiro SQLite local em `./data/app.db` (criado e
populado automaticamente na primeira execução).

## Produção / Deploy

1. **Base de dados.** Em vez do ficheiro local, aponta para uma base
   **libsql/Turso** remota (mesmo driver, serverless, zero mudanças no código):

   ```bash
   DATABASE_URL="libsql://o-teu-db.turso.io"
   DATABASE_AUTH_TOKEN="o-teu-token"
   ```

   (Ver `.env.example`.) Cria a base com [Turso](https://turso.tech) —
   `turso db create apexfund` e `turso db tokens create apexfund`.

2. **Build e arranque:**

   ```bash
   npm run build
   npm run start
   ```

   Com `NODE_ENV=production`, os cookies de sessão passam a `Secure` (só HTTPS).
   Serve sempre atrás de **HTTPS** (o HSTS já está configurado).

3. **Segurança já incluída:**
   - Rate-limiting no login (10/min por IP) e registo (6/hora por IP).
   - Cabeçalhos: `X-Content-Type-Options`, `X-Frame-Options`,
     `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
   - Palavras-passe com hash+salt (`scrypt`); sessões opacas em base de dados.

### Notas de escala

- O rate-limiter é **em memória** (uma instância). Para várias instâncias /
  serverless, troca `src/lib/rate-limit.ts` por Redis ou uma tabela partilhada.
- Para deploy **serverless/edge**, usa o cliente HTTP do libsql
  (`@libsql/client/web`) em vez do binding nativo.
- Próximos passos sugeridos: verificação de email, recuperação de palavra-passe,
  e (se necessário) migração para Postgres via um ORM.
