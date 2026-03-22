/**
 * Composites the baseball icon onto solid black background. Adds "Swing Sense" branding.
 * Run: node scripts/fix-splash-background.js
 *
 * Input priority: splash-icon-source.png (raw baseball only) > icon.png (app icon)
 * Output: splash-icon.png – baseball + "Swing Sense" only, no duplicates
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');
const sourceFile = path.join(assetsDir, 'splash-icon-source.png');
const iconFile = path.join(assetsDir, 'icon.png');
const outputFile = path.join(assetsDir, 'splash-icon.png');

// Use raw baseball source if present; else app icon (baseball only, no embedded text)
const input = fs.existsSync(sourceFile) ? sourceFile : iconFile;

// Black – matches app (#000000)
const BG = { r: 0, g: 0, b: 0 };
const CANVAS_W = 512;
const CANVAS_H = 640;
const ICON_SIZE = 380;
const ACCENT = '#F5A623'; // Orange, matches Record Swing button
const TEXT_WHITE = '#FFFFFF';

if (!fs.existsSync(input)) {
  console.warn('splash-icon-source.png and icon.png not found, skipping');
  process.exit(0);
}

async function fix() {
  const icon = await sharp(input)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: BG });

  // Solid black canvas – channels 3 = no alpha channel at all
  const bg = sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 3,
      background: BG,
    },
  });

  const iconBuf = await icon.png().toBuffer();
  const iconTop = Math.round((CANVAS_H - ICON_SIZE) / 2) - 40;
  const iconLeft = Math.round((CANVAS_W - ICON_SIZE) / 2);

  // Add "Swing Sense" – both source and icon.png are graphic-only (no embedded text)
  let textBuf = null;
  {
    const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="90">
  <text x="${CANVAS_W / 2}" y="58" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="48" font-weight="800" letter-spacing="1" text-anchor="middle">
    <tspan fill="${TEXT_WHITE}">Swing</tspan><tspan fill="${ACCENT}">Sense</tspan>
  </text>
</svg>
`);
    try {
      textBuf = await sharp(textSvg).png().toBuffer();
    } catch (e) {
      console.warn('Could not render text:', e.message);
    }
  }

  const composites = [
    { input: iconBuf, top: iconTop, left: iconLeft },
    ...(textBuf ? [{ input: textBuf, top: CANVAS_H - 100, left: 0 }] : []),
  ];

  await bg
    .composite(composites)
    .flatten({ background: BG })
    .removeAlpha({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(outputFile.replace('.png', '-tmp.png'));

  fs.renameSync(outputFile.replace('.png', '-tmp.png'), outputFile);
  console.log('Fixed splash-icon.png: solid black background, no transparency');

  // Copy to iOS imageset so native splash uses the fixed image
  const imagesetDir = path.join(__dirname, '../ios/SwingSense/Images.xcassets/SplashScreenLogo.imageset');
  if (fs.existsSync(imagesetDir)) {
    const fixed = await sharp(outputFile).png().toBuffer();
    for (const f of ['image.png', 'image@2x.png', 'image@3x.png']) {
      fs.writeFileSync(path.join(imagesetDir, f), fixed);
    }
    console.log('Updated iOS SplashScreenLogo imageset');
  }
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
