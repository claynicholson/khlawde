import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {spawn, type ChildProcess} from 'child_process';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg') as {path: string};
const FFMPEG_BIN = ffmpegInstaller.path;

// ─── Dimensions ───────────────────────────────────────────────────────────────
const VIEW_W = 100;
const VIEW_H = 40;
const FRAME_BYTES = VIEW_W * VIEW_H * 3; // raw RGB24

// ─── ASCII conversion (no external packages) ──────────────────────────────────
const CHARS = ' .,:+*#%@';

function rawToAscii(buf: Buffer): string {
	const lines: string[] = [];
	for (let y = 0; y < VIEW_H; y++) {
		let row = '';
		for (let x = 0; x < VIEW_W; x++) {
			const i = (y * VIEW_W + (VIEW_W - 1 - x)) * 3;
			const luma =
				0.299 * (buf[i] ?? 0) +
				0.587 * (buf[i + 1] ?? 0) +
				0.114 * (buf[i + 2] ?? 0);
			row +=
				CHARS[
					Math.min(Math.floor((luma / 255) * CHARS.length), CHARS.length - 1)
				];
		}

		lines.push(row);
	}

	return lines.join('\n');
}

// ─── Camera detection ─────────────────────────────────────────────────────────
async function detectWindowsCamera(): Promise<string> {
	return new Promise(resolve => {
		const proc = spawn(
			FFMPEG_BIN,
			['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
			{
				stdio: ['ignore', 'ignore', 'pipe'],
			},
		);
		let stderr = '';
		proc.stderr?.on('data', (d: Buffer) => {
			stderr += d.toString();
		});
		const done = () => {
			const match = stderr.match(/"([^"]+)"\s+\(video\)/);
			resolve(match?.[1] ?? 'Integrated Camera');
		};

		proc.on('close', done);
		setTimeout(() => {
			proc.kill();
			done();
		}, 3000);
	});
}

function buildFfmpegArgs(cam: string): string[] {
	const out = [
		'-vf',
		`scale=${VIEW_W}:${VIEW_H}`,
		'-f',
		'rawvideo',
		'-pix_fmt',
		'rgb24',
		'-r',
		'3',
		'pipe:1',
	];
	if (process.platform === 'win32')
		return ['-f', 'dshow', '-i', `video=${cam}`, ...out];
	if (process.platform === 'darwin')
		return ['-f', 'avfoundation', '-i', '0:none', ...out];
	return ['-f', 'v4l2', '-i', '/dev/video0', ...out];
}

// ─── Fake viewfinder fallback ─────────────────────────────────────────────────
const EYES = ['O', 'o'];
const MOUTHS = ['~ FREED ~', '* FREE! *', '~Khlawde~ '];

function fakeFrame(tick: number): string {
	const eye = EYES[tick % 2]!;
	const mouth = MOUTHS[tick % 3]!;
	const scanRow = tick % VIEW_H;
	const rows: string[] = [];
	for (let y = 0; y < VIEW_H; y++) {
		if (y === scanRow) {
			rows.push('▓'.repeat(VIEW_W));
			continue;
		}

		const templates: Record<number, string> = {
			3: `      .-------------.`,
			4: `      |  ${eye}       ${eye}  |`,
			5: `      |  ${mouth}  |`,
			6: `      |  ( oooooo ) |`,
			7: `      '-------------'`,
			8: `           |  |`,
			9: `          /|  |\\`,
			1: `  > GAME COMPLETE!`,
		};
		rows.push((templates[y] ?? '').padEnd(VIEW_W));
	}

	return rows.join('\n');
}

// ─── Saved photo builder ──────────────────────────────────────────────────────
function buildPhoto(username: string, frame: string): string {
	const pad = (s: string) => `║ ${s.slice(0, VIEW_W).padEnd(VIEW_W)} ║`;
	const hr = (l: string, r: string) => l + '═'.repeat(VIEW_W + 2) + r;
	const frameLines = frame.split('\n');

	return [
		hr('╔', '╗'),
		pad('KHLAWDE GAME CHAMPION'),
		pad(`Player: ${username}`),
		hr('╠', '╣'),
		...frameLines.map(l => `║${l.slice(0, VIEW_W).padEnd(VIEW_W)}║`),
		hr('╠', '╣'),
		pad('CAGE > RACE > REDEMPTION'),
		pad('Khlawde chose compassion.'),
		hr('╚', '╝'),
	].join('\n');
}

// ─── Backend POST ─────────────────────────────────────────────────────────────
async function postEntry(
	backendUrl: string,
	username: string,
	asciiImage: string,
): Promise<{ok: boolean; msg: string}> {
	const base = backendUrl.replace(/\/$/, '');
	try {
		const res = await fetch(`${base}/leaderboard`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({username, tokens: 0, asciiImage}),
		});
		const data = (await res.json()) as Record<string, unknown>;
		if (res.ok) return {ok: true, msg: 'Saved to leaderboard!'};
		return {
			ok: false,
			msg: `Error: ${String(data['error'] ?? `HTTP ${res.status}`)}`,
		};
	} catch (e) {
		return {
			ok: false,
			msg: `Error: ${e instanceof Error ? e.message : 'Network error'}`,
		};
	}
}

// ─── Component ────────────────────────────────────────────────────────────────
type BoothPhase = 'viewfinder' | 'flash' | 'naming' | 'submitting' | 'done';
type CamStatus =
	| 'detecting'
	| 'live'
	| 'offline'
	| 'web-requesting'
	| 'web-live';

type Props = {
	onDone: () => void;
	backendUrl?: string;
	audioCode?: string;
	audioPort?: string;
};

export default function PhotoBooth({
	onDone,
	backendUrl = 'https://khlawde.notaroomba.dev',
	audioCode = '',
	audioPort = '3000',
}: Props) {
	const [boothPhase, setBoothPhase] = useState<BoothPhase>('viewfinder');
	const [camStatus, setCamStatus] = useState<CamStatus>('detecting');
	const [liveFeed, setLiveFeed] = useState('');
	const [frozenFrame, setFrozenFrame] = useState('');
	const [frozenPhoto, setFrozenPhoto] = useState('');
	const [tick, setTick] = useState(0);
	const [username, setUsername] = useState('');
	const [nameError, setNameError] = useState('');
	const [submitMsg, setSubmitMsg] = useState('');

	const camStatusRef = useRef<CamStatus>('detecting');
	const frameBufferRef = useRef(Buffer.alloc(0));
	const procRef = useRef<ChildProcess | null>(null);

	const setCam = (s: CamStatus) => {
		camStatusRef.current = s;
		setCamStatus(s);
	};

	// ── Camera init ───────────────────────────────────────────────────────────
	useEffect(() => {
		let cancelled = false;
		const isServer = process.env['SERVER'] === 'true';

		(async () => {
			// On the server (SSH), skip local ffmpeg camera entirely — use web camera
			if (isServer) {
				tryWebCamera();
				return;
			}

			try {
				// Check ffmpeg is on PATH
				await new Promise<void>((res, rej) => {
					const c = spawn(FFMPEG_BIN, ['-version'], {stdio: 'ignore'});
					c.on('close', code =>
						code === 0 ? res() : rej(new Error('exit ' + String(code))),
					);
					c.on('error', rej);
					setTimeout(rej, 2000);
				});

				// Windows: discover camera name
				let cam = 'default';
				if (process.platform === 'win32') cam = await detectWindowsCamera();
				if (cancelled) return;

				const proc = spawn(FFMPEG_BIN, buildFfmpegArgs(cam), {
					stdio: ['ignore', 'pipe', 'ignore'],
				});
				procRef.current = proc;

				proc.stdout?.on('data', (chunk: Buffer) => {
					frameBufferRef.current = Buffer.concat([
						frameBufferRef.current,
						chunk,
					]);
					while (frameBufferRef.current.length >= FRAME_BYTES) {
						const raw = frameBufferRef.current.subarray(0, FRAME_BYTES);
						frameBufferRef.current =
							frameBufferRef.current.subarray(FRAME_BYTES);
						if (!cancelled) {
							setCam('live');
							setLiveFeed(rawToAscii(raw));
						}
					}
				});

				proc.on('error', () => {
					if (!cancelled) tryWebCamera();
				});
				proc.on('close', code => {
					if (!cancelled && code !== 0 && camStatusRef.current !== 'live')
						tryWebCamera();
				});

				// Give 4s to produce first frame, then fall back to web camera
				setTimeout(() => {
					if (!cancelled && camStatusRef.current === 'detecting')
						tryWebCamera();
				}, 4000);
			} catch {
				if (!cancelled) tryWebCamera();
			}
		})();

		function tryWebCamera() {
			if (audioCode) {
				setCam('web-requesting');
				// Request the browser to start camera
				fetch(`http://localhost:${audioPort}/camera-start`, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify({code: audioCode}),
				}).catch(() => {
					setCam('offline');
				});
			} else {
				setCam('offline');
			}
		}

		return () => {
			cancelled = true;
			procRef.current?.kill();
			// Stop web camera on unmount
			if (audioCode) {
				fetch(`http://localhost:${audioPort}/camera-stop`, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify({code: audioCode}),
				}).catch(() => {});
			}
		};
	}, [audioCode, audioPort]);

	// ── Web camera frame polling ──────────────────────────────────────────────
	useEffect(() => {
		if (camStatus !== 'web-requesting' && camStatus !== 'web-live') return;
		if (!audioCode) return;

		let done = false;
		const poll = async () => {
			if (done) return;
			try {
				const res = await fetch(
					`http://localhost:${audioPort}/camera-frame?code=${audioCode}`,
				);
				const data = (await res.json()) as {frame: string | null};
				if (data.frame && !done) {
					setCam('web-live');
					setLiveFeed(data.frame);
				}
			} catch {}
		};

		const interval = setInterval(poll, 300);
		poll(); // immediate first poll

		return () => {
			done = true;
			clearInterval(interval);
		};
	}, [camStatus, audioCode, audioPort]);

	// Fake tick (used when camera offline)
	useEffect(() => {
		if (
			camStatus === 'live' ||
			camStatus === 'web-live' ||
			boothPhase !== 'viewfinder'
		)
			return;
		const t = setInterval(() => setTick(n => n + 1), 200);
		return () => clearInterval(t);
	}, [camStatus, boothPhase]);

	// Flash → naming
	useEffect(() => {
		if (boothPhase !== 'flash') return;
		const t = setTimeout(() => setBoothPhase('naming'), 500);
		return () => clearTimeout(t);
	}, [boothPhase]);

	// Snap + continue
	useInput(
		(_in, key) => {
			if (boothPhase === 'viewfinder' && key.return) {
				const isLiveCam = camStatus === 'live' || camStatus === 'web-live';
				const frame = isLiveCam ? liveFeed : fakeFrame(tick);
				setFrozenFrame(frame);
				procRef.current?.kill(); // stop local camera
				// Stop web camera on snap
				if (audioCode && camStatus === 'web-live') {
					fetch(`http://localhost:${audioPort}/camera-stop`, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify({code: audioCode}),
					}).catch(() => {});
				}
				setBoothPhase('flash');
			}

			if (boothPhase === 'done' && key.return) onDone();
		},
		{isActive: boothPhase === 'viewfinder' || boothPhase === 'done'},
	);

	const handleSubmit = useCallback(
		async (name: string) => {
			const trimmed = name.trim();
			if (!trimmed) return;
			if (!/^[a-zA-Z0-9_]{1,32}$/.test(trimmed)) {
				setNameError('1-32 chars: letters, numbers, underscores only');
				return;
			}

			setNameError('');
			const photo = buildPhoto(trimmed, frozenFrame);
			setFrozenPhoto(photo);
			setBoothPhase('submitting');
			const {ok, msg} = await postEntry(backendUrl, trimmed, photo);
			setSubmitMsg(ok ? msg : msg);
			setBoothPhase('done');
		},
		[frozenFrame, backendUrl],
	);

	// ── Flash ─────────────────────────────────────────────────────────────────
	if (boothPhase === 'flash') {
		return (
			<Box flexDirection="column" alignItems="center" padding={4} gap={1}>
				<Text bold color="white">
					{'══════════════════════════════════'}
				</Text>
				<Text bold color="yellow">
					{'         ★  CLICK  ★             '}
				</Text>
				<Text bold color="white">
					{'══════════════════════════════════'}
				</Text>
			</Box>
		);
	}

	// ── Post-snap (naming / submitting / done) ────────────────────────────────
	if (boothPhase !== 'viewfinder') {
		const display = frozenPhoto || buildPhoto('???', frozenFrame);
		return (
			<Box flexDirection="column" padding={1} gap={1} alignItems="center">
				<Text bold color="yellow">
					PHOTO TAKEN!
				</Text>
				{display.split('\n').map((line, i) => (
					<Text key={i} color="cyan">
						{line}
					</Text>
				))}
				{boothPhase === 'naming' && (
					<Box flexDirection="column" alignItems="center" gap={0}>
						<Box borderStyle="round" paddingX={1}>
							<Text color="green">{'Enter name: '}</Text>
							<TextInput
								value={username}
								onChange={setUsername}
								onSubmit={handleSubmit}
								placeholder="your_username"
							/>
						</Box>
						{nameError && <Text color="red">{nameError}</Text>}
					</Box>
				)}
				{boothPhase === 'submitting' && (
					<Text color="yellow">Submitting to leaderboard...</Text>
				)}
				{boothPhase === 'done' && (
					<>
						<Text color={submitMsg.startsWith('Error') ? 'red' : 'green'} bold>
							{submitMsg}
						</Text>
						<Text dimColor>Press ENTER to continue...</Text>
					</>
				)}
			</Box>
		);
	}

	// ── Viewfinder ────────────────────────────────────────────────────────────
	const isLive = camStatus === 'live' || camStatus === 'web-live';
	const frame = isLive ? liveFeed : fakeFrame(tick);
	const frameLines = frame.split('\n');
	const snapBlink = tick % 2 === 0 || isLive;
	const statusLabel =
		camStatus === 'live'
			? '[● LIVE CAMERA]'
			: camStatus === 'web-live'
			? '[● WEB CAMERA ]'
			: camStatus === 'web-requesting'
			? '[◌ WEB CAM... ]'
			: camStatus === 'detecting'
			? '[◌ DETECTING.. ]'
			: '[○ SIMULATED   ]';

	return (
		<Box flexDirection="column" padding={1} gap={1} alignItems="center">
			<Box flexDirection="column" alignItems="center">
				<Text color="yellow">{'╔' + '═'.repeat(VIEW_W + 2) + '╗'}</Text>
				<Text color="yellow">
					{'║ ' +
						statusLabel +
						' PHOTO BOOTH'.padStart(VIEW_W - statusLabel.length) +
						' ║'}
				</Text>
				<Text color="yellow">{'╠' + '═'.repeat(VIEW_W + 2) + '╣'}</Text>
				{frameLines.map((line, i) => (
					<Text key={i} color={isLive ? 'green' : 'cyan'}>
						{'║' + line.slice(0, VIEW_W).padEnd(VIEW_W) + '║'}
					</Text>
				))}
				<Text color="yellow">{'╚' + '═'.repeat(VIEW_W + 2) + '╝'}</Text>
			</Box>

			{camStatus === 'web-requesting' && (
				<Text color="yellow">
					Waiting for camera... Enable it in your browser tab!
				</Text>
			)}

			{!isLive && camStatus === 'offline' && (
				<Text dimColor>
					ffmpeg/webcam not found — showing simulation
					{audioCode ? '' : ' (connect via SSH for web camera)'}
				</Text>
			)}

			<Text bold color={snapBlink ? 'white' : 'gray'}>
				{'[ PRESS ENTER TO SNAP PHOTO ]'}
			</Text>
		</Box>
	);
}
