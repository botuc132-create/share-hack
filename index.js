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
  groupChat: 'Vào Đây Chat Này Con Tuất👀 \n https://t.me/luxyffchat',
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

// ===== Force Join Config =====
const REQUIRED_GROUPS = [
  { name: '🔥 Nhóm 1', username: '@luxyffshare', url: 'https://t.me/luxyffshare' },
  { name: '🔥 Nhóm 2', username: '@luxyffchat',  url: 'https://t.me/luxyffchat'  },
];

async function checkNotJoined(ctx) {
  const uid = ctx.from?.id;
  if (!uid) return REQUIRED_GROUPS;
  const notJoined = [];
  for (const g of REQUIRED_GROUPS) {
    try {
      const m = await ctx.telegram.getChatMember(g.username, uid);
      if (['left', 'kicked'].includes(m.status)) notJoined.push(g);
    } catch (e) {
      // Nếu bot chưa được add vào nhóm hoặc lỗi khác, coi như chưa tham gia
      notJoined.push(g);
    }
  }
  return notJoined;
}

function joinKeyboard() {
  return Markup.inlineKeyboard([
    REQUIRED_GROUPS.map((g) => Markup.button.url(g.name, g.url)),
    [Markup.button.callback('✅ Tôi Đã Tham Gia', 'check_join')],
  ]);
}

async function sendJoinPrompt(ctx, notJoined) {
  const text =
    `⚠️ Vào Nhóm Để Được Sử dụng Bot\n\n` +
    `Bạn chưa tham gia đủ nhóm. Vui lòng bấm 2 nút bên dưới để vào nhóm, rồi bấm "✅ Tôi Đã Tham Gia".`;
  await ctx.reply(text, joinKeyboard());
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

// Middleware: chặn user chưa join đủ nhóm (chỉ áp dụng chat riêng)
bot.use(async (ctx, next) => {
  try {
    if (ctx.chat && ctx.chat.type !== 'private') return next();
    if (!ctx.from) return next();

    // Cho phép callback check_join đi qua để xử lý riêng
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'check_join') return next();

    const notJoined = await checkNotJoined(ctx);
    if (notJoined.length > 0) {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('Bạn chưa tham gia đủ nhóm!', { show_alert: true }).catch(() => {});
      }
      await sendJoinPrompt(ctx, notJoined);
      return; // chặn
    }
    return next();
  } catch (e) {
    console.error('force-join middleware error:', e.message);
    return next();
  }
});

bot.start(async (ctx) => {
  trackUser(ctx);
  await ctx.reply(config.welcome, mainKeyboard());
});

bot.command('menu', async (ctx) => {
  await ctx.reply('Menu chính:', mainKeyboard());
});

// ===== Callback: kiểm tra tham gia nhóm =====
bot.action('check_join', async (ctx) => {
  const notJoined = await checkNotJoined(ctx);
  if (notJoined.length > 0) {
    await ctx.answerCbQuery(`Bạn chưa tham gia đủ nhóm (${notJoined.length} nhóm còn thiếu)!`, { show_alert: true }).catch(() => {});
    try {
      await ctx.editMessageText(
        `⚠️ Bạn chưa tham gia đủ, hãy tham gia nhóm còn thiếu rồi bấm "✅ Tôi Đã Tham Gia".`,
        joinKeyboard()
      );
    } catch {}
    return;
  }

  await ctx.answerCbQuery('✅ Đã xác minh, chào mừng!').catch(() => {});
  try { await ctx.deleteMessage(); } catch {}
  trackUser(ctx);
  await ctx.reply(config.welcome, mainKeyboard());
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
});

bot.launch().then(() => console.log('🤖 Bot đã chạy (long polling).'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
