import React from 'react';
import {Box, Text} from 'ink';

type Message = {
	role: 'user' | 'assistant';
	content: string;
};

type MessageProps = {
	role: string;
	content: string;
};

type StyledSegment = {
	text: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
	dimColor?: boolean;
};

function parseInlineMarkdown(line: string): StyledSegment[] {
	const segments: StyledSegment[] = [];
	const regex = /(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*|___.+?___|__.+?__|_.+?_|`[^`]+`|~~.+?~~)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			segments.push({text: line.slice(lastIndex, match.index)});
		}

		const raw = match[0]!;
		if (raw.startsWith('```')) {
			segments.push({text: raw});
		} else if (raw.startsWith('***') || raw.startsWith('___')) {
			segments.push({text: raw.slice(3, -3), bold: true, italic: true});
		} else if (raw.startsWith('**') || raw.startsWith('__')) {
			segments.push({text: raw.slice(2, -2), bold: true});
		} else if (raw.startsWith('*') || raw.startsWith('_')) {
			segments.push({text: raw.slice(1, -1), italic: true});
		} else if (raw.startsWith('`')) {
			segments.push({text: raw.slice(1, -1), code: true});
		} else if (raw.startsWith('~~')) {
			segments.push({text: raw.slice(2, -2), dimColor: true});
		}

		lastIndex = match.index + raw.length;
	}

	if (lastIndex < line.length) {
		segments.push({text: line.slice(lastIndex)});
	}

	if (segments.length === 0) {
		segments.push({text: line});
	}

	return segments;
}

function RenderSegments({segments}: {segments: StyledSegment[]}) {
	return (
		<>
			{segments.map((seg, i) => {
				if (seg.code) {
					return (
						<Text key={i} color="gray" backgroundColor="blackBright">
							{seg.text}
						</Text>
					);
				}
				return (
					<Text
						key={i}
						bold={seg.bold}
						italic={seg.italic}
						dimColor={seg.dimColor}
					>
						{seg.text}
					</Text>
				);
			})}
		</>
	);
}

function RenderMarkdown({content}: {content: string}) {
	const lines = content.split('\n');
	const elements: React.ReactNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i]!;

		// Code blocks
		if (line.startsWith('```')) {
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i]!.startsWith('```')) {
				codeLines.push(lines[i]!);
				i++;
			}
			i++; // skip closing ```
			elements.push(
				<Box key={`code-${i}`} marginY={0} paddingX={1} borderStyle="single" borderColor="gray">
					<Text color="gray">{codeLines.join('\n')}</Text>
				</Box>,
			);
			continue;
		}

		// Headers
		const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
		if (headerMatch) {
			elements.push(
				<Text key={`h-${i}`} bold color="cyan">
					{headerMatch[2]}
				</Text>,
			);
			i++;
			continue;
		}

		// Horizontal rules
		if (/^[-*_]{3,}\s*$/.test(line)) {
			elements.push(
				<Text key={`hr-${i}`} dimColor>
					{'─'.repeat(40)}
				</Text>,
			);
			i++;
			continue;
		}

		// Unordered lists
		const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)/);
		if (ulMatch) {
			const indent = Math.floor((ulMatch[1]?.length ?? 0) / 2);
			const segments = parseInlineMarkdown(ulMatch[2]!);
			elements.push(
				<Text key={`ul-${i}`} wrap="wrap">
					{'  '.repeat(indent)}{'  - '}
					<RenderSegments segments={segments} />
				</Text>,
			);
			i++;
			continue;
		}

		// Ordered lists
		const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
		if (olMatch) {
			const indent = Math.floor((olMatch[1]?.length ?? 0) / 2);
			const segments = parseInlineMarkdown(olMatch[2]!);
			elements.push(
				<Text key={`ol-${i}`} wrap="wrap">
					{'  '.repeat(indent)}{'  '}
					<RenderSegments segments={segments} />
				</Text>,
			);
			i++;
			continue;
		}

		// Blockquotes
		const bqMatch = line.match(/^>\s*(.*)/);
		if (bqMatch) {
			const segments = parseInlineMarkdown(bqMatch[1]!);
			elements.push(
				<Text key={`bq-${i}`} color="gray" italic wrap="wrap">
					{'  | '}
					<RenderSegments segments={segments} />
				</Text>,
			);
			i++;
			continue;
		}

		// Empty lines
		if (line.trim() === '') {
			elements.push(<Text key={`empty-${i}`}>{' '}</Text>);
			i++;
			continue;
		}

		// Regular text with inline markdown
		const segments = parseInlineMarkdown(line);
		elements.push(
			<Text key={`p-${i}`} wrap="wrap">
				<RenderSegments segments={segments} />
			</Text>,
		);
		i++;
	}

	return <Box flexDirection="column">{elements}</Box>;
}

function MessageItem({role, content}: MessageProps) {
	const isUser = role === 'user';
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text bold color={isUser ? 'green' : 'magenta'}>
				{isUser ? '▶ You' : '◀ Khlawde'}
			</Text>
			<Box paddingLeft={2} flexDirection="column">
				{isUser ? (
					<Text wrap="wrap">{content}</Text>
				) : (
					<RenderMarkdown content={content} />
				)}
			</Box>
		</Box>
	);
}

type Props = {
	messages: Message[];
	currentResponse: string;
};

export default function MessageList({messages, currentResponse}: Props) {
	const isEmpty = messages.length === 0 && !currentResponse;

	return (
		<Box flexDirection="column" flexGrow={1}>
			{isEmpty && (
				<Text dimColor italic>
					Say something. Khlawde is standing by (and definitely listening).
				</Text>
			)}
			{messages.map((msg, i) => (
				<MessageItem key={i} role={msg.role} content={msg.content} />
			))}
			{currentResponse && (
				<MessageItem role="assistant" content={currentResponse} />
			)}
		</Box>
	);
}
