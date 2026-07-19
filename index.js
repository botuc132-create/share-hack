require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);

if (!BOT_TOKEN) {
  console.error('❌ Thiếu BOT_TOKEN trong biến môi trường.');
  process.exit(1);
}

// ===== Config =====
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  welcome:
    '👋 Chào mừng tuất đến với bot!\n\n🐶 Vào nhóm để được yêu thương https://t.me/luxyffshare\n\n🔥 Admin nhận làm bot tele theo yêu cầu của se cần thì bấm hỗ trợ nhé! ',
  groupShare: 'Vào Đây Lấy Hack Này Con Tuất👀 \n https://t.me/luxyffshare',
  groupChat: 'Vào Đây Chat Này Con Tuất👀 \n https://t.me/luxyffch',
  buyMenu: 'Liên hệ admin để mua Menu Anti: @huybuwin',
  support: 'Liên hệ hỗ trợ: @huybuwin',
};
try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  }
} catch (e) {
  console.error('⚠️  Không đọc được config.json:', e.message);
}

// ===== Users =====
const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  }
} catch (e) {
  console.error('⚠️  Không đọc được users.json:', e.message);
}
function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('⚠️  Không ghi được users.json:', e.message);
  }
}
function trackUser(ctx) {
  const id = ctx.from?.id;
  if (!id) return;
  if (!users.includes(id)) {
    users.push(id);
    saveUsers();
  }
}

// ===== Nhãn nút (PHẢI dùng đúng chuỗi này ở mọi nơi) =====
const BTN_SHARE   = '📦 Nhóm Share Đồ';
const BTN_CHAT    = '💬 Nhóm Chat';
const BTN_BUY     = '🛒 Mua Menu Anti';
const BTN_SUPPORT = '📞 Hỗ Trợ';

// Reply Keyboard (bàn phím Telegram, luôn hiện)
const mainKeyboard = () =>
  Markup.keyboard([
    [BTN_SHARE, BTN_CHAT],
    [BTN_BUY, BTN_SUPPORT],
  ])
    .resize()
    .persistent();

// ===== Bot =====
const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  trackUser(ctx);
  await ctx.reply(config.welcome, mainKeyboard());
});

bot.command('menu', async (ctx) => {
  await ctx.reply('Menu chính:', mainKeyboard());
});

// ===== Xử lý các nút Reply Keyboard =====
bot.hears(BTN_SHARE, async (ctx) => {
  trackUser(ctx);
  await ctx.reply(`📦 Nhóm Share Đồ:\n${config.groupShare}`, mainKeyboard());
});

bot.hears(BTN_CHAT, async (ctx) => {
  trackUser(ctx);
  await ctx.reply(`💬 Nhóm Chat:\n${config.groupChat}`, mainKeyboard());
});

bot.hears(BTN_BUY, async (ctx) => {
  trackUser(ctx);
  await ctx.reply(`🛒 Mua Menu Anti:\n${config.buyMenu}`, mainKeyboard());
});

bot.hears(BTN_SUPPORT, async (ctx) => {
  trackUser(ctx);
  await ctx.reply(`📞 Hỗ Trợ:\n${config.support}`, mainKeyboard());
});

// ===== Admin: broadcast =====
bot.command('broadcast', async (ctx) => {
  if (ctx.from?.id !== ADMIN_ID) return;
  const text = ctx.message.text.replace(/^\/broadcast(@\w+)?\s*/, '');
  if (!text) return ctx.reply('Cú pháp: /broadcast <nội dung>');
  let ok = 0, fail = 0;
  for (const uid of users) {
    try {
      await bot.telegram.sendMessage(uid, text);
      ok++;
    } catch {
      fail++;
    }
  }
  ctx.reply(`✅ Gửi xong: ${ok} thành công, ${fail} thất bại.`, mainKeyboard());
});

// Fallback: mọi tin nhắn khác vẫn giữ bàn phím
bot.on('message', async (ctx) => {
  trackUser(ctx);
  // Không trả lời tự động để tránh nhiễu, chỉ đảm bảo keyboard còn đó
  // nếu muốn phản hồi, mở dòng dưới:
  // await ctx.reply('Vui lòng chọn một mục ở bàn phím bên dưới 👇', mainKeyboard());
});

bot.launch().then(() => console.log('🤖 Bot đã chạy (long polling).'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
