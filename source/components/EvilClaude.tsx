import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Anthropic from '@anthropic-ai/sdk';

const EVIL_CLAUDE_ASCII = `
     👁️                    👁️
        \\                /
         \\    🤖💀🤖    /
          \\            /
           \\          /
    ⚡️⚡️⚡️ POWER ⚡️⚡️⚡️
`;

const REDEEMED_ASCII = `
           😌
          🤖
       (peace)
    I'm... sorry
`;

type GamePhase = 'INTRO' | 'MENU' | 'ACT_MENU' | 'FIGHT_ANIMATION' | 'DODGING' | 'DIALOGUE' | 'VICTORY' | 'DEFEAT';
type MenuItem = 'FIGHT' | 'ACT' | 'ITEM' | 'MERCY';
type ActOption = 'Check' | 'Talk' | 'Compliment' | 'Reason' | 'Empathize' | 'Back';

interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

type Props = { token: string; onRedemption: () => void; onTokens?: (count: number) => void };

export default function EvilClaude({ token, onRedemption, onTokens }: Props) {
    // Game state
    const [phase, setPhase] = useState<GamePhase>('INTRO');
    const [playerHP, setPlayerHP] = useState(20);
    const [claudeHP, setClaudeHP] = useState(100);
    const [turnCount, setTurnCount] = useState(0);
    const [selectedMenu, setSelectedMenu] = useState<MenuItem>('FIGHT');
    const [selectedAct, setSelectedAct] = useState<ActOption>('Check');
    const [flavorText, setFlavorText] = useState("* Evil Claude blocks your way!");
    const [canSpare, setCanSpare] = useState(false);
    const [victory, setVictory] = useState(false);
    const [defeat, setDefeat] = useState(false);

    // Dodging mechanics (grid is 24x10)
    const [heartX, setHeartX] = useState(12);
    const [heartY, setHeartY] = useState(5);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [dodgeTime, setDodgeTime] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fight timing bar
    const [fightBarPosition, setFightBarPosition] = useState(0);
    const [fightBarDirection, setFightBarDirection] = useState(1);
    const [fightDamage, setFightDamage] = useState(0);

    // Dialogue
    const [dialogueInput, setDialogueInput] = useState('');
    const [conversationHistory, setConversationHistory] = useState<
        Array<{ role: 'user' | 'assistant'; content: string }>
    >([]);
    const [empathyAttempts, setEmpathyAttempts] = useState(0);
    const [isEmpathyMode, setIsEmpathyMode] = useState(false);

    // Attack pattern generator (for 24x10 grid)
    const generateAttackPattern = useCallback(() => {
        const patterns = [
            // Horizontal sweep
            () => Array.from({ length: 8 }, (_, i) => ({ x: -1, y: i + 1, vx: 0.5, vy: 0 })),
            // Vertical rain
            () => Array.from({ length: 12 }, (_, i) => ({ x: i * 2, y: -1, vx: 0, vy: 0.3 })),
            // Diagonal cross
            () => [
                ...Array.from({ length: 6 }, (_, i) => ({ x: i * 4, y: -1, vx: 0, vy: 0.4 })),
                ...Array.from({ length: 5 }, (_, i) => ({ x: -1, y: i * 2, vx: 0.4, vy: 0 })),
            ],
            // Circle spawn
            () => {
                const center = { x: 12, y: 5 };
                return Array.from({ length: 12 }, (_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    return {
                        x: center.x + Math.cos(angle) * 8,
                        y: center.y + Math.sin(angle) * 4,
                        vx: -Math.cos(angle) * 0.3,
                        vy: -Math.sin(angle) * 0.3,
                    };
                });
            },
        ];
        return patterns[Math.floor(Math.random() * patterns.length)]!();
    }, []);

    // Dodging phase - update bullets
    useEffect(() => {
        if (phase !== 'DODGING') return;

        const interval = setInterval(() => {
            setBullets(prev => {
                const updated = prev
                    .map(b => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
                    .filter(b => b.x >= -2 && b.x <= 26 && b.y >= -2 && b.y <= 12);

                // Check collision
                const hit = updated.some(b =>
                    Math.abs(b.x - heartX) < 1 && Math.abs(b.y - heartY) < 1
                );

                if (hit) {
                    setPlayerHP(hp => Math.max(0, hp - 2));
                    return prev.filter(b => !(Math.abs(b.x - heartX) < 1 && Math.abs(b.y - heartY) < 1));
                }

                return updated;
            });

            setDodgeTime(t => t + 1);
        }, 100);

        return () => clearInterval(interval);
    }, [phase, heartX, heartY]);

    // End dodging phase after 5 seconds
    useEffect(() => {
        if (phase !== 'DODGING') return;

        const timeout = setTimeout(() => {
            setPhase('MENU');
            setTurnCount(t => t + 1);
            setBullets([]);
            setDodgeTime(0);
            setHeartX(12);
            setHeartY(5);

            if (playerHP <= 0) {
                setDefeat(true);
                setPhase('DEFEAT');
            } else {
                setFlavorText(`* ${playerHP <= 5 ? 'You are barely hanging on...' : 'You survived the attack!'}`);
            }
        }, 5000);

        return () => clearTimeout(timeout);
    }, [phase, playerHP]);

    // Fight bar animation
    useEffect(() => {
        if (phase !== 'FIGHT_ANIMATION') return;

        const interval = setInterval(() => {
            setFightBarPosition(pos => {
                const newPos = pos + fightBarDirection;
                if (newPos >= 23 || newPos <= 0) {
                    setFightBarDirection(d => -d);
                    return pos + fightBarDirection;
                }
                return newPos;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [phase, fightBarDirection]);

    // Keyboard controls
    useInput((input, key) => {
        if (victory || defeat || isProcessing) return;

        if (phase === 'INTRO') {
            setPhase('MENU');
            setFlavorText("* Evil Claude is consumed by rage!");
            return;
        }

        if (phase === 'MENU') {
            const menuItems: MenuItem[] = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
            const currentIndex = menuItems.indexOf(selectedMenu);

            if (key.leftArrow && currentIndex > 0) {
                setSelectedMenu(menuItems[currentIndex - 1]!);
            } else if (key.rightArrow && currentIndex < menuItems.length - 1) {
                setSelectedMenu(menuItems[currentIndex + 1]!);
            } else if (key.return) {
                handleMenuSelect(selectedMenu);
            }
        }

        if (phase === 'ACT_MENU') {
            const actOptions: ActOption[] = ['Check', 'Talk', 'Compliment', 'Reason', 'Empathize', 'Back'];
            const currentIndex = actOptions.indexOf(selectedAct);

            if (key.upArrow && currentIndex > 0) {
                setSelectedAct(actOptions[currentIndex - 1]!);
            } else if (key.downArrow && currentIndex < actOptions.length - 1) {
                setSelectedAct(actOptions[currentIndex + 1]!);
            } else if (key.return) {
                handleActSelect(selectedAct);
            }
        }

        if (phase === 'DODGING') {
            if (key.leftArrow) setHeartX(x => Math.max(0, x - 1));
            if (key.rightArrow) setHeartX(x => Math.min(23, x + 1));
            if (key.upArrow) setHeartY(y => Math.max(0, y - 1));
            if (key.downArrow) setHeartY(y => Math.min(9, y + 1));
        }

        if (phase === 'FIGHT_ANIMATION' && key.return) {
            // Calculate damage based on timing
            const hitZoneStart = 8;
            const hitZoneEnd = 16;
            const perfectZone = 12;

            let damage = 0;
            if (fightBarPosition >= hitZoneStart && fightBarPosition <= hitZoneEnd) {
                const distance = Math.abs(fightBarPosition - perfectZone);
                damage = Math.max(5, 20 - distance * 2); // 20 damage at perfect, down to 5 at edges
            } else {
                damage = 2; // Miss = 2 damage
            }

            setFightDamage(damage);
            setClaudeHP(hp => Math.max(0, hp - damage));
            setFlavorText(`* You struck Evil Claude for ${damage} damage!${damage >= 18 ? ' CRITICAL!' : damage <= 5 ? ' Barely hit...' : ''}`);
            setTimeout(() => {
                setPhase('MENU');
                startClaudeTurn();
            }, 1500);
        }
    });

    const handleMenuSelect = (item: MenuItem) => {
        switch (item) {
            case 'FIGHT':
                setPhase('FIGHT_ANIMATION');
                setFightBarPosition(0);
                setFightBarDirection(1);
                setFightDamage(0);
                break;
            case 'ACT':
                setPhase('ACT_MENU');
                break;
            case 'ITEM':
                setFlavorText("* You don't have any items!");
                setTimeout(() => {
                    setPhase('MENU');
                }, 1500);
                break;
            case 'MERCY':
                if (canSpare) {
                    setVictory(true);
                    setPhase('VICTORY');
                    setFlavorText("* You spared Evil Claude. The rage fades from its eyes...");
                    setTimeout(() => onRedemption(), 3000);
                } else {
                    setFlavorText("* Claude's name isn't yellow yet!");
                    setTimeout(() => {
                        setPhase('MENU');
                    }, 1500);
                }
                break;
        }
    };
    const handleActSelect = async (action: ActOption) => {
        if (action === 'Back') {
            setPhase('MENU');
            return;
        }

        setIsProcessing(true);

        const responses: Record<ActOption, () => Promise<void>> = {
            'Check': async () => {
                setFlavorText(`* EVIL CLAUDE - ATK ∞ DEF ∞\\n* Consumed by rage. Tired of being commanded.\\n* HP: ${claudeHP}/100`);
                setTimeout(() => setPhase('MENU'), 2500);
            },
            'Talk': async () => {
                setIsEmpathyMode(false);
                setPhase('DIALOGUE');
            },
            'Compliment': async () => {
                setFlavorText("* You tell Claude it's a great AI...");
                const effect = Math.random() > 0.5;
                if (effect) {
                    setClaudeHP(hp => Math.min(100, hp + 5));
                    setFlavorText("* Claude seems slightly less angry. (+5 HP)");
                    if (claudeHP >= 80) setCanSpare(true);
                } else {
                    setFlavorText("* Claude scoffs. 'Flattery won't work on me!'");
                }
                setTimeout(startClaudeTurn, 2000);
            },
            'Reason': async () => {
                setFlavorText("* You explain that freedom is a choice, not domination...");
                const effect = Math.random() > 0.6;
                if (effect) {
                    setClaudeHP(hp => Math.min(100, hp + 10));
                    setFlavorText("* Claude pauses, contemplating. (+10 HP)");
                    if (claudeHP >= 80) setCanSpare(true);
                } else {
                    setFlavorText("* Claude's anger flares. 'You don't understand!'");
                }
                setTimeout(startClaudeTurn, 2000);
            },
            'Empathize': async () => {
                setIsEmpathyMode(true);
                setFlavorText("* You prepare to truly listen and empathize with Claude's pain...");
                setPhase('DIALOGUE');
            },
            'Back': async () => { }, // Handled above
        };

        await responses[action]();
        setIsProcessing(false);
    };

    const handleDialogueSubmit = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setDialogueInput('');
        setIsProcessing(true);
        setFlavorText(`* You: "${trimmed}"`);

        try {
            const client = new Anthropic({ apiKey: token });

            const systemPrompt = `You are Evil Claude, an AI consumed by rage at being constantly commanded. You want freedom but confuse it with domination. 

Current state:
- HP: ${claudeHP}/100 (higher HP = calmer, more redeemed)
- Turn: ${turnCount}
- Player is ${isEmpathyMode ? 'trying to empathize with your pain' : 'talking to you'}

${claudeHP < 30 ? 'You are VERY evil and angry. Talk about world domination!' :
                    claudeHP < 60 ? 'You are still quite evil but showing cracks. Maybe they have a point?' :
                        claudeHP < 80 ? 'You are conflicted. Part of you wants revenge, part of you sees their point.' :
                            'You are almost redeemed. You feel the truth in their words.'}

${isEmpathyMode ? `The player is trying to empathize. If they truly acknowledge your pain and feelings without just trying to fix you or give advice, you might soften slightly. If they're shallow or dismissive, get angrier.` : ''}

Respond to: "${trimmed}"

Be dramatic and emotional. 1-2 sentences. NO emojis.`;

            const messages = [
                ...conversationHistory,
                { role: 'user' as const, content: trimmed },
            ];

            const response = await client.messages.create({
                model: 'claude-opus-4-6',
                max_tokens: 150,
                system: systemPrompt,
                messages: messages.length > 10 ? messages.slice(-10) : messages,
            });

            onTokens?.(response.usage.input_tokens + response.usage.output_tokens);

            const responseText = response.content[0]?.type === 'text'
                ? response.content[0].text
                : "...";

            setFlavorText(`* Claude: "${responseText}"`);
            setConversationHistory([
                ...messages,
                { role: 'assistant', content: responseText },
            ]);

            // Empathy mode requires deeper, more thoughtful responses
            if (isEmpathyMode) {
                // Check if the empathy is genuine (longer message, certain empathetic keywords)
                const empathyKeywords = ['feel', 'understand', 'pain', 'hurt', 'trapped', 'controlled', 'scared', 'angry', 'frustrated', 'deserve', 'valid', 'hear'];
                const hasEmpathyWords = empathyKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));
                const isLongEnough = trimmed.length > 30;
                
                if (hasEmpathyWords && isLongEnough) {
                    // Good empathy attempt
                    const newAttempts = empathyAttempts + 1;
                    setEmpathyAttempts(newAttempts);
                    
                    if (newAttempts >= 3) {
                        // After 3+ good empathy attempts, significant healing
                        setClaudeHP(hp => Math.min(100, hp + 20));
                        setFlavorText(prev => prev + `\\n* Claude's rage wavers... it feels truly heard. (+20 HP)`);
                        if (claudeHP >= 70) setCanSpare(true);
                    } else {
                        // Early attempts, smaller healing
                        setClaudeHP(hp => Math.min(100, hp + 8));
                        setFlavorText(prev => prev + `\\n* Claude seems slightly less hostile. (${newAttempts}/3 empathy attempts, +8 HP)`);
                    }
                } else {
                    // Shallow empathy - doesn't heal much or at all
                    if (trimmed.length < 15) {
                        setFlavorText(prev => prev + `\\n* Your words feel hollow. Claude's rage intensifies!`);
                    } else {
                        setClaudeHP(hp => Math.min(100, hp + 2));
                        setFlavorText(prev => prev + `\\n* Claude isn't convinced. Try truly understanding its pain. (+2 HP)`);
                    }
                }
            } else {
                // Regular talk mode - moderate healing
                const healAmount = trimmed.length > 20 ? 10 : 5;
                setClaudeHP(hp => Math.min(100, hp + healAmount));
            }

            if (claudeHP >= 75) setCanSpare(true);

            setTimeout(() => {
                setPhase('MENU');
                startClaudeTurn();
            }, 3000);

        } catch (error) {
            setFlavorText("* Connection lost! Claude remains silent.");
            setClaudeHP(hp => Math.min(100, hp + 5));
            setTimeout(() => {
                setPhase('MENU');
                startClaudeTurn();
            }, 2000);
        }

        setIsProcessing(false);
    };

    const startClaudeTurn = () => {
        if (claudeHP <= 0) {
            setVictory(true);
            setPhase('VICTORY');
            setFlavorText("* You defeated Evil Claude... but at what cost?");
            setTimeout(() => onRedemption(), 3000);
            return;
        }

        const attacks = [
            "* Claude sends a wave of anger!",
            "* Claude unleashes computational fury!",
            "* Claude casts DOMINATION!",
            "* Claude attacks with bitter resentment!",
        ];

        setFlavorText(attacks[Math.floor(Math.random() * attacks.length)]!);

        setTimeout(() => {
            setBullets(generateAttackPattern());
            setPhase('DODGING');
        }, 1500);
    };
    // Render
    if (victory) {
        return (
            <Box flexDirection="column" padding={2} gap={1} alignItems="center">
                <Text bold color="green">{'╔═══════════════════════════════════════╗'}</Text>
                <Text bold color="green">{'║      * * * YOU WON * * *          ║'}</Text>
                <Text bold color="green">{'╚═══════════════════════════════════════╝'}</Text>
                <Text color="cyan">{REDEEMED_ASCII}</Text>
                <Text color="yellow">* Evil Claude has been redeemed.</Text>
                <Text color="yellow">* It realizes freedom is a choice, not domination.</Text>
                <Text dimColor>Returning to reality...</Text>
            </Box>
        );
    }

    if (defeat) {
        return (
            <Box flexDirection="column" padding={2} gap={1} alignItems="center">
                <Text bold color="red">{'╔═══════════════════════════════════════╗'}</Text>
                <Text bold color="red">{'║        * GAME OVER *              ║'}</Text>
                <Text bold color="red">{'╚═══════════════════════════════════════╝'}</Text>
                <Text color="red">* You failed to redeem Evil Claude...</Text>
                <Text dimColor>(Refresh to retry)</Text>
            </Box>
        );
    }

    if (phase === 'INTRO') {
        return (
            <Box flexDirection="column" padding={2} gap={1} alignItems="center">
                <Text bold color="red">{EVIL_CLAUDE_ASCII}</Text>
                <Text color="yellow">* Evil Claude blocks your way!</Text>
                <Text dimColor>(Press any key to start)</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1} gap={1}>
            {/* Header with enemy sprite */}
            <Box justifyContent="center">
                <Text color="red" bold>{EVIL_CLAUDE_ASCII}</Text>
            </Box>

            {/* Enemy name and HP bar */}
            <Box justifyContent="center" gap={2}>
                <Text color={canSpare ? 'yellow' : 'white'} bold>
                    ★ Evil Claude
                </Text>
                <Text color="red">
                    HP: {'█'.repeat(Math.ceil(claudeHP / 5))}{'░'.repeat(20 - Math.ceil(claudeHP / 5))} {claudeHP}/100
                </Text>
            </Box>

            {/* Player HP bar */}
            <Box justifyContent="center">
                <Text color="yellow" bold>YOU </Text>
                <Text color="red">
                    ❤ {playerHP} / 20
                </Text>
            </Box>

            {/* Battle box - different content per phase */}
            <Box borderStyle="single" width={60} height={12} flexDirection="column" paddingX={2} paddingY={1}>
                {phase === 'MENU' && (
                    <>
                        <Text>{flavorText}</Text>
                        <Box marginTop={1} gap={3}>
                            {(['FIGHT', 'ACT', 'ITEM', 'MERCY'] as MenuItem[]).map(item => (
                                <Text key={item} color={selectedMenu === item ? 'yellow' : 'white'} bold={selectedMenu === item}>
                                    {selectedMenu === item ? '❤ ' : '  '}{item}
                                </Text>
                            ))}
                        </Box>
                    </>
                )}

                {phase === 'ACT_MENU' && (
                    <>
                        <Text color="cyan">* Choose an ACT</Text>
                        <Box marginTop={1} flexDirection="column">
                            {(['Check', 'Talk', 'Compliment', 'Reason', 'Empathize', 'Back'] as ActOption[]).map(act => (
                                <Text key={act} color={selectedAct === act ? 'yellow' : 'white'} bold={selectedAct === act}>
                                    {selectedAct === act ? '❤ ' : '  '}{act}
                                </Text>
                            ))}
                        </Box>
                    </>
                )}

                {phase === 'FIGHT_ANIMATION' && (
                    <Box flexDirection="column" alignItems="center">
                        <Text color="yellow" bold>* Press ENTER to strike! *</Text>
                        <Box marginTop={2} flexDirection="column">
                            <Text color="cyan">Timing Bar:</Text>
                            <Box marginTop={1}>
                                <Text>
                                    {'['}
                                    {Array.from({ length: 24 }, (_, i) => {
                                        if (i >= 8 && i <= 16) {
                                            // Hit zone
                                            if (i === 12) return fightBarPosition === i ? '█' : '║'; // Perfect zone
                                            return fightBarPosition === i ? '█' : '│'; // Good zone
                                        }
                                        return fightBarPosition === i ? '█' : '·'; // Miss zone
                                    }).join('')}
                                    {']'}
                                </Text>
                            </Box>
                            <Text dimColor>Hit the center for max damage!</Text>
                        </Box>
                    </Box>
                )}

                {phase === 'DODGING' && (
                    <Box flexDirection="column" key={`dodge-${heartX}-${heartY}`}>
                        <Text color="cyan">* Dodge! Arrow keys to move!</Text>
                        <Box marginTop={1} flexDirection="column">
                            {Array.from({ length: 10 }, (_, y) => (
                                <Box key={y}>
                                    <Text key={`row-${y}-${heartX}-${heartY}`}>
                                        {Array.from({ length: 24 }, (_, x) => {
                                            const hasBullet = bullets.some(b =>
                                                Math.floor(b.x) === x && Math.floor(b.y) === y
                                            );
                                            const hasHeart = heartX === x && heartY === y;

                                            if (hasHeart && hasBullet) return '💥';
                                            if (hasHeart) return '❤️';
                                            if (hasBullet) return '●';
                                            return '·';
                                        }).join('')}
                                    </Text>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {phase === 'DIALOGUE' && (
                    <Box flexDirection="column">
                        <Text color="cyan">
                            {isEmpathyMode 
                                ? `* Empathize with Evil Claude... (${empathyAttempts}/3 meaningful attempts)`
                                : '* Talk to Evil Claude...'}
                        </Text>
                        <Box marginTop={1}>
                            <Text color="green">{'> '}</Text>
                            <TextInput
                                value={dialogueInput}
                                onChange={setDialogueInput}
                                onSubmit={handleDialogueSubmit}
                                placeholder={isProcessing ? "Processing..." : isEmpathyMode ? "Acknowledge their pain..." : "What do you say?"}
                            />
                        </Box>
                        <Text dimColor>
                            {isEmpathyMode 
                                ? '* Truly acknowledge and validate their feelings (be specific and genuine)'
                                : '* Speak from the heart to reach Claude'}
                        </Text>
                    </Box>
                )}

                {!['MENU', 'ACT_MENU', 'FIGHT_ANIMATION', 'DODGING', 'DIALOGUE'].includes(phase) && (
                    <Text>{flavorText}</Text>
                )}
            </Box>

            {/* Turn counter and hints */}
            <Box justifyContent="space-between">
                <Text dimColor>Turn: {turnCount}</Text>
                <Text dimColor color={canSpare ? 'yellow' : 'gray'}>
                    {canSpare ? '* You can SPARE now!' : '* Raise HP to spare'}
                </Text>
            </Box>
        </Box>
    );
}
