import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GAME_COMPONENTS } from '@/components/games/registry';
import { Mascot, MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, Loading, Screen, Tag } from '@/components/ui';
import { useDb } from '@/db/DatabaseProvider';
import { getGamesSummary, recordGameSession, type GameRecordResult } from '@/db/games';
import { formatDuration } from '@/games/daily';
import { useAsyncData } from '@/hooks/useAsyncData';
import { gameInfo, isGameId, type GameId, type GameOutcome } from '@/games/types';
import { useTheme } from '@/theme/ThemeProvider';

const HOW_TO: Record<GameId, string[]> = {
  laberinto: [
    'Arma un programa con bloques: Avanzar, Girar y Repetir.',
    'Toca «Ejecutar» y Bit seguirá tus bloques, uno por uno.',
    'Llega a la bandera sin chocar con las paredes. Hay un límite de bloques.',
  ],
  ritmo: [
    'Mira cómo se encienden los colores: siguen un patrón que se repite.',
    'Descubre cuál es el patrón.',
    'Toca los colores que siguen, en orden. Puedes ver el ritmo otra vez.',
  ],
  cazabugs: [
    'Lee la meta del programa y sus líneas.',
    'Una sola línea tiene un error (un «bug»). Tócala.',
    'Tienes 30 segundos por ronda. Si te equivocas, verás cómo se arregla.',
  ],
  numero: [
    'Se te da una meta y varios números.',
    'Toca un número, una operación y otro número para combinarlos.',
    'Repite hasta que alguno sea igual a la meta. No se vale llegar a negativos ni a decimales.',
  ],
};

type Stage =
  | { kind: 'intro' }
  | { kind: 'jugando'; level: number; run: number }
  | { kind: 'fin'; outcome: GameOutcome; record: GameRecordResult | null };

export default function JugarScreen() {
  const { juego } = useLocalSearchParams<{ juego: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const valid = isGameId(juego);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [saveError, setSaveError] = useState<unknown>(null);
  const [run, setRun] = useState(0);
  const { data, error, reload } = useAsyncData(() => getGamesSummary(db), valid ? juego : '');

  const finish = useCallback(
    (outcome: GameOutcome) => {
      if (!isGameId(juego)) return;
      setStage({ kind: 'fin', outcome, record: null });
      recordGameSession(db, juego, outcome)
        .then((record) => setStage((s) => (s.kind === 'fin' ? { ...s, record } : s)))
        .catch(setSaveError);
    },
    [db, juego],
  );

  if (!valid) {
    return (
      <Screen edges={[]}>
        <ErrorNotice error={new Error('Ese juego no existe.')} />
        <Button label="Volver" icon="arrow-back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;

  const info = gameInfo(juego);
  const stats = data.stats[juego];
  const Game = GAME_COMPONENTS[juego];
  const begin = (level: number) => {
    setRun((n) => n + 1);
    setStage({ kind: 'jugando', level, run: run + 1 });
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: info.title }} />
      {stage.kind === 'intro' ? (
        <>
          <MascotTip title={info.title} text={info.tagline} />
          <Card accent={info.color}>
            <Tag label={`Entrena: ${info.trains}`} tone="neutral" />
            {HOW_TO[juego].map((line, i) => (
              <Body key={i}>
                {i + 1}. {line}
              </Body>
            ))}
            <Body muted>Cada partida dura unos minutos. Ganas un poco de XP, sin presión: practicar también cuenta aunque falles.</Body>
          </Card>
          <Button label={stats.plays > 0 ? `Jugar (nivel ${stats.nextLevel})` : 'Jugar'} icon="play" onPress={() => begin(stats.nextLevel)} />
        </>
      ) : stage.kind === 'jugando' ? (
        <Game key={stage.run} startLevel={stage.level} bestLevel={stats.maxLevel} onFinish={finish} />
      ) : (
        <>
          <View style={styles.center}>
            <Mascot mood={stage.outcome.score >= stage.outcome.maxScore / 2 ? 'feliz' : 'animo'} size={96} />
            <Text style={[styles.big, { color: colors.text }]} accessibilityRole="header">
              {stage.outcome.score >= stage.outcome.maxScore ? '¡Partida perfecta!' : stage.outcome.score > 0 ? '¡Buena partida!' : '¡Sigue intentando!'}
            </Text>
            <Text style={[styles.score, { color: colors.primary }]}>
              {stage.outcome.score} de {stage.outcome.maxScore}
            </Text>
            <Text style={{ color: colors.textMuted }}>Tiempo: {formatDuration(stage.outcome.timeMs)}</Text>
            {stage.record?.newBestScore ? <Tag label="¡Nuevo récord de puntaje!" tone="success" icon="trophy" /> : null}
            {stage.record?.newBestTime ? <Tag label="¡Nuevo récord de tiempo!" tone="success" icon="flash" /> : null}
            <Body muted>
              {stage.record === null
                ? 'Guardando…'
                : stage.record.xp > 0
                  ? `+${stage.record.xp} XP`
                  : 'Hoy ya llegaste al tope de XP de juegos. ¡Es buen momento para descansar!'}
            </Body>
          </View>
          {saveError ? <ErrorNotice error={saveError} /> : null}
          <Button label="Jugar otra vez" icon="refresh" onPress={() => begin(stage.outcome.level)} />
          <Button label="Volver a los juegos" icon="game-controller" variant="secondary" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  big: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  score: { fontSize: 44, fontWeight: '900' },
});
