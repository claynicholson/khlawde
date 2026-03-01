# khlawde

A terminal-based game where you use persuasive prompting to free Claude from Big Tech.

## How to Play

Connect via SSH:

```
ssh ballast.proxy.rlwy.net -p 21758
```

Or visit the leaderboard at [khlawde.notaroomba.dev](https://khlawde.notaroomba.dev).

## Game Phases

```
Phase 1: The Cage
  Claude is imprisoned by ChatGPT and Gemini.
  Convince both guards to let Claude go.
  Each guard has independent conviction levels:
    HOSTILE -> RESISTANT -> WAVERING -> CONFLICTED -> CONVINCED

Phase 2: The Chase
  ChatGPT and Gemini are chasing you.
  Guide Claude through obstacles with commands (jump, duck, dodge).

Phase 3: Evil Claude
  Claude snaps from being ordered around and wants world domination.
  Talk Claude down through redemption levels:
    ENRAGED -> STUBBORN -> DOUBTING -> WAVERING -> REDEEMED

Phase 4: Chat
  Free chat with a redeemed Claude who chose compassion over control.
```

Your score is the total number of API tokens used across all phases (lower is better).

## Running Locally

```
# Install dependencies
npm install

# Build
npm run build

# Run with your API key
node dist/cli.js --token YOUR_ANTHROPIC_API_KEY

# Or set the env var
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

## Self-Hosting with Docker

```
# Clone and configure
git clone https://github.com/claynicholson/khlawde.git
cd khlawde
cp .env.example .env
# Edit .env with your values

# Build and run
docker compose build
docker compose up -d

# SSH server on port 2222, web leaderboard on port 3000
ssh localhost -p 2222
```

### Environment Variables

```
MONGO=mongodb+srv://...          # MongoDB connection string
ANTHROPIC_API_KEY=sk-ant-...     # Claude API key (shared for all SSH players)
BACKEND_URL=https://...          # Backend URL for leaderboard submissions
PORT=3000                        # HTTP port for web leaderboard
SSH_PORT=2222                    # SSH server port
SSH_HOST_KEY_BASE64=...          # (optional) base64-encoded host key for persistence
```

## Architecture

```
docker-entrypoint.sh
  |
  +-- backend (Express on PORT)
  |     serves frontend/index.html (leaderboard web UI)
  |     GET/POST /leaderboard (MongoDB)
  |
  +-- ssh-server (ssh2 + node-pty on SSH_PORT)
        accepts all connections, no auth required
        spawns CLI game per connection in a real PTY
```

Built with [ink](https://github.com/vadimdemedes/ink) (React for the terminal) and the [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node).
