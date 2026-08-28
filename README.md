# ZED JULIAN - Simple Vercel Setup

Structure:
- index.html
- vercel.json
- api/index.js

Vercel Environment Variables:
- TELEGRAM_BOT_TOKEN (recommended; otherwise the supplied token is used as fallback)
- ADMIN_TELEGRAM_ID
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- PUBLIC_BASE_URL
- WEBHOOK_SETUP_SECRET

After deployment, open:
`https://YOUR-DOMAIN/api/set-webhook`
with `Authorization: Bearer YOUR_WEBHOOK_SETUP_SECRET`.

Telegram commands:
/start
/panel
/stats
/maintenance on
/maintenance off
