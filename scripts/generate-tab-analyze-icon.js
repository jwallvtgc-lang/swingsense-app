/**
 * Builds assets/tab-analyze-icon.png — transparent S + bat mark for bottom tab.
 * Strips launcher black background and emerald glow; outputs 256×256 RGBA.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');
const inputPath = path.join(assetsDir, 'icon.png');
const outputPath = path.join(assetsDir, 'tab-analyze-icon.png');
const SIZE = 256;

function isMarkPixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;

  // Launcher black, squircle edge, and glow
  if (lum < 72) return false;
  if (g > r + 12 && g > b + 12 && lum < 140) return false;

  // White S
  if (lum > 168 && sat < 0.22) return true;

  // Gold / yellow bat
  if (r > 140 && g > 100 && b < 140 && r >= g - 35 && lum > 90) return true;

  return false;
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('Missing assets/icon.png');
    process.exit(1);
  }

  const source = await sharp(inputPath).metadata();
  const side = Math.round(Math.min(source.width, source.height) * 0.58);
  const left = Math.round((source.width - side) / 2);
  const top = Math.round((source.height - side) / 2);

  const { data, info } = await sharp(inputPath)
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];

    if (isMarkPixel(r, g, b)) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const t = Math.min(1, (lum - 72) / 150);
      const white = 255;
      out[i * 4] = white;
      out[i * 4 + 1] = white;
      out[i * 4 + 2] = white;
      out[i * 4 + 3] = Math.round(255 * t);
    }
  }

  for (let i = 0; i < width * height; i++) {
    if (out[i * 4 + 3] > 0 && out[i * 4] < 48 && out[i * 4 + 1] < 48 && out[i * 4 + 2] < 48) {
      out[i * 4 + 3] = 0;
    }
  }

  const trimmed = await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  await sharp(trimmed.data, {
    raw: {
      width: trimmed.info.width,
      height: trimmed.info.height,
      channels: trimmed.info.channels,
    },
  })
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const written = await sharp(outputPath).metadata();
  console.log(`Wrote ${outputPath} (${written.width}x${written.height}, alpha: ${written.hasAlpha})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
