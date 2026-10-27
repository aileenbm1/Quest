import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        accent ? { borderLeftColor: accent, borderLeftWidth: 5 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  accessibilityHint,
  testID,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  testID?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    accent: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
  };
  const p = palette[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: p.bg, borderColor: p.border, opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 18 : 22} color={p.fg} /> : null}
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: p.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function ProgressBar({ value, color, height = 10, label }: { value: number; color?: string; height?: number; label?: string }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, backgroundColor: colors.surfaceAlt }]}
    >
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color ?? colors.primary }} />
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.section, { color: colors.text }]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[styles.body, { color: muted ? colors.textMuted : colors.text }, style]}>{children}</Text>;
}

export function Tag({ label, tone = 'info', icon }: { label: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; icon?: IconName }) {
  const { colors } = useTheme();
  const map = {
    info: [colors.infoSoft, colors.info],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    neutral: [colors.surfaceAlt, colors.textMuted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Stat({ icon, value, label, color }: { icon: IconName; value: string; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={22} color={color ?? colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={styles.listRow}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: (iconColor ?? colors.primary) + '22' }]}>
          <Ionicons name={icon} size={22} color={iconColor ?? colors.primary} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={[styles.listTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.body, { color: colors.textMuted, marginTop: 12 }]}>{label}</Text>
    </View>
  );
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
      <Text style={[styles.listTitle, { color: colors.danger }]}>Algo salió mal</Text>
      <Text style={[styles.body, { color: colors.text }]}>{friendlyError(error)}</Text>
      {onRetry ? <Button label="Intentar de nuevo" icon="refresh" variant="secondary" onPress={onRetry} compact /> : null}
    </Card>
  );
}

export function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (/full|disk|space/i.test(msg)) return 'No hay espacio suficiente en el dispositivo para guardar tu progreso. Libera espacio e inténtalo de nuevo.';
  if (/almacenamiento|database|sqlite/i.test(msg)) return 'No pudimos leer o guardar tus datos en este dispositivo. Cierra la app y vuelve a abrirla. Tu progreso guardado no se ha borrado.';
  return msg ? `No se pudo completar la acción. (${msg})` : 'No se pudo completar la acción.';
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderRadius: radius.lg, padding: 16, borderWidth: 1, gap: 10 },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: 14 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  buttonTextCompact: { fontSize: 15 },
  track: { width: '100%', borderRadius: 999, overflow: 'hidden' },
  title: { fontSize: 26, fontWeight: '800' },
  section: { fontSize: 19, fontWeight: '800', marginTop: 6 },
  body: { fontSize: 16, lineHeight: 23 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tagText: { fontSize: 12.5, fontWeight: '700' },
  stat: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: 12, alignItems: 'center', gap: 2, minWidth: 90 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12.5, textAlign: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 48 },
  listIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 16, fontWeight: '700' },
  listSubtitle: { fontSize: 14, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});
