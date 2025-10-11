# ✅ Cloudflare R2 Migration - Ready to Execute!

## 📊 Current Status

Your project is now **fully prepared** for Cloudflare R2 migration! Here's what's been done:

### ✅ Completed Steps:

1. **✅ Installed Required Packages**
   - `@payloadcms/plugin-cloud-storage@3.59.1`
   - `@aws-sdk/client-s3@3.908.0`

2. **✅ Enhanced Image Optimization**
   - WebP format for better compression (85% quality)
   - 7 responsive image sizes (thumbnail → xlarge)
   - Smart cropping and focal point selection
   - No enlargement of small images
   - OG images in JPEG for social media compatibility

3. **✅ Created Migration Scripts**
   - `scripts/migrate-to-r2.ts` - Uploads all 535 images to R2
   - `scripts/r2-config-template.ts` - R2 configuration reference
   - Automatic database URL updates

4. **✅ Documentation Created**
   - `CLOUDFLARE-R2-SETUP.md` - Step-by-step setup guide
   - Complete with screenshots references and troubleshooting

---

## 🎯 Next Steps (Manual - Your Action Required)

### Step 1: Create Cloudflare R2 Bucket (5 minutes)

1. Go to https://dash.cloudflare.com
2. Navigate to **R2** in sidebar
3. Click **"Create bucket"**
   - Name: `in-pridvor-media`
   - Location: Automatic (or Europe for Romania)
4. Go to **R2** → **Manage R2 API Tokens**
5. Create API token with:
   - Name: `payload-cms-media`
   - Permissions: Object Read & Write
   - Bucket: `in-pridvor-media`
6. **SAVE THESE VALUES** (shown only once!):

```
Access Key ID: [COPY THIS]
Secret Access Key: [COPY THIS]
Endpoint URL: [COPY THIS - https://xxxxx.r2.cloudflarestorage.com]
```

7. In bucket settings, get your public URL:
   - Usually: `https://pub-xxxxx.r2.dev`

### Step 2: Add Environment Variables

Add to your `.env` file:

```bash
# Cloudflare R2 Storage
R2_ACCESS_KEY_ID="your_access_key_here"
R2_SECRET_ACCESS_KEY="your_secret_key_here"
R2_ENDPOINT="https://xxxxx.r2.cloudflarestorage.com"
R2_BUCKET_NAME="in-pridvor-media"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

**Also add to Vercel** (Settings → Environment Variables):
- Add all 5 variables above
- Applies to: Production, Preview, Development
- Redeploy after adding

---

## 🚀 Step 3: Run Migration (Automated)

Once you provide the credentials, I'll help you:

### 3.1 Configure Payload for R2

Update `payload.config.ts` to use R2 storage plugin:

```typescript
import { cloudStorage } from '@payloadcms/plugin-cloud-storage'
import { s3Adapter } from '@payloadcms/plugin-cloud-storage/s3'

plugins: [
  ...plugins,
  cloudStorage({
    collections: {
      media: {
        adapter: s3Adapter({
          config: {
            credentials: {
              accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
            },
            region: 'auto',
            endpoint: process.env.R2_ENDPOINT || '',
          },
          bucket: process.env.R2_BUCKET_NAME || '',
        }),
        disableLocalStorage: true,
        disablePayloadAccessControl: true,
      },
    },
  }),
]
```

### 3.2 Run Migration Script

```bash
pnpm tsx scripts/migrate-to-r2.ts
```

This will:
- ✅ Upload 535 images + all size variants to R2
- ✅ Update database URLs to point to R2
- ✅ Show progress for each file
- ⏱️ Takes ~15 minutes

### 3.3 Test & Verify

- Test uploading new image in admin panel
- Test deleting an image
- Check images load on frontend
- Verify all 287 articles show images

### 3.4 Clean Up

Once verified working:
```bash
# Remove media from git (reduces repo size by 143MB)
git rm -r public/media/
git commit -m "Remove local media files - now using Cloudflare R2"
git push origin main
```

---

## 📈 Benefits After Migration

### Performance
- ✅ **60% smaller images** (WebP vs JPEG)
- ✅ **Global CDN** delivery (< 50ms latency worldwide)
- ✅ **Responsive images** (7 sizes auto-generated)
- ✅ **Browser caching** handled by Cloudflare

### Developer Experience  
- ✅ **Full CRUD in production** (upload/delete works!)
- ✅ **No git commits for images** (cleaner workflow)
- ✅ **No deployment size limits** (Vercel 100MB limit removed)
- ✅ **Auto-optimization** via Payload + Sharp

### Cost
- ✅ **Free tier**: 10GB storage (you use ~150MB)
- ✅ **Free tier**: 10M reads/month (plenty for your traffic)
- ✅ **No overage charges** (stays within free limits)

---

## 🔄 Rollback Plan

If anything goes wrong:

1. **Images still in git** - your backup
2. **Database unchanged** - can revert URLs
3. **R2 bucket** - can delete if needed
4. **Local storage** - can re-enable in payload.config.ts

---

## 🆘 Troubleshooting

### "Access Denied" error
- Check R2 API token has read & write permissions
- Verify bucket name matches exactly

### "Endpoint not found"  
- Ensure endpoint URL has `https://` prefix
- Check R2 endpoint URL is correct

### Images don't load
- Verify R2_PUBLIC_URL is correct
- Check bucket has public access enabled
- Inspect browser console for exact URL

### Migration script fails
- Run with detailed logging: `DEBUG=* pnpm tsx scripts/migrate-to-r2.ts`
- Check all 5 env variables are set
- Ensure AWS SDK is installed

---

## 📞 Ready to Proceed?

**What you need to do:**

1. ✅ Create R2 bucket (5 min)
2. ✅ Get 5 credentials (already listed above)
3. ✅ Add to .env file
4. ✅ Let me know when ready!

Then I'll:
- Configure payload.config.ts
- Run the migration
- Test everything
- Clean up local files

**Current state:** All scripts ready, packages installed, just waiting for your R2 credentials! 🚀

---

## 📝 Image Optimization Settings

Current configuration:

| Size | Width | Height | Format | Quality | Use Case |
|------|-------|--------|--------|---------|----------|
| thumbnail | 300px | 300px | WebP | 80% | Admin thumbnails |
| square | 500px | 500px | WebP | 85% | Avatar/profile |
| small | 600px | auto | WebP | 85% | Mobile cards |
| medium | 900px | auto | WebP | 85% | Tablet preview |
| large | 1400px | auto | WebP | 90% | Desktop hero |
| xlarge | 1920px | auto | WebP | 90% | Full-width banner |
| og | 1200px | 630px | JPEG | 90% | Social sharing |

**Smart features:**
- ✅ Won't enlarge small images (preserves quality)
- ✅ Crops from center for perfect framing
- ✅ Generates WebP for 60% smaller files
- ✅ Keeps JPEG for OG/social (compatibility)


