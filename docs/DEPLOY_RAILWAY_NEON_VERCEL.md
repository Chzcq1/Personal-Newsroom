# Deploy INFOX — Railway (API) + Neon (DB) + Vercel (Frontend)

คู่มือนี้พาคุณตั้งแต่ Zero จนถึง Production บน stack ที่แนะนำ

---

## สถาปัตยกรรม

```
User Browser
     │
     ▼
Vercel (Frontend — React/Vite)
     │ /api/* proxy
     ▼
Railway (Express API — port 8080)
     │ DATABASE_URL
     ▼
Neon (PostgreSQL — serverless)
```

---

## ขั้นตอนที่ 1 — เตรียม Database บน Neon (ฟรี)

1. ไปที่ [neon.tech](https://neon.tech) → Sign up / Log in
2. **New Project** → ตั้งชื่อ `infox` → Region: **Singapore** (ใกล้ไทยที่สุด)
3. คัดลอก **Connection string** (format: `postgresql://user:pass@host/dbname?sslmode=require`)
4. เก็บไว้ใช้ใน Railway และ local `.env`

### Push Schema ครั้งแรก

```bash
# ใน project root
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
```

ตรวจสอบว่ามี 13 ตาราง: users, profiles, interests, briefings, delivery_queue, trend_items, saved_articles, narratives, analytics, plans, subscriptions, payments, user_feedback

---

## ขั้นตอนที่ 2 — Deploy Backend บน Railway

### 2.1 Push โค้ดขึ้น GitHub ก่อน

```bash
git init          # ถ้ายังไม่มี
git add .
git commit -m "feat: production-ready deployment"
git remote add origin https://github.com/YOUR_USERNAME/infox.git
git push -u origin main
```

### 2.2 สร้าง Railway Project

1. ไปที่ [railway.app](https://railway.app) → Login with GitHub
2. **New Project** → **Deploy from GitHub repo** → เลือก `infox`
3. Railway จะตรวจเจอ `railway.toml` ที่ root อัตโนมัติ → ใช้ Dockerfile

### 2.3 ตั้ง Environment Variables บน Railway

ไปที่ **Variables** tab → เพิ่มทีละตัว:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Connection string จาก Neon |
| `JWT_SECRET` | สุ่ม 64 ตัว: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `AI_PROVIDER` | `github` |
| `GITHUB_TOKEN` | GitHub Personal Access Token ของคุณ |
| `SCHEDULER_TIMEZONE` | `Asia/Bangkok` |
| `FRONTEND_URL` | URL ของ Vercel (ใส่ทีหลังได้) |
| `ADMIN_EMAILS` | อีเมลของคุณ |

### 2.4 Deploy

Railway จะ build และ deploy อัตโนมัติเมื่อ push โค้ด

ตรวจสอบ:
```bash
curl https://YOUR-APP.railway.app/api/health
# ควรได้: {"status":"healthy","aiProviderWorking":true,...}
```

---

## ขั้นตอนที่ 3 — Deploy Frontend บน Vercel

### 3.1 แก้ `vercel.json` ให้ชี้ไป Railway

เปิดไฟล์ `vercel.json` → แก้บรรทัด destination:

```json
"destination": "https://YOUR-APP.railway.app/api/:path*"
```

### 3.2 Deploy บน Vercel

1. ไปที่ [vercel.com](https://vercel.com) → Login with GitHub
2. **New Project** → Import `infox` repo
3. Vercel จะอ่าน `vercel.json` อัตโนมัติ — **ไม่ต้องแก้อะไรใน UI**
4. **Deploy**

### 3.3 อัปเดต FRONTEND_URL บน Railway

คัดลอก Vercel URL (เช่น `https://infox.vercel.app`) → ไปที่ Railway Variables → อัปเดต `FRONTEND_URL`

### 3.4 อัปเดต Google OAuth (ถ้าใช้)

ไปที่ [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth Client:
- Authorized redirect URIs: `https://YOUR-APP.railway.app/api/auth/google/callback`
- Authorized JavaScript origins: `https://YOUR-APP.vercel.app`

---

## ขั้นตอนที่ 4 — ตั้ง Telegram Bot (ถ้าต้องการ)

1. ไปที่ Telegram → **@BotFather** → `/newbot` → ได้ `TELEGRAM_BOT_TOKEN`
2. ส่งข้อความให้ bot ก่อน
3. รัน: `curl https://api.telegram.org/bot<TOKEN>/getUpdates` → เอา `chat.id`
4. ใส่ใน Railway Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

---

## การ Deploy อัปเดตใหม่

```bash
git add .
git commit -m "feat: your changes"
git push origin main
# Railway + Vercel จะ auto-deploy ทันที
```

---

## Checklist ก่อน Go Live

- [ ] `curl https://YOUR-APP.railway.app/api/health` → status: healthy
- [ ] เปิดหน้าเว็บ Vercel → ล็อกอินได้
- [ ] สมัครสมาชิกได้ (register/login)
- [ ] กด Generate briefing → ได้ข่าวภาษาไทย
- [ ] Telegram delivery ทดสอบจาก settings

---

## ราคาโดยประมาณ (USD/เดือน)

| Service | Plan | ราคา |
|---|---|---|
| Neon | Free tier (0.5 GB) | $0 |
| Railway | Starter (after $5 free credit) | ~$5–10 |
| Vercel | Hobby | $0 |
| **รวม** | | **~$5–10/เดือน** |
