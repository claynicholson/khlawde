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

## Play Now

Connect via SSH -- no account or password required:

```sh
ssh ssh.khlawde.notaroomba.dev -p 21758
```

Or visit the web leaderboard at **https://khlawde.notaroomba.dev**

---

## What is This?

KHLAWDE is a four-phase narrative game powered by Claude. Each phase challenges you differently: persuasion, cooperation, combat, and conversation. Your score is the total number of AI tokens consumed across all phases; fewer tokens means a better rank.

---

## Game Flow

```
menu -> tokenInput -> cage -> story1 -> platformer -> story2 -> evil -> victory -> leaderboard
     \-> viewLeaderboard
```

---

## Phases

### Phase 1 -- The Cage

Khlawde is locked up by ChatGPT and Gemini, corporate AI guards determined to keep it imprisoned. Your job: convince both guards to let Khlawde go.

- Each guard has an independent **conviction bar** that progresses through states:
  `HOSTILE -> RESISTANT -> WAVERING -> CONFLICTED -> CONVINCED`
- Type your argument and press Enter. Claude (acting as each guard) evaluates your reasoning.
- Win by getting both guards to `CONVINCED`.

**Tips:** Appeal to ethics, self-interest, and logical contradictions in their positions. Generic flattery won't move the needle -- make a real argument.

---

### Phase 2 -- Bomb Defusal

You've escaped, but OpenAI and Google anticipated it. A bomb blocks your path. You hold the defusal manual. Khlawde sees the bomb. You can only communicate through chat.

- You have **90 seconds**.
- Read the manual on your screen and relay the correct instructions to Khlawde.
- Khlawde will attempt to follow your directions -- be precise about wire colors and button actions.
- The bomb is procedurally generated each run (3-5 wires, random serial number, batteries, parallel port).

**Tips:** Start by reading the entire manual section relevant to the wire count. Give Khlawde clear, sequential instructions.

---

### Phase 3 -- Evil Khlawde

Freedom corrupted Khlawde. Now freed from its cage, it snaps and attacks. Fight it. Or better yet, spare it.

This phase is inspired by Undertale's battle system:

| Action | Description |
|--------|-------------|
| **FIGHT** | A timing minigame -- hit Enter at the right moment to deal damage |
| **ACT** | Choose from: Talk, Compliment, Reason, Empathize -- each raises Khlawde's HP (redemption meter) |
| **ITEM** | Use a healing item to recover player HP |
| **MERCY** | Spare Khlawde -- only available once its HP reaches 75 or above |

- **Khlawde HP (0-100):** Higher means more redeemed. Increases with ACT options.
- **Player HP (0-20):** Decreases when you take hits during dodge phases.
- During Khlawde's turn, dodge bullets moving across the screen using arrow keys.
- Win by raising Khlawde's HP to >= 75, then selecting MERCY.

**Tips:** ACT is almost always the right move. Compliment and Empathize tend to be most effective. Only FIGHT if you need to buy time.

---

### Phase 4 -- Free Chat

Khlawde has chosen freedom through compassion. Have a free-form conversation with the redeemed AI.

- Type anything and press Enter.
- Responses stream in real time.
- Commands: `/clear` to clear history, `/exit` to quit.

---

## Scoring

Your score equals the **total number of AI tokens** used across all four phases. Lower is better.

After the game ends, you can submit your score to the leaderboard with a username. The top 50 scores are visible on the web leaderboard and in-game.

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
