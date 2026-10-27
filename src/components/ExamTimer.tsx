import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { formatClock } from '@/core/timer';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export function ExamTimerBadge({ remaining }: { remaining: number }) {
  const { colors } = useTheme();
  const low = remaining <= 60;
  const warn = remaining <= 300;
  const fg = low ? colors.danger : warn ? colors.warning : colors.text;
  const bg = low ? colors.dangerSoft : warn ? colors.warningSoft : colors.surfaceAlt;
  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`Tiempo restante ${formatClock(remaining)}`}
      testID="exam-timer"
    >
      <Ionicons name="time" size={20} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{formatClock(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
