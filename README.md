# توثيق أضحيتي | Odheyati Proof Platform

نظام داخلي خاص لمتجر أضحيتي لإدارة طلبات الذبائح والتوثيقات.

## المتطلبات

- Node.js 22.x
- PostgreSQL
- Cloudflare R2 account

## التثبيت

```bash
npm install
```

## إعداد قاعدة البيانات

```bash
npx prisma generate
npx prisma migrate deploy
```

## التطوير

```bash
npm run dev
```

## البناء

```bash
npm run build
```

## النشر

المشروع مُعد للنشر على Hostinger:
- Framework: Next.js
- Branch: main
- Root directory: ./
- Node version: 22.x
- Build command: `prisma generate && next build`

## المتغيرات البيئية

انسخ `.env.example` إلى `.env` وعبّئ القيم المطلوبة.
