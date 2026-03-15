#!/usr/bin/env node
// Fix ios folder permissions so .xcode.env.local can be written during pod install
const fs = require('fs');
const { execSync } = require('child_process');

if (process.env.EAS_BUILD_PLATFORM === 'ios' && fs.existsSync('ios')) {
  execSync('chmod -R u+w ios/', { stdio: 'inherit' });
  console.log('Fixed ios directory permissions');
}
