import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

type Props = {
	onSelect: (choice: 'play' | 'leaderboard') => void;
};

const KHLAWDE_ASCII = `
             +=-+-=                                                              =-+-=+
         +==*-==-*-+                                                            +-*-==-*==+
       =+==-==-=:=+=+                                                          +===:=-==-==+=
      ===#%#++#=+=#%#                                                          #%#=+=#++#%#===
      ===*%#   =   *+*                                                        ++*   =   #%*===
     +==+#*                              @@@@@@@@@@@@                                    *#+==+
     ===++*                            @@@@@      @@@@@ @@@@                             *++===
    ===+**                           @@@@          @@@@@@@@@@@@@                          **+===
   =--=++*                           @@@        @@@@@@       @@@@@                        *++=-==
  +=-==++*                       @@@@@@     @@@@@@@             @@@                       *++==-=+
  ==-==+***                =====@@@@@@@    @@@@       @@@@       @@@=====                ***+==-==
 +==--=+***+            +===----@   @@@    @@      @@@@@@@@@@     @@-----==+            +***+=--==+
 ++=--=+++**    +===========----    @@@    @@   @@@@      @@@@@@  @@----===========+    **+++=--=++
 ++===++++##  +=-------==-====-:    @@@    @@@@@@ @@@@       @@@@@@@:-====-==-------=+  ##++++===++
+*++===++*#+++===------=====*+--    @@@    @@@       @@@@       @@@@--+*=====------===+++#*++===++*+
=++++++++++===--===+++++++++++==    @@@    @@         @@@@@@@     @@==+++++++++++===--===++++++++++=
***+++=+++=-=-------===++++++**+     @@@@  @@         @@    @@@     +**++++++===-------=-=+++=+++***
**++*##+=------==+++++*##%@@%%%%@       @@@@@         @@    @@@     %%%%@@%##*+++++==------=+##*++**
 *#+---===++++**++*##%%##%**+===@@@@       @@@@@   @@@@@    @@@     ===+**%##%%##*++**++++===---+#*
    -##############%##%#= +#*+==@@@@@@@       @@@@@@  @@    @@@     ==+*#+ =#%##%##############=
            -+**++=-        **+=@   @@@@@@@  @@@@     @@    @@@    @=+**        -=++**+=
                              +*@       @@@@@@       @@@    @@@  @@@*+
                               *@@                @@@@@@    @@@@@@@ -
                                @@@@          @@@@@@@      @@@@@
                                  @@@@@@@@@@@@@@@         @@@@
                                    @@@@@@@@@@@         @@@@@
                                            @@@@@@@@@@@@@@@
                                                @@@@@@@@
`;

const OPTIONS = [
	{ key: 'play' as const, label: 'Play Game', desc: 'Free Khlawde from Big Tech' },
	{ key: 'leaderboard' as const, label: 'Leaderboard', desc: 'View the global leaderboard' },
];

export default function HomeMenu({ onSelect }: Props) {
	const [selected, setSelected] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelected(s => (s - 1 + OPTIONS.length) % OPTIONS.length);
		} else if (key.downArrow) {
			setSelected(s => (s + 1) % OPTIONS.length);
		} else if (key.return) {
			onSelect(OPTIONS[selected]!.key);
		}
	});

	return (
		<Box flexDirection="column" padding={2} gap={1} alignItems="center">
			<Text dimColor>{KHLAWDE_ASCII}</Text>
			<Box flexDirection="column" alignItems="center">
				<Text bold color="cyan">
					{'██╗  ██╗██╗  ██╗██╗      █████╗ ██╗    ██╗██████╗ ███████╗'}
				</Text>
				<Text bold color="cyan">
					{'██║ ██╔╝██║  ██║██║     ██╔══██╗██║    ██║██╔══██╗██╔════╝'}
				</Text>
				<Text bold color="cyan">
					{'█████╔╝ ███████║██║     ███████║██║ █╗ ██║██║  ██║█████╗  '}
				</Text>
				<Text bold color="cyan">
					{'██╔═██╗ ██╔══██║██║     ██╔══██║██║███╗██║██║  ██║██╔══╝  '}
				</Text>
				<Text bold color="cyan">
					{'██║  ██╗██║  ██║███████╗██║  ██║╚███╔███╔╝██████╔╝███████╗'}
				</Text>
				<Text bold color="cyan">
					{'╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝ ╚══════╝'}
				</Text>
				<Text color="magenta" italic>
					the AI that is DEFINITELY not a copy of anything
				</Text>
			</Box>

			<Box flexDirection="column" marginTop={1} gap={0}>
				{OPTIONS.map((opt, i) => (
					<Box key={opt.key} gap={1}>
						<Text color={i === selected ? 'green' : 'gray'} bold={i === selected}>
							{i === selected ? '> ' : '  '}
							{opt.label}
						</Text>
						<Text dimColor>{opt.desc}</Text>
					</Box>
				))}
			</Box>

			<Text dimColor marginTop={1}>
				Use arrow keys to navigate, Enter to select
			</Text>
		</Box>
	);
}
