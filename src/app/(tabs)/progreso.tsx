import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Body, Card, ErrorNotice, ListRow, Loading, ProgressBar, Screen, SectionTitle, Stat, Title, type IconName } from '@/components/ui';
import { formatDateTime, parseDay } from '@/core/dates';
import { EXAM_PRESETS } from '@/core/exam';
import { CATEGORY_LABELS } from '@/core/types';
import { getAchievements } from '@/db/achievements';
import { useDb } from '@/db/DatabaseProvider';
import { listExamSessions } from '@/db/exams';
import {
  getDailyStats,
  getFrequentErrors,
  getLessonProgressMap,
  getModuleProgress,
  getOverview,
  getWeakCategories,
} from '@/db/progress';
import { getLessons, getModules } from '@/db/questions';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function Progreso() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const [overview, modules, moduleProgress, daily, weak, errors, lessons, lessonProgress, exams, achievements] = await Promise.all([
      getOverview(db),
      getModules(db),
      getModuleProgress(db),
      getDailyStats(db),
      getWeakCategories(db),
      getFrequentErrors(db),
      getLessons(db),
      getLessonProgressMap(db),
      listExamSessions(db, true),
      getAchievements(db),
    ]);
    return { overview, modules, moduleProgress, daily, weak, errors, lessons, lessonProgress, exams, achievements };
  });

  if (error) return <Screen><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  const o = data.overview;
  const completedLessons = data.lessons.filter((l) => data.lessonProgress.get(l.id)?.status === 'completada');
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.attempts));

  return (
    <Screen>
      <Title>Mi progreso</Title>
      {o.totalAttempts === 0 ? (
        <MascotTip text="Todavía no hay datos. ¡Resuelve tu primer ejercicio y aquí verás cómo avanzas!" />
      ) : null}
      <View style={styles.stats}>
        <Stat icon="create" value={`${o.totalAttempts}`} label="ejercicios respondidos" />
        <Stat icon="checkmark-circle" value={`${o.accuracy} %`} label="respuestas correctas" color={colors.success} />
        <Stat icon="book" value={`${o.lessonsDone}`} label="lecciones completadas" color={colors.info} />
      </View>

      <SectionTitle>Resultados por módulo</SectionTitle>
      <Card>
        {data.modules.map((m) => {
          const p = data.moduleProgress.find((x) => x.moduleId === m.id);
          return (
            <View key={m.id} style={{ gap: 4 }}>
              <View style={styles.between}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{m.title}</Text>
                <Text style={{ color: colors.textMuted }}>
                  {p?.solved ?? 0}/{p?.totalQuestions ?? 0} · {p?.accuracy ?? 0} %
                </Text>
              </View>
              <ProgressBar value={p?.progress ?? 0} color={m.color} height={8} label={m.title} />
            </View>
          );
        })}
      </Card>

      <SectionTitle>Evolución por sesión</SectionTitle>
      <Card>
        {data.daily.length === 0 ? (
          <Body muted>Aún no hay sesiones registradas.</Body>
        ) : (
          <View style={styles.chart} accessible accessibilityLabel="Gráfica de ejercicios por día">
            {data.daily.map((d) => {
              const date = parseDay(d.day);
              const h = (d.attempts / maxDaily) * 90;
              const ch = d.attempts === 0 ? 0 : (d.correct / d.attempts) * h;
              return (
                <View key={d.day} style={styles.barCol}>
                  <View style={[styles.bar, { height: h, backgroundColor: colors.surfaceAlt }]}>
                    <View style={{ height: ch, backgroundColor: colors.success, borderRadius: 4 }} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{date.getDate()}/{date.getMonth() + 1}</Text>
                </View>
              );
            })}
          </View>
        )}
        <Body muted style={{ fontSize: 13 }}>Barra completa: ejercicios del día. Verde: correctos.</Body>
      </Card>

      <SectionTitle>Temas que necesitan refuerzo</SectionTitle>
      <Card>
        {data.weak.length === 0 ? (
          <Body muted>Ningún tema con menos de 60 % de aciertos (se necesitan al menos 3 intentos por tema).</Body>
        ) : (
          data.weak.map((w) => {
            const m = data.modules.find((x) => x.category === w.category);
            return (
              <ListRow
                key={w.category}
                icon="fitness"
                iconColor={colors.warning}
                title={CATEGORY_LABELS[w.category]}
                subtitle={`${w.accuracy} % de aciertos en ${w.attempts} intentos`}
                onPress={m ? () => router.push(`/modulo/${m.id}`) : undefined}
              />
            );
          })
        )}
      </Card>

      <SectionTitle>Errores frecuentes</SectionTitle>
      <Card>
        {data.errors.length === 0 ? (
          <Body muted>Sin errores registrados.</Body>
        ) : (
          data.errors.map((e) => (
            <ListRow key={e.questionId} icon="bug" iconColor={colors.danger} title={e.prompt.length > 70 ? e.prompt.slice(0, 70) + '…' : e.prompt} subtitle={`${CATEGORY_LABELS[e.category]} · ${e.errors} ${e.errors === 1 ? 'error' : 'errores'}`} />
          ))
        )}
      </Card>

      <SectionTitle>Lecciones completadas</SectionTitle>
      <Card>
        {completedLessons.length === 0 ? (
          <Body muted>Aún no completas lecciones.</Body>
        ) : (
          completedLessons.map((l) => (
            <ListRow key={l.id} icon="checkmark-circle" iconColor={colors.success} title={l.title} onPress={() => router.push(`/leccion/${l.id}`)} />
          ))
        )}
      </Card>

      <SectionTitle>Historial de simulacros</SectionTitle>
      <Card>
        {data.exams.length === 0 ? (
          <Body muted>Sin simulacros terminados.</Body>
        ) : (
          data.exams.map((s) => (
            <ListRow
              key={s.id}
              icon={s.kind === 'diagnostico' ? 'compass' : 'timer'}
              title={`${EXAM_PRESETS[s.kind].title}: ${s.score ?? 0}/${s.maxScore ?? 0}`}
              subtitle={formatDateTime(s.startedAt)}
              onPress={() => router.push(`/resultado/${s.id}`)}
            />
          ))
        )}
      </Card>

      <SectionTitle>Insignias</SectionTitle>
      <View style={styles.badges}>
        {data.achievements.map((a) => {
          const unlocked = !!a.unlockedAt;
          return (
            <View
              key={a.id}
              style={[styles.badge, { backgroundColor: colors.surface, borderColor: unlocked ? colors.warning : colors.border, opacity: unlocked ? 1 : 0.55 }]}
              accessible
              accessibilityLabel={`${a.title}: ${a.description}. ${unlocked ? 'Obtenida' : 'Pendiente'}`}
            >
              <Ionicons name={(unlocked ? a.icon : 'lock-closed') as IconName} size={28} color={unlocked ? colors.warning : colors.textMuted} />
              <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'center', fontSize: 13 }}>{a.title}</Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 11.5 }}>{a.description}</Text>
            </View>
          );
        })}
      </View>
      <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
        Tu progreso es privado: se guarda solo en este dispositivo y no se compara con nadie.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 110 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', maxWidth: 26, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', flexGrow: 1, minWidth: 96, borderWidth: 2, borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 4 },
});
