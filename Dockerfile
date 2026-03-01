FROM node:20-bookworm

# Build tools for node-pty native compilation + ssh-keygen for host key generation
RUN apt-get update && \
    apt-get install -y build-essential python3 openssh-client && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install root (CLI app) dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install backend dependencies
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install

# Copy source
COPY . .

# Build the CLI app (includes ssh-server.ts -> ssh-server.js)
RUN npm run build

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 2222 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
