import 'dotenv/config';
import { createServer } from 'node:http';
import { webhookCallback } from 'grammy';
import { createBot } from './bot.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN topilmadi. .env faylida BOT_TOKEN ni belgilang (.env.example ga qarang).');
  process.exit(1);
}

const bot = createBot(token);

const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.WEBHOOK_SECRET ?? 'halolmi_secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL; // public https base, e.g. https://xxxx.ngrok-free.app

// grammY native-http adapter; validates Telegram's secret-token header.
const handleUpdate = webhookCallback(bot, 'http', { secretToken: SECRET });

async function main() {
  // In webhook mode the bot must be initialized before handling updates.
  await bot.init();
  await bot.api.setMyCommands([{ command: 'start', description: 'Botni ishga tushirish' }]);

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
    // health check / anything else
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(`🤖 @${bot.botInfo.username} webhook server ishlayapti`);
  });

  server.listen(PORT, async () => {
    console.log(`🌐 Webhook server tinglayapti: http://localhost:${PORT}/webhook`);
    if (WEBHOOK_URL) {
      const full = `${WEBHOOK_URL.replace(/\/$/, '')}/webhook`;
      await bot.api.setWebhook(full, {
        secret_token: SECRET,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
      });
      console.log('✅ Webhook oʻrnatildi:', full);
    } else {
      console.log('ℹ️  WEBHOOK_URL yoʻq. Public URL oling (ngrok) va uni WEBHOOK_URL ga qoʻying yoki qoʻlda setWebhook qiling.');
    }
  });
}

main().catch((err) => {
  console.error('Ishga tushirishda xatolik:', err);
  process.exit(1);
});
