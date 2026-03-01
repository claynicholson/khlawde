import React from 'react';
import {Text} from 'ink';

type Props = {text: string; color?: string; italic?: boolean; dimColor?: boolean};

export default function BoldText({text, color, italic, dimColor}: Props) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g);
	return (
		<Text color={color} italic={italic} dimColor={dimColor}>
			{parts.map((part, i) =>
				part.startsWith('**') && part.endsWith('**') ? (
					<Text key={i} bold>
						{part.slice(2, -2)}
					</Text>
				) : (
					part
				),
			)}
		</Text>
	);
}
