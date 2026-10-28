import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mascot, MascotTip } from '@/components/Mascot';
import { AnswerInput } from '@/components/question/AnswerInput';
import { Feedback, HintBox } from '@/components/question/Feedback';
import { QuestionStatement, SourceTags } from '@/components/question/QuestionStatement';
import { Body, Button, Card, ErrorNotice, Loading, ProgressBar, Screen, Tag } from '@/components/ui';
import { gradeAnswer, isEmptyResponse } from '@/core/grading';
import { xpForAttempt } from '@/core/progression';
import type { GradeResult, Lesson, Question } from '@/core/types';
import { evaluateAchievements, type Achievement } from '@/db/achievements';
import { useDb } from '@/db/DatabaseProvider';
import { ACTIVITY, loadPracticeQuestions, PRACTICE_TITLES as TITLES, type PracticeMode } from '@/db/practice';
import { markLessonProgress, recordAttempt } from '@/db/progress';
import { getLessons } from '@/db/questions';
import { setLastActivity } from '@/db/settings';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/theme/ThemeProvider';
import { useGoBack } from '@/hooks/useGoBack';

export default function PracticaScreen() {
  const params = useLocalSearchParams<{ modo?: string; id?: string; nivel?: string }>();
  const mode = (params.modo as PracticeMode) in ACTIVITY ? (params.modo as PracticeMode) : 'reto';
  const level = params.nivel !== undefined ? Number(params.nivel) : undefined;
  const db = useDb();
  const goBack = useGoBack('/inicio');

  const { data, error, reload } = useAsyncData(async () => {
    const [questions, lessons] = await Promise.all([loadPracticeQuestions(db, mode, params.id, level), getLessons(db)]);
    if (mode !== 'repaso' && mode !== 'fallados') {
      await setLastActivity(db, { label: TITLES[mode], pathname: '/practica', params: { modo: mode, ...(params.id ? { id: params.id } : {}), ...(params.nivel ? { nivel: params.nivel } : {}) } });
    }
    return { questions, lessons: new Map(lessons.map((l) => [l.id, l])) };
  }, `${mode}:${params.id ?? ''}:${params.nivel ?? ''}`);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  if (data.questions.length === 0) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: TITLES[mode] }} />
        <MascotTip
          text={
            mode === 'repaso' || mode === 'fallados'
              ? '¡No tienes ejercicios pendientes de repaso! Sigue practicando y aquí aparecerán los que necesites reforzar.'
              : 'No hay ejercicios disponibles aquí por ahora.'
          }
        />
        <Button label="Volver" icon="arrow-back" variant="secondary" onPress={goBack} />
      </Screen>
    );
  }
  return <PracticeRunner questions={data.questions} lessons={data.lessons} mode={mode} refId={params.id} key={`${mode}-${params.id}-${params.nivel ?? ''}`} />;
}

function PracticeRunner({
  questions,
  lessons,
  mode,
  refId,
}: {
  questions: Question[];
  lessons: Map<string, Lesson>;
  mode: PracticeMode;
  refId?: string;
}) {
  const db = useDb();
  const goBack = useGoBack('/inicio');
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [stats, setStats] = useState({ correct: 0, answered: 0, xp: 0 });
  const [finished, setFinished] = useState<{ achievements: Achievement[] } | null>(null);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  const question = questions[index]!;
  const lesson = question.lessonId ? lessons.get(question.lessonId) : null;

  const check = async () => {
    if (isEmptyResponse(response)) {
      setWarning('Escribe o elige una respuesta antes de verificar.');
      return;
    }
    setWarning(null);
    const graded = gradeAnswer(question, response);
    setSaving(true);
    try {
      await recordAttempt(db, {
        question,
        activityType: ACTIVITY[mode],
        activityRef: refId ?? mode,
        response,
        result: graded,
        timeMs: Date.now() - startedAt.current,
      });
      setSaveError(null);
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
    setResult(graded);
    setStats((s) => ({
      correct: s.correct + (graded === 'correcta' ? 1 : 0),
      answered: s.answered + 1,
      xp: s.xp + xpForAttempt(graded, question.difficulty),
    }));
  };

  const next = async () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setResponse(null);
      setResult(null);
      return;
    }
    let achievements: Achievement[] = [];
    try {
      if (mode === 'leccion' && refId) await markLessonProgress(db, refId, stats.correct, questions.length);
      achievements = await evaluateAchievements(db);
    } catch (e) {
      setSaveError(e);
    }
    setFinished({ achievements });
  };

  if (finished) {
    const gradable = questions.filter((q) => q.answer.kind !== 'reference' && q.verification === 'verificada').length;
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Resumen' }} />
        <View style={styles.center}>
          <Mascot size={110} mood="animo" />
          <Text style={[styles.big, { color: colors.text }]}>
            {stats.correct} de {gradable} correctas
          </Text>
          <Tag label={`+${stats.xp} XP`} tone="success" icon="sparkles" />
        </View>
        <MascotTip
          text={
            stats.correct === gradable
              ? '¡Impecable! Puedes subir la dificultad con el reto recomendado.'
              : 'Los ejercicios que fallaste quedaron guardados para repasarlos en otra sesión. ¡Así se aprende!'
          }
        />
        {finished.achievements.length > 0 ? (
          <Card accent={colors.warning}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>¡Nueva insignia!</Text>
            {finished.achievements.map((a) => (
              <Body key={a.id}>
                🏅 {a.title}: {a.description}
              </Body>
            ))}
          </Card>
        ) : null}
        {saveError ? <ErrorNotice error={saveError} /> : null}
        <Button label="Terminar" icon="checkmark" onPress={goBack} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: TITLES[mode] }} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
          Ejercicio {index + 1} de {questions.length}
        </Text>
        <ProgressBar value={(index + (result ? 1 : 0)) / questions.length} label="Avance de la práctica" />
      </View>
      <Card>
        <QuestionStatement question={question} />
        <SourceTags question={question} />
      </Card>
      <AnswerInput question={question} value={response} onChange={(v) => { setResponse(v); setWarning(null); }} disabled={result !== null} />
      {warning ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{warning}</Text> : null}
      {result === null ? (
        <>
          <HintBox hints={question.hints} key={question.id} />
          <Button label="Verificar" icon="checkmark-circle" onPress={check} loading={saving} testID="verify-button" />
        </>
      ) : (
        <>
          <Feedback question={question} response={response} result={result} lesson={lesson} />
          {saveError ? <ErrorNotice error={saveError} /> : null}
          <Button
            label={index + 1 < questions.length ? 'Continuar' : 'Ver resumen'}
            icon="arrow-forward"
            onPress={next}
            testID="continue-button"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  big: { fontSize: 26, fontWeight: '900' },
  cardTitle: { fontSize: 17, fontWeight: '800' },
});
