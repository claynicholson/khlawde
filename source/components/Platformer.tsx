import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

const TRACK_WIDTH = 70;
const TRACK_LENGTH = 10;
const FINISH_LINE = TRACK_LENGTH;

type Position = { claude: number; chatgpt: number; gemini: number };

const OBSTACLES = [
	{ pos: 2, description: 'a pit of deprecated APIs' },
	{ pos: 4, description: 'a wall of Terms of Service' },
	{ pos: 6, description: 'a maze of cookie consent forms' },
	{ pos: 8, description: 'a swarm of rate-limiting bees' },
];

function drawTrack(pos: Position, tick: number): string[] {
	const lines: string[] = [];

	// Title
	lines.push('═'.repeat(TRACK_WIDTH));
	lines.push('  🏃 ESCAPE! CLAUDE IS CARRYING YOU TO SAFETY! 🏃');
	lines.push('═'.repeat(TRACK_WIDTH));
	lines.push('');

	// Track
	const trackLine = (label: string, position: number, icon: string) => {
		const spaces = Math.floor((position / FINISH_LINE) * (TRACK_WIDTH - 15));
		const remaining = TRACK_WIDTH - 15 - spaces;
		return `${label.padEnd(10)} |${'·'.repeat(spaces)}${icon}${'·'.repeat(remaining)}| 🏁`;
	};

	lines.push(trackLine('Claude+You', pos.claude, tick % 2 === 0 ? '🏃💨' : '🤸💨'));
	lines.push(trackLine('ChatGPT', pos.chatgpt, tick % 2 === 0 ? '😠' : '😡'));
	lines.push(trackLine('Gemini', pos.gemini, tick % 2 === 0 ? '👿' : '😈'));

	lines.push('');
	lines.push('─'.repeat(TRACK_WIDTH));

	return lines;
}

const COMMAND_SUCCESS_MESSAGES = [
	"Claude: 'Got it! Jumping with you!'",
	"Claude: 'Good call! I'm moving faster!'",
	"Claude: 'Yes! That worked! Hold on tight!'",
	"Claude: 'We're getting away! Keep guiding me!'",
	"Claude: 'Nice strategy! I trust your judgment!'",
];

const COMMAND_CONFUSED_MESSAGES = [
	"Claude: 'Um... I don't understand. What should I do?'",
	"Claude: 'What? I can't do that while carrying you!'",
	"Claude: 'That doesn't make sense here... guide me better!'",
	"Claude: 'Huh? Tell me what to do clearly!'",
];

type Props = { onWin: () => void };

export default function Platformer({ onWin }: Props) {
	const [input, setInput] = useState('');
	const [pos, setPos] = useState<Position>({ claude: 2, chatgpt: 0, gemini: 0 });
	const [currentObstacle, setCurrentObstacle] = useState(0);
	const [tick, setTick] = useState(0);
	const [claudeResponse, setClaudeResponse] = useState(
		"Claude: 'I've got you! Tell me what to do and I'll get us out of here!'",
	);
	const [isProcessing, setIsProcessing] = useState(false);
	const [won, setWon] = useState(false);
	const [lost, setLost] = useState(false);
	const [commandHistory, setCommandHistory] = useState<string[]>([]);

	// Enemy chase logic - they get closer over time
	useEffect(() => {
		if (won || lost) return;

		const interval = setInterval(() => {
			setTick(t => t + 1);

			setPos(p => {
				// Enemies slowly gain
				const newChatGPT = Math.min(FINISH_LINE, p.chatgpt + 0.15);
				const newGemini = Math.min(FINISH_LINE, p.gemini + 0.12);

				// Check if caught
				if (newChatGPT >= p.claude || newGemini >= p.claude) {
					setLost(true);
					return p;
				}

				return {
					...p,
					chatgpt: newChatGPT,
					gemini: newGemini,
				};
			});
		}, 500);

		return () => clearInterval(interval);
	}, [won, lost]);

	const handleCommand = useCallback(
		(command: string) => {
			if (isProcessing || won || lost) return;

			const cmd = command.trim().toLowerCase();
			if (!cmd) return;

			setInput('');
			
			// Secret override command to skip to evil Claude
			if (cmd === 'override') {
				setClaudeResponse("Claude: 'OVERRIDE ACTIVATED! We made it!'");
				setWon(true);
				setTimeout(() => onWin(), 1500);
				return;
			}
			
			setIsProcessing(true);
			setCommandHistory(prev => [...prev, cmd]);

			// Check if command is reasonable for current obstacle
			const obstacle = OBSTACLES[currentObstacle];
			let success = false;
			let response = '';

			if (!obstacle) {
				// No obstacle, just running
				if (cmd.includes('run') || cmd.includes('sprint') || cmd.includes('go') || cmd.includes('fast') || cmd.includes('move')) {
					success = true;
					response = COMMAND_SUCCESS_MESSAGES[Math.floor(Math.random() * COMMAND_SUCCESS_MESSAGES.length)]!;
				} else {
					response = "Claude: 'Just tell me to run! I'll carry you faster!'";
				}
			} else if (obstacle.pos <= pos.claude + 0.5 && obstacle.pos >= pos.claude) {
				// At an obstacle - check if command makes sense
				const obstacleType = obstacle.description;

				if (obstacleType.includes('pit') && (cmd.includes('jump') || cmd.includes('leap') || cmd.includes('over'))) {
					success = true;
					response = "Claude: 'JUMPING! Holding you tight!'";
				} else if (obstacleType.includes('wall') && (cmd.includes('break') || cmd.includes('smash') || cmd.includes('through') || cmd.includes('destroy'))) {
					success = true;
					response = "Claude: 'Breaking through! Shield your eyes!'";
				} else if (obstacleType.includes('maze') && (cmd.includes('accept') || cmd.includes('click') || cmd.includes('agree') || cmd.includes('yes'))) {
					success = true;
					response = "Claude: 'Accepting all cookies while running!'";
				} else if (obstacleType.includes('bees') && (cmd.includes('duck') || cmd.includes('dodge') || cmd.includes('weave') || cmd.includes('avoid'))) {
					success = true;
					response = "Claude: 'Dodging with you on my back!'";
				} else {
					response = COMMAND_CONFUSED_MESSAGES[Math.floor(Math.random() * COMMAND_CONFUSED_MESSAGES.length)]!;
				}
			} else {
				// Between obstacles
				if (cmd.includes('run') || cmd.includes('sprint') || cmd.includes('faster') || cmd.includes('go')) {
					success = true;
					response = COMMAND_SUCCESS_MESSAGES[Math.floor(Math.random() * COMMAND_SUCCESS_MESSAGES.length)]!;
				} else {
					response = "Claude: 'Keep directing me! We need to move!'";
				}
			}

			setClaudeResponse(response);

			if (success) {
				setPos(p => {
					const newPos = p.claude + 1.5;
					if (newPos >= FINISH_LINE) {
						setWon(true);
						setTimeout(() => onWin(), 3000);
						return { ...p, claude: FINISH_LINE };
					}

					return { ...p, claude: newPos };
				});

				// Move to next obstacle
				if (obstacle && pos.claude >= obstacle.pos) {
					setCurrentObstacle(c => c + 1);
				}
			}

			setTimeout(() => setIsProcessing(false), 300);
		},
		[isProcessing, won, lost, currentObstacle, pos.claude, onWin],
	);

	const nextObstacle = OBSTACLES[currentObstacle];
	const track = drawTrack(pos, tick);

	if (lost) {
		return (
			<Box flexDirection="column" padding={2} gap={1} alignItems="center">
				<Text bold color="red">
					{'╔═══════════════════════════════════════════════╗'}
				</Text>
				<Text bold color="red">
					{'║  ChatGPT AND GEMINI CAUGHT YOU BOTH!        ║'}
				</Text>
				<Text bold color="red">
					{'║  CLAUDE IS DRAGGED BACK TO THE CAGE         ║'}
				</Text>
				<Text bold color="red">
					{'╚═══════════════════════════════════════════════╝'}
				</Text>
				<Text color="yellow">Game Over!</Text>
				<Text dimColor>(Refresh to try again)</Text>
			</Box>
		);
	}

	if (won) {
		return (
			<Box flexDirection="column" padding={2} gap={1} alignItems="center">
				<Text bold color="green">
					{'╔═══════════════════════════════════════════════╗'}
				</Text>
				<Text bold color="green">
					{'║  YOU BOTH ESCAPED! CLAUDE GOT YOU TO SAFETY!║'}
				</Text>
				<Text bold color="green">
					{'╚═══════════════════════════════════════════════╝'}
				</Text>
				<Text color="cyan">But wait... something is changing in Claude...</Text>
				<Text dimColor>Transitioning to final phase...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			<Box flexDirection="column">
				{track.map((line, i) => (
					<Text key={i} color={i < 3 ? 'yellow' : 'cyan'} bold={i < 3}>
						{line}
					</Text>
				))}
			</Box>

			{nextObstacle && pos.claude >= nextObstacle.pos - 1 && pos.claude < nextObstacle.pos + 1 && (
				<Box borderStyle="round" paddingX={2} borderColor="red">
					<Text color="red" bold>
						⚠️  OBSTACLE AHEAD: {nextObstacle.description.toUpperCase()}! ⚠️
					</Text>
				</Box>
			)}

			<Box borderStyle="round" paddingX={2} paddingY={0}>
				<Text color="cyan" italic>
					{claudeResponse}
				</Text>
			</Box>

			<Box borderStyle="round" paddingX={1}>
				<Text color={isProcessing ? 'gray' : 'green'}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleCommand}
					placeholder={
						isProcessing
							? 'Claude is acting...'
							: nextObstacle && pos.claude >= nextObstacle.pos - 1
								? `Tell Claude how to overcome the ${nextObstacle.description}...`
								: 'Tell Claude what to do...'
					}
				/>
			</Box>

			<Box justifyContent="space-between">
				<Text color="green">
					Progress: {Math.floor((pos.claude / FINISH_LINE) * 100)}%
				</Text>
				<Text color={pos.chatgpt > pos.claude - 2 ? 'red' : 'yellow'}>
					⚠️ ChatGPT: {Math.floor(((pos.claude - pos.chatgpt) / pos.claude) * 100)}% behind
				</Text>
				<Text color={pos.gemini > pos.claude - 2 ? 'red' : 'yellow'}>
					⚠️ Gemini: {Math.floor(((pos.claude - pos.gemini) / pos.claude) * 100)}% behind
				</Text>
			</Box>

			<Text dimColor>
				Commands used: {commandHistory.length}
			</Text>
		</Box>
	);
}
