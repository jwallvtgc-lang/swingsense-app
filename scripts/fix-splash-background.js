/**
 * Composites splash-icon.png onto solid navy background to fix checkerboard.
 * Adds SwingSense branding. Run: node scripts/fix-splash-background.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');
const input = path.join(assetsDir, 'splash-icon.png');
const output = path.join(assetsDir, 'splash-icon.png');

// Navy – matches app.json splash.backgroundColor (#1e3a5f)
const BG = { r: 30, g: 58, b: 95 };
const CANVAS_W = 512;
const CANVAS_H = 640; // Room for icon + branding
const ICON_SIZE = 380; // Larger, main focus
const ACCENT = '#F5A623'; // Brand orange

if (!fs.existsSync(input)) {
  console.warn('splash-icon.png not found, skipping');
  process.exit(0);
}

async function fix() {
  const icon = await sharp(input)
    .resize(ICON_SIZE, ICON_SIZE)
    .ensureAlpha();

  // Solid navy canvas – no alpha, prevents checkerboard
  const bg = sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 3,
      background: BG,
    },
  });

  const iconBuf = await icon.png().toBuffer();
  const iconTop = Math.round((CANVAS_H - ICON_SIZE) / 2) - 40; // Slightly above center for text
  const iconLeft = Math.round((CANVAS_W - ICON_SIZE) / 2);

  // SVG for "SwingSense" – works on Linux (EAS build) and Windows
  const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="80">
  <text x="${CANVAS_W / 2}" y="55" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="${ACCENT}" text-anchor="middle">SwingSense</text>
</svg>
`);

  let textBuf;
  try {
    textBuf = await sharp(textSvg).png().toBuffer();
  } catch (e) {
    console.warn('Could not render text, outputting icon only:', e.message);
    textBuf = null;
  }

  const composites = [
    { input: iconBuf, top: iconTop, left: iconLeft },
    ...(textBuf ? [{ input: textBuf, top: CANVAS_H - 90, left: 0 }] : []),
  ];

  await bg
    .composite(composites)
    .flatten({ background: BG })
    .removeAlpha({ background: BG }) // Ensure no transparency – prevents checkerboard
    .png({ compressionLevel: 9 })
    .toFile(output.replace('.png', '-tmp.png'));

  fs.renameSync(output.replace('.png', '-tmp.png'), output);
  console.log('Fixed splash-icon.png: navy #1e3a5f background, branding added');
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
