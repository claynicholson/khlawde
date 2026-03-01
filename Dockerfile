FROM node:20-bookworm

RUN apt-get update && \
    apt-get install -y openssh-server && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /run/sshd

# Create player user with empty password and register the game shell
RUN echo "/app/ssh-shell.sh" >> /etc/shells && \
    useradd -m -s /app/ssh-shell.sh player && \
    passwd -d player

# SSH config: allow empty passwords, force the game shell
RUN sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PrintMotd yes/PrintMotd no/' /etc/ssh/sshd_config && \
    echo "PermitEmptyPasswords yes" >> /etc/ssh/sshd_config && \
    echo "PrintMotd no" >> /etc/ssh/sshd_config

WORKDIR /app

# Install root (CLI app) dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install backend dependencies
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install

# Copy source
COPY . .

# Build the CLI app
RUN npm run build

# Make scripts executable
RUN chmod +x /app/ssh-shell.sh /app/docker-entrypoint.sh

EXPOSE 22 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
