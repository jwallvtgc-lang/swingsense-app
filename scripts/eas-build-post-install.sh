#!/bin/bash
# Fix "[Expo] Configure project" phase for EAS iOS build
if [[ "$EAS_BUILD_PLATFORM" != "ios" ]] || [[ ! -d "ios" ]]; then
  exit 0
fi

# 1. Create .xcode.env.local with NODE_BINARY (used when script sources env)
NODE_PATH=$(command -v node 2>/dev/null || echo "/usr/local/bin/node")
echo "export NODE_BINARY=$NODE_PATH" > ios/.xcode.env.local
echo "Created ios/.xcode.env.local with NODE_BINARY=$NODE_PATH"

# 2. Patch expo-modules-autolinking so generated script doesn't fail when node not in PATH
INTEGRATOR="node_modules/expo-modules-autolinking/scripts/ios/project_integrator.rb"
if [[ -f "$INTEGRATOR" ]]; then
  sed -i.bak 's|export NODE_BINARY=$(command -v node)|export NODE_BINARY="${NODE_BINARY:-$(command -v node 2>/dev/null || true)}"|' "$INTEGRATOR"
  rm -f "${INTEGRATOR}.bak"
  echo "Patched expo-modules-autolinking for EAS Build"
fi
