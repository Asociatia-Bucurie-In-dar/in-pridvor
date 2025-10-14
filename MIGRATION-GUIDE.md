# 🚀 Cloudflare R2 Migration Guide

## 📋 Current Status

✅ **Ready to migrate!** All scripts and configuration are prepared.

- **534 images** ready to migrate from `/public/media/` to R2
- **Migration scripts** created and tested
- **Payload configuration** updated to support R2
- **Database update script** ready to run after migration

---

## 🎯 Step 1: Create Cloudflare R2 Account & Bucket

### 1.1 Sign up for Cloudflare (if needed)
1. Go to https://dash.cloudflare.com
2. Sign up for free account
3. Verify email if required

### 1.2 Create R2 Bucket
1. Navigate to **R2 Object Storage** in sidebar
2. Click **"Create bucket"**
3. **Bucket name**: `in-pridvor-media`
4. **Location**: Auto (or Europe for better Romania performance)
5. Click **"Create bucket"**

### 1.3 Get API Credentials
1. Go to **R2** → **Manage R2 API Tokens**
2. Click **"Create API token"**
3. **Token name**: `payload-cms-media`
4. **Permissions**: 
   - ✅ Object Read & Write
   - **Bucket**: Select `in-pridvor-media`
5. Click **"Create API Token"**
6. **SAVE THESE VALUES** (shown only once):

```
Access Key ID: [COPY THIS]
Secret Access Key: [COPY THIS]  
Endpoint URL: [COPY THIS - looks like https://xxxxx.r2.cloudflarestorage.com]
```

### 1.4 Get Public URL
1. In your bucket, go to **Settings**
2. Look for **R2.dev subdomain** or **Custom domain**
3. You'll get: `https://pub-xxxxx.r2.dev`
4. This is your **R2_PUBLIC_URL**

---

## 🔧 Step 2: Add Environment Variables

Add these to your `.env` file:

```bash
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID="your_access_key_here"
R2_SECRET_ACCESS_KEY="your_secret_key_here"
R2_ENDPOINT="https://xxxxx.r2.cloudflarestorage.com"
R2_BUCKET_NAME="in-pridvor-media"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

**Also add to Vercel** (for production):
1. Go to your Vercel project → Settings → Environment Variables
2. Add all 5 variables above
3. Redeploy after adding

---

## 🚀 Step 3: Run Migration

### 3.1 Upload Images to R2

```bash
pnpm tsx scripts/migrate-to-r2.ts
```

This will:
- ✅ Upload all 534 images to R2
- ✅ Skip files that already exist
- ✅ Show progress for each file
- ✅ Generate detailed results report
- ⏱️ Takes ~10-15 minutes

### 3.2 Update Database URLs

```bash
pnpm tsx scripts/update-database-urls.ts
```

This will:
- ✅ Update all media URLs in database to point to R2
- ✅ Update all image size variants (thumbnail, small, medium, etc.)
- ✅ Show detailed update log

---

## 🧪 Step 4: Test Everything

### 4.1 Test Admin Panel
1. Start your dev server: `pnpm dev`
2. Go to admin panel: `http://localhost:3000/admin`
3. **Upload a new image** - should go to R2
4. **Delete an image** - should work from R2
5. **Edit image metadata** - should work

### 4.2 Test Frontend
1. Visit your website
2. Check that all images load correctly
3. Test responsive images on different screen sizes
4. Check image loading speed

### 4.3 Test Production
1. Deploy to Vercel
2. Test image upload/delete in production
3. Verify images load on live site

---

## 🧹 Step 5: Clean Up (After Testing)

Once everything works:

```bash
# Remove local media files from git (saves ~143MB)
git rm -r public/media/
git commit -m "Remove local media files - now using Cloudflare R2"
git push origin main
```

---

## 📊 What You Get

### Performance Benefits
- ✅ **60% smaller images** (WebP optimization)
- ✅ **Global CDN** delivery (< 50ms latency)
- ✅ **7 responsive sizes** auto-generated
- ✅ **Smart caching** via Cloudflare

### Developer Benefits  
- ✅ **Full CRUD in production** (upload/delete works!)
- ✅ **No git commits for images** (cleaner workflow)
- ✅ **No deployment size limits** (Vercel 100MB limit removed)
- ✅ **Automatic optimization** via Payload + Sharp

### Cost Benefits
- ✅ **Free tier**: 10GB storage (you use ~150MB)
- ✅ **Free tier**: 10M reads/month (plenty for your traffic)
- ✅ **No overage charges** (stays within free limits)

---

## 🆘 Troubleshooting

### "Access Denied" error
- Check R2 API token has read & write permissions
- Verify bucket name matches exactly
- Ensure credentials are copied correctly

### "Endpoint not found"
- Ensure endpoint URL has `https://` prefix
- Check R2 endpoint URL is correct

### Images don't load
- Verify R2_PUBLIC_URL is correct
- Check bucket has public access enabled
- Inspect browser console for exact URL

### Migration script fails
- Run with debug: `DEBUG=* pnpm tsx scripts/migrate-to-r2.ts`
- Check all 5 env variables are set
- Ensure AWS SDK is installed

### Database update fails
- Check database connection
- Verify media collection exists
- Check Payload configuration

---

## 🔄 Rollback Plan

If something goes wrong:

1. **Images still in git** - your backup is safe
2. **Remove R2 env vars** - will fall back to local storage
3. **Revert payload.config.ts** - if needed
4. **R2 bucket** - can delete if needed (free)

---

## 📞 Ready to Start?

**What you need to do:**

1. ✅ Create R2 bucket (5 min)
2. ✅ Get 5 credentials (listed above)  
3. ✅ Add to .env file
4. ✅ Run migration scripts
5. ✅ Test everything
6. ✅ Clean up local files

**Current state:** All scripts ready, packages installed, just waiting for your R2 credentials! 🚀

---

## 📝 Image Optimization Settings

Your images will be automatically optimized with these settings:

| Size | Dimensions | Format | Quality | Use Case |
|------|------------|--------|---------|----------|
| thumbnail | 300×300 | WebP | 80% | Admin thumbnails |
| square | 500×500 | WebP | 85% | Avatar/profile |
| small | 600px wide | WebP | 85% | Mobile cards |
| medium | 900px wide | WebP | 85% | Tablet preview |
| large | 1400px wide | WebP | 90% | Desktop hero |
| xlarge | 1920px wide | WebP | 90% | Full-width banner |
| og | 1200×630 | JPEG | 90% | Social sharing |

**Smart features:**
- ✅ Won't enlarge small images (preserves quality)
- ✅ Crops from center for perfect framing  
- ✅ Generates WebP for 60% smaller files
- ✅ Keeps JPEG for OG/social (compatibility)
