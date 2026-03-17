#!/usr/bin/env node
// Fix splash + iOS build issues for EAS
const fs = require('fs');
const { execSync } = require('child_process');

// Fix splash checkerboard: flatten splash-icon.png onto solid background (all platforms)
try {
  execSync('node scripts/fix-splash-background.js', { stdio: 'inherit' });
} catch (e) {
  console.warn('fix-splash-background.js failed (sharp may be unavailable):', e.message);
}

if (process.env.EAS_BUILD_PLATFORM !== 'ios' || !fs.existsSync('ios')) {
  process.exit(0);
}

// 0. Strip CRLF from env files (fixes "unexpected end of file" when repo was edited on Windows)
for (const f of ['ios/.xcode.env', 'ios/.xcode.env.local']) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    fs.writeFileSync(f, content);
  }
}

// 1. Create .xcode.env.local with NODE_BINARY (used when script sources env)
const nodePath = process.execPath || '/usr/local/bin/node';
fs.writeFileSync('ios/.xcode.env.local', `export NODE_BINARY=${nodePath}\n`);
console.log('Created ios/.xcode.env.local with NODE_BINARY=' + nodePath);

// 2. Patch expo-modules-autolinking so generated script doesn't fail when node not in PATH
const integrator = 'node_modules/expo-modules-autolinking/scripts/ios/project_integrator.rb';
if (fs.existsSync(integrator)) {
  let content = fs.readFileSync(integrator, 'utf8');
  content = content.replace(
    /export NODE_BINARY=\$\(command -v node\)/g,
    'export NODE_BINARY="${NODE_BINARY:-$(command -v node 2>/dev/null || true)}"'
  );
  fs.writeFileSync(integrator, content);
  console.log('Patched expo-modules-autolinking for EAS Build');
}
