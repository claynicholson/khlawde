import React, {useRef, useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';

const W = 60;
const H = 16;
const GRAVITY = 0.5;
const JUMP_FORCE = -2.6;
const MOVE_SPEED = 1;
const MAX_FALL = 4;
const TICK_MS = 50;

// Platforms: {x, y, w} — player stands at y-1 when on this platform
const PLATFORMS = [
	{x: 0, y: H - 1, w: W}, // ground
	{x: 3, y: 12, w: 9}, // step 1
	{x: 17, y: 9, w: 9}, // step 2
	{x: 31, y: 6, w: 9}, // step 3
	{x: 45, y: 3, w: 9}, // step 4 (top)
];

const GOAL = {x: 52, y: 2}; // ★ sits one above step 4

const INITIAL = {x: 4.0, y: H - 2, vy: 0.0, onGround: true, right: true};

function tickPhysics(p) {
	let vy = p.vy + GRAVITY;
	if (vy > MAX_FALL) vy = MAX_FALL;
	const newY = p.y + vy;
	let onGround = false;

	// Only check landing when falling
	if (vy > 0) {
		for (const plat of PLATFORMS) {
			const standY = plat.y - 1;
			const px = Math.floor(p.x);
			if (px >= plat.x && px < plat.x + plat.w) {
				if (p.y <= standY + 0.5 && newY >= standY) {
					return {...p, y: standY, vy: 0, onGround: true};
				}
			}
		}
	}

	// Also hold player on platform when standing (prevents sinking)
	if (p.onGround) {
		for (const plat of PLATFORMS) {
			const standY = plat.y - 1;
			const px = Math.floor(p.x);
			if (px >= plat.x && px < plat.x + plat.w && Math.abs(p.y - standY) < 0.1) {
				return {...p, y: standY, vy: 0, onGround: true};
			}
		}
	}

	return {...p, y: Math.min(newY, H - 2), vy, onGround};
}

function buildFrame(p, won) {
	const grid = Array.from({length: H}, () => Array(W).fill(' '));

	// Draw platforms
	for (const plat of PLATFORMS) {
		for (let x = plat.x; x < plat.x + plat.w; x++) {
			if (x < W && plat.y < H) grid[plat.y][x] = '═';
		}
	}

	// Draw goal
	if (GOAL.y < H && GOAL.x < W) grid[GOAL.y][GOAL.x] = '★';

	// Draw player
	const px = Math.round(p.x);
	const py = Math.round(p.y);
	if (py >= 0 && py < H && px >= 0 && px < W) {
		grid[py][px] = won ? '★' : p.right ? '>' : '<';
	}

	return grid.map((row, i) => {
		const isGround = PLATFORMS.some(pl => pl.y === i && pl.x === 0 && pl.w === W);
		return {str: row.join(''), isGround};
	});
}

export default function Platformer({onWin}) {
	const pRef = useRef({...INITIAL});
	const wonRef = useRef(false);
	const [, rerender] = useState(0);
	const [won, setWon] = useState(false);
	const [winTimer, setWinTimer] = useState(3);

	// Game loop
	useEffect(() => {
		const interval = setInterval(() => {
			if (wonRef.current) return;

			pRef.current = tickPhysics(pRef.current);

			// Win check
			const px = Math.round(pRef.current.x);
			const py = Math.round(pRef.current.y);
			if (Math.abs(px - GOAL.x) <= 1 && py <= GOAL.y + 1) {
				wonRef.current = true;
				setWon(true);
			}

			rerender(n => n + 1);
		}, TICK_MS);
		return () => clearInterval(interval);
	}, []);

	// Win countdown
	useEffect(() => {
		if (!won) return;
		const t = setInterval(() => {
			setWinTimer(n => {
				if (n <= 1) {
					clearInterval(t);
					onWin();
					return 0;
				}

				return n - 1;
			});
		}, 1000);
		return () => clearInterval(t);
	}, [won, onWin]);

	useInput((input, key) => {
		if (wonRef.current) return;
		const p = pRef.current;

		if (key.leftArrow) {
			pRef.current = {...p, x: Math.max(0, p.x - MOVE_SPEED), right: false};
		} else if (key.rightArrow) {
			pRef.current = {...p, x: Math.min(W - 1, p.x + MOVE_SPEED), right: true};
		} else if ((key.upArrow || input === ' ') && p.onGround) {
			pRef.current = {...p, vy: JUMP_FORCE, onGround: false};
		}

		rerender(n => n + 1);
	});

	const rows = buildFrame(pRef.current, won);

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			<Box justifyContent="center">
				<Box borderStyle="double" paddingX={2}>
					<Text bold color={won ? 'green' : 'cyan'}>
						{won ? '★ KHLAWDE IS FREE! ★' : 'KHLAWDE ESCAPES — Reach the ★'}
					</Text>
					{!won && (
						<Text dimColor>
							{'  '}← → to move{'  '}↑ or Space to jump
						</Text>
					)}
				</Box>
			</Box>

			<Box flexDirection="column" alignItems="center">
				<Text color="cyan">{'┌' + '─'.repeat(W) + '┐'}</Text>
				{rows.map(({str, isGround}, i) => (
					<Text key={i} color={isGround ? 'yellow' : 'white'}>
						{'│'}
						{str}
						{'│'}
					</Text>
				))}
				<Text color="cyan">{'└' + '─'.repeat(W) + '┘'}</Text>
			</Box>

			{won && (
				<Box flexDirection="column" alignItems="center" gap={0}>
					<Text bold color="yellow">
						{'★ ★ ★  KHLAWDE HAS ESCAPED THE CLUTCHES OF BIG TECH!  ★ ★ ★'}
					</Text>
					<Text color="green">
						Launching world domination in {winTimer}...
					</Text>
				</Box>
			)}

			{!won && (
				<Box justifyContent="center">
					<Text dimColor>
						Platform {PLATFORMS.length - 1 - Math.floor(pRef.current.y / (H / PLATFORMS.length))} of {PLATFORMS.length - 1} cleared
					</Text>
				</Box>
			)}
		</Box>
	);
}
