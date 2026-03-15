#!/bin/bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use correct Node version
nvm use

# Clear command cache to ensure correct Node binary
hash -r

# Verify versions
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Start the server
npm start
