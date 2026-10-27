import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card } from '@/components/ui';
import { describeCycle, generateRhythm, isCorrectTap, MAX_RHYTHM_LEVEL, PADS, padName, type Pad } from '@/games/ritmo';
import { mulberry32 } from '@/games/rng';
import { roundsFor, type GameProps } from '@/games/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { RoundBar, RoundResult, useGameRounds } from './GameParts';

const LIT_MS = 450;
const GAP_MS = 200;

type Phase = 'viendo' | 'tu_turno' | 'acierto' | 'fallo';

export function RitmoGame({ startLevel, onFinish, seed, rounds }: GameProps) {
  const game = useGameRounds({ rounds: rounds ?? roundsFor('ritmo'), startLevel, maxLevel: MAX_RHYTHM_LEVEL, onFinish });
  const [rng] = useState(() => mulberry32(seed ?? Date.now()));
  return (
    <View style={styles.wrap}>
      <RoundBar round={game.round} rounds={game.rounds} score={game.score} />
      <Round key={game.round} level={game.level} rng={rng} isLast={game.round + 1 >= game.rounds} onDone={game.finishRound} />
    </View>
  );
}

function Round({ level, rng, isLast, onDone }: { level: number; rng: () => number; isLast: boolean; onDone: (solved: boolean) => void }) {
  const { colors } = useTheme();
  const [rhythm] = useState(() => generateRhythm(level, rng));
  const [phase, setPhase] = useState<Phase>('viendo');
  const [lit, setLit] = useState<number | null>(null);
  const [replays, setReplays] = useState(0);
  const [tapped, setTapped] = useState<number[]>([]);

  // Reproduce el ritmo: cada color se enciende en orden. Al terminar es el turno del estudiante.
  useEffect(() => {
    if (phase !== 'viendo') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    rhythm.shown.forEach((id, i) => {
      timers.push(setTimeout(() => setLit(id), 500 + i * (LIT_MS + GAP_MS)));
      timers.push(setTimeout(() => setLit(null), 500 + i * (LIT_MS + GAP_MS) + LIT_MS));
    });
    timers.push(setTimeout(() => setPhase('tu_turno'), 500 + rhythm.shown.length * (LIT_MS + GAP_MS)));
    return () => timers.forEach(clearTimeout);
  }, [phase, replays, rhythm]);

  const replay = () => {
    setTapped([]);
    setReplays((n) => n + 1);
    setPhase('viendo');
  };

  const tap = (pad: Pad) => {
    if (phase !== 'tu_turno') return;
    if (!isCorrectTap(rhythm.expected, tapped.length, pad.id)) {
      setTapped([...tapped, pad.id]);
      setPhase('fallo');
      return;
    }
    const next = [...tapped, pad.id];
    setTapped(next);
    if (next.length === rhythm.expected.length) setPhase('acierto');
  };

  const finished = phase === 'acierto' || phase === 'fallo';

  return (
    <>
      <Card accent={colors.accent}>
        <Text style={[styles.title, { color: colors.text }]}>
          {phase === 'viendo' ? 'Mira el ritmo…' : phase === 'tu_turno' ? 'Ahora continúalo' : 'Así sigue el patrón'}
        </Text>
        <Body muted>Hay un patrón que se repite. Descúbrelo y toca lo que sigue.</Body>
        <View style={styles.sequence}>
          {rhythm.shown.map((id, i) => (
            <Chip key={`s${i}`} pad={PADS[id]!} />
          ))}
          {rhythm.expected.map((id, i) => {
            const entered = tapped[i];
            return entered === undefined ? (
              <View key={`e${i}`} style={[styles.chip, styles.empty, { borderColor: colors.textMuted }]} accessibilityLabel="Falta">
                <Text style={{ color: colors.textMuted, fontWeight: '800' }}>?</Text>
              </View>
            ) : (
              <Chip key={`e${i}`} pad={PADS[entered]!} wrong={entered !== id} />
            );
          })}
        </View>
      </Card>

      <View style={styles.pads}>
        {PADS.map((pad) => (
          <Pressable
            key={pad.id}
            onPress={() => tap(pad)}
            disabled={phase !== 'tu_turno'}
            accessibilityRole="button"
            accessibilityLabel={pad.label}
            style={[
              styles.pad,
              { backgroundColor: pad.color, opacity: lit === pad.id ? 1 : phase === 'tu_turno' ? 0.9 : 0.45 },
              lit === pad.id && styles.padLit,
            ]}
          >
            <Ionicons name={pad.icon} size={34} color="#FFFFFF" />
            <Text style={styles.padText}>{pad.label}</Text>
          </Pressable>
        ))}
      </View>

      {!finished ? (
        <Button label="Ver el ritmo otra vez" icon="refresh" variant="ghost" compact disabled={phase === 'viendo'} onPress={replay} />
      ) : (
        <RoundResult
          ok={phase === 'acierto'}
          title={phase === 'acierto' ? '¡Descubriste el patrón!' : 'Casi'}
          nextLabel={isLast ? 'Ver resultado' : 'Siguiente'}
          onNext={() => onDone(phase === 'acierto')}
        >
          {`El patrón era: ${describeCycle(rhythm.cycle)}, y vuelve a empezar. Lo que seguía: ${rhythm.expected.map(padName).join(', ')}.`}
        </RoundResult>
      )}
    </>
  );
}

function Chip({ pad, wrong }: { pad: Pad; wrong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.chip, { backgroundColor: pad.color, borderColor: wrong ? colors.danger : 'transparent', borderWidth: wrong ? 3 : 0 }]}
      accessibilityLabel={pad.label}
    >
      <Ionicons name={pad.icon} size={14} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  title: { fontSize: 20, fontWeight: '800' },
  sequence: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 2, borderStyle: 'dashed' },
  pads: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  pad: { width: '47%', height: 104, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
  padLit: { transform: [{ scale: 1.06 }], borderWidth: 4, borderColor: '#FFFFFF' },
  padText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
