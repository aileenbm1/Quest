import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, ErrorNotice, ListRow, Loading, ProgressBar, Screen, SectionTitle, Tag } from '@/components/ui';
import type { PathStep } from '@/core/path';
import type { Lesson, Module } from '@/core/types';
import { useDb } from '@/db/DatabaseProvider';
import { getModulePath } from '@/db/path';
import { getFailedQuestions, getLessonProgressMap, getModuleProgress } from '@/db/progress';
import { getLessons, getModule } from '@/db/questions';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/theme/ThemeProvider';

export default function ModuloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const [module, lessons, lessonProgress, progress, failed, path] = await Promise.all([
      getModule(db, id),
      getLessons(db, id),
      getLessonProgressMap(db),
      getModuleProgress(db),
      getFailedQuestions(db, id),
      getModulePath(db, id),
    ]);
    return { module, lessons, lessonProgress, progress: progress.find((p) => p.moduleId === id), failed, path };
  }, id);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  if (!data.module) return <Screen edges={[]}><Body>No encontramos este módulo.</Body></Screen>;
  const { module: m, progress: p } = data;
  const completedLessons = new Set([...data.lessonProgress].filter(([, v]) => v.status === 'completada').map(([k]) => k));

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: m.title }} />
      <Card accent={m.color}>
        <Text style={[styles.title, { color: colors.text }]}>{m.title}</Text>
        <Body>{m.description}</Body>
        <ProgressBar value={p?.progress ?? 0} color={m.color} label="Progreso del módulo" />
        <Body muted>
          {p?.solved ?? 0} de {p?.totalQuestions ?? 0} ejercicios resueltos · {p?.accuracy ?? 0} % de aciertos
        </Body>
      </Card>

      <SectionTitle>Tu camino</SectionTitle>
      <Body muted>Cada nivel se abre al completar el anterior. Empieza por «Aprender jugando».</Body>
      {data.path.map((step) => (
        <LevelCard
          key={step.level}
          step={step}
          module={m}
          lessons={data.lessons.filter((l) => lessonStep(data.path, l) === step.level)}
          completedLessons={completedLessons}
        />
      ))}

      <SectionTitle>Ejercicios</SectionTitle>
      <View style={{ gap: 10 }}>
        <Button
          label={`Repetir ejercicios fallados (${data.failed.length})`}
          icon="refresh"
          variant="secondary"
          disabled={data.failed.length === 0}
          onPress={() => router.push({ pathname: '/practica', params: { modo: 'fallados', id: m.id } })}
        />
        {m.id === 'm6-simulador' ? (
          <Button label="Ir al simulador de examen" icon="timer" variant="accent" onPress={() => router.push('/simulador')} />
        ) : null}
      </View>
    </Screen>
  );
}

/** Nivel del camino donde se muestra una lección: el suyo o, si ese nivel no tiene ejercicios, el más cercano antes. */
function lessonStep(path: PathStep[], lesson: Lesson): number | undefined {
  const before = path.filter((s) => s.level <= lesson.level);
  return (before[before.length - 1] ?? path[0])?.level;
}

const STATUS_TAG = {
  completado: { label: 'Completado', tone: 'success', icon: 'checkmark-circle' },
  abierto: { label: 'Abierto', tone: 'info', icon: 'lock-open' },
  bloqueado: { label: 'Con candado', tone: 'neutral', icon: 'lock-closed' },
} as const;

function LevelCard({ step, module: m, lessons, completedLessons }: { step: PathStep; module: Module; lessons: Lesson[]; completedLessons: Set<string> }) {
  const router = useRouter();
  const { colors } = useTheme();
  const locked = step.status === 'bloqueado';
  const tag = STATUS_TAG[step.status];
  return (
    <Card accent={locked ? colors.border : m.color} style={locked ? { opacity: 0.6 } : undefined}>
      <View style={styles.levelHead}>
        <Text style={[styles.levelTitle, { color: colors.text }]} accessibilityRole="header">
          Nivel {step.level} · {step.name}
        </Text>
        <Tag label={tag.label} tone={tag.tone} icon={tag.icon} />
      </View>
      {step.level === 0 ? <Body muted>Ejercicios muy fáciles, con dibujos, para empezar desde cero.</Body> : null}
      {lessons.map((l) => (
        <ListRow
          key={l.id}
          icon={completedLessons.has(l.id) ? 'checkmark-circle' : locked ? 'lock-closed' : 'book-outline'}
          iconColor={completedLessons.has(l.id) ? colors.success : locked ? colors.textMuted : m.color}
          title={`Lección: ${l.title}`}
          subtitle={completedLessons.has(l.id) ? 'Completada' : locked ? 'Se abre con el nivel' : 'Léela antes de practicar'}
          onPress={locked ? undefined : () => router.push(`/leccion/${l.id}`)}
        />
      ))}
      <ProgressBar value={step.solved / step.required} color={m.color} label={`Avance del nivel ${step.level}`} />
      <Body muted>
        {locked
          ? `Completa el nivel anterior para abrirlo.`
          : `${Math.min(step.solved, step.required)} de ${step.required} ejercicios bien resueltos para completarlo (hay ${step.total}).`}
      </Body>
      {locked ? null : (
        <Button
          label={step.status === 'completado' ? 'Practicar otra vez' : 'Practicar este nivel'}
          icon="play"
          variant={step.status === 'completado' ? 'secondary' : 'primary'}
          compact
          onPress={() => router.push({ pathname: '/practica', params: { modo: 'nivel', id: m.id, nivel: String(step.level) } })}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800' },
  levelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  levelTitle: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
});
