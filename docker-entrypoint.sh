#!/bin/bash
set -e

# Generate SSH host keys if they don't exist
ssh-keygen -A

# Start the backend API in the background
cd /app/backend
node --import tsx src/index.ts &

# Start SSH server in foreground
exec /usr/sbin/sshd -D -e
