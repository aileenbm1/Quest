import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card } from '@/components/ui';
import { applyOp, describeStep, generatePuzzle, MAX_NUMBER_LEVEL, OPS, solve, type Op } from '@/games/numero';
import { mulberry32 } from '@/games/rng';
import { roundsFor, type GameProps } from '@/games/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { RoundBar, RoundResult, useGameRounds } from './GameParts';

interface Item {
  id: number;
  value: number;
}

type Phase = { kind: 'jugando' } | { kind: 'listo'; solved: boolean; solution: string };

export function NumeroGame({ startLevel, onFinish, seed, rounds }: GameProps) {
  const game = useGameRounds({ rounds: rounds ?? roundsFor('numero'), startLevel, maxLevel: MAX_NUMBER_LEVEL, onFinish });
  const [rng] = useState(() => mulberry32(seed ?? Date.now()));
  return (
    <View style={styles.wrap}>
      <RoundBar round={game.round} rounds={game.rounds} score={game.score} />
      {/* key: cada ronda es un componente nuevo y genera su propio acertijo una sola vez. */}
      <Round key={game.round} level={game.level} rng={rng} isLast={game.round + 1 >= game.rounds} onDone={game.finishRound} />
    </View>
  );
}

function Round({ level, rng, isLast, onDone }: { level: number; rng: () => number; isLast: boolean; onDone: (solved: boolean) => void }) {
  const { colors } = useTheme();
  const [puzzle] = useState(() => generatePuzzle(level, rng));
  const nextId = useRef(puzzle.numbers.length);
  const [items, setItems] = useState<Item[]>(() => puzzle.numbers.map((value, id) => ({ id, value })));
  const [history, setHistory] = useState<Item[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'jugando' });
  const playing = phase.kind === 'jugando';

  const tapItem = (item: Item) => {
    if (!playing) return;
    setMessage(null);
    if (selected === null || selected === item.id) {
      setSelected(selected === item.id ? null : item.id);
      setOp(null);
      return;
    }
    if (op === null) {
      setSelected(item.id);
      return;
    }
    const first = items.find((i) => i.id === selected)!;
    const result = applyOp(first.value, op, item.value);
    if (result === null) {
      setMessage(
        op === '−'
          ? 'Esa resta no da un número positivo. Prueba al revés o con otra operación.'
          : op === '÷'
            ? 'Esa división no es exacta. Prueba con otros números.'
            : 'Esa operación no se puede hacer.',
      );
      setOp(null);
      return;
    }
    const merged: Item = { id: nextId.current++, value: result };
    const next = [...items.filter((i) => i.id !== first.id && i.id !== item.id), merged];
    setHistory((h) => [...h, items]);
    setItems(next);
    setSelected(null);
    setOp(null);
    if (result === puzzle.target) setPhase({ kind: 'listo', solved: true, solution: '' });
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev || !playing) return;
    setHistory(history.slice(0, -1));
    setItems(prev);
    setSelected(null);
    setOp(null);
    setMessage(null);
  };

  const hint = () => {
    const steps = solve(
      items.map((i) => i.value),
      puzzle.target,
    );
    setMessage(
      steps && steps.length > 0
        ? `Pista: prueba con ${steps[0]!.a} ${steps[0]!.op} ${steps[0]!.b}.`
        : 'Con estos números ya no se puede llegar. Toca «Deshacer» y prueba otro camino.',
    );
  };

  const giveUp = () => {
    const steps = solve(puzzle.numbers, puzzle.target) ?? [];
    setPhase({ kind: 'listo', solved: false, solution: steps.map(describeStep).join('  →  ') });
  };

  return (
    <>
      <Card accent={colors.primary}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Llega a</Text>
        <Text style={[styles.target, { color: colors.primary }]} accessibilityLabel={`Meta: ${puzzle.target}`}>
          {puzzle.target}
        </Text>
        <Body muted>Toca un número, una operación y otro número. Puedes usar los que quieras.</Body>
      </Card>

      <View style={styles.items}>
        {items.map((item) => {
          const isSelected = item.id === selected;
          const isTarget = item.value === puzzle.target;
          return (
            <Pressable
              key={item.id}
              onPress={() => tapItem(item)}
              disabled={!playing}
              accessibilityRole="button"
              accessibilityLabel={`Número ${item.value}${isSelected ? ', seleccionado' : ''}`}
              style={[
                styles.item,
                {
                  backgroundColor: isTarget ? colors.success : isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.itemText, { color: isTarget || isSelected ? '#FFFFFF' : colors.text }]}>{item.value}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ops}>
        {OPS.map((o) => (
          <Pressable
            key={o}
            onPress={() => setOp(op === o ? null : o)}
            disabled={!playing || selected === null}
            accessibilityRole="button"
            accessibilityLabel={`Operación ${o}`}
            style={[
              styles.op,
              {
                backgroundColor: op === o ? colors.accent : colors.surfaceAlt,
                borderColor: op === o ? colors.accent : colors.border,
                opacity: !playing || selected === null ? 0.4 : 1,
              },
            ]}
          >
            <Text style={[styles.opText, { color: op === o ? colors.onAccent : colors.text }]}>{o}</Text>
          </Pressable>
        ))}
      </View>

      {message ? (
        <Card accent={colors.warning}>
          <Body>{message}</Body>
        </Card>
      ) : null}

      {phase.kind === 'jugando' ? (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Deshacer" icon="arrow-undo" variant="ghost" compact disabled={history.length === 0} onPress={undo} />
          </View>
          <View style={styles.flex}>
            <Button label="Pista" icon="bulb" variant="secondary" compact onPress={hint} />
          </View>
          <View style={styles.flex}>
            <Button label="Saltar" icon="play-skip-forward" variant="ghost" compact onPress={giveUp} />
          </View>
        </View>
      ) : (
        <RoundResult
          ok={phase.solved}
          title={phase.solved ? '¡Lo lograste!' : 'Una forma de resolverlo'}
          nextLabel={isLast ? 'Ver resultado' : 'Siguiente'}
          onNext={() => onDone(phase.solved)}
        >
          {phase.solved ? `Llegaste a ${puzzle.target}. ¡Buen cálculo!` : phase.solution}
        </RoundResult>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flex: { flex: 1 },
  label: { fontWeight: '700', textAlign: 'center' },
  target: { fontSize: 56, fontWeight: '900', textAlign: 'center' },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  item: { minWidth: 72, height: 72, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 28, fontWeight: '800' },
  ops: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  op: { width: 64, height: 56, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  opText: { fontSize: 28, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
});
