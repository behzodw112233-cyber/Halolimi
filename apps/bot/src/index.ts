import 'dotenv/config';
import { createServer } from 'node:http';
import { webhookCallback } from 'grammy';
import { createBot } from './bot.js';

/**
 * Production entry.
 *
 * - Pella / free bot hosts: long-polling (no public URL) — default
 * - Webhook mode: set WEBHOOK_URL to a public HTTPS base
 */

const token = process.env.BOT_TOKEN;
const authSecret = process.env.TELEGRAM_AUTH_SECRET;
if (!token) {
  console.error('❌ BOT_TOKEN topilmadi. Env da BOT_TOKEN ni belgilang.');
  process.exit(1);
}
if (!authSecret || authSecret.length < 32) {
  console.error('TELEGRAM_AUTH_SECRET topilmadi yoki juda qisqa.');
  process.exit(1);
}

const bot = createBot(token, authSecret);
const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.WEBHOOK_SECRET ?? 'halolmi_secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL?.trim();

async function runPolling() {
  await bot.init();
  await bot.api.setMyCommands([{ command: 'start', description: 'Botni ishga tushirish' }]);
  // A webhook and long-polling can't be active at once.
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  console.log(`🤖 @${bot.botInfo.username} long-polling rejimida (Pella / local).`);

  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());

  await bot.start({
    allowed_updates: ['message', 'callback_query'],
    onStart: () => console.log('✅ Yangilanishlarni tinglash boshlandi.'),
  });
}

async function runWebhook() {
  await bot.init();
  await bot.api.setMyCommands([{ command: 'start', description: 'Botni ishga tushirish' }]);

  const handleUpdate = webhookCallback(bot, 'http', { secretToken: SECRET });

  const server = createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      try {
        await handleUpdate(req, res);
      } catch (err) {
        console.error('Webhook xatolik:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        }
      }
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(`🤖 @${bot.botInfo.username} webhook server ishlayapti`);
  });

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => resolve());
  });

  console.log(`🌐 Webhook server: http://0.0.0.0:${PORT}/webhook`);

  const full = `${WEBHOOK_URL!.replace(/\/$/, '')}/webhook`;
  await bot.api.setWebhook(full, {
    secret_token: SECRET,
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query'],
  });
  console.log('✅ Webhook oʻrnatildi:', full);
}

async function main() {
  if (WEBHOOK_URL) {
    await runWebhook();
  } else {
    await runPolling();
  }
}

main().catch((err) => {
  console.error('Ishga tushirishda xatolik:', err);
  process.exit(1);
});
