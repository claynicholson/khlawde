import React from 'react';
import {Text} from 'ink';

export default function App({name = 'Stranger'}) {
	return (
		<Text>
			Good Morning, <Text color="green">{name}</Text>
		</Text>
	);
}
