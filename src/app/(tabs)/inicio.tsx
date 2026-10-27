import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, ListRow, Loading, ProgressBar, Screen, SectionTitle, Stat, Tag } from '@/components/ui';
import { daysBetween, toLocalDay } from '@/core/dates';
import { FIRST_STAGE_START, PLAN_KIND_LABELS } from '@/core/plan';
import { CATEGORY_LABELS, LEVEL_NAMES } from '@/core/types';
import { useDb } from '@/db/DatabaseProvider';
import { getActiveExam, getLatestDiagnostic } from '@/db/exams';
import { getPlan } from '@/db/plan';
import { countDueReviews, getOverview, getRecommendedChallenge } from '@/db/progress';
import { getLastActivity, getSetting } from '@/db/settings';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/theme/ThemeProvider';

export default function Inicio() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const now = new Date();
    const [alias, overview, active, last, recommendation, dueReviews, diagnostic, plan] = await Promise.all([
      getSetting(db, 'alias'),
      getOverview(db, now),
      getActiveExam(db),
      getLastActivity(db),
      getRecommendedChallenge(db),
      countDueReviews(db, now),
      getLatestDiagnostic(db),
      getPlan(db),
    ]);
    const today = toLocalDay(now);
    return {
      alias,
      overview,
      active,
      last,
      recommendation,
      dueReviews,
      diagnostic,
      todayPlan: plan.filter((p) => p.day === today),
      daysToStage: daysBetween(today, FIRST_STAGE_START),
    };
  });

  if (error) {
    return (
      <Screen>
        <ErrorNotice error={error} onRetry={reload} />
      </Screen>
    );
  }
  if (!data) return <Loading />;
  const { overview: o } = data;

  return (
    <Screen>
      <Text style={[styles.hello, { color: colors.text }]} accessibilityRole="header">
        ¡Hola, {data.alias || 'explorador'}!
      </Text>
      <MascotTip
        text={
          o.practicedToday
            ? 'Buen trabajo hoy. Recuerda descansar: sesiones de 30 a 45 minutos rinden más que maratones.'
            : data.daysToStage > 0
              ? `Faltan ${data.daysToStage} días para la primera etapa (12 al 14 de noviembre). ¡Un poco cada día!`
              : 'Sigue entrenando con la ruta avanzada para las siguientes etapas.'
        }
      />

      <Card accent={colors.primary}>
        <View style={styles.levelRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.levelTitle, { color: colors.text }]}>
              Nivel {o.level.level}: {LEVEL_NAMES[o.level.level]}
            </Text>
            <Text style={{ color: colors.textMuted }}>
              {o.xp} XP{o.level.nextThreshold !== null ? ` · ${o.level.nextThreshold - o.xp} XP para el siguiente nivel` : ' · ¡Nivel máximo!'}
            </Text>
          </View>
        </View>
        <ProgressBar value={o.level.progress} label="Progreso del nivel" />
      </Card>

      <View style={styles.stats}>
        <Stat icon="flame" value={`${o.streak}`} label={o.streak === 1 ? 'día de racha' : 'días de racha'} color={colors.warning} />
        <Stat icon="pie-chart" value={`${Math.round(o.globalProgress * 100)} %`} label="progreso global" />
        <Stat icon="checkmark-done" value={`${o.solvedQuestions}/${o.totalQuestions}`} label="ejercicios resueltos" color={colors.success} />
      </View>

      {data.active ? (
        <Card accent={colors.warning}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {data.active.kind === 'diagnostico' ? 'Tienes un diagnóstico sin terminar' : 'Tienes un simulacro en curso'}
          </Text>
          <Button label="Continuar" icon="play" onPress={() => router.push(`/examen/${data.active!.id}`)} />
        </Card>
      ) : null}

      {data.last ? (
        <Button
          label={`Continuar: ${data.last.label}`}
          icon="play-circle"
          variant="secondary"
          onPress={() => router.push({ pathname: data.last!.pathname, params: data.last!.params } as Href)}
        />
      ) : null}

      {!data.diagnostic ? (
        <Card accent={colors.accent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Empieza con el diagnóstico</Text>
          <Body muted>12 preguntas breves para saber qué temas conviene practicar primero. No es un examen.</Body>
          <Button label="Hacer diagnóstico" icon="compass" variant="accent" onPress={() => router.push('/diagnostico')} />
        </Card>
      ) : null}

      {data.recommendation ? (
        <Card>
          <SectionTitle>Reto recomendado</SectionTitle>
          <View style={styles.tags}>
            <Tag label={CATEGORY_LABELS[data.recommendation.category]} />
            <Tag label={`Nivel sugerido ${data.recommendation.difficulty}`} tone="neutral" />
          </View>
          <Body muted>{data.recommendation.questions.length} ejercicios elegidos según tu desempeño.</Body>
          <Button label="Aceptar el reto" icon="flash" onPress={() => router.push({ pathname: '/practica', params: { modo: 'reto' } })} />
        </Card>
      ) : null}

      {data.dueReviews > 0 ? (
        <Card accent={colors.danger}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Repaso pendiente</Text>
          <Body muted>
            {data.dueReviews} {data.dueReviews === 1 ? 'ejercicio que fallaste está listo' : 'ejercicios que fallaste están listos'} para repasar.
          </Body>
          <Button label="Repasar errores" icon="refresh" variant="secondary" onPress={() => router.push({ pathname: '/practica', params: { modo: 'repaso' } })} />
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Plan de hoy</SectionTitle>
        {data.todayPlan.length === 0 ? (
          <Body muted>No hay tareas para hoy. Genera tu plan o practica libremente.</Body>
        ) : (
          data.todayPlan.map((p) => (
            <ListRow
              key={p.id}
              icon={p.done ? 'checkmark-circle' : 'ellipse-outline'}
              iconColor={p.done ? colors.success : colors.textMuted}
              title={p.title}
              subtitle={`${PLAN_KIND_LABELS[p.kind]}${p.minutes ? ` · ${p.minutes} min` : ''}`}
            />
          ))
        )}
        <Button label="Ver plan de preparación" icon="calendar" variant="ghost" compact onPress={() => router.push('/plan')} />
      </Card>

      <Button label="Ir al simulador de examen" icon="timer" variant="accent" onPress={() => router.push('/simulador')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 28, fontWeight: '900' },
  levelRow: { flexDirection: 'row', alignItems: 'center' },
  levelTitle: { fontSize: 18, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
});
