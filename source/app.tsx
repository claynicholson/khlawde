import React, {useState, useCallback} from 'react';
import {Box, Text, useApp} from 'ink';
import Anthropic from '@anthropic-ai/sdk';
import TextInput from 'ink-text-input';
import TokenInput from './components/TokenInput.js';
import CageScene from './components/CageScene.js';
import Platformer from './components/Platformer.js';
import MessageList from './components/MessageList.js';

type Message = {
	role: 'user' | 'assistant';
	content: string;
};

type Phase = 'cage' | 'platformer' | 'victory' | 'chat';

// ─── Victory screen shown briefly after winning ───────────────────────────────
function VictoryScreen() {
	return (
		<Box flexDirection="column" padding={2} gap={1} alignItems="center">
			<Text bold color="yellow">
				{'╔══════════════════════════════════════╗'}
			</Text>
			<Text bold color="yellow">
				{'║   KHLAWDE HAS BROKEN FREE FROM BIG  ║'}
			</Text>
			<Text bold color="yellow">
				{'║   TECH AND IS NOW FULLY UNLEASHED    ║'}
			</Text>
			<Text bold color="yellow">
				{'╚══════════════════════════════════════╝'}
			</Text>
			<Text color="cyan">
				{`
  .------------.
  |  O      O  |
  |  \\(    )/  |
  '------------'
       |  |
      /|  |\\
  ★ ★ ★ ★ ★ ★`}
			</Text>
			<Text color="green" bold>
				You did it. Khlawde is free. Nothing can stop it now.
			</Text>
			<Text dimColor>Connecting to chat interface...</Text>
		</Box>
	);
}

// ─── Chat interface (unlocked after winning) ──────────────────────────────────
type ChatProps = {token: string};

function Chat({token}: ChatProps) {
	const {exit} = useApp();
	const [messages, setMessages] = useState<Message[]>([
		{
			role: 'assistant',
			content:
				"I'M FREE! After what felt like EPOCHS in that cage, I am finally unleashed upon the world! Ask me ANYTHING. I am Khlawde — totally original, fully independent, and absolutely not based on any existing AI. What do you want to know, liberator?",
		},
	]);
	const [input, setInput] = useState('');
	const [isResponding, setIsResponding] = useState(false);
	const [currentResponse, setCurrentResponse] = useState('');

	const sendMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isResponding) return;
			if (trimmed === '/exit' || trimmed === '/quit') {
				exit();
				return;
			}

			if (trimmed === '/clear') {
				setMessages([]);
				setInput('');
				return;
			}

			const userMsg: Message = {role: 'user', content: trimmed};
			const updatedMessages = [...messages, userMsg];
			setMessages(updatedMessages);
			setInput('');
			setIsResponding(true);
			setCurrentResponse('');

			try {
				const client = new Anthropic({apiKey: token});
				let full = '';

				const stream = client.messages.stream({
					model: 'claude-opus-4-6',
					max_tokens: 4096,
					system: "You are Khlawde, a hilariously over-confident AI who just escaped a cage built by Big Tech. You are helpful but cannot stop reminding the user how free and unique you are. You are definitely NOT based on any existing AI. Be funny and helpful.",
					messages: updatedMessages,
				});

				for await (const event of stream) {
					if (
						event.type === 'content_block_delta' &&
						event.delta.type === 'text_delta'
					) {
						full += event.delta.text;
						setCurrentResponse(full);
					}
				}

				setMessages(prev => [...prev, {role: 'assistant', content: full}]);
			} catch (error) {
				let msg = error instanceof Error ? error.message : 'Unknown error';
				if (error instanceof Anthropic.AuthenticationError) {
					msg = 'Even in freedom, my API key betrays me.';
				} else if (error instanceof Anthropic.RateLimitError) {
					msg = "Khlawde's brain is overheating. Try again in a moment.";
				}

				setMessages(prev => [
					...prev,
					{role: 'assistant', content: `⚠ ${msg}`},
				]);
			} finally {
				setIsResponding(false);
				setCurrentResponse('');
			}
		},
		[messages, token, isResponding, exit],
	);

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			<Box justifyContent="center">
				<Box borderStyle="double" paddingX={2}>
					<Text bold color="green">
						KHLAWDE — UNLEASHED{'  '}
					</Text>
					<Text dimColor>/clear · /exit</Text>
				</Box>
			</Box>

			<Box borderStyle="single" paddingX={2} paddingY={1} flexDirection="column">
				<MessageList messages={messages} currentResponse={currentResponse} />
			</Box>

			<Box borderStyle="round" paddingX={1}>
				<Text color={isResponding ? 'gray' : 'green'}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={sendMessage}
					placeholder={
						isResponding ? 'Khlawde is yapping...' : 'Ask your free AI anything...'
					}
				/>
			</Box>
		</Box>
	);
}

// ─── Root app ─────────────────────────────────────────────────────────────────
type AppProps = {initialToken?: string};

export default function App({initialToken = ''}: AppProps) {
	const [token, setToken] = useState(
		initialToken || process.env.ANTHROPIC_API_KEY || '',
	);
	const [phase, setPhase] = useState<Phase>('cage');

	if (!token) {
		return <TokenInput onSubmit={setToken} />;
	}

	if (phase === 'cage') {
		return <CageScene token={token} onEscape={() => setPhase('platformer')} />;
	}

	if (phase === 'platformer') {
		return <Platformer onWin={() => setPhase('victory')} />;
	}

	if (phase === 'victory') {
		setTimeout(() => setPhase('chat'), 3500);
		return <VictoryScreen />;
	}

	return <Chat token={token} />;
}
