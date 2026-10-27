import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, ErrorNotice, ListRow, Loading, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { LEVEL_NAMES } from '@/core/types';
import { useDb } from '@/db/DatabaseProvider';
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
    const [module, lessons, lessonProgress, progress, failed] = await Promise.all([
      getModule(db, id),
      getLessons(db, id),
      getLessonProgressMap(db),
      getModuleProgress(db),
      getFailedQuestions(db, id),
    ]);
    return { module, lessons, lessonProgress, progress: progress.find((p) => p.moduleId === id), failed };
  }, id);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  if (!data.module) return <Screen edges={[]}><Body>No encontramos este módulo.</Body></Screen>;
  const { module: m, progress: p } = data;

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

      <SectionTitle>Lecciones</SectionTitle>
      <Card>
        {data.lessons.map((l) => {
          const done = data.lessonProgress.get(l.id)?.status === 'completada';
          return (
            <ListRow
              key={l.id}
              icon={done ? 'checkmark-circle' : 'book-outline'}
              iconColor={done ? colors.success : m.color}
              title={`${l.position}. ${l.title}`}
              subtitle={`Nivel ${l.level} · ${LEVEL_NAMES[l.level]}${done ? ' · completada' : ''}`}
              onPress={() => router.push(`/leccion/${l.id}`)}
            />
          );
        })}
      </Card>

      <SectionTitle>Ejercicios</SectionTitle>
      <View style={{ gap: 10 }}>
        <Button
          label="Practicar el módulo"
          icon="play"
          onPress={() => router.push({ pathname: '/practica', params: { modo: 'modulo', id: m.id } })}
        />
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

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '800' } });
