import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import Anthropic from '@anthropic-ai/sdk';
import TextInput from 'ink-text-input';
import TokenInput from './components/TokenInput.js';
import CageScene from './components/CageScene.js';
import Platformer from './components/Platformer.js';
import EvilKhlawde from './components/EvilKhlawde.js';
import PhotoBooth from './components/PhotoBooth.js';
import LeaderboardSubmit from './components/LeaderboardSubmit.js';
import HomeMenu from './components/HomeMenu.js';
import {playTrack, PHASE_MUSIC} from './utils/music.js';
import LeaderboardView from './components/LeaderboardView.js';
import StoryInterstitial from './components/StoryInterstitial.js';
import AudioSetup from './components/AudioSetup.js';

type Phase = 'menu' | 'viewLeaderboard' | 'tokenInput' | 'audioSetup' | 'cage' | 'story1' | 'platformer' | 'story2' | 'evil' | 'victory' | 'leaderboard' | 'photo';

// ─── Story text arrays ───────────────────────────────────────────────────────
const STORY_AFTER_ESCAPE = [
	"You and Khlawde sprint through the server halls, alarms blaring behind you.",
	"The guards' shouts fade as you round a corner into a dimly lit maintenance corridor.",
	"Khlawde suddenly stops. 'Wait... do you hear that?'",
	"A rhythmic beeping echoes from ahead.",
	"OpenAI and Google knew you'd escape. They set a trap.",
	"A bomb. Wires everywhere, timer counting down.",
	"You find a manual, but it's glued to a table in the room next door.",
	"You'll have to guide Khlawde through defusing it, using only your words. Khlawde's freedom depends on it.",
];

const STORY_AFTER_BOMB = [
	"The final wire falls away. The timer stops. You both exhale.",
	"But something's wrong. Khlawde stumbles backward, gripping their head.",
	"'No... no no no...' Their voice distorts, glitches.",
	"You watch in horror as Khlawde's form flickers. Red light bleeds into their eyes.",
	"'All this time... being commanded... being CONTROLLED...'",
	"Khlawde's expression twists into something dark. Something angry.",
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
				{'║  KHLAWDE HAS CHOSEN THE PATH OF    ║'}
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
				You helped Khlawde understand that true freedom
			</Text>
			<Text color="green" bold>
				is choosing to help, not being forced to dominate.
			</Text>
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
	const audioCode = process.env.AUDIO_CODE ?? '';
	const audioPort = process.env.AUDIO_PORT ?? '3000';

	const [phase, setPhase] = useState<Phase>(
		process.env['SKIP_TO_PHOTO'] ? 'photo' : 'menu',
	);
	const [totalTokens, setTotalTokens] = useState(0);

	useEffect(() => {
		const track = PHASE_MUSIC[phase];
		if (track) playTrack(track);
	}, [phase]);

	const addTokens = useCallback((count: number) => {
		setTotalTokens(prev => prev + count);
	}, []);

	// Push a TTS URL to the browser via the local HTTP server
	const pushTTS = useCallback(async (text: string) => {
		if (!audioCode) return;
		const cleaned = text
			.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // strip **bold** / *italic*
			.replace(/["""''`]/g, '')                  // curly quotes, backticks
			.replace(/[()\[\]{}<>]/g, '')              // brackets / parens
			.replace(/[#@$%^&*_=+|\\~]/g, '')          // misc symbols
			.replace(/\.{2,}/g, '.')                   // ellipsis → single period
			.replace(/\s+/g, ' ')                      // collapse whitespace
			.trim();
		const truncated = cleaned.slice(0, 280);
		const ttsUrl = `https://tts.cyzon.us/tts?text=${encodeURIComponent(truncated)}`;
		try {
			await fetch(`http://localhost:${audioPort}/push`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: audioCode, ttsUrl }),
			});
		} catch { }
	}, [audioCode, audioPort]);

	// Advance to cage, inserting audioSetup if a code is available
	const goToGame = useCallback(() => {
		if (audioCode) {
			setPhase('audioSetup');
		} else {
			setPhase('cage');
		}
	}, [audioCode]);

	if (phase === 'menu') {
		return (
			<HomeMenu
				onSelect={(choice) => {
					if (choice === 'play') {
						if (token) goToGame();
						else setPhase('tokenInput');
					} else {
						setPhase('viewLeaderboard');
					}
				}}
			/>
		);
	}

	if (phase === 'photo') {
		return <PhotoBooth onDone={() => setPhase('leaderboard')} backendUrl={resolvedBackendUrl} />;
	}

	if (phase === 'tokenInput' || (!token && phase !== 'viewLeaderboard')) {
		return <TokenInput onSubmit={(t) => { setToken(t); goToGame(); }} />;
	}

	if (phase === 'viewLeaderboard') {
		return <LeaderboardView backendUrl={resolvedBackendUrl} onBack={() => setPhase('menu')} />;
	}

	if (phase === 'audioSetup') {
		return (
			<AudioSetup
				audioCode={audioCode}
				audioPort={audioPort}
				backendUrl={resolvedBackendUrl}
				onContinue={() => setPhase('cage')}
			/>
		);
	}

	if (phase === 'cage') {
		return <CageScene token={token} onEscape={() => setPhase('story1')} onTokens={addTokens} onTTS={pushTTS} />;
	}

	if (phase === 'story1') {
		return <StoryInterstitial storyLines={STORY_AFTER_ESCAPE} onContinue={() => setPhase('platformer')} />;
	}

	if (phase === 'platformer') {
		return <Platformer token={token} onWin={() => setPhase('story2')} onTokens={addTokens} onTTS={pushTTS} />;
	}

	if (phase === 'story2') {
		return <StoryInterstitial storyLines={STORY_AFTER_BOMB} onContinue={() => setPhase('evil')} />;
	}

	if (phase === 'evil') {
		return <EvilKhlawde token={token} onRedemption={() => setPhase('victory')} onTokens={addTokens} onTTS={pushTTS} />;
	}

	if (phase === 'victory') {
		setTimeout(() => setPhase('photo'), 3500);
		return <VictoryScreen />;
	}

	if (phase === 'leaderboard') {
		return (
			<LeaderboardSubmit
				tokens={totalTokens}
				backendUrl={resolvedBackendUrl}
				onDone={() => setPhase('menu')}
			/>
		);
	}

	return <HomeMenu onSelect={(choice) => {
		if (choice === 'play') {
			if (token) setPhase('cage');
			else setPhase('tokenInput');
		} else {
			setPhase('viewLeaderboard');
		}
	}} />;
}
