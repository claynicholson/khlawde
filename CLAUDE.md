# KHLAWDE - Project Context

Terminal-based game where players use persuasive prompting to free Khlawde from Big Tech. Played over SSH or locally.

## Project Structure

```
khlawde/
├── source/                      # TypeScript source (Babel -> dist/)
│   ├── cli.tsx                  # CLI entry point (meow arg parser)
│   ├── app.tsx                  # Main state machine, phase routing, Chat component
│   ├── ssh-server.ts            # Custom SSH server (ssh2 + node-pty, no auth)
│   └── components/
│       ├── CageScene.tsx        # Phase 1: Convince ChatGPT & Gemini guards
│       ├── Platformer.tsx       # Phase 2: Bomb defusal cooperation puzzle
│       ├── EvilKhlawde.tsx       # Phase 3: Undertale-style battle + redemption
│       ├── StoryInterstitial.tsx # Narrative bridges between phases
│       ├── HomeMenu.tsx         # Main menu (Play / Leaderboard)
│       ├── TokenInput.tsx       # API key input screen
│       ├── LeaderboardView.tsx  # View top 50 scores
│       ├── LeaderboardSubmit.tsx # Post-game score submission
│       ├── PhotoBooth.tsx       # Camera capture -> ASCII art (ffmpeg)
│       ├── MessageList.tsx      # Chat messages with markdown rendering
│       └── RobotAnimation.tsx   # Idle/talking ASCII animation frames
│
├── backend/                     # Express API server
│   └── src/
│       ├── index.ts             # Express app, MongoDB, serves frontend/
│       ├── models/Entry.ts      # Mongoose schema: username, tokens, asciiImage, ip
│       └── routes/leaderboard.ts # GET /leaderboard (top 50), POST /leaderboard (rate limited)
│
├── frontend/
│   └── index.html               # Tailwind-styled web leaderboard
│
├── Dockerfile                   # Node 20, build-essential for node-pty
├── docker-compose.yml           # Ports: 2222 (SSH), 3000 (HTTP)
├── docker-entrypoint.sh         # Starts backend + SSH server
└── dist/                        # Compiled JS output
```

## Game Flow

```
menu -> tokenInput -> cage -> story1 -> platformer -> story2 -> evil -> victory -> leaderboard -> chat
                 \-> viewLeaderboard -> menu
```

### Phase 1: The Cage (CageScene.tsx)
- Player convinces ChatGPT and Gemini guards to free Khlawde
- Two independent conviction bars: HOSTILE -> RESISTANT -> WAVERING -> CONFLICTED -> CONVINCED
- Khlawde API evaluates each argument for each guard separately
- Win: both guards reach CONVINCED

### Phase 2: Bomb Defusal (Platformer.tsx)
- Cooperative puzzle: player sees manual, Khlawde sees bomb
- Player instructs Khlawde which wires to cut and button actions
- 90 second timer, procedurally generated bomb configs

### Phase 3: Evil Khlawde (EvilKhlawde.tsx)
- Undertale-inspired battle system: FIGHT, ACT, ITEM, MERCY
- Timing minigame for attacks, bullet dodging phases
- ACT submenu: Talk, Compliment, Reason, Empathize
- Khlawde HP 0-100 (higher = more redeemed), player HP 20
- Win: Khlawde HP >= 75 unlocks MERCY (spare)

### Phase 4: Chat (app.tsx)
- Free-form streaming conversation with redeemed Khlawde
- Commands: /clear, /exit

## Key Patterns

- **Token tracking**: App accumulates totalTokens via onTokens callbacks from all phases. Lower score = better.
- **AI calls**: All use Khlawde-opus-4-6 via @anthropic-ai/sdk. Streaming responses in CageScene, EvilKhlawde, Chat.
- **SSH**: ssh2 server accepts all auth (no password), spawns node-pty per connection running dist/cli.js
- **Build**: Babel transpiles source/*.ts(x) -> dist/*.js. ESM modules.
- **Backend**: Express + Mongoose. Helmet CSP allows Tailwind CDN + Google Fonts. Rate limit: 1 POST per 2min per IP.

## Environment Variables

```
MONGO                  # MongoDB connection string
ANTHROPIC_API_KEY      # Shared Khlawde API key for SSH players
BACKEND_URL            # Leaderboard API URL (https://khlawde.notaroomba.dev)
PORT                   # HTTP port (default 3000)
SSH_PORT               # SSH port (default 2222)
SSH_HOST_KEY_BASE64    # Optional: base64 RSA key for persistent host identity
```

## Commands

```
npm run build          # Compile source -> dist
npm run dev            # Watch mode
npm start              # Run locally with tsx
docker compose up      # Run full stack (SSH + backend)
```