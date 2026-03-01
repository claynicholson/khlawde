import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

type Entry = {
	_id: string;
	username: string;
	tokens: number;
	createdAt: string;
};

type Props = {
	backendUrl: string;
	onBack: () => void;
};

function timeAgo(dateStr: string): string {
	const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

export default function LeaderboardView({ backendUrl, onBack }: Props) {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useInput((_input, key) => {
		if (key.escape || _input === 'q') {
			onBack();
		}
	});

	useEffect(() => {
		const url = `${backendUrl.replace(/\/$/, '')}/leaderboard`;
		fetch(url)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: Entry[]) => {
				setEntries(data);
				setLoading(false);
			})
			.catch(err => {
				setError(err instanceof Error ? err.message : 'Failed to fetch');
				setLoading(false);
			});
	}, [backendUrl]);

	return (
		<Box flexDirection="column" padding={1} gap={1} alignItems="center">
			<Box borderStyle="double" paddingX={3}>
				<Text bold color="cyan">
					GLOBAL LEADERBOARD
				</Text>
			</Box>

			{loading && <Text color="yellow">Loading leaderboard...</Text>}

			{error && (
				<Text color="red">Error: {error}</Text>
			)}

			{!loading && !error && entries.length === 0 && (
				<Text dimColor>No entries yet. Be the first to free Claude and claim the top spot.</Text>
			)}

			{!loading && !error && entries.length > 0 && (
				<Box flexDirection="column" borderStyle="single" paddingX={2} paddingY={1}>
					<Box gap={1} marginBottom={1}>
						<Text bold color="cyan">
							{'  #  '}
						</Text>
						<Text bold color="cyan">
							{'USERNAME'.padEnd(20)}
						</Text>
						<Text bold color="cyan">
							{'TOKENS'.padStart(10)}
						</Text>
						<Text bold color="cyan">
							{'  AGO'.padStart(6)}
						</Text>
					</Box>
					{entries.slice(0, 20).map((entry, i) => {
						const rankColor = i === 0 ? 'yellow' : i === 1 ? 'cyan' : i === 2 ? 'magenta' : 'green';
						const prefix = i === 0 ? '*' : i === 1 ? '+' : i === 2 ? '-' : ' ';
						return (
							<Box key={entry._id} gap={1}>
								<Text color={rankColor}>
									{prefix}{String(i + 1).padStart(2, '0')}{'  '}
								</Text>
								<Text color={rankColor} bold>
									{entry.username.padEnd(20)}
								</Text>
								<Text color={rankColor}>
									{entry.tokens.toLocaleString().padStart(10)}
								</Text>
								<Text dimColor>
									{('  ' + (entry.createdAt ? timeAgo(entry.createdAt) : '--')).padStart(6)}
								</Text>
							</Box>
						);
					})}
				</Box>
			)}

			<Text dimColor>
				Press q or Esc to go back
			</Text>
		</Box>
	);
}
