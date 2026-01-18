#! /usr/bin/bash

set -e

echo "Starting build process"

echo "Downloading dependencies"
npm install    # Download dependencies

if [ "$1" = "ff" ]; then
  echo "Firefox build mode selected"
  npm run build-ff-zip
else
    echo "Chrome build mode selected"
    npm run build-chrome-zip
fi

echo "Build completed"

