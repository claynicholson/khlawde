#!/bin/bash
set -e

# Railway sets PORT for the HTTP service — pass it to the backend
export PORT="${PORT:-3000}"
export SSH_PORT="${SSH_PORT:-2222}"

# Start the backend API in the background
cd /app/backend
node --import tsx src/index.ts &

# Start custom SSH server in foreground
cd /app
exec node dist/ssh-server.js
