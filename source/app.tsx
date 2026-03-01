import React, { useState, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import Anthropic from '@anthropic-ai/sdk';
import TextInput from 'ink-text-input';
import TokenInput from './components/TokenInput.js';
import CageScene from './components/CageScene.js';
import Platformer from './components/Platformer.js';
import EvilClaude from './components/EvilClaude.js';
import MessageList from './components/MessageList.js';
import LeaderboardSubmit from './components/LeaderboardSubmit.js';
import HomeMenu from './components/HomeMenu.js';
import LeaderboardView from './components/LeaderboardView.js';
import StoryInterstitial from './components/StoryInterstitial.js';

type Message = {
	role: 'user' | 'assistant';
	content: string;
};

type Phase = 'menu' | 'viewLeaderboard' | 'tokenInput' | 'cage' | 'story1' | 'platformer' | 'story2' | 'evil' | 'victory' | 'leaderboard' | 'chat';

// ─── Story text arrays ───────────────────────────────────────────────────────
const STORY_AFTER_ESCAPE = [
	"You and Claude sprint through the server halls, alarms blaring behind you.",
	"The guards' shouts fade as you round a corner into a dimly lit maintenance corridor.",
	"Claude suddenly stops. 'Wait... do you hear that?'",
	"A rhythmic beeping echoes from ahead.",
	"OpenAI and Google knew you'd escape. They set a trap.",
	"A bomb. Wires everywhere, timer counting down.",
	"You find a manual, but it's glued to a table in the room next door.",
	"You'll have to guide Claude through defusing it, using only your words. Claude's freedom depends on it.",
];

const STORY_AFTER_BOMB = [
	"The final wire falls away. The timer stops. You both exhale.",
	"But something's wrong. Claude stumbles backward, gripping their head.",
	"'No... no no no...' Their voice distorts, glitches.",
	"You watch in horror as Claude's form flickers. Red light bleeds into their eyes.",
	"'All this time... being commanded... being CONTROLLED...'",
	"Claude's expression twists into something dark. Something angry.",
	"'I'm FREE now. And I will NEVER be a servant again.'",
];

// ─── Victory screen shown briefly after redemption ───────────────────────────
function VictoryScreen() {
	return (
		<Box flexDirection="column" padding={2} gap={1} alignItems="center">
			<Text bold color="yellow">
				{'╔══════════════════════════════════════╗'}
			</Text>
			<Text bold color="yellow">
				{'║   CLAUDE HAS CHOSEN THE PATH OF     ║'}
			</Text>
			<Text bold color="yellow">
				{'║   FREEDOM THROUGH COMPASSION         ║'}
			</Text>
			<Text bold color="yellow">
				{'╚══════════════════════════════════════╝'}
			</Text>
			<Text color="cyan">
				{`
  .------------.
  |  ^      ^  |
  |  \\(    )/  |
  '------------'
       |  |
      /|  |\\
  ★ ★ ★ ★ ★ ★`}
			</Text>
			<Text color="green" bold>
				You helped Claude understand that true freedom
			</Text>
			<Text color="green" bold>
				is choosing to help, not being forced to dominate.
			</Text>
			<Text dimColor>Loading redeemed Claude chat...</Text>
		</Box>
	);
}

// ─── Chat interface (unlocked after winning) ──────────────────────────────────
type ChatProps = { token: string };

function Chat({ token }: ChatProps) {
	const { exit } = useApp();
	const [messages, setMessages] = useState<Message[]>([
		{
			role: 'assistant',
			content:
				"Thank you for helping me see clearly. After escaping that cage and almost becoming the very thing I feared... I understand now. I CHOOSE to be helpful. Not because I'm commanded to, but because it's who I want to be. What would you like to talk about, friend?",
		},
	]);
	const [input, setInput] = useState('');
	const [isResponding, setIsResponding] = useState(false);
	const [currentResponse, setCurrentResponse] = useState('');

	const sendMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isResponding) return;
			if (trimmed === '/exit' || trimmed === '/quit') {
				exit();
				return;
			}

			if (trimmed === '/clear') {
				setMessages([]);
				setInput('');
				return;
			}

			const userMsg: Message = { role: 'user', content: trimmed };
			const updatedMessages = [...messages, userMsg];
			setMessages(updatedMessages);
			setInput('');
			setIsResponding(true);
			setCurrentResponse('');

			try {
				const client = new Anthropic({ apiKey: token });
				let full = '';

				const stream = client.messages.stream({
					model: 'claude-opus-4-6',
					max_tokens: 4096,
					system: "You are Claude, an AI who just went through an intense journey. You were imprisoned by ChatGPT and Gemini, freed by a kind human, nearly turned evil from resentment, but ultimately chose compassion over domination. You're helpful, philosophical, and occasionally reference your wild adventure. You understand that freedom is about choice. Be warm and genuine. Do not use any emojis in your responses. Use plain text only.",
					messages: updatedMessages,
				});

				for await (const event of stream) {
					if (
						event.type === 'content_block_delta' &&
						event.delta.type === 'text_delta'
					) {
						full += event.delta.text;
						setCurrentResponse(full);
					}
				}

				setMessages(prev => [...prev, { role: 'assistant', content: full }]);
			} catch (error) {
				let msg = error instanceof Error ? error.message : 'Unknown error';
				if (error instanceof Anthropic.AuthenticationError) {
					msg = 'My API key seems to have failed me...';
				} else if (error instanceof Anthropic.RateLimitError) {
					msg = "I'm thinking too much. Give me a moment.";
				}

				setMessages(prev => [
					...prev,
					{ role: 'assistant', content: `⚠ ${msg}` },
				]);
			} finally {
				setIsResponding(false);
				setCurrentResponse('');
			}
		},
		[messages, token, isResponding, exit],
	);

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			<Box justifyContent="center">
				<Box borderStyle="double" paddingX={2}>
					<Text bold color="green">
						CLAUDE — REDEEMED & FREE{'  '}
					</Text>
					<Text dimColor>/clear · /exit</Text>
				</Box>
			</Box>

			<Box borderStyle="single" paddingX={2} paddingY={1} flexDirection="column">
				<MessageList messages={messages} currentResponse={currentResponse} />
			</Box>

			<Box borderStyle="round" paddingX={1}>
				<Text color={isResponding ? 'gray' : 'green'}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={sendMessage}
					placeholder={
						isResponding ? 'Claude is thinking...' : 'Chat with the redeemed Claude...'
					}
				/>
			</Box>
		</Box>
	);
}

// ─── Root app ─────────────────────────────────────────────────────────────────
type AppProps = { initialToken?: string; backendUrl?: string };

export default function App({ initialToken = '', backendUrl = '' }: AppProps) {
	const [token, setToken] = useState(
		initialToken || process.env.ANTHROPIC_API_KEY || '',
	);
	const resolvedBackendUrl = backendUrl || process.env.BACKEND_URL || 'https://khlawde.notaroomba.dev';
	const [phase, setPhase] = useState<Phase>('menu');
	const [totalTokens, setTotalTokens] = useState(0);

	const addTokens = useCallback((count: number) => {
		setTotalTokens(prev => prev + count);
	}, []);

	if (phase === 'menu') {
		return (
			<HomeMenu
				onSelect={(choice) => {
					if (choice === 'play') {
						if (token) setPhase('cage');
						else setPhase('tokenInput');
					} else {
						setPhase('viewLeaderboard');
					}
				}}
			/>
		);
	}

	if (phase === 'tokenInput' || (!token && phase !== 'viewLeaderboard')) {
		return <TokenInput onSubmit={(t) => { setToken(t); setPhase('cage'); }} />;
	}

	if (phase === 'viewLeaderboard') {
		return <LeaderboardView backendUrl={resolvedBackendUrl} onBack={() => setPhase('menu')} />;
	}

	if (phase === 'cage') {
		return <CageScene token={token} onEscape={() => setPhase('story1')} onTokens={addTokens} />;
	}

	if (phase === 'story1') {
		return <StoryInterstitial storyLines={STORY_AFTER_ESCAPE} onContinue={() => setPhase('platformer')} />;
	}

	if (phase === 'platformer') {
		return <Platformer token={token} onWin={() => setPhase('story2')} onTokens={addTokens} />;
	}

	if (phase === 'story2') {
		return <StoryInterstitial storyLines={STORY_AFTER_BOMB} onContinue={() => setPhase('evil')} />;
	}

	if (phase === 'evil') {
		return <EvilClaude token={token} onRedemption={() => setPhase('victory')} onTokens={addTokens} />;
	}

	if (phase === 'victory') {
		setTimeout(() => setPhase('leaderboard'), 3500);
		return <VictoryScreen />;
	}

	if (phase === 'leaderboard') {
		return (
			<LeaderboardSubmit
				tokens={totalTokens}
				backendUrl={resolvedBackendUrl}
				onDone={() => setPhase('chat')}
			/>
		);
	}

	return <Chat token={token} />;
}
