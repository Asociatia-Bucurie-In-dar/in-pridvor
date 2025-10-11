# Cloudflare R2 Storage Migration Guide

## 📋 Overview
This guide will help you migrate from local storage to Cloudflare R2, enabling:
- ✅ Full CRUD operations in production
- ✅ No Vercel deployment size limits
- ✅ Free storage (10GB free tier)
- ✅ Automatic image optimization via Payload
- ✅ Fast CDN delivery worldwide

## 🎯 Step 1: Create Cloudflare R2 Bucket

### 1.1 Sign up/Login to Cloudflare
1. Go to https://dash.cloudflare.com
2. Sign up for free or login
3. Navigate to **R2** in the sidebar

### 1.2 Create R2 Bucket
1. Click **"Create bucket"**
2. **Bucket name**: `in-pridvor-media` (or your choice)
3. **Location**: Automatic (or choose Europe for Romanian audience)
4. Click **"Create bucket"**

### 1.3 Get API Credentials
1. Go to **R2** → **Manage R2 API Tokens**
2. Click **"Create API token"**
3. **Token name**: `payload-cms-media`
4. **Permissions**: 
   - ✅ Object Read & Write
   - Bucket: Select your bucket `in-pridvor-media`
5. Click **"Create API Token"**
6. **SAVE THESE VALUES** (you'll only see them once):
   ```
   Access Key ID: [copy this]
   Secret Access Key: [copy this]
   Endpoint URL: [copy this - looks like https://xxxxx.r2.cloudflarestorage.com]
   ```

### 1.4 Get Public Bucket URL
1. In your bucket settings, go to **Settings**
2. Click **"Connect Domain"** or note the R2.dev subdomain
3. You'll get a URL like: `https://pub-xxxxx.r2.dev`
4. This is your **R2_PUBLIC_URL**

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

Also add to Vercel environment variables (for production):
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add all 5 variables above
4. Redeploy

## 🚀 Step 3: Run Migration Scripts

Once you provide the credentials above, I will:

1. **Configure Payload** to use R2 instead of local storage
2. **Enhance image optimization** (quality, sizes, formats)
3. **Create migration script** to upload 535 images to R2
4. **Update database** with new R2 URLs
5. **Test CRUD operations** to ensure everything works
6. **Clean up** local files from git

## ⏱️ Expected Timeline
- R2 setup: ~5 minutes (manual)
- Migration execution: ~15 minutes (automated)
- Testing: ~5 minutes
- **Total: ~25 minutes**

## ✅ After Migration

You'll be able to:
- Upload new images directly in Payload admin
- Delete images from production
- Auto-generate multiple optimized sizes
- Serve images from Cloudflare's global CDN
- No more git commits for images!

## 🆘 Rollback Plan

If something goes wrong:
- Local images are still in git as backup
- Database can be reverted
- R2 bucket can be kept or deleted (free)

---

## 📝 Next Steps

1. Complete Step 1 & 2 above
2. Provide me with the 5 environment variables
3. I'll handle the rest automatically!

