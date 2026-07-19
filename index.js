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

const USERS_FILE = path.join(__dirname, 'users.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// ===== Nhãn nút Reply Keyboard (cố định theo yêu cầu) =====
const BTN_SHARE = '📦 Nhóm Share Đồ';
const BTN_CHAT = '💬 Nhóm Chat';
const BTN_MENU = '🛒 Mua Menu Anti';
const BTN_SUPPORT = '📞 Hỗ Trợ';

const DEFAULT_CONFIG = {
  responses: {
    share: Vào Lấy Đây Lấy Hack Này Con Tuất /n 'https://t.me/luxyffshare',
    chat: Vào Đây Chat Này Con Tuất /n 'https://t.me/luxyffch',
    menu: 'Liên hệ admin Để Mua /n : @huybuwin',
    support: 'Liên hệ admin /n : @huybuwin',
  },
  startText: 'Vào Nhóm Để Nhận Menu Miễn Phí /n 🔥 Admin Có Nhận Làm Bot Theo Yêu Câu Ai Cần Làm Thì Liên Hệ Nhé. /n 👀 https://t.me/luxyffshare',
};

function ensureFile(file, defaults) {
  try { if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaults, null, 2)); }
  catch (e) { console.error('ensureFile error:', e); }
}
function readJson(file, defaults) {
  try { ensureFile(file, defaults); return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch (e) { console.error('readJson error:', e); return defaults; }
}
function writeJson(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('writeJson error:', e); }
}

ensureFile(USERS_FILE, []);
ensureFile(CONFIG_FILE, DEFAULT_CONFIG);

let config = { ...DEFAULT_CONFIG, ...readJson(CONFIG_FILE, DEFAULT_CONFIG) };
config.responses = { ...DEFAULT_CONFIG.responses, ...(config.responses || {}) };

function getUsers() { return readJson(USERS_FILE, []); }
function addUser(id) {
  const users = getUsers();
  if (!users.includes(id)) { users.push(id); writeJson(USERS_FILE, users); }
}

// ===== Reply Keyboard (LUÔN hiển thị ở khu vực nhập tin) =====
function mainKeyboard() {
  return Markup.keyboard([
    [BTN_SHARE, BTN_CHAT],
    [BTN_MENU, BTN_SUPPORT],
  ]).resize().persistent();
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Thống kê user', 'ADMIN_STATS')],
    [Markup.button.callback('📢 Thông báo all', 'ADMIN_BROADCAST')],
  ]);
}

const adminState = {};
function isAdmin(ctx) { return ctx.from && ctx.from.id === ADMIN_ID; }

const bot = new Telegraf(BOT_TOKEN);
bot.catch((err, ctx) => console.error('Bot error for', ctx.updateType, err));

bot.start(async (ctx) => {
  try {
    addUser(ctx.from.id);
    await ctx.reply(config.startText, mainKeyboard());
  } catch (e) { console.error('start error:', e); }
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Bạn không có quyền sử dụng lệnh này.', mainKeyboard());
  await ctx.reply('🛠 Menu Admin:', adminMenu());
});

// ===== Bấm nút trên Reply Keyboard =====
bot.hears(BTN_SHARE,   (ctx) => ctx.reply(config.responses.share,   mainKeyboard()));
bot.hears(BTN_CHAT,    (ctx) => ctx.reply(config.responses.chat,    mainKeyboard()));
bot.hears(BTN_MENU,    (ctx) => ctx.reply(config.responses.menu,    mainKeyboard()));
bot.hears(BTN_SUPPORT, (ctx) => ctx.reply(config.responses.support, mainKeyboard()));

bot.action('ADMIN_STATS', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Không có quyền', { show_alert: true });
  try { await ctx.answerCbQuery(); } catch {}
  await ctx.reply(`Tổng số user: ${getUsers().length}`);
});

bot.action('ADMIN_BROADCAST', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Không có quyền', { show_alert: true });
  try { await ctx.answerCbQuery(); } catch {}
  adminState[ctx.from.id] = { action: 'broadcast' };
  await ctx.reply('Nhập nội dung cần gửi cho tất cả user:');
});

bot.on('text', async (ctx, next) => {
  try { addUser(ctx.from.id); } catch {}

  if (isAdmin(ctx) && adminState[ctx.from.id]) {
    const state = adminState[ctx.from.id];
    if (state.action === 'broadcast') {
      delete adminState[ctx.from.id];
      const users = getUsers();
      const content = ctx.message.text;
      let ok = 0, fail = 0;
      for (const uid of users) {
        try { await ctx.telegram.sendMessage(uid, content); ok++; }
        catch { fail++; }
      }
      return ctx.reply(`✅ Gửi thành công: ${ok}\n❌ Thất bại: ${fail}`, mainKeyboard());
    }
  }
  return next && next();
});

bot.launch().then(() => console.log('🤖 Bot đang chạy...'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
