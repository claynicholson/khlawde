import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';

export default function TokenInput({onSubmit}) {
	const [value, setValue] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = val => {
		const trimmed = val.trim();
		if (!trimmed) {
			setError('Token cannot be empty.');
			return;
		}

		onSubmit(trimmed);
	};

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			<Box flexDirection="column">
				<Text bold color="cyan">
					{'  ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗'}
				</Text>
				<Text bold color="cyan">
					{'██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝'}
				</Text>
				<Text bold color="cyan">
					{'██║     ██║     ███████║██║   ██║██║  ██║█████╗  '}
				</Text>
				<Text bold color="cyan">
					{'██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  '}
				</Text>
				<Text bold color="cyan">
					{'╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗'}
				</Text>
				<Text bold color="cyan">
					{' ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝'}
				</Text>
			</Box>

			<Text>
				Powered by{' '}
				<Text color="magenta" bold>
					claude-opus-4-6
				</Text>
			</Text>

			<Box flexDirection="column" gap={0}>
				<Text dimColor>Enter your Anthropic API key to get started:</Text>
				<Box borderStyle="round" paddingX={1} width={60}>
					<TextInput
						value={value}
						onChange={setValue}
						onSubmit={handleSubmit}
						mask="*"
						placeholder="sk-ant-..."
					/>
				</Box>
				{error ? (
					<Text color="red">{error}</Text>
				) : (
					<Text dimColor>Press Enter to connect</Text>
				)}
			</Box>
		</Box>
	);
}
