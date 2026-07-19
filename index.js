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

// ===== File paths =====
const USERS_FILE = path.join(__dirname, 'users.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// ===== Defaults =====
const DEFAULT_CONFIG = {
  buttons: {
    share: 'Nhóm Share Đồ',
    chat: 'Nhóm Chat',
    menu: 'Mua Menu Anti',
    support: 'Hỗ trợ',
  },
  responses: {
    share: 'https://t.me/luxyffshare',
    chat: 'https://t.me/luxyffch',
    menu: 'Liên hệ admin: @huybuwin',
    support: 'Liên hệ admin: @huybuwin',
  },
  startText: 'Vào Nhóm Để Nhận Menu Miễn Phí https://t.me/luxyffshare',
};

// ===== Helpers: read/write JSON safely =====
function ensureFile(file, defaults) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
    }
  } catch (e) {
    console.error('ensureFile error:', e);
  }
}

function readJson(file, defaults) {
  try {
    ensureFile(file, defaults);
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('readJson error:', e);
    return defaults;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('writeJson error:', e);
  }
}

ensureFile(USERS_FILE, []);
ensureFile(CONFIG_FILE, DEFAULT_CONFIG);

let config = { ...DEFAULT_CONFIG, ...readJson(CONFIG_FILE, DEFAULT_CONFIG) };
config.buttons = { ...DEFAULT_CONFIG.buttons, ...(config.buttons || {}) };
config.responses = { ...DEFAULT_CONFIG.responses, ...(config.responses || {}) };

function saveConfig() {
  writeJson(CONFIG_FILE, config);
}

function getUsers() {
  return readJson(USERS_FILE, []);
}

function addUser(id) {
  const users = getUsers();
  if (!users.includes(id)) {
    users.push(id);
    writeJson(USERS_FILE, users);
  }
}

// ===== Keyboards =====
function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(config.buttons.share, 'BTN_SHARE'),
      Markup.button.callback(config.buttons.chat, 'BTN_CHAT'),
    ],
    [
      Markup.button.callback(config.buttons.menu, 'BTN_MENU'),
      Markup.button.callback(config.buttons.support, 'BTN_SUPPORT'),
    ],
  ]);
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Thống kê user', 'ADMIN_STATS')],
    [Markup.button.callback('📢 Thông báo all', 'ADMIN_BROADCAST')],
    [Markup.button.callback('✏️ Đổi văn bản menu', 'ADMIN_EDIT')],
  ]);
}

function editMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(config.buttons.share, 'EDIT_share'),
      Markup.button.callback(config.buttons.chat, 'EDIT_chat'),
    ],
    [
      Markup.button.callback(config.buttons.menu, 'EDIT_menu'),
      Markup.button.callback(config.buttons.support, 'EDIT_support'),
    ],
  ]);
}

// ===== Admin state (in-memory) =====
// state: { [adminId]: { action: 'broadcast' | 'edit', key?: string } }
const adminState = {};

function isAdmin(ctx) {
  return ctx.from && ctx.from.id === ADMIN_ID;
}

// ===== Bot =====
const bot = new Telegraf(BOT_TOKEN);

bot.catch((err, ctx) => {
  console.error('Bot error for', ctx.updateType, err);
});

bot.start(async (ctx) => {
  try {
    addUser(ctx.from.id);
    await ctx.reply(config.startText, mainMenu());
  } catch (e) {
    console.error('start error:', e);
  }
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Bạn không có quyền sử dụng lệnh này.');
  }
  await ctx.reply('🛠 Menu Admin:', adminMenu());
});

// Main menu actions
bot.action('BTN_SHARE', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  await ctx.reply(config.responses.share);
});
bot.action('BTN_CHAT', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  await ctx.reply(config.responses.chat);
});
bot.action('BTN_MENU', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  await ctx.reply(config.responses.menu);
});
bot.action('BTN_SUPPORT', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  await ctx.reply(config.responses.support);
});

// Admin actions
bot.action('ADMIN_STATS', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Không có quyền', { show_alert: true });
  try { await ctx.answerCbQuery(); } catch {}
  const users = getUsers();
  await ctx.reply(`Tổng số user: ${users.length}`);
});

bot.action('ADMIN_BROADCAST', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Không có quyền', { show_alert: true });
  try { await ctx.answerCbQuery(); } catch {}
  adminState[ctx.from.id] = { action: 'broadcast' };
  await ctx.reply('Nhập nội dung cần gửi cho tất cả user:');
});

bot.action('ADMIN_EDIT', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Không có quyền', { show_alert: true });
  try { await ctx.answerCbQuery(); } catch {}
  await ctx.reply('Chọn ô muốn đổi tên:', editMenu());
});

bot.action(/^EDIT_(share|chat|menu|support)$/, async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Không có quyền', { show_alert: true });
  try { await ctx.answerCbQuery(); } catch {}
  const key = ctx.match[1];
  adminState[ctx.from.id] = { action: 'edit', key };
  await ctx.reply(`Đổi tên ô này thành gì? (hiện tại: "${config.buttons[key]}")`);
});

// Handle text: broadcast content / edit new name / register user
bot.on('text', async (ctx, next) => {
  try {
    addUser(ctx.from.id);
  } catch {}

  if (isAdmin(ctx) && adminState[ctx.from.id]) {
    const state = adminState[ctx.from.id];

    if (state.action === 'broadcast') {
      delete adminState[ctx.from.id];
      const users = getUsers();
      const content = ctx.message.text;
      let ok = 0, fail = 0;
      for (const uid of users) {
        try {
          await ctx.telegram.sendMessage(uid, content);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      return ctx.reply(`✅ Gửi thành công: ${ok}\n❌ Thất bại: ${fail}`);
    }

    if (state.action === 'edit' && state.key) {
      const key = state.key;
      const newName = ctx.message.text.trim();
      delete adminState[ctx.from.id];
      if (!newName) {
        return ctx.reply('Tên không hợp lệ.');
      }
      config.buttons[key] = newName;
      saveConfig();
      return ctx.reply('Đổi thành công!', mainMenu());
    }
  }

  return next && next();
});

bot.launch().then(() => {
  console.log('🤖 Bot đang chạy...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
