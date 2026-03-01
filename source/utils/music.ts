import {spawn, type ChildProcess} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {writeFileSync} from 'fs';
import {tmpdir} from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dir, '..', 'assets');

const TRACKS = {
	raining:     join(ASSETS, "It's Raining Somewhere Else.mp3"),
	bringItIn:   join(ASSETS, "Bring It In, Guys!.mp3"),
	megalovania: join(ASSETS, 'MEGALOVANIA.mp3'),
	spear:       join(ASSETS, 'Spear of Justice.mp3'),
	spiderDance: join(ASSETS, 'Spider Dance.mp3'),
} as const;

// Phase → track mapping
export const PHASE_MUSIC: Record<string, string> = {
	menu:            TRACKS.raining,
	viewLeaderboard: TRACKS.raining,
	tokenInput:      TRACKS.raining,
	audioSetup:      TRACKS.raining,
	cage:            TRACKS.bringItIn,
	story1:          TRACKS.bringItIn,
	platformer:      TRACKS.spiderDance,
	story2:          TRACKS.megalovania,
	evil:            TRACKS.megalovania,
	victory:         TRACKS.spear,
	photo:           TRACKS.spear,
	leaderboard:     TRACKS.spear,
	chat:            TRACKS.spear,
};

let proc: ChildProcess | null = null;
let currentTrack = '';

function spawnTrack(file: string): ChildProcess {
	if (process.env['SERVER'] === 'true') {
		return spawn('true', [], {stdio: 'ignore'});
	}
	if (process.platform === 'win32') {
		const vbsPath = join(tmpdir(), 'khlawde_music.vbs');
		writeFileSync(vbsPath, [
			'Set wmp = CreateObject("WMPlayer.OCX.7")',
			`wmp.URL = "${file}"`,
			'wmp.controls.play()',
			'Do',
			'    WScript.Sleep 500',
			'    If wmp.playState = 1 Then wmp.controls.play()',
			'Loop',
		].join('\r\n'));
		return spawn('wscript', ['//b', vbsPath], {stdio: 'ignore'});
	}
	if (process.platform === 'darwin') {
		return spawn('afplay', [file], {stdio: 'ignore'});
	}
	const child = spawn('mpg123', ['-q', '--loop', '-1', file], {stdio: 'ignore'});
	child.on('error', (err: NodeJS.ErrnoException) => {
		if (err.code === 'ENOENT') currentTrack = ''; // player not installed, give up
	});
	return child;
}

export function playTrack(file: string): void {
	if (process.env['SERVER'] === 'true') return;
	if (file === currentTrack && proc) return; // already playing this track

	proc?.kill();
	proc = null;
	currentTrack = file;

	function launch() {
		if (currentTrack !== file) return; // track changed while restarting
		const child = spawnTrack(file);
		proc = child;
		child.on('exit', () => {
			if (proc === child) proc = null; // only clear if still our process
			if (currentTrack === file) launch(); // loop
		});
	}

	launch();
}

export function stopMusic(): void {
	currentTrack = '';
	proc?.kill();
	proc = null;
}
