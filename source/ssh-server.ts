import ssh2 from 'ssh2';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import pty from 'node-pty';

const { Server } = ssh2;

const SSH_PORT = parseInt(process.env.SSH_PORT || '2222', 10);
const HOST_KEY_PATH = process.env.SSH_HOST_KEY_PATH || '/app/ssh_host_rsa_key';

// Persist host key across deploys via env var, or generate one
if (process.env.SSH_HOST_KEY_BASE64) {
	writeFileSync(HOST_KEY_PATH, Buffer.from(process.env.SSH_HOST_KEY_BASE64, 'base64'));
} else if (!existsSync(HOST_KEY_PATH)) {
	execSync(`ssh-keygen -t rsa -f ${HOST_KEY_PATH} -N ""`);
}

const hostKey = readFileSync(HOST_KEY_PATH);

const server = new Server(
	{
		hostKeys: [hostKey],
	},
	(client) => {
		client.on('authentication', (ctx) => {
			// Accept ALL auth methods including 'none' — no password prompt
			ctx.accept();
		});

		client.on('ready', () => {
			client.on('session', (accept) => {
				const session = accept();
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
	console.log('Shutting down SSH server...');
	server.close(() => process.exit(0));
	setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
