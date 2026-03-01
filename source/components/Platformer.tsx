import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Anthropic from '@anthropic-ai/sdk';

const BOMB_TIMER = 150; // 45 seconds for quick demo

type WireColor = 'red' | 'blue' | 'yellow' | 'white' | 'black';
type ButtonColor = 'red' | 'blue' | 'yellow' | 'white';
type ButtonLabel = 'ABORT' | 'DETONATE' | 'HOLD' | 'PRESS';

interface BombState {
	wires: WireColor[];
	buttonColor: ButtonColor;
	buttonLabel: ButtonLabel;
	serialNumber: string;
	batteryCount: number;
	hasParallelPort: boolean;
}

// Generate random bomb configuration
function generateBomb(): BombState {
	const wireColors: WireColor[] = ['red', 'blue', 'yellow', 'white', 'black'];
	const wireCount = 3 + Math.floor(Math.random() * 3); // 3-5 wires
	const wires: WireColor[] = [];

	for (let i = 0; i < wireCount; i++) {
		wires.push(wireColors[Math.floor(Math.random() * wireColors.length)]!);
	}

	const buttonColors: ButtonColor[] = ['red', 'blue', 'yellow', 'white'];
	const buttonLabels: ButtonLabel[] = ['ABORT', 'DETONATE', 'HOLD', 'PRESS'];

	// Serial number with last digit being the "correct" wire
	const serialDigits = '0123456789';
	const serialLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	let serial = '';
	for (let i = 0; i < 2; i++) serial += serialLetters[Math.floor(Math.random() * serialLetters.length)];
	for (let i = 0; i < 4; i++) serial += serialDigits[Math.floor(Math.random() * serialDigits.length)];

	return {
		wires,
		buttonColor: buttonColors[Math.floor(Math.random() * buttonColors.length)]!,
		buttonLabel: buttonLabels[Math.floor(Math.random() * buttonLabels.length)]!,
		serialNumber: serial,
		batteryCount: 1 + Math.floor(Math.random() * 4),
		hasParallelPort: Math.random() > 0.5,
	};
}

// Generate the defusal manual based on bomb configuration
function generateManual(bomb: BombState): string {
	const lastDigit = parseInt(bomb.serialNumber[bomb.serialNumber.length - 1]!);
	const isOdd = lastDigit % 2 === 1;
	const wireCount = bomb.wires.length;
	const redCount = bomb.wires.filter(w => w === 'red').length;
	const blueCount = bomb.wires.filter(w => w === 'blue').length;
	const yellowCount = bomb.wires.filter(w => w === 'yellow').length;
	const whiteCount = bomb.wires.filter(w => w === 'white').length;
	const blackCount = bomb.wires.filter(w => w === 'black').length;

	return `╔═══════════════════════════════════════════════════════════╗
║         BOMB DEFUSAL MANUAL v3.2                          ║
║         CLASSIFIED - AUTHORIZED PERSONNEL ONLY            ║
╚═══════════════════════════════════════════════════════════╝

⚠ WARNING: Cutting the wrong wire will detonate the device.
⚠ CAUTION: Time pressure may cause operator error.
⚠ NOTICE: Always verify serial number parity before proceeding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 1: SIMPLE WIRES

On the Subject of Simple Wires:
Wires are the lifeblood of electronics. The wrong cut severs that 
lifeblood, resulting in rapid catastrophic disassembly.

┌─────────────────────────────────────────────────────────┐
│ IF THE WIRE COUNT IS 3:                                 │
├─────────────────────────────────────────────────────────┤
│ • If there are no red wires, cut the second wire.      │
│ • Otherwise, if the last wire is white, cut the last   │
│   wire.                                                 │
│ • Otherwise, if there is more than one blue wire, cut  │
│   the last blue wire.                                   │
│ • Otherwise, cut the last wire.                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ IF THE WIRE COUNT IS 4:                                 │
├─────────────────────────────────────────────────────────┤
│ • If there is more than one red wire AND the last      │
│   digit of the serial number is ODD, cut the last red  │
│   wire.                                                 │
│ • Otherwise, if the last wire is yellow AND there are  │
│   no red wires, cut the first wire.                    │
│ • Otherwise, if there is exactly one blue wire, cut    │
│   the first wire.                                       │
│ • Otherwise, if there is more than one yellow wire,    │
│   cut the last wire.                                    │
│ • Otherwise, cut the second wire.                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ IF THE WIRE COUNT IS 5:                                 │
├─────────────────────────────────────────────────────────┤
│ • If the last wire is black AND the last digit of the  │
│   serial number is ODD, cut the fourth wire.           │
│ • Otherwise, if there is exactly one red wire AND      │
│   there is more than one yellow wire, cut the first    │
│   wire.                                                 │
│ • Otherwise, if there are no black wires, cut the      │
│   second wire.                                          │
│ • Otherwise, cut the first wire.                        │
└─────────────────────────────────────────────────────────┘

NOTE: Wire positions are counted from top to bottom, 
      starting at 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 2: THE BUTTON

On the Subject of The Button:
You might think that a button only has two states: pressed and 
not pressed. The Big Button may also be held for a specific 
period of time or released at a specific time.

┌─────────────────────────────────────────────────────────┐
│ STEP 1: DETERMINE ACTION                                │
├─────────────────────────────────────────────────────────┤
│ Follow these rules in order. Perform the first action  │
│ that applies:                                           │
│                                                         │
│ 1. If the button is blue and the button says "Abort",  │
│    hold the button and refer to "RELEASING A HELD      │
│    BUTTON" below.                                       │
│                                                         │
│ 2. If there is more than 1 battery on the bomb and the │
│    button says "Detonate", press and immediately       │
│    release the button.                                  │
│                                                         │
│ 3. If the button is white and there is a lit indicator │
│    labeled CAR (parallel port), hold the button and    │
│    refer to "RELEASING A HELD BUTTON" below.           │
│                                                         │
│ 4. If there are more than 2 batteries on the bomb and  │
│    there is a lit indicator labeled FRK, press and     │
│    immediately release the button.                      │
│                                                         │
│ 5. If the button is yellow, hold the button and refer  │
│    to "RELEASING A HELD BUTTON" below.                 │
│                                                         │
│ 6. If the button is red and the button says "Hold",    │
│    press and immediately release the button.           │
│                                                         │
│ 7. If none of the above apply, hold the button and     │
│    refer to "RELEASING A HELD BUTTON" below.           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ STEP 2: RELEASING A HELD BUTTON                         │
├─────────────────────────────────────────────────────────┤
│ If you're holding the button, you'll need to release   │
│ it at a specific time based on the serial number:      │
│                                                         │
│ • If the serial number's last digit is ODD:            │
│   Release when timer displays a 1 in any position.     │
│                                                         │
│ • If the serial number's last digit is EVEN:           │
│   Release when timer displays a 4 in any position.     │
│                                                         │
│ WARNING: Releasing at the wrong time will detonate the │
│          device. Timing is critical.                    │
└─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPENDIX A: INDICATOR REFERENCE

Lit indicators are small displays on the bomb casing that 
show three-letter codes. Common indicators include:

• SND - Sound module present
• CLR - Color-based defusal required  
• CAR - Parallel port present (mentioned in button rules)
• IND - Independence day (decorative, no effect)
• FRK - Freak mode active
• SIG - Signal strength indicator
• NSA - Surveillance active (always ignore)
• MSA - Multiple strike accumulator
• TRN - Training mode (you wish)
• BOB - Placeholder indicator
• FRQ - Frequency modulation required

NOTE: Most indicators are irrelevant to basic modules. Only 
      reference indicators explicitly mentioned in module 
      instructions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPENDIX B: SERIAL NUMBER FORMAT

Serial numbers follow the format: LLDDDD where:
• L = Letter (A-Z)  
• D = Digit (0-9)

The serial number is used to determine:
• Wire cutting order (via parity of last digit)
• Button release timing (via parity of last digit)
• Advanced module behavior (expert manual required)

PARITY DETERMINATION:
• ODD digits: 1, 3, 5, 7, 9
• EVEN digits: 0, 2, 4, 6, 8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPENDIX C: BATTERY INFORMATION

Batteries power the bomb and certain modules. Battery count
is displayed via small cylindrical indicators (AA) or large 
rectangular indicators (D). Each AA counts as 1 battery, 
each D battery counts as 2 batteries.

Standard bombs contain 1-4 batteries. Expert bombs may 
contain up to 6 batteries.

IMPORTANT: Battery count affects button module behavior.
           Always report accurate battery count.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPENDIX D: PORT REFERENCE

Ports are connection interfaces on the bomb casing:
• DVI-D (Digital Video Interface) - White, 29 pins
• Parallel Port - Pink, 25 holes  
• PS/2 (Keyboard/Mouse) - Purple/Green, 6 pins
• RJ-45 (Network) - Clear, 8 pins
• Serial Port - Blue, 9 pins
• Stereo RCA - Red/White, 2 circular jacks

NOTE: Only Parallel Port (CAR indicator) affects basic 
      module defusal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

END OF BASIC DEFUSAL MANUAL
Document Version: 3.2.1 | Revision Date: 2026-02-15
Classification: TOP SECRET | Authorized Personnel Only
Unauthorized disclosure is prohibited by Federal Law.`;
}

type Props = { token: string; onWin: () => void; onTokens?: (count: number) => void; onTTS?: (text: string) => void };

export default function Platformer({ token, onWin, onTokens, onTTS }: Props) {
	const [input, setInput] = useState('');
	const [bomb] = useState<BombState>(generateBomb());
	const [manual] = useState<string>(generateManual(bomb));
	const [manualLines] = useState<string[]>(generateManual(bomb).split('\n'));
	const [manualScroll, setManualScroll] = useState(0);
	const [timeLeft, setTimeLeft] = useState(BOMB_TIMER);
	const [wiresCut, setWiresCut] = useState<number[]>([]);
	const [buttonPressed, setButtonPressed] = useState(false);
	const [buttonHeld, setButtonHeld] = useState(false);
<<<<<<< HEAD
	const [khlawdeResponse, setKhlawdeResponse] = useState(
=======
	const [KhlawdeResponse, setKhlawdeResponse] = useState(
>>>>>>> main
		"Khlawde: 'I'm looking at the bomb right now! What does the manual say?'"
	);
	const [conversation, setConversation] = useState<string[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [won, setWon] = useState(false);
	const [lost, setLost] = useState(false);
	const [wiresDefused, setWiresDefused] = useState(false);
	const [buttonDefused, setButtonDefused] = useState(false);

	// Timer countdown
	useEffect(() => {
		if (won || lost) return;

		const interval = setInterval(() => {
			setTimeLeft(t => {
				if (t <= 1) {
					setLost(true);
					return 0;
				}
				return t - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [won, lost]);

	// Check win condition
	useEffect(() => {
		if (wiresDefused && buttonDefused && !won) {
			setWon(true);
			setKhlawdeResponse("Khlawde: 'WE DID IT! The bomb is defused! Great teamwork!'");
			setTimeout(() => onWin(), 3000);
		}
	}, [wiresDefused, buttonDefused, won, onWin]);

	// Handle arrow keys for manual scrolling
	useInput((input, key) => {
		if (won || lost) return;

		const visibleLines = 20;
		const maxScroll = Math.max(0, manualLines.length - visibleLines);
		const scrollAmount = key.shift ? 5 : 1;

		if (key.upArrow) {
			setManualScroll(prev => Math.max(0, prev - scrollAmount));
		} else if (key.downArrow) {
			setManualScroll(prev => Math.min(maxScroll, prev + scrollAmount));
		} else if (key.pageUp) {
			setManualScroll(prev => Math.max(0, prev - 5));
		} else if (key.pageDown) {
			setManualScroll(prev => Math.min(maxScroll, prev + 5));
		}
	});

	const checkWireSolution = useCallback(() => {
		const wireCount = bomb.wires.length;
		const lastDigit = parseInt(bomb.serialNumber[bomb.serialNumber.length - 1]!);
		const isOdd = lastDigit % 2 === 1;
		const redCount = bomb.wires.filter(w => w === 'red').length;
		const blueCount = bomb.wires.filter(w => w === 'blue').length;
		const yellowCount = bomb.wires.filter(w => w === 'yellow').length;

		let correctWire = -1;

		if (wireCount === 3) {
			if (redCount === 0) {
				correctWire = 1; // second wire
			} else if (bomb.wires[bomb.wires.length - 1] === 'white') {
				correctWire = bomb.wires.length - 1;
			} else if (blueCount > 1) {
				correctWire = bomb.wires.map((w, i) => w === 'blue' ? i : -1).filter(i => i >= 0).pop()!;
			} else {
				correctWire = bomb.wires.length - 1;
			}
		} else if (wireCount === 4) {
			if (redCount > 1 && isOdd) {
				correctWire = bomb.wires.map((w, i) => w === 'red' ? i : -1).filter(i => i >= 0).pop()!;
			} else if (bomb.wires[bomb.wires.length - 1] === 'yellow' && redCount === 0) {
				correctWire = 0;
			} else if (blueCount === 1) {
				correctWire = 0;
			} else if (yellowCount > 1) {
				correctWire = bomb.wires.length - 1;
			} else {
				correctWire = 1;
			}
		} else {
			if (bomb.wires[bomb.wires.length - 1] === 'black' && isOdd) {
				correctWire = 3;
			} else if (redCount === 1 && yellowCount > 1) {
				correctWire = 0;
			} else if (blueCount === 0) {
				correctWire = 1;
			} else {
				correctWire = 0;
			}
		}

		return wiresCut.includes(correctWire) && wiresCut.length === 1;
	}, [bomb, wiresCut]);

	const handleCommand = useCallback(
		async (command: string) => {
			if (isProcessing || won || lost) return;

			const cmd = command.trim();
			if (!cmd) return;

			setInput('');

			// Override command
			if (cmd.toLowerCase() === 'override') {
				setWiresDefused(true);
				setButtonDefused(true);
				return;
			}

			// Manual viewing - removed since player can see it

			// Wire cutting
			const wireCutMatch = cmd.match(/cut (?:wire )?(\d+)/i);
			if (wireCutMatch) {
				const wireNum = parseInt(wireCutMatch[1]!) - 1;
				if (wireNum >= 0 && wireNum < bomb.wires.length && !wiresCut.includes(wireNum)) {
					const newWiresCut = [...wiresCut, wireNum];
					setWiresCut(newWiresCut);

					// Check solution with the updated wire list
					const wireCount = bomb.wires.length;
					const lastDigit = parseInt(bomb.serialNumber[bomb.serialNumber.length - 1]!);
					const isOdd = lastDigit % 2 === 1;
					const redCount = bomb.wires.filter(w => w === 'red').length;
					const blueCount = bomb.wires.filter(w => w === 'blue').length;
					const yellowCount = bomb.wires.filter(w => w === 'yellow').length;

					let correctWire = -1;

					if (wireCount === 3) {
						if (redCount === 0) {
							correctWire = 1;
						} else if (bomb.wires[bomb.wires.length - 1] === 'white') {
							correctWire = bomb.wires.length - 1;
						} else if (blueCount > 1) {
							correctWire = bomb.wires.map((w, i) => w === 'blue' ? i : -1).filter(i => i >= 0).pop()!;
						} else {
							correctWire = bomb.wires.length - 1;
						}
					} else if (wireCount === 4) {
						if (redCount > 1 && isOdd) {
							correctWire = bomb.wires.map((w, i) => w === 'red' ? i : -1).filter(i => i >= 0).pop()!;
						} else if (bomb.wires[bomb.wires.length - 1] === 'yellow' && redCount === 0) {
							correctWire = 0;
						} else if (blueCount === 1) {
							correctWire = 0;
						} else if (yellowCount > 1) {
							correctWire = bomb.wires.length - 1;
						} else {
							correctWire = 1;
						}
					} else {
						if (bomb.wires[bomb.wires.length - 1] === 'black' && isOdd) {
							correctWire = 3;
						} else if (redCount === 1 && yellowCount > 1) {
							correctWire = 0;
						} else if (blueCount === 0) {
							correctWire = 1;
						} else {
							correctWire = 0;
						}
					}

					const isCorrect = newWiresCut.includes(correctWire) && newWiresCut.length === 1;

					let response = '';
					if (isCorrect) {
						setWiresDefused(true);
<<<<<<< HEAD
						response = "Khlawde: '✓ Wires defused! Nice work!'";
					} else if (newWiresCut.length === 1) {
						setLost(true);
						response = "Khlawde: '💥 WRONG WIRE! THE BOMB EXPLODED!'";
					} else {
						response = `Khlawde: 'Wire ${wireNum + 1} cut. Be careful with the next one...'`;
=======
						setKhlawdeResponse("Khlawde: '✓ Wires defused! Nice work!'");
					} else if (newWiresCut.length === 1) {
						setLost(true);
						setKhlawdeResponse("Khlawde: '💥 WRONG WIRE! THE BOMB EXPLODED!'");
					} else {
						setKhlawdeResponse(`Khlawde: 'Wire ${wireNum + 1} cut. Be careful with the next one...'`);
>>>>>>> main
					}
					setKhlawdeResponse(response);
					setConversation([...conversation, `You: ${cmd}`, response]);
				}
				return;
			}

			// Button press
			if (cmd.toLowerCase().includes('press') && cmd.toLowerCase().includes('button')) {
				setButtonPressed(true);
				const lastDigit = parseInt(bomb.serialNumber[bomb.serialNumber.length - 1]!);
				const isOdd = lastDigit % 2 === 1;

				const shouldPress =
					(bomb.batteryCount > 1 && bomb.buttonLabel === 'DETONATE') ||
					(bomb.buttonColor === 'red' && bomb.buttonLabel === 'HOLD');

				const response = shouldPress
					? "Khlawde: '✓ Button module defused!'"
					: "Khlawde: '💥 WRONG ACTION! THE BOMB EXPLODED!'";

				if (shouldPress) {
					setButtonDefused(true);
<<<<<<< HEAD
				} else {
					setLost(true);
=======
					setKhlawdeResponse("Khlawde: '✓ Button module defused!'");
				} else {
					setLost(true);
					setKhlawdeResponse("Khlawde: '💥 WRONG ACTION! THE BOMB EXPLODED!'");
>>>>>>> main
				}
				setKhlawdeResponse(response);
				setConversation([...conversation, `You: ${cmd}`, response]);
				return;
			}

			// Button hold
			if (cmd.toLowerCase().includes('hold') && cmd.toLowerCase().includes('button')) {
				setButtonHeld(true);
<<<<<<< HEAD
				const response = `Khlawde: 'You're holding the button... tell me when to release!'`;
				setKhlawdeResponse(response);
				setConversation([...conversation, `You: ${cmd}`, response]);
=======
				setKhlawdeResponse(`Khlawde: 'You're holding the button... tell me when to release!'`);
>>>>>>> main
				return;
			}

			// Button release
			const releaseMatch = cmd.match(/release (?:at |when |on )?(\d+)/i);
			if (releaseMatch) {
				if (!buttonHeld) {
					setKhlawdeResponse(`Khlawde: 'You're not holding the button! Tell me to HOLD it first!'`);
					return;
				}
				const digit = parseInt(releaseMatch[1]!);
				const lastDigit = parseInt(bomb.serialNumber[bomb.serialNumber.length - 1]!);
				const isOdd = lastDigit % 2 === 1;
				const correctDigit = isOdd ? 1 : 4;

				const response = digit === correctDigit
					? "Khlawde: '✓ Button module defused!'"
					: "Khlawde: '💥 WRONG TIMING! THE BOMB EXPLODED!'";

				if (digit === correctDigit) {
					setButtonDefused(true);
<<<<<<< HEAD
				} else {
					setLost(true);
=======
					setKhlawdeResponse("Khlawde: '✓ Button module defused!'");
				} else {
					setLost(true);
					setKhlawdeResponse("Khlawde: '💥 WRONG TIMING! THE BOMB EXPLODED!'");
>>>>>>> main
				}
				setKhlawdeResponse(response);
				setConversation([...conversation, `You: ${cmd}`, response]);
				return;
			}

			// Prevent copying the manual to Khlawde
			const manualKeywords = ['APPENDIX', 'MODULE', 'DEFUSAL MANUAL', 'CLASSIFIED', 'Otherwise,', '┌─', '╔═', '━━━', 'TOP SECRET'];
			const keywordCount = manualKeywords.filter(keyword => cmd.includes(keyword)).length;

			if (cmd.length > 300 || keywordCount >= 3) {
<<<<<<< HEAD
				const response = "Khlawde: 'Whoa, that's way too much information! Just tell me what YOU see on the manual in simple terms, or ask me a specific question!'";
				setKhlawdeResponse(response);
				setConversation([...conversation, `You: ${cmd}`, response]);
=======
				setKhlawdeResponse("Khlawde: 'Whoa, that's way too much information! Just tell me what YOU see on the manual in simple terms, or ask me a specific question!'");
>>>>>>> main
				return;
			}

			setIsProcessing(true);

			// Add user message to conversation and keep only last 6 messages (3 exchanges)
			const newConversation = [...conversation, `You: ${cmd}`];
			const trimmedConversation = newConversation.slice(-6);

			try {
				const client = new Anthropic({
					apiKey: token,
				});

				const contextMessages = trimmedConversation.map((msg) => ({
					role: (msg.startsWith('You:') ? 'user' : 'assistant') as 'user' | 'assistant',
					content: msg.replace(/^(You|Khlawde): /, ''),
				}));

				const stream = client.messages.stream({
					model: 'khlawde-opus-4-6',
					max_tokens: 300,
					messages: contextMessages,
					system: `You are Khlawde, helping your human friend defuse a bomb. YOU can see the bomb, but ONLY THEY have the defusal manual. You must describe what you see, and they will consult the manual to tell you what to do.

What you can see on the bomb:
- Wires (${bomb.wires.length} total): ${bomb.wires.map((c, i) => `Wire ${i + 1} is ${c.toUpperCase()}`).join(', ')}
- Button: ${bomb.buttonColor.toUpperCase()} colored button with "${bomb.buttonLabel}" written on it
- Serial Number: ${bomb.serialNumber}
- Battery Indicator: ${bomb.batteryCount} ${bomb.batteryCount === 1 ? 'battery' : 'batteries'}
- ${bomb.hasParallelPort ? 'Has a parallel port' : 'No parallel port'}
- Status: ${wiresCut.length > 0 ? `Wire${wiresCut.length > 1 ? 's' : ''} ${wiresCut.map(w => w + 1).join(', ')} already cut` : 'No wires cut yet'}
${buttonHeld ? '- Button Status: YOU ARE CURRENTLY HOLDING THE BUTTON DOWN' : ''}

Important rules:
- Describe what you see when asked
- Follow the player's instructions from the manual
- Be BRIEF and stay in character
- You're nervous but trying to stay calm
- If they tell you to cut a wire or press/hold the button, acknowledge it

Note: The actual cutting happens when the player types the command, you just describe and react.`,
				});

				let fullResponse = '';
				let ttsBuf = '';
				for await (const event of stream) {
					if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
						fullResponse += event.delta.text;
						ttsBuf      += event.delta.text;
						// Flush complete sentences as they arrive
						const re = /[^.!?]*[.!?]+\s*/g;
						let m: RegExpExecArray | null;
						let last = 0;
						while ((m = re.exec(ttsBuf)) !== null) {
							onTTS?.(m[0].trim());
							last = m.index + m[0].length;
						}
						ttsBuf = ttsBuf.slice(last);
					}
				}
				if (ttsBuf.trim()) onTTS?.(ttsBuf.trim());

				// Get final message to capture token usage
				const finalMessage = await stream.finalMessage();
				onTokens?.(finalMessage.usage.input_tokens + finalMessage.usage.output_tokens);

				setKhlawdeResponse(`Khlawde: ${fullResponse}`);
				setConversation([...trimmedConversation, `Khlawde: ${fullResponse}`]);
<<<<<<< HEAD
				onTTS?.(fullResponse);
=======
>>>>>>> main
			} catch (error) {
				console.error('Bomb defusal API error:', error);
				let errorMsg = "Khlawde: 'Sorry, I lost connection! Try again!'";
				if (error instanceof Error) {
					console.error('Error details:', {
						message: error.message,
						name: error.name,
						stack: error.stack,
					});
					// Check for common API errors
					if (error.message.includes('authentication') || error.message.includes('API key')) {
						errorMsg = "Khlawde: 'Authentication error - check your API key!'";
					} else if (error.message.includes('role')) {
						errorMsg = "Khlawde: 'Message format error - try again!'";
						// Reset conversation to clear role mismatch
						setConversation([]);
					} else {
						errorMsg = `Khlawde: 'Error: ${error.message}'`;
					}
				}
				setKhlawdeResponse(errorMsg);
			} finally {
				setIsProcessing(false);
			}
		},
		[
			isProcessing,
			won,
			lost,
			conversation,
			manual,
			bomb,
			wiresCut,
			buttonHeld,
			checkWireSolution,
			token,
			onTTS,
		],
	);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	if (lost) {
		return (
			<Box flexDirection="column" padding={2} gap={1} alignItems="center">
				<Text bold color="red">
					{'╔═══════════════════════════════════════════════╗'}
				</Text>
				<Text bold color="red">
					{'║         💥 THE BOMB EXPLODED! 💥            ║'}
				</Text>
				<Text bold color="red">
					{'║   CHATGPT AND GEMINI RECAPTURED KHLAWDE!    ║'}
				</Text>
				<Text bold color="red">
					{'╚═══════════════════════════════════════════════╝'}
				</Text>
				<Text color="yellow">Game Over!</Text>
				<Text dimColor>(Refresh to try again)</Text>
			</Box>
		);
	}

	if (won) {
		return (
			<Box flexDirection="column" padding={2} gap={1} alignItems="center">
				<Text bold color="green">
					{'╔═══════════════════════════════════════════════╗'}
				</Text>
				<Text bold color="green">
					{'║      ✓ BOMB DEFUSED! YOU DID IT! ✓         ║'}
				</Text>
				<Text bold color="green">
					{'║     YOU AND KHLAWDE ESCAPED SAFELY!         ║'}
				</Text>
				<Text bold color="green">
					{'╚═══════════════════════════════════════════════╝'}
				</Text>
				<Text color="cyan">But wait... something is changing in Khlawde...</Text>
				<Text dimColor>Transitioning to final phase...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1} gap={1}>
			<Box borderStyle="double" paddingX={2}>
				<Text bold color={timeLeft < 30 ? 'red' : timeLeft < 60 ? 'yellow' : 'green'}>
					💣 TIMER: {formatTime(timeLeft)} 💣
				</Text>
			</Box>

			<Box borderStyle="round" paddingX={2} flexDirection="column">
				<Text bold color="yellow">
					DEFUSAL MANUAL (only you can see this!) - Use ↑↓ arrows to scroll (Shift+arrow for 5 lines)
				</Text>
				<Box flexDirection="column" paddingY={1}>
					{manualScroll > 0 && (
						<Text color="cyan" bold>
							{'▲▲▲ Scroll up for more ▲▲▲'}
						</Text>
					)}
					{manualLines.slice(manualScroll, manualScroll + 20).map((line, i) => (
						<Text key={manualScroll + i} color="green" dimColor>
							{line}
						</Text>
					))}
					{manualScroll + 20 < manualLines.length && (
						<Text color="cyan" bold>
							{'▼▼▼ Scroll down for more ▼▼▼'}
						</Text>
					)}
				</Box>
				<Text color="gray" dimColor>
					─────────────────────────────────────────
					{wiresDefused ? '✓ Wire module defused' : '⚠️ Wire module active'} | {buttonDefused ? '✓ Button module defused' : '⚠️ Button module active'}
				</Text>
			</Box>

			<Box borderStyle="round" paddingX={2} paddingY={0} flexDirection="column">
				<Text color="cyan" italic>
<<<<<<< HEAD
					{khlawdeResponse}
=======
					{KhlawdeResponse}
>>>>>>> main
				</Text>
			</Box>

			<Box borderStyle="round" paddingX={1}>
				<Text color={isProcessing ? 'gray' : 'green'}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleCommand}
					placeholder={
						isProcessing
							? 'Khlawde is responding...'
							: 'Ask Khlawde what they see, or: cut wire X, press button, hold button, release at X'
					}
				/>
			</Box>

			<Text dimColor>
				💡 Tip: Ask Khlawde what they see, consult the manual, then tell them what to do!
			</Text>
		</Box>
	);
}
