# ZED JULIAN — Vercel, no folders

All project files are in the repository root:

- index.html
- server.js
- vercel.json
- package.json

## Vercel Environment Variables

Recommended:
- TELEGRAM_BOT_TOKEN
- ADMIN_TELEGRAM_ID
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- PUBLIC_BASE_URL (example: https://your-domain.vercel.app)
- WEBHOOK_SETUP_SECRET

The bot token also exists as a server-side fallback in `server.js` because the owner requested a self-contained project. It is never inserted into `index.html`.

## Setup

1. Import the repository into Vercel.
2. Add the environment variables above.
3. Deploy.
4. Open `/api/set-webhook?secret=YOUR_WEBHOOK_SETUP_SECRET` once.
5. Open your bot and send `/panel`.

Commands:
- `/panel`
- `/stats`
- `/maintenance on`
- `/maintenance off`

The website tracks page views and Google, Facebook, VK, X, and Apple button clicks. Redis is required for shared persistent statistics and maintenance state across Vercel instances.
