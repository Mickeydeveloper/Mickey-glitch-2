# Mickey Glitch deployment

The app binds to `0.0.0.0` and reads the platform-provided `PORT`. Set `MONGODB_URI` and `MONGODB_SESSION_SECRET` in every production environment because Vercel and most container hosts do not provide durable local storage.

## Vercel

1. Import the repository and keep the included `vercel.json`.
2. Add `MONGODB_URI`, `MONGODB_DB`, `MONGODB_SESSION_SECRET`, and the bot API secrets in Project Settings.
3. Deploy with `npm install` handled by Vercel.

Vercel is suitable for the dashboard and API adapter. Long-lived WhatsApp and Telegram connections should run on Render, a VPS, or Pterodactyl.

## Render

The included `render.yaml` creates a Node web service. In a manual service use:

```text
Build Command: npm ci
Start Command: npm start
Health Check Path: /health
```

Render supplies `PORT`; do not replace it with a hard-coded port.

### Render bandwidth suspension

`Workspace suspended: you've used the 5 GB of free bandwidth` is a Render account limit. Application code cannot unsuspend the workspace. Restore service by waiting for the monthly quota reset, upgrading the workspace, or contacting Render support. After service is restored, redeploy with the included `render.yaml` and keep `LOW_RESOURCE_MODE=true`.

Low-resource mode disables Telegram polling unless `ENABLE_TELEGRAM=true`, leaves automatic status activity off unless explicitly configured, caches dashboard assets for one day, limits API request bodies, throttles abusive API traffic, and caps Axios media responses at 8 MB. Video, audio, sticker, and image commands can still use substantial bandwidth when users invoke them; these commands cannot be made bandwidth-free without disabling them.

## VPS with PM2

```bash
npm ci --omit=dev
cp .env.example .env
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Put Nginx or Caddy in front of the process and proxy WebSocket requests to the same port. Set `PUBLIC_HOST` to the public hostname used in dashboard logs.

## Pterodactyl

Use the Node.js egg, set the startup command to `npm start`, and map the allocation port to the container's `PORT` variable. Upload the repository, run `npm ci --omit=dev`, then start the server. Keep `auth_info` and `data` on a persistent volume, or configure MongoDB for durable sessions and account data.

## Environment essentials

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
PUBLIC_HOST=your-domain.example
MONGODB_URI=mongodb+srv://...
MONGODB_SESSION_SECRET=replace-with-a-long-random-value
```