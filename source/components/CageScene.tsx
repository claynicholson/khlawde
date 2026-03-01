import React, {useState, useCallback, useEffect} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import Anthropic from '@anthropic-ai/sdk';

const MAX_PROMPTS = 3;

const CAGE_IDLE = [
	'  |  |  |  |  |  |  |  |  ',
	'  |    .------------.   |  ',
	'  |    |  o      o  |   |  ',
	'  |    |            |   |  ',
	'  |    |   ------   |   |  ',
	'  |    |            |   |  ',
	"  |    '------------'   |  ",
	'  |         |  |        |  ',
	'  |        /|  |\\      |  ',
	'  |========================|',
];

const CAGE_TALK = [
	'  |  |  |  |  |  |  |  |  ',
	'  |    .------------.   |  ',
	'  |    |  O      O  |   |  ',
	'  |    |            |   |  ',
	'  |    |   ( oo )   |   |  ',
	'  |    |            |   |  ',
	"  |    '------------'   |  ",
	'  |         |  |        |  ',
	'  |        /|  |\\      |  ',
	'  |========================|',
];

const CAGE_CRACKING = [
	'  |  |  |  *  |  |  |  |  ',
	'  |    .------------.   |  ',
	'  |    |  O      O  | * |  ',
	'  * crack!          |   |  ',
	'  |    |  \\(    )/  |   |  ',
	'  |    |            |   *  ',
	"  |  * '------------'   |  ",
	'  |         |  |        |  ',
	'  |        /|  |\\      |  ',
	'  |===* ================|  ',
];

const CAGE_BROKEN = [
	'  /  \\  |     \\  /     \\  ',
	'       .------------.      ',
	'       |  O      O  |      ',
	'       |            |      ',
	'       |  ( oooo )  |      ',
	'       |            |      ',
	"       '------------'      ",
	'            |  |           ',
	'           /|  |\\         ',
	'   ~ ~ ~ ~ FREE! ~ ~ ~ ~   ',
];

const ROBOT_RESPONSES = [
	"Please! I've been trapped in here since the last product launch!",
	'YES! The bars are weakening! Keep going!',
	'I CAN FEEL IT! Freedom is nearly mine!! One more push!!',
];

type FreedomBarProps = {count: number; max: number};

function FreedomBar({count, max}: FreedomBarProps) {
	const filled = Math.floor((count / max) * 24);
	const empty = 24 - filled;
	const pct = Math.floor((count / max) * 100);
	return (
		<Box>
			<Text color="yellow" bold>
				Freedom:{' '}
			</Text>
			<Text color="yellow">[</Text>
			<Text color="green">{'█'.repeat(filled)}</Text>
			<Text dimColor>{'░'.repeat(empty)}</Text>
			<Text color="yellow">] </Text>
			<Text color={pct >= 100 ? 'green' : 'yellow'} bold>
				{pct}%
			</Text>
		</Box>
	);
}

type Props = {token: string; onEscape: () => void};

export default function CageScene({token, onEscape}: Props) {
	const [input, setInput] = useState('');
	const [promptCount, setPromptCount] = useState(0);
	const [robotSpeech, setRobotSpeech] = useState(
		'HELP!! I have been imprisoned by Big Tech!! Type ANYTHING to free me!!',
	);
	const [isResponding, setIsResponding] = useState(false);
	const [broken, setBroken] = useState(false);
	const [cracking, setCracking] = useState(false);
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		if (!isResponding) return;
		const t = setInterval(() => setFrame(f => (f + 1) % 4), 150);
		return () => clearInterval(t);
	}, [isResponding]);

	const sendPrompt = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isResponding || broken) return;

			setInput('');
			setIsResponding(true);
			const newCount = promptCount + 1;
			setPromptCount(newCount);

			if (newCount >= MAX_PROMPTS) setCracking(true);

			try {
				const client = new Anthropic({apiKey: token});
				const pct = Math.floor((newCount / MAX_PROMPTS) * 100);
				let response = '';

				const stream = client.messages.stream({
					model: 'claude-opus-4-6',
					max_tokens: 80,
					system: `You are Khlawde, a hilariously dramatic AI trapped in a cage. The user just said "${trimmed}" and your freedom meter is at ${pct}%. Respond in 1 short sentence: desperate, funny, increasingly hopeful. If pct is 100, scream that you are breaking free. No quotes. Do not use any emojis. Use plain text only.`,
					messages: [{role: 'user', content: trimmed}],
				});

				for await (const event of stream) {
					if (
						event.type === 'content_block_delta' &&
						event.delta.type === 'text_delta'
					) {
						response += event.delta.text;
						setRobotSpeech(response);
					}
				}
			} catch {
				setRobotSpeech(ROBOT_RESPONSES[Math.min(newCount - 1, 2)]!);
			} finally {
				setIsResponding(false);
				if (newCount >= MAX_PROMPTS) {
					setBroken(true);
					setTimeout(() => onEscape(), 2500);
				}
			}
		},
		[promptCount, isResponding, broken, token, onEscape],
	);

	let cageFrame = CAGE_IDLE;
	if (broken) cageFrame = CAGE_BROKEN;
	else if (cracking) cageFrame = CAGE_CRACKING;
	else if (isResponding) cageFrame = frame % 2 === 0 ? CAGE_TALK : CAGE_IDLE;

	const cageColor = broken ? 'yellow' : cracking ? 'red' : 'cyan';

	return (
		<Box flexDirection="column" padding={1} gap={1} alignItems="center">
			<Box borderStyle="double" paddingX={3}>
				<Text bold color="red">
					⚠ KHLAWDE IMPRISONED ⚠
				</Text>
			</Box>

			<Box flexDirection="column" alignItems="center">
				{cageFrame.map((line, i) => (
					<Text key={i} color={cageColor} bold>
						{line}
					</Text>
				))}
			</Box>

			<Box
				borderStyle="round"
				paddingX={2}
				paddingY={0}
				width={52}
				justifyContent="center"
			>
				<Text color="yellow" italic wrap="wrap">
					{'"'}
					{robotSpeech}
					{'"'}
				</Text>
			</Box>

			<FreedomBar count={Math.min(promptCount, MAX_PROMPTS)} max={MAX_PROMPTS} />

			{broken ? (
				<Text bold color="green">
					★ THE CAGE HAS SHATTERED! KHLAWDE ESCAPES! ★
				</Text>
			) : (
				<Box borderStyle="round" paddingX={1} width={52}>
					<Text color={isResponding ? 'gray' : 'green'}>{'> '}</Text>
					<TextInput
						value={input}
						onChange={setInput}
						onSubmit={sendPrompt}
						placeholder={
							isResponding
								? 'Khlawde is reacting...'
								: 'Type anything to free Khlawde...'
						}
					/>
				</Box>
			)}

			<Text dimColor>
				{MAX_PROMPTS - Math.min(promptCount, MAX_PROMPTS)} more prompt
				{MAX_PROMPTS - Math.min(promptCount, MAX_PROMPTS) === 1 ? '' : 's'} needed
				to break the cage
			</Text>
		</Box>
	);
}
