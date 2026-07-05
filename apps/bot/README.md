# Halolmi Telegram Bot

A grammY-based Telegram bot mirroring the Halolmi mobile app flows (browse, sell,
saved, profile) with quick inline-button actions.

## Setup (webhook mode)

The bot runs an HTTP **webhook** server (grammY `webhookCallback`, native-http adapter).
Telegram POSTs updates to `<WEBHOOK_URL>/webhook`, validated with a secret token.

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Expose a public HTTPS URL to the server's port (default `8080`). In dev, use ngrok:
   ```bash
   ngrok http 8080          # copy the https URL it prints
   ```
3. Create `.env` (see `.env.example`):
   ```
   BOT_TOKEN=your-token-here
   PORT=8080
   WEBHOOK_SECRET=halolmi_secret
   WEBHOOK_URL=https://<your-ngrok-subdomain>.ngrok-free.dev
   ```
4. Run (from repo root or this folder):
   ```bash
   npm run start -w @halolmia/bot   # boots server + calls setWebhook automatically
   npm run dev   -w @halolmia/bot   # same, with tsx watch
   ```
   On boot it registers the webhook. Verify with:
   `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`

> In production, point `WEBHOOK_URL` at your deployed domain instead of ngrok.

## Features

- `/start` → language pick → main menu
- 🔍 **Qidirish** — pick a category, browse listings with ◀️/▶️ navigation, ❤️ save, 📞 contact
- ➕ **Sotish** — wizard: category → zot → vazn → narx → manzil → telefon → "admin tekshiruvida"
- ❤️ **Saqlangan** — saved listings
- 👤 **Kabinet** — profile summary

Data is mock (`src/data.ts`) — swap for Convex queries when the backend is wired.
