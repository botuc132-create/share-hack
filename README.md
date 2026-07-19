# Luxy Telegram Bot

Telegram bot viết bằng Node.js + [Telegraf](https://telegraf.js.org/), deploy sẵn cho [Railway](https://railway.app).

## 1. Tính năng

- `/start`: gửi lời chào và hiển thị menu chính (2 hàng x 2 nút).
- 4 nút menu chính:
  - **Nhóm Share Đồ** → gửi `https://t.me/luxyffshare`
  - **Nhóm Chat** → gửi `https://t.me/luxyffch`
  - **Mua Menu Anti** → `Liên hệ admin: @huybuwin`
  - **Hỗ trợ** → `Liên hệ admin: @huybuwin`
- `/admin` (chỉ `ADMIN_ID`):
  - 📊 Thống kê user (đọc từ `users.json`)
  - 📢 Thông báo all (broadcast cho toàn bộ user)
  - ✏️ Đổi văn bản menu (lưu vào `config.json`)
- Tự tạo `users.json` và `config.json` nếu chưa tồn tại.
- Có xử lý lỗi cho tất cả action.

## 2. Cấu trúc

```
telegram-bot/
├── index.js
├── package.json
├── railway.json
├── .env.example
├── users.json
├── config.json
└── README.md
```

## 3. Chạy local

```bash
cp .env.example .env
# Sửa BOT_TOKEN và ADMIN_ID trong .env
npm install
npm start
```

## 4. Deploy lên Railway

1. Tạo repo GitHub mới, upload toàn bộ file trong thư mục này.
2. Vào [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → chọn repo vừa tạo.
3. Vào tab **Variables**, thêm:
   - `BOT_TOKEN` = token từ [@BotFather](https://t.me/BotFather)
   - `ADMIN_ID` = Telegram user ID của bạn (lấy từ [@userinfobot](https://t.me/userinfobot))
4. Railway sẽ tự chạy `npm install` và `npm start` (đã cấu hình trong `railway.json`).
5. Mở bot trên Telegram, gõ `/start` để kiểm tra.

> ⚠️ Lưu ý: filesystem của Railway **không bền vững giữa các lần deploy**. `users.json` và `config.json` sẽ reset khi redeploy. Nếu cần lưu vĩnh viễn, hãy gắn Volume của Railway vào thư mục project hoặc chuyển sang database.

## 5. Biến môi trường

| Tên         | Mô tả                                 |
| ----------- | ------------------------------------- |
| `BOT_TOKEN` | Token bot từ BotFather                |
| `ADMIN_ID`  | Telegram user ID của admin (dạng số)  |

## 6. Lệnh nhanh

- `/start` — menu chính
- `/admin` — menu quản trị (chỉ `ADMIN_ID`)
