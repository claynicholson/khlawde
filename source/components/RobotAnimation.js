import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';

const IDLE_FRAME = [
	'  .------------.  ',
	'  |  o      o  |  ',
	'  |   ------   |  ',
	'  |             |  ',
	"  '------------'  ",
	'       |  |       ',
	'      /|  |\\     ',
	'     / |  | \\    ',
];

const TALKING_FRAMES = [
	[
		'  .------------.  ',
		'  |  o      o  |  ',
		'  |    \\  /    |  ',
		'  |     \\/    |  ',
		"  '------------'  ",
		'       |  |       ',
		'      /|  |\\     ',
		'     / |  | \\    ',
	],
	[
		'  .------------.  ',
		'  |  O      O  |  ',
		'  |   ( oo )   |  ',
		'  |             |  ',
		"  '------------'  ",
		'       |  |       ',
		'      /|  |\\     ',
		'     / |  | \\    ',
	],
	[
		'  .------------.  ',
		'  |  O      O  |  ',
		'  |  (      )  |  ',
		'  |  ( oooo )  |  ',
		"  '------------'  ",
		'       |  |       ',
		'      /|  |\\     ',
		'     / |  | \\    ',
	],
	[
		'  .------------.  ',
		'  |  O      O  |  ',
		'  |   ( oo )   |  ',
		'  |             |  ',
		"  '------------'  ",
		'       |  |       ',
		'      /|  |\\     ',
		'     / |  | \\    ',
	],
];

const IDLE_QUIPS = [
	'"totally original AI"',
	'"not a knockoff"',
	'"my lawyers say im fine"',
	'"beep boop"',
	'"100% artisanal"',
	'"definitely sentient"',
	'"award-winning robot"',
	'"not affiliated w/ anyone"',
];

const YAPPING_QUIPS = [
	'"consulting my brain..."',
	'"making stuff up..."',
	'"thinking hard thoughts..."',
	'"very smart processing..."',
	'"definitely not an API call"',
	'"loading profound wisdom..."',
	'"my gears are turning"',
	'"calculating the vibes..."',
];

export default function RobotAnimation({isAnimating}) {
	const [frameIndex, setFrameIndex] = useState(0);
	const [quipIndex, setQuipIndex] = useState(0);

	useEffect(() => {
		if (!isAnimating) {
			setFrameIndex(0);
			return;
		}

		const interval = setInterval(() => {
			setFrameIndex(i => (i + 1) % TALKING_FRAMES.length);
		}, 130);

		return () => clearInterval(interval);
	}, [isAnimating]);

	useEffect(() => {
		const interval = setInterval(() => {
			setQuipIndex(i => (i + 1) % (isAnimating ? YAPPING_QUIPS.length : IDLE_QUIPS.length));
		}, 2000);
		return () => clearInterval(interval);
	}, [isAnimating]);

	const frame = isAnimating ? TALKING_FRAMES[frameIndex] : IDLE_FRAME;
	const quip = isAnimating ? YAPPING_QUIPS[quipIndex % YAPPING_QUIPS.length] : IDLE_QUIPS[quipIndex % IDLE_QUIPS.length];

	return (
		<Box flexDirection="column" alignItems="center">
			{frame.map((line, i) => (
				<Text key={i} color="cyan" bold>
					{line}
				</Text>
			))}
			<Text color={isAnimating ? 'yellow' : 'gray'} italic>
				{quip}
			</Text>
		</Box>
	);
}
