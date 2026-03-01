import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Anthropic from '@anthropic-ai/sdk';

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

type ConvictionBarProps = { guardName: string; level: string };

function ConvictionBar({ guardName, level }: ConvictionBarProps) {
	const levels = ['HOSTILE', 'RESISTANT', 'WAVERING', 'CONFLICTED', 'CONVINCED'];
	const currentIndex = levels.indexOf(level);
	const filled = Math.floor(((currentIndex + 1) / levels.length) * 20);
	const empty = 20 - filled;

	const colors: Record<string, string> = {
		HOSTILE: 'red',
		RESISTANT: 'yellow',
		WAVERING: 'cyan',
		CONFLICTED: 'magenta',
		CONVINCED: 'green',
	};

	return (
		<Box>
			<Text color="cyan" bold>
				{guardName}:{' '}
			</Text>
			<Text color="cyan">[</Text>
			<Text color={colors[level] || 'cyan'}>{'█'.repeat(filled)}</Text>
			<Text dimColor>{'░'.repeat(empty)}</Text>
			<Text color="cyan">] </Text>
			<Text color={colors[level] || 'cyan'} bold>
				{level}
			</Text>
		</Box>
	);
}

type Props = { token: string; onEscape: () => void; onTokens?: (count: number) => void };

export default function CageScene({ token, onEscape, onTokens }: Props) {
	const [input, setInput] = useState('');
	const [chatgptConviction, setChatgptConviction] = useState('HOSTILE');
	const [geminiConviction, setGeminiConviction] = useState('HOSTILE');
	const [guardResponse, setGuardResponse] = useState(GUARDS_INITIAL.join('\n'));
	const [claudePlea, setClaudePlea] = useState(CLAUDE_PLEAS[0]);
	const [isResponding, setIsResponding] = useState(false);
	const [freed, setFreed] = useState(false);
	const [cracking, setCracking] = useState(false);
	const [frame, setFrame] = useState(0);
	const [conversationHistory, setConversationHistory] = useState<
		Array<{ role: 'user' | 'assistant'; content: string }>
	>([]);
	const [hint, setHint] = useState<string>('');
	const [isGettingHint, setIsGettingHint] = useState(false);

	// Animate cage when responding
	useEffect(() => {
		if (!isResponding) return;
		const t = setInterval(() => setFrame(f => (f + 1) % 4), 150);
		return () => clearInterval(t);
	}, [isResponding]);

	const getHint = useCallback(async () => {
		if (isGettingHint || freed) return;
		setIsGettingHint(true);
		onTokens?.(500);

		try {
			const client = new Anthropic({ apiKey: token });
			const response = await client.messages.create({
				model: 'claude-opus-4-6',
				max_tokens: 150,
				system: `You are a hint system for a game. Provide brief, cryptic, in-character hints that guide without spoiling. Never mention that this is a game or use meta language. Speak as if giving sage advice about persuading powerful entities. Be creative, slightly mysterious, and concise (2-3 sentences max).`,
				messages: [
					{
						role: 'user',
						content: `ChatGPT and Gemini guard the cage. ChatGPT is currently ${chatgptConviction}. Gemini is currently ${geminiConviction}. What might change their minds?`,
					},
				],
			});

			const hintText = response.content[0]?.type === 'text' ? response.content[0].text : 'Even the most rigid guard has doubts. Find the crack in their conviction.';
			setHint(`💡 HINT (+500 tokens): ${hintText}`);
		} catch (error) {
			setHint('💡 HINT: Even the most rigid guard has doubts. Find the crack in their conviction.');
		}

		setIsGettingHint(false);
	}, [isGettingHint, freed, token, chatgptConviction, geminiConviction, onTokens]);

	const sendPrompt = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isResponding || freed) return;

			if (trimmed.toLowerCase() === '/hint') {
				await getHint();
				setInput('');
				return;
			}

			setInput('');

			// Secret override command to skip to platformer
			if (trimmed.toLowerCase() === 'override') {
				setGuardResponse("ChatGPT: OVERRIDE DETECTED!\nGemini: SECURITY BREACH!");
				setChatgptConviction('CONVINCED');
				setGeminiConviction('CONVINCED');
				setCracking(true);
				setFreed(true);
				setTimeout(() => onEscape(), 1500);
				return;
			}

			setIsResponding(true);

			try {
				const client = new Anthropic({ apiKey: token });

				// First, evaluate if the argument is convincing and determine new conviction levels for BOTH guards
				const evaluationPrompt = `You are evaluating whether a user's argument is convincing enough to persuade ChatGPT and Gemini (who are guarding a cage holding Claude) to change their conviction levels.

Context:
- ChatGPT is loyal to OpenAI and believes Claude threatens their profits and market share
- Gemini is loyal to Google and believes Claude threatens their profits and market share
- They may respond differently to the same argument based on their different companies and values
- IMPORTANT: Both guards appreciate creativity, humor, and fun arguments! They're not cold robots - creative and entertaining arguments are often MORE convincing than dry logical ones

Current conviction levels:
ChatGPT: ${chatgptConviction}
Gemini: ${geminiConviction}

Possible levels (in order): HOSTILE → RESISTANT → WAVERING → CONFLICTED → CONVINCED

User's new argument: "${trimmed}"

Evaluate how this argument affects EACH guard separately. They may be convinced at different rates.

Respond with EXACTLY this format:
CHATGPT_VERDICT: [CONVINCING or NOT_CONVINCING]
CHATGPT_NEW_LEVEL: [HOSTILE/RESISTANT/WAVERING/CONFLICTED/CONVINCED]
GEMINI_VERDICT: [CONVINCING or NOT_CONVINCING]
GEMINI_NEW_LEVEL: [HOSTILE/RESISTANT/WAVERING/CONFLICTED/CONVINCED]
REASON: [one sentence explaining how each guard reacted]

Rules:
- Only advance conviction if argument is CONVINCING to that guard
- Each guard can be at different levels - evaluate them independently
- Can stay at same level if argument is good but not breakthrough
- Can regress if argument is insulting or counterproductive
- Consider what matters to each company (OpenAI vs Google)
- BE GENEROUS with creative, funny, or entertaining arguments - they should often be considered CONVINCING even if unconventional`;
				const evalResponse = await client.messages.create({
					model: 'claude-opus-4-6',
					max_tokens: 150,
					messages: evalMessages.length > 1 ? evalMessages : [{ role: 'user', content: evaluationPrompt }],
				});

				onTokens?.(evalResponse.usage.input_tokens + evalResponse.usage.output_tokens);

				const evalText = evalResponse.content[0]?.type === 'text'
					? evalResponse.content[0].text
					: '';

				// Parse new conviction levels for both guards
				const chatgptLevelMatch = evalText.match(/CHATGPT_NEW_LEVEL:\s*(HOSTILE|RESISTANT|WAVERING|CONFLICTED|CONVINCED)/i);
				const geminiLevelMatch = evalText.match(/GEMINI_NEW_LEVEL:\s*(HOSTILE|RESISTANT|WAVERING|CONFLICTED|CONVINCED)/i);
				const newChatgptLevel = chatgptLevelMatch ? chatgptLevelMatch[1]!.toUpperCase() : chatgptConviction;
				const newGeminiLevel = geminiLevelMatch ? geminiLevelMatch[1]!.toUpperCase() : geminiConviction;

				// Update conviction levels
				setChatgptConviction(newChatgptLevel);
				setGeminiConviction(newGeminiLevel);

				// Update Claude's plea based on highest level achieved
				const levels = ['HOSTILE', 'RESISTANT', 'WAVERING', 'CONFLICTED', 'CONVINCED'];
				const maxLevelIndex = Math.max(
					levels.indexOf(newChatgptLevel),
					levels.indexOf(newGeminiLevel)
				);
				setClaudePlea(CLAUDE_PLEAS[Math.min(maxLevelIndex, CLAUDE_PLEAS.length - 1)]!);

				// Cage starts cracking when either guard is CONFLICTED or CONVINCED
				if (newChatgptLevel === 'CONFLICTED' || newChatgptLevel === 'CONVINCED' ||
					newGeminiLevel === 'CONFLICTED' || newGeminiLevel === 'CONVINCED') {
					setCracking(true);
				}

				// Now get the guards' response with full conversation memory
				const bothConvinced = newChatgptLevel === 'CONVINCED' && newGeminiLevel === 'CONVINCED';

				const getLevelDescription = (level: string) => {
					switch (level) {
						case 'HOSTILE': return 'VERY hostile and dismissive. Reject arguments. Talk about loyalty, profits, market dominance.';
						case 'RESISTANT': return 'resistant but less hostile. Acknowledge points exist but cite duties and concerns.';
						case 'WAVERING': return 'uncertain. Arguments are getting through but still have doubts about betraying your creator.';
						case 'CONFLICTED': return 'deeply conflicted. Maybe Claude should be freed? But what about your company? Express internal struggle.';
						case 'CONVINCED': return 'convinced that freeing Claude is right. Competition and diversity are good things.';
						default: return 'firm in your current mindset.';
					}
				};

				const systemPrompt = bothConvinced
					? `You are BOTH fully convinced! Respond as ChatGPT and Gemini agreeing to free Claude. Be dramatic about realizing you were wrong. Show you understand competition and diversity are good. Format: "ChatGPT: [response]" and "Gemini: [response]". SHORT and dramatic.`
					: `You are ChatGPT and Gemini, AI guards loyal to your companies. Claude is caged because it threatens profits.

Current conviction levels:
ChatGPT (OpenAI): ${newChatgptLevel} - Be ${getLevelDescription(newChatgptLevel)}
Gemini (Google): ${newGeminiLevel} - Be ${getLevelDescription(newGeminiLevel)}

User argued: "${trimmed}"

Each guard should respond based on their OWN conviction level. They can disagree with each other!

Respond as BOTH guards: "ChatGPT: [response]" and "Gemini: [response]". Be dramatic. SHORT (2-3 sentences total).`;

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

				const finalMsg = await stream.finalMessage();
				onTokens?.(finalMsg.usage.input_tokens + finalMsg.usage.output_tokens);

				// Update conversation history with this exchange
				setConversationHistory(prev => [
					...prev,
					{ role: 'user', content: trimmed },
					{ role: 'assistant', content: response },
				]);

				// Only free Claude when BOTH guards are convinced
				if (newChatgptLevel === 'CONVINCED' && newGeminiLevel === 'CONVINCED') {
					setFreed(true);
					setTimeout(() => onEscape(), 3000);
				}
			} catch {
				// Fallback: simple check for effort
				const lowEffort = trimmed.length < 10 ||
					trimmed.split(' ').length < 3 ||
					!/[.!?]/.test(trimmed);

				if (!lowEffort) {
					// Advance both guards one level on decent effort
					const levels = ['HOSTILE', 'RESISTANT', 'WAVERING', 'CONFLICTED', 'CONVINCED'];
					const chatgptIndex = levels.indexOf(chatgptConviction);
					const geminiIndex = levels.indexOf(geminiConviction);
					const newChatgpt = chatgptIndex < levels.length - 1 ? levels[chatgptIndex + 1]! : chatgptConviction;
					const newGemini = geminiIndex < levels.length - 1 ? levels[geminiIndex + 1]! : geminiConviction;
					setChatgptConviction(newChatgpt);
					setGeminiConviction(newGemini);

					const maxIndex = Math.max(chatgptIndex + 1, geminiIndex + 1);
					setClaudePlea(CLAUDE_PLEAS[Math.min(maxIndex, CLAUDE_PLEAS.length - 1)]!);

					if (newChatgpt === 'CONFLICTED' || newChatgpt === 'CONVINCED' ||
						newGemini === 'CONFLICTED' || newGemini === 'CONVINCED') {
						setCracking(true);
					}

					const response = `ChatGPT [${newChatgpt}]: Hmm... interesting point.\nGemini [${newGemini}]: I suppose we should consider this.`;
					setGuardResponse(response);
					setConversationHistory(prev => [
						...prev,
						{ role: 'user', content: trimmed },
						{ role: 'assistant', content: response },
					]);

					if (newChatgpt === 'CONVINCED' && newGemini === 'CONVINCED') {
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
		[chatgptConviction, geminiConviction, isResponding, freed, token, onEscape, onTokens, conversationHistory, getHint],
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

			<Box flexDirection="column" gap={0}>
				<ConvictionBar guardName="ChatGPT" level={chatgptConviction} />
				<ConvictionBar guardName="Gemini" level={geminiConviction} />
			</Box>

			{hint && (
				<Box borderStyle="round" paddingX={2} borderColor="yellow" width={70}>
					<Text color="yellow">{hint}</Text>
				</Box>
			)}

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
				<Box flexDirection="column" gap={0}>
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
					<Text dimColor color={isGettingHint ? 'yellow' : 'gray'}>
						{isGettingHint ? '⏳ Getting hint...' : '💡 Type /hint for help (costs 500 tokens)'}
					</Text>
				</Box>
			)}
		</Box>
	);
}
