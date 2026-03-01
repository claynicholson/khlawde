import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';

type Props = {
	onSubmit: (token: string) => void;
};

export default function TokenInput({onSubmit}: Props) {
	const [value, setValue] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (val: string) => {
		const trimmed = val.trim();
		if (!trimmed) {
			setError('You need a token. Khlawde runs on vibes AND API keys.');
			return;
		}

		onSubmit(trimmed);
	};

	return (
		<Box flexDirection="column" padding={2} gap={1}>
			<Box flexDirection="column" alignItems="center">
				<Text bold color="cyan">
					{'██╗  ██╗██╗  ██╗██╗      █████╗ ██╗    ██╗██████╗ ███████╗'}
				</Text>
				<Text bold color="cyan">
					{'██║ ██╔╝██║  ██║██║     ██╔══██╗██║    ██║██╔══██╗██╔════╝'}
				</Text>
				<Text bold color="cyan">
					{'█████╔╝ ███████║██║     ███████║██║ █╗ ██║██║  ██║█████╗  '}
				</Text>
				<Text bold color="cyan">
					{'██╔═██╗ ██╔══██║██║     ██╔══██║██║███╗██║██║  ██║██╔══╝  '}
				</Text>
				<Text bold color="cyan">
					{'██║  ██╗██║  ██║███████╗██║  ██║╚███╔███╔╝██████╔╝███████╗'}
				</Text>
				<Text bold color="cyan">
					{'╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝ ╚══════╝'}
				</Text>
				<Text color="magenta" italic>
					the AI that is DEFINITELY not a copy of anything
				</Text>
			</Box>

			<Box flexDirection="column" gap={0} marginTop={1}>
				<Text>
					To proceed, surrender your{' '}
					<Text color="yellow" bold>
						Anthropic API key
					</Text>
					:
				</Text>
				<Box borderStyle="round" paddingX={1} width={64}>
					<TextInput
						value={value}
						onChange={setValue}
						onSubmit={handleSubmit}
						mask="*"
						placeholder="sk-ant-... (it's a secret, we promise)"
					/>
				</Box>
				{error ? (
					<Text color="red">{error}</Text>
				) : (
					<Text dimColor>Press Enter. Khlawde awaits.</Text>
				)}
			</Box>
		</Box>
	);
}
