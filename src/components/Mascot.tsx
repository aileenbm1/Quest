import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export type MascotMood = 'feliz' | 'pensando' | 'animo';

/** «Bit», el robot explorador de OIEG Quest. Personaje original. */
export function Mascot({ size = 72, mood = 'feliz', animated = true }: { size?: number; mood?: MascotMood; animated?: boolean }) {
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -3, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, bob]);

  const mouth =
    mood === 'pensando' ? 'M40 66 L60 66' : mood === 'animo' ? 'M38 63 Q50 74 62 63' : 'M38 64 Q50 72 62 64';

  return (
    <Animated.View
      style={{ transform: [{ translateY: bob }] }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Bit, el robot explorador"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Line x1="50" y1="8" x2="50" y2="22" stroke={palette.cyan} strokeWidth="4" strokeLinecap="round" />
        <Circle cx="50" cy="8" r="6" fill={palette.cyan} />
        <Rect x="18" y="22" width="64" height="58" rx="18" fill={palette.violet} />
        <Rect x="26" y="32" width="48" height="40" rx="12" fill={palette.night} />
        <Circle cx="40" cy="50" r="6" fill={palette.cyan} />
        <Circle cx="60" cy="50" r={mood === 'pensando' ? 4 : 6} fill={palette.cyan} />
        <Path d={mouth} stroke={palette.cyan} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <Rect x="8" y="42" width="10" height="20" rx="5" fill={palette.cyan} />
        <Rect x="82" y="42" width="10" height="20" rx="5" fill={palette.cyan} />
        <Rect x="32" y="82" width="12" height="12" rx="4" fill={palette.violet} />
        <Rect x="56" y="82" width="12" height="12" rx="4" fill={palette.violet} />
      </Svg>
    </Animated.View>
  );
}

/** Mensaje de orientación con la mascota. */
export function MascotTip({ text, mood = 'feliz', title }: { text: string; mood?: MascotMood; title?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Mascot size={56} mood={mood} />
      <View style={[styles.bubble, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
        <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { flex: 1, borderRadius: radius.md, padding: 12, borderWidth: 1 },
  title: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  text: { fontSize: 15, lineHeight: 21 },
});
