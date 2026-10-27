import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, Loading, Screen, SectionTitle } from '@/components/ui';
import { formatDayLabel, toLocalDay } from '@/core/dates';
import { PLAN_KIND_LABELS, type PlanKind } from '@/core/plan';
import { useDb } from '@/db/DatabaseProvider';
import { deletePlanItem, ensurePlan, getSessionMinutes, regeneratePlan, setPlanItemDone, setPlanItemMinutes, type StoredPlanItem } from '@/db/plan';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const ACTION: Partial<Record<PlanKind, Href>> = {
  diagnostico: '/diagnostico',
  leccion: '/academia',
  reto: { pathname: '/practica', params: { modo: 'reto' } },
  repaso: { pathname: '/practica', params: { modo: 'repaso' } },
  simulacro_corto: '/simulador',
  simulacro_completo: '/simulador',
  repaso_ligero: '/progreso',
  avanzado: '/academia',
};

export default function PlanScreen() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const { data, error, reload } = useAsyncData(async () => {
    const [plan, minutes] = await Promise.all([ensurePlan(db), getSessionMinutes(db)]);
    return { plan, minutes };
  });

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setActionError(null);
      reload();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  };

  const today = toLocalDay(new Date());
  const days = new Map<string, StoredPlanItem[]>();
  for (const item of data.plan) {
    if (item.day < today && item.done) continue; // ocultar días pasados ya cumplidos
    days.set(item.day, [...(days.get(item.day) ?? []), item]);
  }

  return (
    <Screen edges={[]}>
      <MascotTip text="Este plan es una sugerencia que puedes editar. Practica a tu ritmo: lo importante es la constancia, no la cantidad de horas." />
      <Card>
        <SectionTitle>Duración de cada sesión</SectionTitle>
        <View style={styles.row}>
          {[30, 35, 40, 45].map((m) => (
            <Pressable
              key={m}
              onPress={() => run(() => regeneratePlan(db, new Date(), m))}
              accessibilityRole="radio"
              accessibilityState={{ checked: data.minutes === m }}
              accessibilityLabel={`${m} minutos`}
              style={[styles.chip, { borderColor: data.minutes === m ? colors.primary : colors.border, backgroundColor: data.minutes === m ? colors.primary : colors.surface }]}
            >
              <Text style={{ color: data.minutes === m ? colors.onPrimary : colors.text, fontWeight: '700' }}>{m} min</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Regenerar plan desde hoy" icon="refresh" variant="ghost" compact loading={busy} onPress={() => run(() => regeneratePlan(db))} />
        <Body muted style={{ fontSize: 13 }}>
          Completar el plan no garantiza aprobar ni avanzar de etapa. Las fechas de la primera etapa (12 al 14 de noviembre de 2026) provienen de la convocatoria; confírmalas en el sitio oficial.
        </Body>
      </Card>
      {actionError ? <ErrorNotice error={actionError} /> : null}

      {[...days.entries()].map(([day, items]) => (
        <View key={day} style={{ gap: 8 }}>
          <Text style={[styles.day, { color: day === today ? colors.primary : colors.text }]}>
            {day === today ? 'Hoy · ' : ''}
            {formatDayLabel(day)}
            {items[0]?.phase === 'avanzada' ? ' · Ruta avanzada' : ''}
          </Text>
          {items.map((item) => (
            <Card key={item.id} style={{ opacity: item.done ? 0.65 : 1 }}>
              <View style={styles.itemRow}>
                <Pressable
                  onPress={() => run(() => setPlanItemDone(db, item.id, !item.done))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                  accessibilityLabel={`Marcar «${item.title}» como hecha`}
                  hitSlop={8}
                >
                  <Ionicons name={item.done ? 'checkbox' : 'square-outline'} size={28} color={item.done ? colors.success : colors.textMuted} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
                  <Text style={{ color: colors.textMuted }}>{PLAN_KIND_LABELS[item.kind]}</Text>
                </View>
              </View>
              {item.kind !== 'evento' ? (
                <View style={styles.itemRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Quitar 5 minutos" onPress={() => run(() => setPlanItemMinutes(db, item.id, item.minutes - 5))} style={[styles.small, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </Pressable>
                  <Text style={{ color: colors.text, fontWeight: '700', minWidth: 60, textAlign: 'center' }}>{item.minutes} min</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Agregar 5 minutos" onPress={() => run(() => setPlanItemMinutes(db, item.id, item.minutes + 5))} style={[styles.small, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="add" size={18} color={colors.text} />
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  {ACTION[item.kind] ? (
                    <Button label="Ir" icon="arrow-forward" compact variant="secondary" onPress={() => router.push(ACTION[item.kind]!)} />
                  ) : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar «${item.title}»`} onPress={() => run(() => deletePlanItem(db, item.id))} style={[styles.small, { backgroundColor: colors.dangerSoft }]}>
                    <Ionicons name="trash" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  day: { fontSize: 17, fontWeight: '800', marginTop: 6, textTransform: 'capitalize' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  small: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
