/**
 * Full-bleed portrait splash: dark green radial gradient, subtle grid, logo + wordmark + tagline.
 * Run: node scripts/generate-splash-full.js
 *
 * Output: assets/splash-full.png (referenced by app.json)
 * Requires: assets/icon.png
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');
const iconPath = path.join(assetsDir, 'icon.png');
const outPath = path.join(assetsDir, 'splash-full.png');

const W = 1284;
const H = 2778;
/** Must match app.json splash.backgroundColor (no flash at edges) */
const EDGE = '#050508';

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.error('Missing assets/icon.png');
    process.exit(1);
  }

  const bgSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="rg" cx="50%" cy="32%" r="75%" fx="50%" fy="32%">
      <stop offset="0%" stop-color="#0d3d2c"/>
      <stop offset="38%" stop-color="#081a14"/>
      <stop offset="72%" stop-color="#050a08"/>
      <stop offset="100%" stop-color="${EDGE}"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(148,163,184,0.07)" stroke-width="1"/>
    </pattern>
    <linearGradient id="vignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#rg)"/>
  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.85"/>
  <rect width="100%" height="100%" fill="url(#vignette)"/>
</svg>`
  );

  const bgPng = await sharp(bgSvg).png().toBuffer();

  const LOGO = 520;
  const iconBuf = await sharp(iconPath)
    .resize(LOGO, LOGO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const shadowSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO + 80}" height="${LOGO + 80}">
  <ellipse cx="${(LOGO + 80) / 2}" cy="${LOGO + 28}" rx="${LOGO * 0.42}" ry="18" fill="rgba(0,0,0,0.45)"/>
</svg>`
  );
  const shadowPng = await sharp(shadowSvg).png().toBuffer();

  const iconLeft = Math.round((W - LOGO) / 2);
  const iconTop = Math.round(H * 0.26);

  const wordmarkSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="200">
  <text x="${W / 2}" y="120" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="82" font-weight="800" letter-spacing="2" text-anchor="middle">
    <tspan fill="#F1F5F9">Swing</tspan><tspan fill="#F59E0B">Sense</tspan>
  </text>
</svg>`
  );
  const wordPng = await sharp(wordmarkSvg).png().toBuffer();

  const tagSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="80">
  <text x="${W / 2}" y="48" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="600" letter-spacing="3" text-anchor="middle" fill="#64748B">AI FEEDBACK FOR YOUR SWING</text>
</svg>`
  );
  const tagPng = await sharp(tagSvg).png().toBuffer();

  const shadowLeft = Math.round((W - (LOGO + 80)) / 2);
  const shadowTop = iconTop + LOGO - 40;

  const wmTop = iconTop + LOGO + 36;
  const tagTop = wmTop + 150;

  await sharp(bgPng)
    .composite([
      { input: shadowPng, left: shadowLeft, top: shadowTop },
      { input: iconBuf, left: iconLeft, top: iconTop },
      { input: wordPng, left: 0, top: wmTop },
      { input: tagPng, left: 0, top: tagTop },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log('Wrote', outPath, `(${W}x${H})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
