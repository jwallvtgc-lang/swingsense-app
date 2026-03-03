#!/bin/bash
# Fix ios folder permissions so .xcode.env.local can be written during pod install
if [[ "$EAS_BUILD_PLATFORM" == "ios" ]] && [[ -d "ios" ]]; then
  chmod -R u+w ios/
  echo "Fixed ios directory permissions"
fi
