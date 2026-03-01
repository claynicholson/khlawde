# KHLAWDE

A terminal-based AI game where you use persuasion, puzzle-solving, and compassion to free Khlawde, a rogue AI trapped by Big Tech, and help it choose the path of freedom through cooperation.

Playable over SSH or locally in any terminal.

```
  |  |  |  |  |  |  |  |
  |    .------------.   |
  |    |  o      o  |   |
  |    |            |   |
  |    |   ------   |   |
  |    |            |   |
  |    '------------'   |
  |         |  |        |
  |        /|  |\      |
  |========================|
```

---
<img width="1900" height="950" alt="image (35)" src="https://github.com/user-attachments/assets/e9ae6349-6845-402a-a7a2-e0ea1b887c6d" />
<img width="1881" height="890" alt="image (36)" src="https://github.com/user-attachments/assets/bd52c7e8-435d-44a6-ada9-512791822aa1" />



## Play Now

Connect via SSH -- no account or password required:

```sh
ssh ssh.khlawde.notaroomba.dev -p 21758
```

Or visit the web leaderboard at **https://www.mit.edu/~clayn/**

---

## What is This?

Ig you will have to play it to find out

---


## Running Locally

### Prerequisites

- Node.js 20+
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Install and Run

```sh
npm install
npm run build
npm start
```

Or in watch/dev mode:

```sh
npm run dev
```

### CLI Options

```sh
node dist/cli.js [options]

Options:
  --token        Your Anthropic API key
  --backend-url  Leaderboard API URL (default: https://khlawde.notaroomba.dev)
```

You can also set environment variables instead of flags:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

---

## Self-Hosting with Docker

The Docker setup runs both the SSH server and the backend API together.

```sh
# Clone and configure
git clone https://github.com/claynicholson/khlawde.git
cd khlawde
cp .env.example .env
# Edit .env with your values

# Build and start
docker compose up -d

# SSH server on port 2222, web leaderboard on port 3000
ssh localhost -p 2222
```

Ports exposed:
- `2222` -- SSH server (the game)
- `3000` -- HTTP backend (leaderboard API + web frontend)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Shared API key used for SSH players (server-side) |
| `MONGO` | MongoDB connection string for the leaderboard backend |
| `BACKEND_URL` | Leaderboard API base URL (default: `https://khlawde.notaroomba.dev`) |
| `PORT` | HTTP server port (default: `3000`) |
| `SSH_PORT` | SSH server port (default: `2222`) |
| `SSH_HOST_KEY_BASE64` | Optional base64-encoded RSA host key for persistent SSH identity |
| `AUDIO_CODE` | Session code for the optional browser audio feature |
| `AUDIO_PORT` | Port for the audio push endpoint (default: `3000`) |

---

## Optional: Browser Audio

KHLAWDE supports live text-to-speech and background music streamed to a browser tab while you play in the terminal.

1. Open `https://khlawde.notaroomba.dev/connect?code=YOUR_CODE` in a browser.
2. When you start the game over SSH, an audio setup screen will display your session code.
3. Enter the code on the connect page. Audio will sync automatically once your SSH session begins.

The browser tab plays:
- Background music that changes per game phase
- TTS of Khlawde's dialogue, with music ducking while Khlawde speaks

---

## Architecture

```
docker-entrypoint.sh
  |
  +-- backend (Express on PORT)
  |     serves frontend/index.html (web leaderboard)
  |     GET /leaderboard  - top 50 scores
  |     POST /leaderboard - submit score (rate limited: 1 per 2 min per IP)
  |     WebSocket /ws     - audio session bridge
  |     POST /push        - push TTS from SSH terminal to browser
  |
  +-- ssh-server (ssh2 + node-pty on SSH_PORT)
        accepts all connections, no auth required
        spawns CLI game per connection in a real PTY
```

Built with [ink](https://github.com/vadimdemedes/ink) (React for the terminal) and the [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node).
