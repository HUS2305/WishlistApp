# Railway Deployment Guide for Wishly Backend

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"**

## Step 2: Deploy from GitHub

1. Select **"Deploy from GitHub repo"**
2. Choose your **WishlistApp** repository
3. Railway will detect the monorepo structure

## Step 3: Configure Service

1. Railway will create a service automatically
2. Click on the service to configure it
3. Go to **Settings** tab
4. Set **Root Directory** to: `services/backend`
5. Set **Build Command** to: `cd ../.. && npm install && cd services/backend && npm run build`
6. Set **Start Command** to: `npm run start:prod`

## Step 4: Add Environment Variables

Go to **Variables** tab and add:

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database (from Neon)
DATABASE_URL=<your-neon-production-connection-string>
DIRECT_URL=<your-neon-direct-connection-string>

# Clerk (Production Keys)
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# CORS (Allow your mobile app)
ALLOWED_ORIGINS=https://expo.dev,https://*.expo.dev

# Sentry (Optional)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

## Step 5: Get Your Railway URL

1. After deployment, Railway will give you a URL like: `wishly-app-production.up.railway.app`
2. Copy this URL - you'll need it for:
   - Updating Clerk webhook URL
   - Updating mobile app API URL (if not using custom domain)

## Step 6: Configure Custom Domain (Optional)

1. In Railway, go to **Settings** > **Domains**
2. Click **"Generate Domain"** or **"Custom Domain"**
3. If using custom domain:
   - Add: `api.wishly.app`
   - Railway will give you DNS records to add
   - Add CNAME record in your DNS provider

## Step 7: Update Clerk Webhook

1. Go to Clerk Dashboard > **Webhooks**
2. Add endpoint: `https://api.wishly.app/api/webhooks/clerk` (or your Railway URL)
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the webhook signing secret
5. Add to Railway variables: `CLERK_WEBHOOK_SECRET`

## Step 8: Test Deployment

1. Railway will automatically deploy on every push to main branch
2. Test your API: `https://api.wishly.app/api/health` (or Railway URL)
3. Check logs in Railway dashboard

## Troubleshooting

- **Build fails**: Check Railway logs, ensure all dependencies are in package.json
- **Database connection fails**: Verify DATABASE_URL is correct
- **CORS errors**: Add your Expo preview URL to ALLOWED_ORIGINS
- **Webhook not working**: Verify CLERK_WEBHOOK_SECRET matches Clerk dashboard
