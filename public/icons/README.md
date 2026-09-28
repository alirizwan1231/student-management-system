Place your app icons here before building for production:

- icon-192.png (192x192)
- icon-512.png (512x512)
- icon-512-maskable.png (512x512, safe-zone padded for Android adaptive icons)

manifest.json already references these paths. Without them, the app still
works as a PWA but install prompts will show a blank/default icon.
