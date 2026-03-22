# Splash Icon Source (Optional)

For the cleanest checkerboard fix, add **splash-icon-source.png** – the raw baseball icon with a transparent background from your design tool.

- If present: the fix script uses it as the source (best quality, no checkerboard).
- If absent: the script uses splash-icon.png as fallback.

Export from Figma/Sketch/etc. as PNG with transparency, save as `splash-icon-source.png` in this folder, then run `npm run fix-splash`.
