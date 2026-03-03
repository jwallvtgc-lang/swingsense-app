const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');

async function optimize(name, size) {
  const input = path.join(assetsDir, `${name}.png`);
  const output = path.join(assetsDir, `${name}-opt.png`);
  if (!fs.existsSync(input)) return;
  await sharp(input).resize(size, size).png({ compressionLevel: 9 }).toFile(output);
  fs.renameSync(output, input);
  console.log(`Optimized ${name}.png to ${size}x${size}`);
}

optimize('icon', 1024)
  .then(() => optimize('splash-icon', 512))
  .then(() => console.log('Done'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
