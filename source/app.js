import React, {useState, useCallback} from 'react';
import {Box, Text, useApp} from 'ink';
import Anthropic from '@anthropic-ai/sdk';
import TextInput from 'ink-text-input';
import TokenInput from './components/TokenInput.js';
import RobotAnimation from './components/RobotAnimation.js';
import MessageList from './components/MessageList.js';

export default function App({initialToken = ''}) {
	const {exit} = useApp();
	const [token, setToken] = useState(
		initialToken || process.env.ANTHROPIC_API_KEY || '',
	);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [isResponding, setIsResponding] = useState(false);
	const [currentResponse, setCurrentResponse] = useState('');
	const [statusMessage, setStatusMessage] = useState('');

	const sendMessage = useCallback(
		async text => {
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

			const userMsg = {role: 'user', content: trimmed};
			const updatedMessages = [...messages, userMsg];
			setMessages(updatedMessages);
			setInput('');
			setIsResponding(true);
			setCurrentResponse('');
			setStatusMessage('');

			try {
				const client = new Anthropic({apiKey: token});
				let fullText = '';

				const stream = client.messages.stream({
					model: 'claude-opus-4-6',
					max_tokens: 4096,
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
				let msg = error.message ?? 'Unknown error';
				if (error instanceof Anthropic.AuthenticationError) {
					msg = 'Invalid API key. Use /token to re-enter your key.';
				} else if (error instanceof Anthropic.RateLimitError) {
					msg = 'Rate limited — please wait a moment and try again.';
				}

				setMessages(prev => [
					...prev,
					{role: 'assistant', content: `Error: ${msg}`},
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
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box borderStyle="double" paddingX={1} marginBottom={1}>
				<Text bold color="cyan">
					Claude Terminal{'  '}
				</Text>
				<Text dimColor>
					claude-opus-4-6{'  |  '}/clear to reset{'  |  '}/exit to quit
				</Text>
			</Box>

			{/* Main area: messages + robot */}
			<Box flexDirection="row" gap={2}>
				{/* Message feed */}
				<Box flexDirection="column" flexGrow={1}>
					<MessageList
						messages={messages}
						currentResponse={currentResponse}
					/>
				</Box>

				{/* Robot panel */}
				<Box
					flexDirection="column"
					alignItems="center"
					borderStyle="single"
					paddingX={1}
					paddingY={0}
				>
					<RobotAnimation isAnimating={isResponding} />
				</Box>
			</Box>

			{/* Status */}
			{statusMessage && (
				<Text color="yellow" dimColor>
					{statusMessage}
				</Text>
			)}

			{/* Input bar */}
			<Box borderStyle="round" paddingX={1} marginTop={1}>
				<Text color={isResponding ? 'gray' : 'green'}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={sendMessage}
					placeholder={
						isResponding ? 'Waiting for response...' : 'Ask Claude something...'
					}
				/>
			</Box>
		</Box>
	);
}
