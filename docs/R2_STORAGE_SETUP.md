# Cloudflare R2 storage setup

Uploads go **straight from the browser to R2** with a short-lived signed URL, then the server checks
the real file size (max 10 MB). If R2 CORS is not set up yet, the app automatically falls back to
uploading through the server, so uploads still work (but on Vercel only up to ~4.5 MB).

## 1. Bucket + keys
Private bucket. API token with Object Read & Write. Put the 4 values in `.env.local`
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).

## 2. CORS (needed for direct uploads / files above 4.5 MB on Vercel)
R2 -> your bucket -> Settings -> CORS Policy -> Add:

    [
      {
        "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
        "AllowedMethods": ["PUT", "GET"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]

Replace `https://your-domain.com` with your real site (no trailing slash). Add every origin you use.

## 3. How files are protected
- Keys always start with `users/<user-id>/`; routes refuse any path outside the caller's own prefix.
- Downloads use short-lived signed links. The bucket stays private.
- Deleting a resource deletes the object; deleting an account purges the whole `users/<user-id>/` prefix.
