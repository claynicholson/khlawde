#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ ink-example

	Options
	  --token  Your Anthropic API key (or set ANTHROPIC_API_KEY env var)

	Examples
	  $ ink-example
	  $ ink-example --token=sk-ant-...
	`,
	{
		importMeta: import.meta,
		flags: {
			token: {
				type: 'string',
				default: '',
			},
		},
	},
);

render(<App initialToken={cli.flags.token} />);
