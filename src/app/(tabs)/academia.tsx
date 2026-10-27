import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Button, ErrorNotice, Loading, ProgressBar, Screen, Title, type IconName } from '@/components/ui';
import { useDb } from '@/db/DatabaseProvider';
import { getModuleProgress } from '@/db/progress';
import { getModules } from '@/db/questions';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function Academia() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const [modules, progress] = await Promise.all([getModules(db), getModuleProgress(db)]);
    return modules.map((m) => ({ module: m, progress: progress.find((p) => p.moduleId === m.id) }));
  });

  if (error) return <Screen><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;

  return (
    <Screen>
      <Title>Academia</Title>
      <MascotTip text="Elige un módulo. Cada uno tiene lecciones cortas y ejercicios que van de fácil a difícil." />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button label="Diagnóstico" icon="compass" variant="secondary" compact onPress={() => router.push('/diagnostico')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Mi plan" icon="calendar" variant="secondary" compact onPress={() => router.push('/plan')} />
        </View>
      </View>
      {data.map(({ module: m, progress: p }) => (
        <Pressable
          key={m.id}
          accessibilityRole="button"
          accessibilityLabel={`Módulo ${m.position}: ${m.title}`}
          onPress={() => router.push(`/modulo/${m.id}`)}
          style={({ pressed }) => [
            styles.module,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: m.color }]}>
            <Ionicons name={m.icon as IconName} size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.kicker, { color: m.color }]}>MÓDULO {m.position}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{m.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{m.subtitle}</Text>
            <ProgressBar value={p?.progress ?? 0} color={m.color} height={8} label={`Progreso de ${m.title}`} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {p?.solved ?? 0} de {p?.totalQuestions ?? 0} ejercicios · {p?.lessonsDone ?? 0} de {p?.lessonsTotal ?? 0} lecciones
            </Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  module: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '800' },
});
