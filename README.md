# ZED JULIAN — Vercel One-Click Setup

Upload these files to the **root of a GitHub repository** (no folders), import the repository into Vercel, and deploy.

The Telegram bot token and admin ID are already configured in `server.js`.

After the site is opened once, the app automatically registers the Telegram webhook using the current Vercel domain.

Admin commands:
- `/start`
- `/panel`
- `/stats`
- `/maintenance on`
- `/maintenance off`

Note: statistics and maintenance state use serverless in-memory storage in this no-database version. Vercel may reset it between function instances/deployments.
