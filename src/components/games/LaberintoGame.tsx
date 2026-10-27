import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Body, Button, Card, type IconName } from '@/components/ui';
import {
  COMMAND_LABELS,
  findCell,
  MAX_MAZE_LEVEL,
  mazeForRound,
  runProgram,
  type Command,
  type Dir,
  type MazeLevel,
  type Pose,
} from '@/games/laberinto';
import { mulberry32 } from '@/games/rng';
import { roundsFor, type GameProps } from '@/games/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { RoundBar, RoundResult, useGameRounds } from './GameParts';

const STEP_MS = 420;
const ROTATION: Record<Dir, string> = { N: '0deg', E: '90deg', S: '180deg', W: '270deg' };
const PALETTE: Command[] = ['adelante', 'izq', 'der', 'x2', 'x3'];
const COMMAND_ICONS: Record<Command, IconName | null> = {
  adelante: 'arrow-up',
  izq: 'return-up-back',
  der: 'return-up-forward',
  x2: null,
  x3: null,
};
const COMMAND_SHORT: Record<Command, string> = { adelante: 'Avanzar', izq: 'Izq.', der: 'Der.', x2: '×2', x3: '×3' };

export function LaberintoGame({ startLevel, onFinish, bestLevel = 0, seed, rounds }: GameProps) {
  const game = useGameRounds({ rounds: rounds ?? roundsFor('laberinto'), startLevel, maxLevel: MAX_MAZE_LEVEL, onFinish });
  const [rng] = useState(() => mulberry32(seed ?? Date.now()));
  return (
    <View style={styles.wrap}>
      <RoundBar round={game.round} rounds={game.rounds} score={game.score} />
      <Maze
        key={game.round}
        levelNumber={game.level}
        passed={game.level < bestLevel}
        rng={rng}
        isLast={game.round + 1 >= game.rounds}
        onDone={game.finishRound}
      />
    </View>
  );
}

type Status = 'editando' | 'corriendo' | 'choque' | 'sin_llegar' | 'meta' | 'saltado';

function Maze({
  levelNumber,
  passed,
  rng,
  isLast,
  onDone,
}: {
  levelNumber: number;
  passed: boolean;
  rng: () => number;
  isLast: boolean;
  onDone: (solved: boolean) => void;
}) {
  const { colors } = useTheme();
  const [level] = useState<MazeLevel>(() => mazeForRound(levelNumber, passed, rng));
  const { width } = useWindowDimensions();
  const [program, setProgram] = useState<Command[]>([]);
  const [status, setStatus] = useState<Status>('editando');
  const [step, setStep] = useState(0);
  const run = useMemo(() => runProgram(level, program), [level, program]);

  const cols = level.grid[0]!.length;
  const cell = Math.max(34, Math.min(60, Math.floor((width - 64) / cols)));
  const start = findCell(level.grid, 'S')!;
  const pose: Pose = status === 'editando' ? { ...start, dir: level.startDir } : (run.poses[Math.min(step, run.poses.length - 1)] ?? { ...start, dir: level.startDir });

  // Anima la ejecución paso a paso.
  useEffect(() => {
    if (status !== 'corriendo') return;
    const atEnd = step >= run.poses.length - 1;
    const t = setTimeout(() => {
      if (atEnd) setStatus(run.outcome === 'meta' ? 'meta' : run.outcome === 'choque' ? 'choque' : 'sin_llegar');
      else setStep((s) => s + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [status, step, run]);

  const editable = status === 'editando';
  const add = (c: Command) => editable && program.length < level.maxCommands && setProgram([...program, c]);
  const execute = () => {
    setStep(0);
    setStatus('corriendo');
  };
  const reset = () => {
    setStep(0);
    setStatus('editando');
  };
  const finished = status === 'meta' || status === 'saltado';

  return (
    <>
      <Card accent={colors.primary}>
        <Text style={[styles.title, { color: colors.text }]}>
          Nivel {levelNumber}: {level.title}
        </Text>
        <Body muted>{level.tip}</Body>
        <View style={styles.board} accessibilityLabel={`Laberinto de ${level.grid.length} filas y ${cols} columnas`}>
          {level.grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {[...row].map((ch, c) => {
                const isBit = pose.row === r && pose.col === c;
                return (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      { width: cell, height: cell },
                      ch === '#' ? { backgroundColor: colors.text, opacity: 0.85 } : { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
                    ]}
                  >
                    {ch === 'G' ? <Ionicons name="flag" size={cell * 0.6} color={colors.success} /> : null}
                    {isBit ? (
                      <View style={[styles.bit, { backgroundColor: colors.primary, transform: [{ rotate: ROTATION[pose.dir] }] }]} accessibilityLabel={`Bit mirando ${pose.dir}`}>
                        <Ionicons name="arrow-up" size={cell * 0.55} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.title, { color: colors.text }]}>
          Tu programa ({program.length}/{level.maxCommands})
        </Text>
        <View style={styles.tray}>
          {program.length === 0 ? <Body muted>Toca los bloques de abajo para armar el camino de Bit.</Body> : null}
          {program.map((c, i) => (
            <View key={i} style={[styles.chip, { backgroundColor: colors.primary }]} accessibilityLabel={`Paso ${i + 1}: ${COMMAND_LABELS[c]}`}>
              {COMMAND_ICONS[c] ? <Ionicons name={COMMAND_ICONS[c]!} size={18} color="#FFFFFF" /> : <Text style={styles.chipText}>{COMMAND_SHORT[c]}</Text>}
            </View>
          ))}
        </View>
      </Card>

      {!finished ? (
        <>
          <View style={styles.palette}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => add(c)}
                disabled={!editable || program.length >= level.maxCommands}
                accessibilityRole="button"
                accessibilityLabel={COMMAND_LABELS[c]}
                style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.primary, opacity: editable && program.length < level.maxCommands ? 1 : 0.4 }]}
              >
                {COMMAND_ICONS[c] ? <Ionicons name={COMMAND_ICONS[c]!} size={26} color={colors.primary} /> : <Text style={[styles.blockText, { color: colors.primary }]}>{COMMAND_SHORT[c]}</Text>}
                <Text style={[styles.blockLabel, { color: colors.textMuted }]}>{COMMAND_LABELS[c]}</Text>
              </Pressable>
            ))}
          </View>

          {status === 'choque' || status === 'sin_llegar' ? (
            <Card accent={colors.warning}>
              <Body>
                {status === 'choque' ? '¡Bit chocó con una pared! Revisa tus bloques y vuelve a intentarlo.' : 'Bit se detuvo antes de llegar a la meta. Te faltan pasos.'}
              </Body>
              <Button label="Intentar de nuevo" icon="refresh" onPress={reset} />
            </Card>
          ) : (
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button label="Borrar último" icon="backspace" variant="ghost" compact disabled={!editable || program.length === 0} onPress={() => setProgram(program.slice(0, -1))} />
              </View>
              <View style={styles.flex}>
                <Button label="Limpiar" icon="trash" variant="ghost" compact disabled={!editable || program.length === 0} onPress={() => setProgram([])} />
              </View>
            </View>
          )}
          <Button label="Ejecutar" icon="play" disabled={!editable || program.length === 0} onPress={execute} />
          <Button label="Saltar este nivel" icon="play-skip-forward" variant="ghost" compact disabled={status === 'corriendo'} onPress={() => setStatus('saltado')} />
        </>
      ) : (
        <RoundResult
          ok={status === 'meta'}
          title={status === 'meta' ? '¡Bit llegó a la meta!' : 'Una solución posible'}
          nextLabel={isLast ? 'Ver resultado' : 'Siguiente'}
          onNext={() => onDone(status === 'meta')}
        >
          {status === 'meta'
            ? `Lo lograste con ${program.length} ${program.length === 1 ? 'bloque' : 'bloques'}.`
            : `Una forma: ${level.solution.map((c) => COMMAND_LABELS[c]).join(', ')}.`}
        </RoundResult>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flex: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  board: { alignSelf: 'center', gap: 2, marginTop: 6 },
  row: { flexDirection: 'row', gap: 2 },
  cell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bit: { position: 'absolute', width: '84%', height: '84%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 36 },
  chip: { minWidth: 36, height: 36, paddingHorizontal: 8, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: '#FFFFFF', fontWeight: '800' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  block: { width: '30%', minWidth: 96, height: 76, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
  blockText: { fontSize: 22, fontWeight: '900' },
  blockLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
});
