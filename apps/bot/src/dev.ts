import 'dotenv/config';
import { createBot } from './bot.js';

// Local development runner: LONG-POLLING mode.
// Unlike the webhook server (index.ts), this needs no public URL / ngrok —
// the bot connects out to Telegram and pulls updates. Just run it and it works.
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN topilmadi. apps/bot/.env faylida BOT_TOKEN ni belgilang (.env.example ga qarang).');
  process.exit(1);
}

const bot = createBot(token);

async function main() {
  await bot.init();
  await bot.api.setMyCommands([{ command: 'start', description: 'Botni ishga tushirish' }]);
  // A webhook and long-polling can't be active at once — drop any webhook first.
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  console.log(`🤖 @${bot.botInfo.username} long-polling rejimida ishlayapti (ngrok kerak emas).`);
  console.log('   To‘xtatish uchun Ctrl+C bosing.');

  await bot.start({
    allowed_updates: ['message', 'callback_query'],
    onStart: () => console.log('✅ Yangilanishlarni tinglash boshlandi.'),
  });
}

// Graceful shutdown so the next run can re-acquire updates cleanly.
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

main().catch((err) => {
  console.error('Ishga tushirishda xatolik:', err);
  process.exit(1);
});
