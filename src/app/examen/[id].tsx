import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExamTimerBadge } from '@/components/ExamTimer';
import { AnswerInput } from '@/components/question/AnswerInput';
import { QuestionStatement, SourceTags } from '@/components/question/QuestionStatement';
import { Body, Button, Card, ErrorNotice, Loading, Screen } from '@/components/ui';
import { EXAM_PRESETS } from '@/core/exam';
import { isEmptyResponse } from '@/core/grading';
import type { Question } from '@/core/types';
import { evaluateAchievements } from '@/db/achievements';
import { useDb } from '@/db/DatabaseProvider';
import { finalizeExam, getExamWithQuestions, saveExamAnswer, type ExamSession } from '@/db/exams';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useExamTimer } from '@/hooks/useExamTimer';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function ExamenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const db = useDb();
  const { data, error, reload } = useAsyncData(() => getExamWithQuestions(db, sessionId), sessionId);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  return (
    <ExamRunner
      key={sessionId}
      session={data.session}
      questions={data.questions}
      initialResponses={data.answers.map((a) => a.response)}
    />
  );
}

function ExamRunner({
  session,
  questions,
  initialResponses,
}: {
  session: ExamSession;
  questions: Question[];
  initialResponses: (string | null)[];
}) {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<(string | null)[]>(initialResponses);
  const [finishing, setFinishing] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const pending = useRef(new Map<number, string | null>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const done = useRef(session.status !== 'en_curso');

  const flush = useCallback(async () => {
    const entries = [...pending.current.entries()];
    pending.current.clear();
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    for (const [position, value] of entries) {
      await saveExamAnswer(db, session.id, position, value);
    }
  }, [db, session.id]);

  const finish = useCallback(
    async (reason: 'finalizado' | 'tiempo_agotado') => {
      if (done.current) return;
      done.current = true;
      setFinishing(true);
      try {
        await flush();
        await finalizeExam(db, session.id, new Date(), reason);
        await evaluateAchievements(db);
        router.replace(`/resultado/${session.id}`);
      } catch (e) {
        done.current = false;
        setSaveError(e);
        setFinishing(false);
      }
    },
    [db, flush, router, session.id],
  );

  useEffect(() => {
    if (session.status !== 'en_curso') router.replace(`/resultado/${session.id}`);
  }, [router, session.id, session.status]);

  // Guarda lo pendiente al salir de la pantalla.
  useEffect(() => () => void flush().catch(() => {}), [flush]);

  const remaining = useExamTimer(session.startedAt, session.durationSeconds, () => void finish('tiempo_agotado'));

  const update = (value: string | null) => {
    setResponses((r) => r.map((x, i) => (i === index ? value : x)));
    const position = index;
    pending.current.set(position, value);
    const existing = timers.current.get(position);
    if (existing) clearTimeout(existing);
    timers.current.set(
      position,
      setTimeout(() => {
        const v = pending.current.get(position);
        pending.current.delete(position);
        timers.current.delete(position);
        saveExamAnswer(db, session.id, position, v ?? null).catch(setSaveError);
      }, 400),
    );
  };

  const go = (i: number) => {
    flush().catch(setSaveError);
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
  };

  const answered = responses.filter((r) => !isEmptyResponse(r)).length;
  const unanswered = questions.length - answered;

  const confirmFinish = () => {
    Alert.alert(
      '¿Terminar el examen?',
      unanswered > 0
        ? `Te faltan ${unanswered} ${unanswered === 1 ? 'pregunta' : 'preguntas'} por contestar. Después de terminar no podrás cambiar tus respuestas.`
        : 'Después de terminar no podrás cambiar tus respuestas.',
      [
        { text: 'Seguir respondiendo', style: 'cancel' },
        { text: 'Terminar', style: 'destructive', onPress: () => void finish('finalizado') },
      ],
    );
  };

  const question = questions[index];
  const preset = EXAM_PRESETS[session.kind];

  if (finishing) return <Loading label="Calificando tus respuestas…" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: preset.title }} />
      <View style={[styles.top, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} testID="exam-counter">
            {answered} contestadas · {unanswered} pendientes
          </Text>
          {remaining !== null ? <ExamTimerBadge remaining={remaining} /> : <Text style={{ color: colors.textMuted }}>Sin límite</Text>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
          {questions.map((q, i) => {
            const isAnswered = !isEmptyResponse(responses[i]);
            const current = i === index;
            return (
              <Pressable
                key={q.id}
                onPress={() => go(i)}
                accessibilityRole="button"
                accessibilityLabel={`Pregunta ${i + 1}${isAnswered ? ', contestada' : ', pendiente'}`}
                style={[
                  styles.navItem,
                  {
                    backgroundColor: isAnswered ? colors.primary : colors.surfaceAlt,
                    borderColor: current ? colors.accent : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: isAnswered ? colors.onPrimary : colors.text, fontWeight: '800' }}>{i + 1}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {question ? (
          <>
            <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
              Pregunta {index + 1} de {questions.length}
            </Text>
            <Card>
              <QuestionStatement question={question} showMeta={session.kind === 'diagnostico'} />
              <SourceTags question={question} />
            </Card>
            <AnswerInput key={question.id} question={question} value={responses[index] ?? null} onChange={update} />
            {!isEmptyResponse(responses[index]) ? (
              <Button label="Borrar respuesta" variant="ghost" icon="close" compact onPress={() => update(null)} />
            ) : null}
          </>
        ) : (
          <Body>Este simulacro no tiene preguntas.</Body>
        )}
        {saveError ? <ErrorNotice error={saveError} /> : null}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button label="Anterior" icon="arrow-back" variant="ghost" disabled={index === 0} onPress={() => go(index - 1)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Siguiente"
              icon="arrow-forward"
              variant="secondary"
              disabled={index === questions.length - 1}
              onPress={() => go(index + 1)}
            />
          </View>
        </View>
        <Button label="Terminar examen" icon="flag" variant="danger" onPress={confirmFinish} testID="finish-exam" />
        <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
          Tus respuestas se guardan automáticamente en este dispositivo.
        </Body>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, gap: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nav: { gap: 6, paddingVertical: 2 },
  navItem: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 10 },
});
