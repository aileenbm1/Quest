import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Card, ProgressBar } from '@/components/ui';
import { buildRound, MAX_BUG_LEVEL, type BugRound } from '@/games/cazabugs';
import { mulberry32 } from '@/games/rng';
import { roundsFor, type GameProps } from '@/games/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { RoundBar, RoundResult, useGameRounds } from './GameParts';

const SECONDS_PER_ROUND = 30;

export function CazabugsGame({ startLevel, onFinish, seed, rounds }: GameProps) {
  const game = useGameRounds({ rounds: rounds ?? roundsFor('cazabugs'), startLevel, maxLevel: MAX_BUG_LEVEL, onFinish });
  const [rng] = useState(() => mulberry32(seed ?? Date.now()));
  const [usedText, setUsedText] = useState<string[]>([]);
  return (
    <View style={styles.wrap}>
      <RoundBar round={game.round} rounds={game.rounds} score={game.score} />
      <Round
        key={game.round}
        index={game.round}
        level={game.level}
        rng={rng}
        used={usedText}
        isLast={game.round + 1 >= game.rounds}
        onDone={(solved, id) => {
          if (id.startsWith('txt-')) setUsedText((u) => [...u, id]);
          game.finishRound(solved);
        }}
      />
    </View>
  );
}

type Result = 'jugando' | 'acierto' | 'fallo' | 'tiempo';

function Round({
  index,
  level,
  rng,
  used,
  isLast,
  onDone,
}: {
  index: number;
  level: number;
  rng: () => number;
  used: string[];
  isLast: boolean;
  onDone: (solved: boolean, id: string) => void;
}) {
  const { colors } = useTheme();
  const [round] = useState<BugRound>(() => buildRound(index, level, rng, used));
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result>('jugando');
  const [left, setLeft] = useState(SECONDS_PER_ROUND);

  useEffect(() => {
    if (result !== 'jugando') return;
    const t = setTimeout(() => {
      setLeft((s) => Math.max(0, s - 1));
      if (left <= 1) setResult('tiempo');
    }, 1000);
    return () => clearTimeout(t);
  }, [left, result]);

  const choose = (i: number) => {
    if (result !== 'jugando') return;
    setPicked(i);
    setResult(i === round.bug ? 'acierto' : 'fallo');
  };

  const finished = result !== 'jugando';

  return (
    <>
      <Card accent={colors.danger}>
        <Text style={[styles.goal, { color: colors.text }]}>Meta: {round.goal}</Text>
        {round.actual ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{round.actual}</Text> : null}
        <Body muted>Toca la línea que tiene el error.</Body>
        <ProgressBar value={left / SECONDS_PER_ROUND} color={left <= 8 ? colors.danger : colors.accent} height={8} label={`Tiempo: ${left} segundos`} />
        <Text style={{ color: colors.textMuted, fontWeight: '700' }}>{finished ? 'Ronda terminada' : `${left} s`}</Text>
      </Card>

      <View style={styles.lines}>
        {round.lines.map((line, i) => {
          const isBug = i === round.bug;
          const isPicked = picked === i;
          const showBug = finished && isBug;
          const showWrong = finished && isPicked && !isBug;
          return (
            <Pressable
              key={i}
              onPress={() => choose(i)}
              disabled={finished}
              accessibilityRole="button"
              accessibilityLabel={`Línea ${i + 1}: ${line.text}`}
              style={[
                styles.line,
                {
                  marginLeft: (line.indent ?? 0) * 22,
                  backgroundColor: showBug ? colors.successSoft : showWrong ? colors.dangerSoft : colors.surface,
                  borderColor: showBug ? colors.success : showWrong ? colors.danger : colors.border,
                },
              ]}
            >
              <Text style={[styles.lineNo, { color: colors.textMuted }]}>{i + 1}</Text>
              <Text style={[styles.lineText, { color: colors.text }]}>{line.text}</Text>
            </Pressable>
          );
        })}
      </View>

      {finished ? (
        <RoundResult
          ok={result === 'acierto'}
          title={result === 'acierto' ? '¡Bug atrapado!' : result === 'tiempo' ? 'Se acabó el tiempo' : 'Ese no era el bug'}
          nextLabel={isLast ? 'Ver resultado' : 'Siguiente'}
          onNext={() => onDone(result === 'acierto', round.id)}
        >
          {`${round.explanation} Debía decir: «${round.fix}».`}
        </RoundResult>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  goal: { fontSize: 17, fontWeight: '800' },
  lines: { gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: 2 },
  lineNo: { width: 20, fontWeight: '800', textAlign: 'center' },
  lineText: { flex: 1, fontSize: 16, fontWeight: '600' },
});
