import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

const VICTORY_ART = `
  .------------.
  |  ^      ^  |
  |  \\(    )/  |
  '------------'
       |  |
      /|  |\\
  * * * * * * *
   REDEEMED!`;

type Props = {
	tokens: number;
	backendUrl: string;
	onDone: () => void;
};

type Status = 'input' | 'submitting' | 'success' | 'error' | 'skipped';

export default function LeaderboardSubmit({ tokens, backendUrl, onDone }: Props) {
	const [username, setUsername] = useState('');
	const [status, setStatus] = useState<Status>('input');
	const [errorMsg, setErrorMsg] = useState('');

	const submit = useCallback(
		async (text: string) => {
			const trimmed = text.trim();

			if (trimmed === '/skip') {
				setStatus('skipped');
				setTimeout(onDone, 1000);
				return;
			}

			if (!/^[a-zA-Z0-9_]{1,32}$/.test(trimmed)) {
				setErrorMsg('Username must be 1-32 alphanumeric characters or underscores.');
				return;
			}

			setStatus('submitting');
			setErrorMsg('');

			try {
				const url = `${backendUrl.replace(/\/$/, '')}/leaderboard`;
				const res = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						username: trimmed,
						tokens,
						asciiImage: VICTORY_ART,
					}),
				});

				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
					throw new Error(data.error || `HTTP ${res.status}`);
				}

				setStatus('success');
				setTimeout(onDone, 2500);
			} catch (err) {
				setStatus('error');
				setErrorMsg(err instanceof Error ? err.message : 'Failed to submit');
				setTimeout(() => setStatus('input'), 3000);
			}
		},
		[tokens, backendUrl, onDone],
	);

	return (
		<Box flexDirection="column" padding={1} gap={1} alignItems="center">
			<Box borderStyle="double" paddingX={3}>
				<Text bold color="yellow">
					LEADERBOARD SUBMISSION
				</Text>
			</Box>

			<Text color="cyan">{VICTORY_ART}</Text>

			<Box flexDirection="column" alignItems="center" gap={0}>
				<Text>
					Total API tokens used: <Text bold color="yellow">{tokens.toLocaleString()}</Text>
				</Text>
				<Text dimColor>Your score will be recorded on the global leaderboard.</Text>
			</Box>

			{status === 'input' && (
				<Box flexDirection="column" alignItems="center" gap={1}>
					{errorMsg && <Text color="red">{errorMsg}</Text>}
					<Box borderStyle="round" paddingX={1} width={50}>
						<Text color="green">{'username> '}</Text>
						<TextInput
							value={username}
							onChange={setUsername}
							onSubmit={submit}
							placeholder="Enter your username (or /skip)"
						/>
					</Box>
				</Box>
			)}

			{status === 'submitting' && (
				<Text color="yellow">Submitting to leaderboard...</Text>
			)}

			{status === 'success' && (
				<Box flexDirection="column" alignItems="center">
					<Text bold color="green">
						Score submitted! You are on the leaderboard.
					</Text>
					<Text dimColor>Entering chat...</Text>
				</Box>
			)}

			{status === 'error' && (
				<Box flexDirection="column" alignItems="center">
					<Text color="red">Error: {errorMsg}</Text>
					<Text dimColor>Retrying in a moment...</Text>
				</Box>
			)}

			{status === 'skipped' && (
				<Box flexDirection="column" alignItems="center">
					<Text dimColor>Skipped. Entering chat...</Text>
				</Box>
			)}
		</Box>
	);
}
