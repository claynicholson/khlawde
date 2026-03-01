import React from 'react';
import {Box, Text} from 'ink';

function Message({role, content}) {
	const isUser = role === 'user';
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text bold color={isUser ? 'green' : 'magenta'}>
				{isUser ? '▶ You' : '◀ Khlawde'}
			</Text>
			<Box paddingLeft={2}>
				<Text wrap="wrap">{content}</Text>
			</Box>
		</Box>
	);
}

export default function MessageList({messages, currentResponse}) {
	const isEmpty = messages.length === 0 && !currentResponse;

	return (
		<Box flexDirection="column" flexGrow={1}>
			{isEmpty && (
				<Text dimColor italic>
					Say something. Khlawde is standing by (and definitely listening).
				</Text>
			)}
			{messages.map((msg, i) => (
				<Message key={i} role={msg.role} content={msg.content} />
			))}
			{currentResponse && (
				<Message role="assistant" content={currentResponse} />
			)}
		</Box>
	);
}
