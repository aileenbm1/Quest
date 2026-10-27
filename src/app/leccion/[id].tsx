import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, Loading, Screen, SectionTitle, Tag } from '@/components/ui';
import { LEVEL_NAMES } from '@/core/types';
import { useDb } from '@/db/DatabaseProvider';
import { getLesson, queryQuestions } from '@/db/questions';
import { setLastActivity } from '@/db/settings';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function LeccionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const lesson = await getLesson(db, id);
    const questions = await queryQuestions(db, 'q.lesson_id = ?', [id]);
    if (lesson) await setLastActivity(db, { label: `Lección «${lesson.title}»`, pathname: '/leccion/[id]', params: { id } });
    return { lesson, count: questions.length };
  }, id);

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  const l = data.lesson;
  if (!l) return <Screen edges={[]}><Body>No encontramos esta lección.</Body></Screen>;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: l.title }} />
      <Tag label={`Nivel ${l.level} · ${LEVEL_NAMES[l.level]}`} />
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {l.title}
      </Text>
      <Body>{l.intro}</Body>
      <Card accent={colors.primary}>
        <SectionTitle>La idea clave</SectionTitle>
        <Body>{l.keyIdea}</Body>
      </Card>
      <Card>
        <SectionTitle>Ejemplo resuelto</SectionTitle>
        <Body style={{ fontWeight: '700' }}>{l.exampleProblem}</Body>
        {l.exampleSolution.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>{i + 1}</Text>
            </View>
            <Body style={{ flex: 1 }}>{s}</Body>
          </View>
        ))}
      </Card>
      {l.tips.length > 0 ? <MascotTip title="Consejos de Bit" text={l.tips.map((t) => `• ${t}`).join('\n')} /> : null}
      <Button
        label={`Practicar esta lección (${data.count} ejercicios)`}
        icon="play"
        disabled={data.count === 0}
        onPress={() => router.push({ pathname: '/practica', params: { modo: 'leccion', id: l.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900' },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
