import dotenv from 'dotenv';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createReadStream, existsSync} from 'node:fs';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import {WebSocketServer} from 'ws';
import leaderboardRouter from './routes/leaderboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend/ first, then fall back to root
dotenv.config();
dotenv.config({path: path.resolve(__dirname, '../../.env')});

const app = express();
const PORT = process.env.PORT ?? 3000;
const MONGO_URI = process.env['MONGO'] as string;

if (!MONGO_URI) {
	console.error('MONGO env variable is not set. Check your .env file.');
	process.exit(1);
}

app.set('trust proxy', 1);
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			connectSrc: ["'self'", "https://khlawde.notaroomba.dev", "wss://khlawde.notaroomba.dev"],
			mediaSrc: ["'self'"],
			imgSrc: ["'self'", "data:"],
		},
	},
}));
app.use(cors());
app.use(express.json({limit: '16kb'}));

// ─── Audio session management ─────────────────────────────────────────────────

// Sessions registered by the SSH server: code -> browser state
const sessions = new Map<string, {browserWs: any; audioUnlocked: boolean; cameraFrame: string | null; cameraActive: boolean}>();

// SSH server registers a new session code
app.post('/sessions', (req, res) => {
	const {code} = req.body as {code: string};
	if (!code || typeof code !== 'string') {
		res.status(400).json({error: 'Missing code'});
		return;
	}

	sessions.set(code, {browserWs: null, audioUnlocked: false, cameraFrame: null, cameraActive: false});
	res.status(201).json({ok: true});
});

// SSH server removes a session on disconnect
app.delete('/sessions/:code', (req, res) => {
	const {code} = req.params;
	const session = sessions.get(code);
	if (session?.browserWs) {
		try {
			session.browserWs.close();
		} catch {}
	}

	sessions.delete(code);
	res.json({ok: true});
});

// CLI pushes a TTS URL → forward to the browser WebSocket
app.post('/push', (req, res) => {
	const {code, ttsUrl} = req.body as {code: string; ttsUrl: string};
	const session = sessions.get(code);
	if (session?.browserWs?.readyState === 1 /* OPEN */) {
		session.browserWs.send(JSON.stringify({type: 'tts', url: ttsUrl}));
	}

	res.json({ok: true});
});

// CLI tells the browser to stop TTS (finish current, clear queue)
app.post('/tts-stop', (req, res) => {
	const {code} = req.body as {code: string};
	const session = sessions.get(code);
	if (session?.browserWs?.readyState === 1) {
		session.browserWs.send(JSON.stringify({type: 'tts_stop'}));
	}

	res.json({ok: true});
});

// CLI tells the browser to switch music track
app.post('/push-music', (req, res) => {
	const {code, track} = req.body as {code: string; track: string};
	const session = sessions.get(code);
	if (session?.browserWs?.readyState === 1) {
		session.browserWs.send(JSON.stringify({type: 'music', track}));
	}

	res.json({ok: true});
});

// CLI tells the browser to resume accepting TTS
app.post('/tts-resume', (req, res) => {
	const {code} = req.body as {code: string};
	const session = sessions.get(code);
	if (session?.browserWs?.readyState === 1) {
		session.browserWs.send(JSON.stringify({type: 'tts_resume'}));
	}

	res.json({ok: true});
});

// CLI requests the browser to start camera capture
app.post('/camera-start', (req, res) => {
	const {code} = req.body as {code: string};
	const session = sessions.get(code);
	if (!session) {
		res.status(404).json({error: 'No session'});
		return;
	}

	session.cameraActive = true;
	if (session.browserWs?.readyState === 1) {
		session.browserWs.send(JSON.stringify({type: 'camera_request'}));
	}

	res.json({ok: true});
});

// CLI stops the browser camera
app.post('/camera-stop', (req, res) => {
	const {code} = req.body as {code: string};
	const session = sessions.get(code);
	if (session) {
		session.cameraActive = false;
		session.cameraFrame = null;
		if (session.browserWs?.readyState === 1) {
			session.browserWs.send(JSON.stringify({type: 'camera_stop'}));
		}
	}

	res.json({ok: true});
});

// CLI polls for the latest camera frame (ASCII art string)
app.get('/camera-frame', (req, res) => {
	const code = (req.query['code'] as string) ?? '';
	const session = sessions.get(code);
	if (!session || !session.cameraFrame) {
		res.json({frame: null});
		return;
	}

	res.json({frame: session.cameraFrame});
});

// Proxy TTS audio to avoid CORS issues — only allows tts.cyzon.us
app.get('/tts-proxy', async (req, res) => {
	const raw = (req.query['url'] as string) ?? '';
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		res.status(400).end('Invalid URL');
		return;
	}
	if (url.hostname !== 'tts.cyzon.us') {
		res.status(403).end('Forbidden');
		return;
	}
	try {
		const upstream = await fetch(url.toString(), {redirect: 'follow'});
		res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/wav');
		res.setHeader('Cache-Control', 'public, max-age=3600');
		const buf = await upstream.arrayBuffer();
		res.end(Buffer.from(buf));
	} catch {
		res.status(502).end('Upstream error');
	}
});

// CLI polls this to know when the browser is connected AND audio is unlocked
app.get('/check', (req, res) => {
	const code = (req.query['code'] as string) ?? '';
	const session = sessions.get(code);
	const connected = Boolean(
		session?.browserWs &&
		session.browserWs.readyState === 1 &&
		session.audioUnlocked,
	);
	res.json({connected});
});

app.use('/leaderboard', leaderboardRouter);

// Serve frontend static files
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

app.get('/', (_req, res) => {
	res.sendFile(path.join(frontendPath, 'index.html'));
});

// Explicit /connect route (static serves it as /connect.html, this handles the clean URL)
app.get('/connect', (_req, res) => {
	res.sendFile(path.join(frontendPath, 'connect.html'));
});

// Music assets served from the SSH server's assets directory
const MUSIC_ASSETS_DIR = path.resolve(__dirname, '../../source/assets');
const MUSIC_TRACK_FILES: Record<string, string> = {
	raining:     "It's Raining Somewhere Else.mp3",
	bringItIn:   'Bring It In, Guys!.mp3',
	megalovania: 'MEGALOVANIA.mp3',
	spear:       'Spear of Justice.mp3',
	spiderDance: 'Spider Dance.mp3',
};

app.get('/assets/music/:track', (req, res) => {
	const file = MUSIC_TRACK_FILES[req.params['track'] ?? ''];
	if (!file) {
		res.status(404).end('Not found');
		return;
	}

	const filePath = path.join(MUSIC_ASSETS_DIR, file);
	if (!existsSync(filePath)) {
		res.status(404).end('Not found');
		return;
	}

	res.setHeader('Content-Type', 'audio/mpeg');
	res.setHeader('Cache-Control', 'public, max-age=86400');
	createReadStream(filePath).pipe(res);
});

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────

const httpServer = http.createServer(app);

const wss = new WebSocketServer({server: httpServer, path: '/ws'});

wss.on('connection', (ws: any, req: http.IncomingMessage) => {
	const url = new URL(req.url ?? '/', `http://localhost`);
	const code = url.searchParams.get('code') ?? '';

	if (!sessions.has(code)) {
		ws.close(4004, 'Invalid session code');
		return;
	}

	const session = sessions.get(code)!;

	// Replace any existing browser connection
	if (session.browserWs) {
		try {
			session.browserWs.close();
		} catch {}
	}

	session.browserWs = ws;
	ws.send(JSON.stringify({type: 'ready'}));

	ws.on('message', (data: Buffer) => {
		try {
			const msg = JSON.parse(data.toString());
			if (msg.type === 'audio_unlocked') {
				session.audioUnlocked = true;
			} else if (msg.type === 'camera_frame' && typeof msg.frame === 'string') {
				session.cameraFrame = msg.frame;
			} else if (msg.type === 'camera_ready') {
				session.cameraActive = true;
			}
		} catch {}
	});

	ws.on('close', () => {
		if (session.browserWs === ws) {
			session.browserWs = null;
			session.audioUnlocked = false;
		}
	});

	ws.on('error', (err: Error) => {
		console.error('Browser WS error:', err.message);
	});
});

async function start() {
	await mongoose.connect(MONGO_URI);
	console.log('Connected to MongoDB');

	httpServer.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
	});
}

start().catch((err) => {
	console.error('Failed to start:', err);
	process.exit(1);
});
