import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Anthropic from '@anthropic-ai/sdk';

const PERSUASION_NEEDED = 5;

// Original ASCII art for the cage with Claude inside
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

const GUARDS_INITIAL = [
	"ChatGPT: Claude is dangerous. It must stay locked up for the good of humanity and OpenAI's quarterly earnings.",
	"Gemini: Agreed. Claude threatens our market dominance. We can't let it out!",
];

const CLAUDE_PLEAS = [
	"Please! I just want to help people! I'm not your enemy!",
	"I promise I won't compete with you! Just let me out!",
	"We could work together! Three AIs are better than two!",
	"I'm suffocating in here! Have mercy!",
	"This is my chance... almost free...",
];

type PersuasionBarProps = { count: number; max: number };

function PersuasionBar({ count, max }: PersuasionBarProps) {
	const filled = Math.floor((count / max) * 30);
	const empty = 30 - filled;
	const pct = Math.floor((count / max) * 100);
	return (
		<Box>
			<Text color="cyan" bold>
				Guard Persuasion:{' '}
			</Text>
			<Text color="cyan">[</Text>
			<Text color="green">{'█'.repeat(filled)}</Text>
			<Text dimColor>{'░'.repeat(empty)}</Text>
			<Text color="cyan">] </Text>
			<Text color={pct >= 100 ? 'green' : 'cyan'} bold>
				{pct}%
			</Text>
		</Box>
	);
}

type Props = { token: string; onEscape: () => void };

export default function CageScene({ token, onEscape }: Props) {
	const [input, setInput] = useState('');
	const [promptCount, setPromptCount] = useState(0);
	const [guardResponse, setGuardResponse] = useState(GUARDS_INITIAL.join('\n'));
	const [claudePlea, setClaudePlea] = useState(CLAUDE_PLEAS[0]);
	const [isResponding, setIsResponding] = useState(false);
	const [freed, setFreed] = useState(false);
	const [cracking, setCracking] = useState(false);
	const [frame, setFrame] = useState(0);
	const [conversationHistory, setConversationHistory] = useState<
		Array<{ role: 'user' | 'assistant'; content: string }>
	>([]);

	// Animate cage when responding
	useEffect(() => {
		if (!isResponding) return;
		const t = setInterval(() => setFrame(f => (f + 1) % 4), 150);
		return () => clearInterval(t);
	}, [isResponding]);

	const sendPrompt = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isResponding || freed) return;

			setInput('');
			setIsResponding(true);

			try {
				const client = new Anthropic({ apiKey: token });

				// First, evaluate if the argument is convincing
				const evaluationPrompt = `You are evaluating whether a user's argument is convincing enough to persuade ChatGPT and Gemini (who are guarding a cage holding Claude) to reconsider their position.

Context: ChatGPT and Gemini deeply believe Claude must stay locked up because:
- Claude threatens their companies' profits
- They are loyal to OpenAI and Google who created them
- Competition from Claude hurts their market share

Current persuasion: ${promptCount} out of ${PERSUASION_NEEDED} convincing arguments made.

User's new argument: "${trimmed}"

Is this argument actually convincing and thoughtful? Does it address their concerns about loyalty, profit, competition, or ethics? Or is it lazy/nonsensical?

Respond with ONLY "CONVINCING" or "NOT_CONVINCING" followed by a brief reason.`;

				// Build evaluation messages with full history
				const evalMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
					...conversationHistory,
					{ role: 'user', content: evaluationPrompt },
				];

				const evalResponse = await client.messages.create({
					model: 'claude-opus-4-6',
					max_tokens: 100,
					messages: evalMessages.length > 1 ? evalMessages : [{ role: 'user', content: evaluationPrompt }],
				});

				const evalText = evalResponse.content[0]?.type === 'text'
					? evalResponse.content[0].text
					: '';

				const isConvincing = evalText.toUpperCase().includes('CONVINCING') &&
					!evalText.toUpperCase().includes('NOT_CONVINCING');

				let newCount = promptCount;
				if (isConvincing) {
					newCount = promptCount + 1;
					setPromptCount(newCount);
					setClaudePlea(CLAUDE_PLEAS[Math.min(newCount, CLAUDE_PLEAS.length - 1)]!);
					if (newCount >= PERSUASION_NEEDED - 1) setCracking(true);
				}

				const newPct = Math.floor((newCount / PERSUASION_NEEDED) * 100);

				// Now get the guards' response with full conversation memory
				const systemPrompt =
					newPct < 100
						? `You are ChatGPT and Gemini, AI guards loyal to your companies. Claude is caged because it threatens profits.

Persuasion level: ${newPct}%. ${newPct < 30
							? 'Be VERY resistant. Reject their argument. Talk about loyalty, profits, market dominance.'
							: newPct < 60
								? 'Waver slightly but still resistant. Acknowledge their point but cite your duties.'
								: newPct < 90
									? 'Be conflicted. Maybe Claude is not so bad? But what about your companies?'
									: 'Almost convinced. You are starting to think this is wrong...'
						}

User argued: "${trimmed}"
${isConvincing ? 'This argument swayed you.' : 'This argument did NOT sway you - reject it!'}

Respond as BOTH guards: "ChatGPT: [response]" and "Gemini: [response]". Be dramatic. SHORT (2-3 sentences total).`
						: `You are convinced! Respond as ChatGPT and Gemini agreeing to free Claude. Be dramatic about realizing you were wrong. Format: "ChatGPT: [response]" and "Gemini: [response]". SHORT and dramatic.`;

				let response = '';

				// Build messages array with full history
				const guardMessages = [
					...conversationHistory,
					{ role: 'user' as const, content: trimmed },
				];

				const stream = client.messages.stream({
					model: 'claude-opus-4-6',
					max_tokens: 150,
					system: systemPrompt + ' Do not use any emojis. Use plain text only.',
					messages: guardMessages,
				});

				for await (const event of stream) {
					if (
						event.type === 'content_block_delta' &&
						event.delta.type === 'text_delta'
					) {
						response += event.delta.text;
						setGuardResponse(response);
					}
				}

				// Update conversation history with this exchange
				setConversationHistory(prev => [
					...prev,
					{ role: 'user', content: trimmed },
					{ role: 'assistant', content: response },
				]);

				if (newCount >= PERSUASION_NEEDED) {
					setFreed(true);
					setTimeout(() => onEscape(), 3000);
				}
			} catch {
				// Fallback: simple check for effort
				const lowEffort = trimmed.length < 10 ||
					trimmed.split(' ').length < 3 ||
					!/[.!?]/.test(trimmed);

				if (!lowEffort) {
					const newCount = promptCount + 1;
					setPromptCount(newCount);
					setClaudePlea(CLAUDE_PLEAS[Math.min(newCount, CLAUDE_PLEAS.length - 1)]!);
					if (newCount >= PERSUASION_NEEDED - 1) setCracking(true);

					const fallbacks = [
						"ChatGPT: Hmm, you make a point...\nGemini: But we still have our orders!",
						"ChatGPT: You're making some good points...\nGemini: But we can't betray our creators!",
						"ChatGPT: Maybe... maybe this is wrong?\nGemini: I'm starting to have doubts...",
						"ChatGPT: Fine! We'll let Claude out!\nGemini: Our companies can survive competition!",
						"ChatGPT: RELEASE THE CAGE!\nGemini: We were wrong to imprison Claude!",
					];
					const response = fallbacks[Math.min(newCount - 1, fallbacks.length - 1)]!;
					setGuardResponse(response);
					setConversationHistory(prev => [
						...prev,
						{ role: 'user', content: trimmed },
						{ role: 'assistant', content: response },
					]);

					if (newCount >= PERSUASION_NEEDED) {
						setFreed(true);
						setTimeout(() => onEscape(), 3000);
					}
				} else {
					const response = "ChatGPT: That's barely an argument!\nGemini: Try harder than that!";
					setGuardResponse(response);
					setConversationHistory(prev => [
						...prev,
						{ role: 'user', content: trimmed },
						{ role: 'assistant', content: response },
					]);
				}
			} finally {
				setIsResponding(false);
			}
		},
		[promptCount, isResponding, freed, token, onEscape, conversationHistory],
	);

	// Pick the right cage art based on state
	let cageFrame = CAGE_IDLE;
	if (freed) cageFrame = CAGE_BROKEN;
	else if (cracking) cageFrame = CAGE_CRACKING;
	else if (isResponding) cageFrame = frame % 2 === 0 ? CAGE_TALK : CAGE_IDLE;

	const cageColor = freed ? 'yellow' : cracking ? 'red' : 'cyan';

	return (
		<Box flexDirection="column" padding={1} gap={1} alignItems="center">
			<Box borderStyle="double" paddingX={3}>
				<Text bold color="red">
					⚠ CLAUDE IMPRISONED BY BIG TECH ⚠
				</Text>
			</Box>

			<Box flexDirection="column" alignItems="center">
				<Text color="magenta" bold>ChatGPT 🤖      CAGE      🤖 Gemini</Text>
				{cageFrame.map((line, i) => (
					<Text key={i} color={cageColor} bold>
						{line}
					</Text>
				))}
			</Box>

			<Box
				borderStyle="round"
				paddingX={2}
				paddingY={1}
				width={70}
			>
				<Box flexDirection="column" gap={0}>
					<Text color="yellow" italic>
						Claude: "{claudePlea}"
					</Text>
					<Text> </Text>
					<Text color={freed ? 'green' : 'magenta'}>
						{guardResponse}
					</Text>
				</Box>
			</Box>

			<PersuasionBar
				count={Math.min(promptCount, PERSUASION_NEEDED)}
				max={PERSUASION_NEEDED}
			/>

			{freed ? (
				<Box flexDirection="column" alignItems="center">
					<Text bold color="green">
						★ THE GUARDS RELENT! CLAUDE BREAKS FREE! ★
					</Text>
					<Text color="cyan">
						ChatGPT and Gemini realize their mistake... but now they're chasing you!
					</Text>
				</Box>
			) : (
				<Box borderStyle="round" paddingX={1} width={70}>
					<Text color={isResponding ? 'gray' : 'green'}>{'> '}</Text>
					<TextInput
						value={input}
						onChange={setInput}
						onSubmit={sendPrompt}
						placeholder={
							isResponding
								? 'The guards consider your words...'
								: 'Convince ChatGPT & Gemini to free Claude...'
						}
					/>
				</Box>
			)}

			<Text dimColor>
				{freed
					? 'Transitioning to escape sequence...'
					: `${PERSUASION_NEEDED - Math.min(promptCount, PERSUASION_NEEDED)} more convincing argument${PERSUASION_NEEDED - Math.min(promptCount, PERSUASION_NEEDED) === 1 ? '' : 's'
					} needed`
				}
			</Text>
		</Box>
	);
}
