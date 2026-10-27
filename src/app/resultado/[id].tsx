import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Mascot, MascotTip } from '@/components/Mascot';
import { QuestionStatement } from '@/components/question/QuestionStatement';
import { Body, Button, Card, ErrorNotice, Loading, ProgressBar, Screen, SectionTitle, Tag } from '@/components/ui';
import { formatDateTime } from '@/core/dates';
import { EXAM_PRESETS } from '@/core/exam';
import { describeCorrectAnswer, describeResponse } from '@/core/grading';
import { SCORING_RULES, weakCategories } from '@/core/scoring';
import { CATEGORY_IDS, CATEGORY_LABELS, type GradeResult, type Question } from '@/core/types';
import { useDb } from '@/db/DatabaseProvider';
import { getExamWithQuestions } from '@/db/exams';
import { getModules } from '@/db/questions';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function ResultadoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const [exam, modules] = await Promise.all([getExamWithQuestions(db, Number(id)), getModules(db)]);
    return { exam, modules };
  }, id);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  if (!data.exam || !data.exam.session.breakdown) {
    return (
      <Screen edges={[]}>
        <Body>Este resultado no está disponible.</Body>
      </Screen>
    );
  }
  const { session, answers, questions } = data.exam;
  const summary = session.breakdown!;
  const isDiagnostic = session.kind === 'diagnostico';
  const byId = new Map(questions.map((q) => [q.id, q]));
  const weak = weakCategories(summary);
  // Para recomendar, si no hay categorías débiles se sugiere la de menor porcentaje.
  const recommended =
    weak.length > 0
      ? weak
      : (Object.entries(summary.byCategory) as [keyof typeof summary.byCategory, { percent: number; gradable: number }][])
          .filter(([, c]) => c.gradable > 0)
          .sort((a, b) => a[1].percent - b[1].percent)
          .slice(0, 1)
          .map(([k]) => k);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: isDiagnostic ? 'Resultado del diagnóstico' : 'Resultados' }} />
      <View style={styles.center}>
        <Mascot size={96} mood={summary.percent >= 60 ? 'feliz' : 'animo'} />
        <Text style={[styles.score, { color: colors.text }]}>
          {summary.score} / {summary.maxScore}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          {EXAM_PRESETS[session.kind].title} · {formatDateTime(session.startedAt)}
        </Text>
        {session.status === 'tiempo_agotado' ? (
          <Tag label="Se agotó el tiempo: se envió automáticamente" tone="warning" icon="time" />
        ) : null}
      </View>

      {isDiagnostic ? (
        <MascotTip text="Este diagnóstico solo muestra por dónde empezar. No mide lo que eres capaz de lograr ni predice tu resultado en la olimpiada: con práctica, todo mejora." />
      ) : (
        <MascotTip text="Revisa tus respuestas con calma. Cada error es una pista de qué practicar." />
      )}

      <Card>
        <SectionTitle>Resultado por categoría</SectionTitle>
        {CATEGORY_IDS.filter((c) => summary.byCategory[c]).map((c) => {
          const s = summary.byCategory[c]!;
          return (
            <View key={c} style={{ gap: 4 }}>
              <View style={styles.between}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{CATEGORY_LABELS[c]}</Text>
                <Text style={{ color: colors.textMuted }}>
                  {s.gradable > 0 ? `${s.correct}/${s.gradable}` : 'revisión manual'}
                </Text>
              </View>
              <ProgressBar value={s.gradable > 0 ? s.correct / s.gradable : 0} color={s.percent >= 60 ? colors.success : colors.warning} height={8} label={CATEGORY_LABELS[c]} />
            </View>
          );
        })}
        <Body muted>
          Correctas: {summary.correct} · Incorrectas: {summary.incorrect} · Sin contestar: {summary.empty}
          {summary.unverifiable > 0 ? ` · Abiertas para revisión manual: ${summary.unverifiable}` : ''}
        </Body>
      </Card>

      {recommended.length > 0 ? (
        <Card accent={colors.accent}>
          <SectionTitle>{isDiagnostic ? 'Temas que conviene practicar' : 'Temas recomendados'}</SectionTitle>
          {recommended.map((c) => {
            const m = data.modules.find((x) => x.category === c);
            return m ? (
              <Button key={c} label={m.title} icon="school" variant="secondary" compact onPress={() => router.push(`/modulo/${m.id}`)} />
            ) : null;
          })}
        </Card>
      ) : null}

      <SectionTitle>Revisión de respuestas</SectionTitle>
      {answers.map((a) => {
        const q = byId.get(a.questionId);
        return q ? <ReviewItem key={a.position} index={a.position} question={q} response={a.response} result={a.result ?? 'vacia'} /> : null;
      })}

      <Card>
        <SectionTitle>Criterio de puntuación</SectionTitle>
        {SCORING_RULES.map((r, i) => (
          <Body key={i} muted>
            • {r}
          </Body>
        ))}
      </Card>
      <Button label="Volver al inicio" icon="home" onPress={() => router.navigate('/inicio')} />
    </Screen>
  );
}

const RESULT_ICON: Record<GradeResult, { icon: 'checkmark-circle' | 'close-circle' | 'remove-circle' | 'document-text'; label: string }> = {
  correcta: { icon: 'checkmark-circle', label: 'Correcta' },
  incorrecta: { icon: 'close-circle', label: 'Incorrecta' },
  vacia: { icon: 'remove-circle', label: 'Sin contestar' },
  no_verificable: { icon: 'document-text', label: 'Revisión manual' },
};

function ReviewItem({ index, question, response, result }: { index: number; question: Question; response: string | null; result: GradeResult }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const color =
    result === 'correcta' ? colors.success : result === 'no_verificable' ? colors.info : result === 'vacia' ? colors.textMuted : colors.danger;
  const r = RESULT_ICON[result];
  return (
    <View style={[styles.review, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Pregunta ${index + 1}: ${r.label}`}
        style={styles.reviewHead}
      >
        <Ionicons name={r.icon} size={24} color={color} />
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={open ? undefined : 2}>
          {index + 1}. {question.prompt}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={{ gap: 8 }}>
          <QuestionStatement question={question} showMeta={false} />
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Tu respuesta</Text>
          <Body>{describeResponse(question, response)}</Body>
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
            {question.answer.kind === 'reference' ? 'Solución de referencia' : 'Respuesta correcta'}
          </Text>
          <Body style={{ fontWeight: '700' }}>{describeCorrectAnswer(question)}</Body>
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Explicación</Text>
          <Body>{question.explanation}</Body>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 6 },
  score: { fontSize: 40, fontWeight: '900' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  review: { borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
});
