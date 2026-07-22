# Halolmi Telegram Bot

grammY bot for browse / sell / saved / profile + app login handshake (Telegram contact → verified seller).

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `BOT_TOKEN` | yes | From @BotFather |
| `CONVEX_URL` | yes | e.g. `https://xxx.convex.cloud` |
| `TELEGRAM_AUTH_SECRET` | yes | Same random 32+ character server-only value in bot hosting and Convex |
| `WEBHOOK_URL` | no | If set → webhook mode. **Leave empty on Pella** (long-polling). |
| `WEBHOOK_SECRET` | webhook only | Shared secret with Telegram |
| `PORT` | webhook only | Default `8080` |

Copy `.env.example` → `.env` for local runs.

## Local

```bash
# from monorepo root
npm install
npm run dev:poll -w @halolmia/bot   # long-polling (easiest)
# or
npm run start -w @halolmia/bot      # poll if no WEBHOOK_URL, else webhook
```

---

## Deploy on [Pella](https://www.pella.app/) (Telegram bot hosting)

Pella runs a Node process 24/7. Use **long-polling** (do **not** set `WEBHOOK_URL`).

### 1. Push monorepo to GitHub

Repo: your Halolmia GitHub (includes `apps/bot` + `packages/backend`).

### 2. Create project on Pella

1. Go to [pella.app](https://www.pella.app/) → sign up / log in  
2. **Create** → **Telegram Bot** → runtime **Node.js**  
3. Import from **GitHub** (whole monorepo)

### 3. Build / start commands

Pella needs the **workspace root** (repo root), not only `apps/bot`, because the bot depends on `@halolmia/backend`.

| Field | Value |
|-------|--------|
| **Install** | `npm install` |
| **Start** | `npm run start -w @halolmia/bot` |

If Pella only has a single “Start command” field, use:

```bash
npm install && npm run start -w @halolmia/bot
```

If it asks for a main file and cannot run monorepo scripts, set root to repo root and:

```bash
npx tsx apps/bot/src/index.ts
```

(after `npm install` at root).

### 4. Environment variables (Pella dashboard)

```
BOT_TOKEN=123456:ABC-from-BotFather
CONVEX_URL=https://your-deployment.convex.cloud
TELEGRAM_AUTH_SECRET=replace-with-a-long-random-secret
```

Configure the same secret in the Convex deployment:

```bash
npx convex env set TELEGRAM_AUTH_SECRET replace-with-a-long-random-secret
```

**Do not set** `WEBHOOK_URL` on Pella — the bot will long-poll Telegram.

### 5. Start the project

Open the Pella console/logs. You should see:

```
🤖 @YourBot long-polling rejimida (Pella / local).
✅ Yangilanishlarni tinglash boshlandi.
```

Then message the bot `/start` in Telegram.

### 6. App login deep link

In mobile env:

```
EXPO_PUBLIC_BOT_USERNAME=YourBotUsernameWithoutAt
```

---

## Webhook mode (optional, not Pella free)

If you later host with a public HTTPS URL (Railway, Fly, VPS):

```
WEBHOOK_URL=https://your-public-host.example
WEBHOOK_SECRET=some-long-secret
PORT=8080
```

Telegram will POST to `https://your-public-host.example/webhook`.

---

## Features

- `/start` → language → main menu  
- Qidirish, Sotish, Saqlangan, Kabinet  
- App login handshake (`?start=<token>`)  
- Verify seller (`?start=verify`) — Telegram + phone → tasdiqlangan sotuvchi  
- Convex backend for listings / users / auth
