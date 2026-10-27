import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, ListRow, Loading, Screen, SectionTitle, Title } from '@/components/ui';
import { formatDateTime } from '@/core/dates';
import { EXAM_PRESETS, type ExamKind } from '@/core/exam';
import { SCORING_RULES } from '@/core/scoring';
import { clampExamMinutes, MAX_EXAM_MINUTES } from '@/core/timer';
import { useDb } from '@/db/DatabaseProvider';
import { getActiveExam, listExamSessions, startExam } from '@/db/exams';
import { setSetting } from '@/db/settings';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const DURATIONS = [10, 20, 30, 45, 60, 90];

export default function Simulador() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const [kind, setKind] = useState<Exclude<ExamKind, 'diagnostico'>>('corto');
  const [minutes, setMinutes] = useState<number>(EXAM_PRESETS.corto.defaultMinutes!);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);
  const { data, error, reload } = useAsyncData(async () => {
    const [active, history] = await Promise.all([getActiveExam(db), listExamSessions(db)]);
    return { active, history };
  });

  if (error) return <Screen><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;

  const choose = (k: Exclude<ExamKind, 'diagnostico'>) => {
    setKind(k);
    setMinutes(EXAM_PRESETS[k].defaultMinutes!);
  };

  const begin = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const m = clampExamMinutes(minutes);
      const id = await startExam(db, kind, m * 60);
      await setSetting(db, 'exam_minutes', String(m));
      router.push(`/examen/${id}`);
    } catch (e) {
      setStartError(e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <Title>Simulador de examen</Title>
      <MascotTip
        mood="pensando"
        text="Practica con tiempo, como en la primera evaluación (hasta 90 minutos). Son preguntas originales de práctica, no un examen oficial."
      />

      {data.active ? (
        <Card accent={colors.warning}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Tienes un simulacro en curso</Text>
          <Body muted>Tus respuestas están guardadas. El tiempo sigue corriendo aunque cierres la app.</Body>
          <Button label="Continuar simulacro" icon="play" onPress={() => router.push(`/examen/${data.active!.id}`)} />
        </Card>
      ) : (
        <Card>
          <SectionTitle>1. Elige el tipo</SectionTitle>
          {(['corto', 'completo'] as const).map((k) => (
            <Choice key={k} selected={kind === k} title={EXAM_PRESETS[k].title} subtitle={EXAM_PRESETS[k].description} onPress={() => choose(k)} />
          ))}
          <SectionTitle>2. Duración (máximo {MAX_EXAM_MINUTES} min)</SectionTitle>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setMinutes(d)}
                accessibilityRole="radio"
                accessibilityState={{ checked: minutes === d }}
                accessibilityLabel={`${d} minutos`}
                style={[
                  styles.chip,
                  { borderColor: minutes === d ? colors.primary : colors.border, backgroundColor: minutes === d ? colors.primary : colors.surface },
                ]}
              >
                <Text style={{ color: minutes === d ? colors.onPrimary : colors.text, fontWeight: '700' }}>{d} min</Text>
              </Pressable>
            ))}
          </View>
          {startError ? <ErrorNotice error={startError} /> : null}
          <Button label="Comenzar simulacro" icon="timer" onPress={begin} loading={starting} />
        </Card>
      )}

      <Card>
        <SectionTitle>¿Cómo se califica?</SectionTitle>
        {SCORING_RULES.map((r, i) => (
          <Body key={i}>• {r}</Body>
        ))}
      </Card>

      <SectionTitle>Historial de simulacros</SectionTitle>
      <Card>
        {data.history.length === 0 ? (
          <Body muted>Aún no has terminado ningún simulacro.</Body>
        ) : (
          data.history.map((s) => (
            <ListRow
              key={s.id}
              icon={s.kind === 'completo' ? 'medal' : 'timer'}
              title={`${EXAM_PRESETS[s.kind].title}: ${s.score ?? 0}/${s.maxScore ?? 0}`}
              subtitle={`${formatDateTime(s.startedAt)}${s.status === 'tiempo_agotado' ? ' · tiempo agotado' : ''}`}
              onPress={() => router.push(`/resultado/${s.id}`)}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

function Choice({ selected, title, subtitle, onPress }: { selected: boolean; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '1A' : colors.surface }]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={{ color: colors.textMuted }}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 17, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  choice: { borderWidth: 2, borderRadius: radius.md, padding: 14, gap: 2 },
});
