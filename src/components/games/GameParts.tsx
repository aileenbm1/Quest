import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, ProgressBar } from '@/components/ui';
import type { GameOutcome } from '@/games/types';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Lleva la cuenta de rondas, aciertos y nivel. Acertar sube el nivel y fallar lo baja,
 * así la dificultad se ajusta sola. Al terminar la última ronda llama a `onFinish`.
 */
export function useGameRounds({
  rounds,
  startLevel,
  maxLevel,
  onFinish,
}: {
  rounds: number;
  startLevel: number;
  maxLevel: number;
  onFinish: (outcome: GameOutcome) => void;
}) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(Math.min(maxLevel, Math.max(1, startLevel)));
  const [startedAt] = useState(() => Date.now());

  const finishRound = useCallback(
    (solved: boolean) => {
      const nextScore = score + (solved ? 1 : 0);
      const nextLevel = Math.min(maxLevel, Math.max(1, level + (solved ? 1 : -1)));
      if (round + 1 >= rounds) {
        onFinish({ score: nextScore, maxScore: rounds, level: nextLevel, timeMs: Date.now() - startedAt });
        return;
      }
      setScore(nextScore);
      setLevel(nextLevel);
      setRound(round + 1);
    },
    [level, maxLevel, onFinish, round, rounds, score, startedAt],
  );

  return { round, score, level, rounds, finishRound };
}

export function RoundBar({ round, rounds, score }: { round: number; rounds: number; score: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bar}>
      <View style={styles.barRow}>
        <Text style={[styles.barText, { color: colors.text }]}>
          Ronda {round + 1} de {rounds}
        </Text>
        <Text style={[styles.barText, { color: colors.textMuted }]}>
          {score} {score === 1 ? 'acierto' : 'aciertos'}
        </Text>
      </View>
      <ProgressBar value={round / rounds} label="Progreso de la partida" height={8} />
    </View>
  );
}

/** Mensaje al terminar una ronda: acierto o intento fallido, con explicación y botón para seguir. */
export function RoundResult({
  ok,
  title,
  children,
  nextLabel,
  onNext,
}: {
  ok: boolean;
  title: string;
  children?: ReactNode;
  nextLabel: string;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card accent={ok ? colors.success : colors.warning} style={{ backgroundColor: ok ? colors.successSoft : colors.warningSoft }}>
      <View style={styles.resultRow}>
        <Ionicons name={ok ? 'checkmark-circle' : 'bulb'} size={26} color={ok ? colors.success : colors.warning} />
        <Text style={[styles.resultTitle, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {typeof children === 'string' ? <Body>{children}</Body> : children}
      <Button label={nextLabel} icon="arrow-forward" onPress={onNext} />
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 6 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barText: { fontWeight: '700', fontSize: 15 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
});
