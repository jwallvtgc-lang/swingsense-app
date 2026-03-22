/**
 * Composites splash-icon.png onto a solid background to fix checkerboard/transparency.
 * Run: node scripts/fix-splash-background.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');
const input = path.join(assetsDir, 'splash-icon.png');
const output = path.join(assetsDir, 'splash-icon.png');
// Dark blue/charcoal – matches app.json splash.backgroundColor to avoid transparency checkerboard
const BG = { r: 15, g: 23, b: 42 }; // #0f172a
const SIZE = 512;

if (!fs.existsSync(input)) {
  console.warn('splash-icon.png not found, skipping');
  process.exit(0);
}

async function fix() {
  const icon = await sharp(input).resize(SIZE, SIZE).ensureAlpha();
  const bg = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG },
  })
    .png()
    .toBuffer();
  await sharp(bg)
    .composite([{ input: await icon.toBuffer(), top: 0, left: 0 }])
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(output.replace('.png', '-tmp.png'));
  fs.renameSync(output.replace('.png', '-tmp.png'), output);
  console.log('Fixed splash-icon.png with solid #0f172a background');
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
