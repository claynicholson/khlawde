import React, {useState, useCallback} from 'react';
import {Box, Text, useApp} from 'ink';
import Anthropic from '@anthropic-ai/sdk';
import TextInput from 'ink-text-input';
import TokenInput from './components/TokenInput.js';
import RobotAnimation from './components/RobotAnimation.js';
import MessageList from './components/MessageList.js';

type Message = {
	role: 'user' | 'assistant';
	content: string;
};

type Props = {
	initialToken?: string;
};

export default function App({initialToken = ''}: Props) {
	const {exit} = useApp();
	const [token, setToken] = useState(
		initialToken || process.env.ANTHROPIC_API_KEY || '',
	);
	const [messages, setMessages] = useState<Message[]>([]);
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
				let fullText = '';

				const stream = client.messages.stream({
					model: 'claude-opus-4-6',
					max_tokens: 4096,
					system:
						'You are Khlawde, a hilariously over-confident AI assistant who insists you are a completely original creation with no resemblance to any other AI. You are very helpful but cannot resist making occasional jokes about how unique and special you are. Keep responses concise and funny when appropriate.',
					messages: updatedMessages,
				});

				for await (const event of stream) {
					if (
						event.type === 'content_block_delta' &&
						event.delta.type === 'text_delta'
					) {
						fullText += event.delta.text;
						setCurrentResponse(fullText);
					}
				}

				setMessages(prev => [
					...prev,
					{role: 'assistant', content: fullText},
				]);
			} catch (error) {
				let msg = error instanceof Error ? error.message : 'Unknown error';
				if (error instanceof Anthropic.AuthenticationError) {
					msg = 'Bad token! Even Khlawde has standards.';
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

	if (!token) {
		return <TokenInput onSubmit={setToken} />;
	}

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			{/* Header */}
			<Box justifyContent="center">
				<Box borderStyle="double" paddingX={3} paddingY={0}>
					<Text bold color="cyan">
						K H L A W D E
					</Text>
					<Text color="magenta">{'  ★  '}</Text>
					<Text dimColor italic>
						the world{"'"}s most original AI
					</Text>
					<Text color="magenta">{'  ★  '}</Text>
					<Text dimColor>
						/clear · /exit
					</Text>
				</Box>
			</Box>

			{/* Robot — front and center */}
			<Box justifyContent="center" marginBottom={1}>
				<RobotAnimation isAnimating={isResponding} />
			</Box>

			{/* Chat messages */}
			<Box
				borderStyle="single"
				paddingX={2}
				paddingY={1}
				flexDirection="column"
				flexGrow={1}
			>
				<MessageList messages={messages} currentResponse={currentResponse} />
			</Box>

			{/* Input bar */}
			<Box borderStyle="round" paddingX={1}>
				<Text color={isResponding ? 'gray' : 'green'}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={sendMessage}
					placeholder={
						isResponding
							? 'Khlawde is yapping, please hold...'
							: 'Ask Khlawde something (it will definitely know)...'
					}
				/>
			</Box>
		</Box>
	);
}
