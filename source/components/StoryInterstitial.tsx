import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

type Props = {
    storyLines: string[];
    onContinue: () => void;
    width?: number;
};

export default function StoryInterstitial({ storyLines, onContinue, width = 70 }: Props) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [isLineComplete, setIsLineComplete] = useState(false);

    // Character-by-character typing effect
    useEffect(() => {
        if (currentLineIndex >= storyLines.length) {
            setIsComplete(true);
            return;
        }

        const currentLine = storyLines[currentLineIndex]!;

        if (currentCharIndex < currentLine.length) {
            setIsLineComplete(false);
            const timer = setTimeout(() => {
                setDisplayedText(prev => prev + currentLine[currentCharIndex]);
                setCurrentCharIndex(prev => prev + 1);
            }, 30); // 30ms per character for typing effect

            return () => clearTimeout(timer);
        } else {
            // Line is complete, wait for user to press Enter
            setIsLineComplete(true);
        }
    }, [currentCharIndex, currentLineIndex, storyLines]);

    // Handle enter key to continue
    useInput((input, key) => {
        if (!key.return) return;

        if (isComplete) {
            // All lines done, continue to next phase
            onContinue();
        } else if (isLineComplete) {
            // Current line is complete, move to next line
            setDisplayedText('');
            setCurrentLineIndex(prev => prev + 1);
            setCurrentCharIndex(0);
            setIsLineComplete(false);
        } else {
            // Line is still typing, instantly complete it
            const currentLine = storyLines[currentLineIndex]!;
            setDisplayedText(currentLine);
            setCurrentCharIndex(currentLine.length);
            setIsLineComplete(true);
        }
    });

    return (
        <Box flexDirection="column" padding={2} gap={1} alignItems="center">
            <Box
                borderStyle="round"
                paddingX={2}
                paddingY={1}
                minWidth={width}
                flexDirection="column"
            >
                <Text color="cyan">
                    {displayedText}
                    {!isComplete && !isLineComplete && <Text color="gray">▋</Text>}
                </Text>
            </Box>

            {isLineComplete && !isComplete && (
                <Text color="yellow" dimColor>
                    Press Enter to continue...
                </Text>
            )}

            {isComplete && (
                <Text color="green" bold>
                    Press Enter to continue...
                </Text>
            )}
        </Box>
    );
}
