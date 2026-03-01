import ssh2 from 'ssh2';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import pty from 'node-pty';
import http from 'http';
import { WebSocketServer } from 'ws';

const { Server } = ssh2;

const SSH_PORT = parseInt(process.env.SSH_PORT || '2222', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);
const HOST_KEY_PATH = process.env.SSH_HOST_KEY_PATH || '/app/ssh_host_rsa_key';

// Persist host key across deploys via env var, or generate one
if (process.env.SSH_HOST_KEY_BASE64) {
	writeFileSync(HOST_KEY_PATH, Buffer.from(process.env.SSH_HOST_KEY_BASE64, 'base64'));
} else if (!existsSync(HOST_KEY_PATH)) {
	execSync(`ssh-keygen -t rsa -f ${HOST_KEY_PATH} -N ""`);
}

const hostKey = readFileSync(HOST_KEY_PATH);

// Session map: code -> browser WebSocket (or null)
const sessions = new Map<string, { browserWs: any }>();

function generateCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const LISTEN_HTML = readFileSync(
	new URL('../../frontend/listen.html', import.meta.url),
	'utf8',
);

// ─── HTTP + WebSocket server ───────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost`);

	if (url.pathname === '/listen' && req.method === 'GET') {
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(LISTEN_HTML);
		return;
	}

	if (url.pathname === '/push' && req.method === 'POST') {
		let body = '';
		req.on('data', (chunk: Buffer) => {
			body += chunk.toString();
		});
		req.on('end', () => {
			try {
				const { code, ttsUrl } = JSON.parse(body) as { code: string; ttsUrl: string };
				const session = sessions.get(code);
				if (session?.browserWs?.readyState === 1 /* OPEN */) {
					session.browserWs.send(JSON.stringify({ type: 'tts', url: ttsUrl }));
				}
			} catch {}

			res.writeHead(200).end('ok');
		});
		return;
	}

	if (url.pathname === '/check' && req.method === 'GET') {
		const code = url.searchParams.get('code') ?? '';
		const session = sessions.get(code);
		const connected = Boolean(session?.browserWs && session.browserWs.readyState === 1);
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ connected }));
		return;
	}

	res.writeHead(404).end('Not found');
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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
	ws.send(JSON.stringify({ type: 'ready' }));

	ws.on('close', () => {
		if (session.browserWs === ws) {
			session.browserWs = null;
		}
	});

	ws.on('error', (err: Error) => {
		console.error('Browser WS error:', err.message);
	});
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
	console.log(`HTTP/WS server listening on port ${HTTP_PORT}`);
});

// ─── SSH server ────────────────────────────────────────────────────────────────

const server = new Server(
	{
		hostKeys: [hostKey],
	},
	(client) => {
		client.on('authentication', (ctx) => {
			ctx.accept();
		});

		client.on('ready', () => {
			client.on('session', (accept) => {
				const session = accept();
				const audioCode = generateCode();
				sessions.set(audioCode, { browserWs: null });

				let ptyInfo = { cols: 80, rows: 24, term: 'xterm-256color' };

				session.on('pty', (accept, _reject, info) => {
					ptyInfo = { cols: info.cols, rows: info.rows, term: info.term };
					if (accept) accept();
				});

				session.on('shell', (accept) => {
					const channel = accept();

					const shell = pty.spawn(
						'node',
						[
							'dist/cli.js',
							'--token',
							process.env.ANTHROPIC_API_KEY || '',
							'--backend-url',
							process.env.BACKEND_URL || '',
						],
						{
							name: ptyInfo.term,
							cols: ptyInfo.cols,
							rows: ptyInfo.rows,
							cwd: '/app',
							env: {
								...process.env,
								TERM: ptyInfo.term,
								COLUMNS: String(ptyInfo.cols),
								LINES: String(ptyInfo.rows),
								AUDIO_CODE: audioCode,
								AUDIO_PORT: String(HTTP_PORT),
							} as Record<string, string>,
						},
					);

					// Pipe SSH channel <-> PTY
					channel.on('data', (data: Buffer) => shell.write(data.toString()));
					shell.onData((data: string) => channel.write(data));

					// Handle terminal resize
					session.on('window-change', (accept, _reject, info) => {
						shell.resize(info.cols, info.rows);
						if (accept) accept();
					});

					// Clean up
					channel.on('close', () => {
						shell.kill();
					});

					shell.onExit(({ exitCode }) => {
						sessions.delete(audioCode);
						channel.exit(exitCode);
						channel.close();
					});
				});
			});
		});

		client.on('error', (err) => {
			console.error('Client error:', err.message);
		});
	},
);

server.listen(SSH_PORT, '0.0.0.0', () => {
	console.log(`SSH server listening on port ${SSH_PORT}`);
});

function shutdown() {
	console.log('Shutting down...');
	server.close(() => process.exit(0));
	httpServer.close();
	setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
