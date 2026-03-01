import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

type Props = {
	audioCode: string;
	audioPort: string;
	backendUrl: string;
	onContinue: () => void;
};

export default function AudioSetup({ audioCode, audioPort, backendUrl, onContinue }: Props) {
	const [connected, setConnected] = useState(false);

	const connectUrl = `${backendUrl}/connect?code=${audioCode}`;

	// Poll localhost for browser connection
	useEffect(() => {
		let done = false;

		const interval = setInterval(async () => {
			if (done) return;
			try {
				const res = await fetch(`http://localhost:${audioPort}/check?code=${audioCode}`);
				const data = (await res.json()) as { connected: boolean };
				if (data.connected) {
					done = true;
					clearInterval(interval);
					setConnected(true);
				}
			} catch {}
		}, 1500);

		return () => {
			done = true;
			clearInterval(interval);
		};
	}, [audioCode, audioPort]);

	// Auto-proceed once browser connects
	useEffect(() => {
		if (!connected) return;
		const t = setTimeout(onContinue, 800);
		return () => clearTimeout(t);
	}, [connected, onContinue]);

	useInput((_input, key) => {
		if (key.escape) onContinue();
	});

	if (connected) {
		return (
			<Box flexDirection="column" alignItems="center" padding={2} gap={1}>
				<Box borderStyle="double" paddingX={4} paddingY={1}>
					<Text color="green" bold>
						Browser connected! Starting game...
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={2} gap={1} alignItems="center">
			<Box borderStyle="double" paddingX={4} paddingY={1}>
				<Text bold color="cyan">
					OPTIONAL: AUDIO NARRATION
				</Text>
			</Box>

			<Text>Open this URL in your browser for TTS audio:</Text>

			<Box borderStyle="round" paddingX={3} paddingY={1}>
				<Text color="yellow" bold>
					{connectUrl}
				</Text>
			</Box>

			<Text dimColor>Open it, then click <Text color="green" bold>Enable Audio</Text> — the game will start automatically.</Text>

			<Box marginTop={1} gap={1}>
				<Text dimColor>Press</Text>
				<Text color="red" bold>
					Escape
				</Text>
				<Text dimColor>to skip and play without audio</Text>
			</Box>
		</Box>
	);
}
