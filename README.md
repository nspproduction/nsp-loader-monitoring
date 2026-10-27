# Loader Monitoring

ระบบติดตามคิวโหลดสินค้า — Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Vercel

## สรุป flow

| ฝั่ง | หน้าจอ | หน้าที่ |
| --- | --- | --- |
| Operator (โรงงาน) | `/manage` | แสดง QR (lazy regen เมื่อถูกใช้งาน) + คุมคิว (เริ่มโหลด / โหลดเสร็จ / ยกเลิก / เลื่อนลำดับ) |
| Operator | `/reports` | รายงานย้อนหลัง + กราฟ + export CSV |
| จอ Monitor / TV | `/dashboard` | จอใหญ่แสดงคิวรอ + คิวที่กำลังโหลด + เสร็จแล้ว (public, read-only) |
| คนขับรถ | `/arrive?t=<token>` | สแกน QR → กรอกฟอร์ม → บันทึกเวลาที่มาถึง |
| คนขับรถ | `/q/<slug>` | หน้าสถานะคิวตัวเอง (realtime: ลำดับที่, คิวข้างหน้า, กำลังโหลด) |

## การ setup ครั้งแรก

### 1. สร้าง Supabase project

- สร้าง project ใน [Supabase Dashboard](https://supabase.com/dashboard) (region: ap-southeast-1 แนะนำ)
- รัน SQL ที่ `supabase/migrations/0001_initial_schema.sql` ใน SQL Editor
- รัน SQL ที่ `supabase/migrations/0003_qr_tokens_realtime.sql` (เพิ่ม qr_tokens เข้า realtime publication)
- สร้าง auth user (Authentication → Users → Add user) ด้วย email `<username>@loader.local` และ password + Auto Confirm
- รัน SQL ที่ `supabase/migrations/0002_seed_operator.sql` หลังเปลี่ยน UUID ให้ตรงกับ user ที่สร้าง

### 2. ตั้ง environment variables

copy `.env.local.example` → `.env.local` แล้วเติมค่า:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...        # Dashboard → Project Settings → API

APP_URL=http://localhost:3000                   # ตอน deploy เปลี่ยนเป็น https://<domain>
QR_TOKEN_TTL_SECONDS=900                        # 15 นาที — QR regen อัตโนมัติเมื่อหมดอายุ
```

### 3. รัน dev server

```bash
npm install
npm run dev
```

เข้า http://localhost:3000 → login ด้วย username/password → เข้าหน้า `/manage` เห็น QR + คิว

ทดสอบฝั่งคนขับ: สแกน QR จากหน้า manage ด้วยมือถืออีกเครื่อง (ต้องเปิด dev server ให้ LAN เข้าได้ — ใช้ `npm run dev -- -H 0.0.0.0`)

## Deploy ขึ้น Vercel

1. push repo นี้ขึ้น GitHub
2. Vercel → New Project → import repo → Framework: Next.js (auto-detect)
3. ใส่ env vars 5 ตัวใน Project Settings → Environment Variables
4. Deploy → เปลี่ยน `APP_URL` เป็น production URL แล้ว redeploy

## เพิ่ม operator user เพิ่มเติม

ทำแบบเดียวกับ setup ขั้นที่ 1 — สร้าง auth user ด้วย email `<username>@loader.local` แล้ว insert row ใน `public.operators` พร้อม UUID ของ user

## โครงไฟล์

```
app/
  (operator)/          # กลุ่ม route ที่ต้อง login (manage, reports)
    manage/            # หน้าควบคุมคิว + QR
    reports/           # หน้ารายงาน + กราฟ
  dashboard/           # public: จอใหญ่สำหรับโรงงาน
  arrive/              # public: หน้าฟอร์มสำหรับคนขับ
  q/[slug]/            # public: หน้าสถานะคิวของคนขับ
  login/
actions/               # server actions (auth, token, queue, arrival)
lib/supabase/          # client / server / admin factories
supabase/migrations/   # SQL schema + seed
middleware.ts          # auth guard (/manage, /reports)
```
