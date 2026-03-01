import {spawn, type ChildProcess} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {writeFileSync} from 'fs';
import {tmpdir} from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));
const MUSIC_FILE = join(__dir, '..', 'assets', 'Spear of Justice.mp3');

let proc: ChildProcess | null = null;
let active = false;

function launch(): void {
	if (!active) return;
	let child: ChildProcess;

	if (process.platform === 'win32') {
		// wscript.exe is always on Windows and its WScript.Sleep pumps COM messages,
		// so WMPlayer.OCX events (including audio callbacks) fire correctly.
		const vbsPath = join(tmpdir(), 'khlawde_music.vbs');
		writeFileSync(vbsPath, [
			'Set wmp = CreateObject("WMPlayer.OCX.7")',
			`wmp.URL = "${MUSIC_FILE}"`,
			'wmp.controls.play()',
			'Do',
			'    WScript.Sleep 500',
			'    If wmp.playState = 1 Then wmp.controls.play()',
			'Loop',
		].join('\r\n'));
		child = spawn('wscript', ['//b', vbsPath], {stdio: 'ignore'});
	} else if (process.platform === 'darwin') {
		child = spawn('afplay', [MUSIC_FILE], {stdio: 'ignore'});
	} else {
		child = spawn('mpg123', ['-q', '--loop', '-1', MUSIC_FILE], {stdio: 'ignore'});
	}

	proc = child;
	child.on('exit', () => {
		proc = null;
		if (active) launch();
	});
}

export function startMusic(): void {
	if (active) return;
	active = true;
	launch();
}

export function stopMusic(): void {
	active = false;
	proc?.kill();
	proc = null;
}
