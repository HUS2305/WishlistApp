# 🚀 Quick Start: Production Setup for Wishly

Follow these steps in order to get Wishly ready for the App Store.

## ✅ Step 1: Set EAS Secrets (5 minutes)

You have your Clerk production keys. Now set them up:

```bash
cd apps/mobile

# Option A: Use the setup script
./setup-eas-secrets.sh

# Option B: Manual setup
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_xxxxx"
```

**What you need:**
- Clerk Publishable Key: `pk_live_...` (from Clerk dashboard)
- Clerk Secret Key: `sk_live_...` (for Railway, keep it handy)

---

## ✅ Step 2: Deploy Backend to Railway (15 minutes)

1. **Go to Railway**: [railway.app](https://railway.app) → Sign up with GitHub

2. **Create New Project** → **Deploy from GitHub repo** → Select your repo

3. **Configure Service:**
   - Root Directory: `services/backend`
   - Build Command: `cd ../.. && npm install && cd services/backend && npm run build`
   - Start Command: `npm run start:prod`

4. **Add Environment Variables** (in Railway dashboard → Variables):
   ```bash
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<your-neon-production-url>
   DIRECT_URL=<your-neon-direct-url>
   CLERK_SECRET_KEY=sk_live_xxxxx
   CLERK_WEBHOOK_SECRET=whsec_xxxxx
   ALLOWED_ORIGINS=https://expo.dev,https://*.expo.dev
   ```

5. **Get Your Railway URL**: After deployment, copy the URL (e.g., `wishly-app.up.railway.app`)

6. **Optional - Custom Domain**: 
   - In Railway → Settings → Domains
   - Add `api.wishly.app`
   - Add DNS records as instructed

**See detailed guide**: `RAILWAY_SETUP.md`

---

## ✅ Step 3: Update Clerk Webhook (5 minutes)

1. Go to Clerk Dashboard → **Webhooks**
2. Add endpoint: `https://api.wishly.app/api/webhooks/clerk` (or your Railway URL)
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Webhook Signing Secret** (starts with `whsec_`)
5. Add to Railway variables: `CLERK_WEBHOOK_SECRET=whsec_xxxxx`

---

## ✅ Step 4: Test Production Build (10 minutes)

```bash
cd apps/mobile

# Make sure you're logged in
eas login

# Build for production
eas build --platform ios --profile production
```

This will:
- Build your app in the cloud (~15-30 minutes)
- Use production Clerk keys
- Use production API URL (`https://api.wishly.app/api`)
- Create an `.ipa` file ready for App Store

---

## ✅ Step 5: App Store Connect Setup (20 minutes)

1. **Go to App Store Connect**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

2. **Create App:**
   - Click **My Apps** → **+** → **New App**
   - Platform: **iOS**
   - Name: **Wishly**
   - Primary Language: **English (U.S.)**
   - Bundle ID: **com.wishly.app**
   - SKU: `wishly-ios-001`

3. **Get Your App Store Connect Info:**
   - **App ID**: Found in App Store Connect (e.g., `1234567890`)
   - **Team ID**: Found in Apple Developer portal (e.g., `ABC123DEF4`)

4. **Update `eas.json`** with your info:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-email@example.com",
         "ascAppId": "1234567890",
         "appleTeamId": "ABC123DEF4"
       }
     }
   }
   ```

---

## ✅ Step 6: Create Notion Support Page (15 minutes)

Apple requires a Support URL and Privacy Policy URL. Easiest option:

1. **Create Notion Page:**
   - Go to [notion.so](https://notion.so)
   - Create new page
   - Add sections:
     - **Support**: `support@wishly.app`
     - **Privacy Policy**: (copy from template below)
   - Make it **Public** (Share → Public web)

2. **Copy the public URL** (e.g., `https://wishly.notion.site/support`)

**Privacy Policy Template:**
```
# Privacy Policy for Wishly

Last updated: [Date]

## Information We Collect
- Email address (for account creation)
- Name and profile information
- Wishlist data
- Friend connections

## How We Use Your Information
- To provide and improve our service
- To send you notifications
- To connect you with friends

## Data Storage
- Authentication: Clerk (clerk.com)
- Database: Neon (neon.tech)
- Images: Cloudinary

## Contact
For questions: support@wishly.app
```

---

## ✅ Step 7: Prepare App Store Assets (30 minutes)

**Screenshots needed:**
- iPhone 15 Pro Max (6.7"): 1290 x 2796 px
- iPhone 14 Plus (6.5"): 1284 x 2778 px
- iPhone 8 Plus (5.5"): 1242 x 2208 px

**How to create:**
1. Run your app in iOS Simulator
2. Navigate to key screens
3. Take screenshots: `Cmd + S` in Simulator
4. Use [AppMockUp](https://app-mockup.com) or similar to format

**App Description:**
```
Wishly makes gifting effortless. Create wishlists, share with friends, 
and never give (or receive) a bad gift again.

Features:
• Create unlimited wishlists
• Add items from any store with one tap
• Share wishlists with friends and family
• See what your friends want
• Privacy controls (private, friends-only, public)
• Secret Santa mode for holiday gift exchanges

Perfect for birthdays, holidays, weddings, or any occasion!
```

**Keywords:** wishlist, gifts, birthday, christmas, registry, friends, sharing

---

## ✅ Step 8: Submit to App Store (10 minutes)

```bash
cd apps/mobile

# Submit the latest build
eas submit --platform ios --latest
```

Then in App Store Connect:
1. Go to your app → **+ Version**
2. Fill in:
   - What's New
   - Screenshots (all sizes)
   - Description, Keywords
   - Support URL: `https://wishly.notion.site/support`
   - Privacy Policy URL: `https://wishly.notion.site/support`
3. Select your build
4. Add demo account for reviewers
5. Click **Submit for Review**

---

## 🎉 You're Done!

Review typically takes 24-48 hours. You'll get an email when approved!

---

## 📋 Checklist

- [ ] EAS secrets configured
- [ ] Backend deployed to Railway
- [ ] Clerk webhook configured
- [ ] Production build successful
- [ ] App Store Connect app created
- [ ] Notion support page created
- [ ] Screenshots prepared
- [ ] App submitted for review

---

## 🆘 Need Help?

- **EAS Issues**: Check [docs.expo.dev](https://docs.expo.dev)
- **Railway Issues**: Check `RAILWAY_SETUP.md`
- **Clerk Issues**: Check [clerk.com/docs](https://clerk.com/docs)
