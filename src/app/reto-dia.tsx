import { Stack } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { GAME_COMPONENTS } from '@/components/games/registry';
import { Mascot, MascotTip } from '@/components/Mascot';
import { AnswerInput } from '@/components/question/AnswerInput';
import { Feedback } from '@/components/question/Feedback';
import { QuestionStatement } from '@/components/question/QuestionStatement';
import { Body, Button, Card, ErrorNotice, Loading, ProgressBar, Screen, Tag } from '@/components/ui';
import { toLocalDay } from '@/core/dates';
import { gradeAnswer, isEmptyResponse } from '@/core/grading';
import type { Question } from '@/core/types';
import { evaluateAchievements } from '@/db/achievements';
import { useDb } from '@/db/DatabaseProvider';
import { getDailyChallenge, recordDailyChallenge, type DailyRecordResult } from '@/db/games';
import { recordAttempt } from '@/db/progress';
import { getAllQuestions } from '@/db/questions';
import { useAsyncData } from '@/hooks/useAsyncData';
import { DAILY_GAMES, DAILY_LEVEL, dailySeed, formatDuration, pickDailyQuestion, shareMessage } from '@/games/daily';
import { gameInfo } from '@/games/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useGoBack } from '@/hooks/useGoBack';

type Stage =
  | { kind: 'intro' }
  | { kind: 'juego'; index: number }
  | { kind: 'pregunta' }
  | { kind: 'fin'; score: number; maxScore: number; timeMs: number; record: DailyRecordResult | null };

export default function RetoDiaScreen() {
  const db = useDb();
  const goBack = useGoBack('/juegos');
  const { colors } = useTheme();
  const [day] = useState(() => toLocalDay(new Date()));
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [startedAt, setStartedAt] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [saveError, setSaveError] = useState<unknown>(null);
  const { data, error, reload } = useAsyncData(async () => {
    const [daily, questions] = await Promise.all([getDailyChallenge(db, day), getAllQuestions(db)]);
    return { daily, question: pickDailyQuestion(day, questions) };
  }, day);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;

  const { daily, question } = data;
  const maxScore = DAILY_GAMES.length + (question ? 1 : 0);
  const seed = dailySeed(day);

  const finish = (all: number[]) => {
    const score = all.reduce((a, b) => a + b, 0);
    const timeMs = Date.now() - startedAt;
    setStage({ kind: 'fin', score, maxScore, timeMs, record: null });
    recordDailyChallenge(db, day, { score, maxScore, timeMs })
      .then(async (record) => {
        setStage((s) => (s.kind === 'fin' ? { ...s, record } : s));
        await evaluateAchievements(db);
      })
      .catch(setSaveError);
  };

  const gameDone = (index: number, solved: number) => {
    const all = [...scores.slice(0, index), solved];
    setScores(all);
    if (index + 1 < DAILY_GAMES.length) setStage({ kind: 'juego', index: index + 1 });
    else if (question) setStage({ kind: 'pregunta' });
    else finish(all);
  };

  const begin = () => {
    setScores([]);
    setStartedAt(Date.now());
    setStage({ kind: 'juego', index: 0 });
  };

  if (stage.kind === 'intro') {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Reto del día' }} />
        <MascotTip title="Reto del día" text="Hoy todos los que juegan reciben exactamente el mismo reto. ¡Compara tu resultado con tus amigos!" />
        <Card accent={colors.warning}>
          <Body>1. Cuatro juegos cortos: laberinto, ritmo, bugs y números. Cada uno vale 1 punto.</Body>
          <Body>2. Una pregunta final de respuesta numérica, como en el examen: solo cuenta la respuesta.</Body>
          <Body muted>No tiene tiempo límite. Se mide cuánto tardaste, pero lo importante es acertar. Si lo repites, se guarda tu mejor resultado.</Body>
          {daily ? (
            <Tag label={`Tu resultado de hoy: ${daily.score}/${daily.maxScore} en ${formatDuration(daily.timeMs)}`} tone="success" icon="checkmark-circle" />
          ) : null}
        </Card>
        <Button label={daily ? 'Jugarlo otra vez' : 'Empezar el reto'} icon="flash" onPress={begin} />
      </Screen>
    );
  }

  if (stage.kind === 'juego') {
    const id = DAILY_GAMES[stage.index]!;
    const Game = GAME_COMPONENTS[id];
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Reto del día' }} />
        <View style={styles.progress}>
          <Text style={[styles.step, { color: colors.text }]}>
            Juego {stage.index + 1} de {DAILY_GAMES.length}: {gameInfo(id).title}
          </Text>
          <ProgressBar value={stage.index / maxScore} label="Avance del reto del día" height={8} />
        </View>
        <Game
          key={id}
          startLevel={DAILY_LEVEL}
          rounds={1}
          bestLevel={99}
          seed={seed + stage.index * 7919}
          onFinish={(o) => gameDone(stage.index, o.score >= 1 ? 1 : 0)}
        />
      </Screen>
    );
  }

  if (stage.kind === 'pregunta' && question) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Reto del día' }} />
        <View style={styles.progress}>
          <Text style={[styles.step, { color: colors.text }]}>Pregunta final</Text>
          <ProgressBar value={DAILY_GAMES.length / maxScore} label="Avance del reto del día" height={8} />
        </View>
        <FinalQuestion
          question={question}
          saveFirst={!daily}
          onDone={(correct) => finish([...scores, correct ? 1 : 0])}
        />
      </Screen>
    );
  }

  if (stage.kind === 'fin') {
    const { score, timeMs, record } = stage;
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Reto del día' }} />
        <View style={styles.center}>
          <Mascot mood={score >= maxScore / 2 ? 'feliz' : 'animo'} size={96} />
          <Text style={[styles.big, { color: colors.text }]} accessibilityRole="header">
            {score >= maxScore ? '¡Reto perfecto!' : score > 0 ? '¡Buen reto!' : '¡Mañana hay otro!'}
          </Text>
          <Text style={[styles.score, { color: colors.primary }]}>
            {score} de {maxScore}
          </Text>
          <Text style={{ color: colors.textMuted }}>Tiempo: {formatDuration(timeMs)}</Text>
          {record?.improved ? <Tag label="¡Mejoraste tu resultado de hoy!" tone="success" icon="trophy" /> : null}
          <Body muted>
            {record === null ? 'Guardando…' : record.first ? `+${record.xp} XP` : 'Tu XP del reto de hoy ya estaba contado. ¡Vuelve mañana por el nuevo!'}
          </Body>
        </View>
        {saveError ? <ErrorNotice error={saveError} /> : null}
        <Button
          label="Compartir mi resultado"
          icon="share-social"
          variant="secondary"
          onPress={() => {
            Share.share({ message: shareMessage(day, score, maxScore, timeMs) }).catch(() => {});
          }}
        />
        <Button label="Volver a los juegos" icon="game-controller" onPress={goBack} />
      </Screen>
    );
  }

  return <Loading />;
}

/** Pregunta final: se califica solo la respuesta, igual que en el examen. */
function FinalQuestion({ question, saveFirst, onDone }: { question: Question; saveFirst: boolean; onDone: (correct: boolean) => void }) {
  const db = useDb();
  const { colors } = useTheme();
  const [response, setResponse] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof gradeAnswer> | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [warning, setWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const check = async () => {
    if (isEmptyResponse(response)) {
      setWarning('Escribe tu respuesta antes de verificar.');
      return;
    }
    setWarning(null);
    const graded = gradeAnswer(question, response);
    setSaving(true);
    try {
      // Solo la primera vez del día cuenta como intento, para no repetir XP de la misma pregunta.
      if (saveFirst) {
        await recordAttempt(db, {
          question,
          activityType: 'reto',
          activityRef: 'reto-dia',
          response,
          result: graded,
          timeMs: Date.now() - startedAt,
        });
      }
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
    setResult(graded);
  };

  return (
    <>
      <Card accent={colors.primary}>
        <QuestionStatement question={question} />
      </Card>
      <AnswerInput
        question={question}
        value={response}
        onChange={(v) => {
          setResponse(v);
          setWarning(null);
        }}
        disabled={result !== null}
      />
      {warning ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{warning}</Text> : null}
      {result === null ? (
        <Button label="Verificar" icon="checkmark-circle" onPress={check} loading={saving} />
      ) : (
        <>
          <Feedback question={question} response={response} result={result} lesson={null} />
          {saveError ? <ErrorNotice error={saveError} /> : null}
          <Button label="Ver resultado" icon="arrow-forward" onPress={() => onDone(result === 'correcta')} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 6 },
  step: { fontSize: 15, fontWeight: '800' },
  center: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  big: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  score: { fontSize: 44, fontWeight: '900' },
});
