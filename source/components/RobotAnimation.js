import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';

const IDLE_FRAME = [
	' .------. ',
	' |o    o| ',
	' |  --  | ',
	" '------' ",
	'   |  |   ',
	'  /|  |\\ ',
];

const TALKING_FRAMES = [
	[
		' .------. ',
		' |o    o| ',
		' |  \\/  | ',
		" '------' ",
		'   |  |   ',
		'  /|  |\\ ',
	],
	[
		' .------. ',
		' |O    O| ',
		' |  ()  | ',
		" '------' ",
		'   |  |   ',
		'  /|  |\\ ',
	],
	[
		' .------. ',
		' |O    O| ',
		' | (  ) | ',
		" '------' ",
		'   |  |   ',
		'  /|  |\\ ',
	],
	[
		' .------. ',
		' |O    O| ',
		' |  ()  | ',
		" '------' ",
		'   |  |   ',
		'  /|  |\\ ',
	],
];

export default function RobotAnimation({isAnimating}) {
	const [frameIndex, setFrameIndex] = useState(0);

	useEffect(() => {
		if (!isAnimating) {
			setFrameIndex(0);
			return;
		}

		const interval = setInterval(() => {
			setFrameIndex(i => (i + 1) % TALKING_FRAMES.length);
		}, 150);

		return () => clearInterval(interval);
	}, [isAnimating]);

	const frame = isAnimating ? TALKING_FRAMES[frameIndex] : IDLE_FRAME;

	return (
		<Box flexDirection="column" alignItems="center">
			{frame.map((line, i) => (
				<Text key={i} color="cyan">
					{line}
				</Text>
			))}
			<Text color={isAnimating ? 'yellow' : 'gray'}>
				{isAnimating ? ' yapping... ' : '  standby   '}
			</Text>
		</Box>
	);
}
