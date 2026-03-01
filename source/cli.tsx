#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ khlawde

	Options
	  --token        Your Anthropic API key (or set ANTHROPIC_API_KEY env var)
	  --backend-url  Backend URL for leaderboard (or set BACKEND_URL env var)

	Examples
	  $ khlawde
	  $ khlawde --token=sk-ant-... --backend-url=https://khlawde.notaroomba.dev
	`,
	{
		importMeta: import.meta,
		flags: {
			token: {
				type: 'string',
				default: '',
			},
			backendUrl: {
				type: 'string',
				default: '',
			},
		},
	},
);

render(<App initialToken={cli.flags.token} backendUrl={cli.flags.backendUrl} />);
