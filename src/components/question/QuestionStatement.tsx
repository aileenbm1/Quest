import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { getVisual } from '@/content/visuals';
import { CATEGORY_LABELS, LEVEL_NAMES, QUESTION_TYPE_LABELS, type Question } from '@/core/types';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Mascot } from '../Mascot';
import { Tag } from '../ui';
import { VisualView } from '../visuals/VisualView';

export function SourceTags({ question }: { question: Question }) {
  return (
    <View style={styles.tags}>
      {question.origin === 'oficial' ? (
        <Tag label="Pregunta oficial" tone="info" icon="ribbon" />
      ) : (
        <Tag label="Ejercicio original de práctica" tone="neutral" icon="create" />
      )}
      {question.verification === 'pendiente' ? <Tag label="Pendiente de revisión" tone="warning" icon="alert-circle" /> : null}
    </View>
  );
}

/** Enunciado, datos, pseudocódigo y cuadrícula de una pregunta. */
export function QuestionStatement({ question, showMeta = true }: { question: Question; showMeta?: boolean }) {
  const { colors } = useTheme();
  const d = question.data;
  const visual = getVisual(question.id);
  return (
    <View style={styles.wrap}>
      {showMeta ? (
        <View style={styles.tags}>
          <Tag label={CATEGORY_LABELS[question.category]} tone="info" />
          <Tag label={`Nivel ${question.difficulty} · ${LEVEL_NAMES[question.difficulty]}`} tone="neutral" />
          <Tag label={QUESTION_TYPE_LABELS[question.type]} tone="neutral" />
        </View>
      ) : null}
      <Text style={[styles.prompt, { color: colors.text }]} accessibilityRole="header">
        {question.prompt}
      </Text>
      {d?.text ? (
        <View style={[styles.dataBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.dataText, { color: colors.text }]}>{d.text}</Text>
        </View>
      ) : null}
      {d?.code ? <CodeBlock lines={d.code} /> : null}
      {visual ? <VisualView visual={visual} /> : null}
      {d?.grid ? <GridView rows={d.grid} legend={d.gridLegend} /> : null}
    </View>
  );
}

export function CodeBlock({ lines }: { lines: string[] }) {
  const { colors } = useTheme();
  const usesArrow = lines.some((l) => l.includes('←'));
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.code} accessible accessibilityLabel={`Algoritmo: ${lines.join('. ')}`}>
        {lines.map((line, i) => (
          <Text key={i} style={styles.codeText}>
            {line}
          </Text>
        ))}
      </View>
      {usesArrow ? (
        <Text style={[styles.legend, { color: colors.textMuted, marginTop: 0, textAlign: 'left' }]}>
          La flecha ← significa «guardar»: «x ← 3» guarda el 3 en x. «x ← x + 1» toma lo que hay en x, le suma 1 y lo vuelve a guardar.
        </Text>
      ) : null}
    </View>
  );
}

export function GridView({ rows, legend }: { rows: string[]; legend?: string }) {
  const { colors } = useTheme();
  const cols = Math.max(...rows.map((r) => r.length));
  const size = Math.min(48, Math.floor(300 / Math.max(cols, 1)));
  return (
    <View style={styles.gridWrap} accessible accessibilityLabel={`Cuadrícula de ${rows.length} filas por ${cols} columnas. ${legend ?? ''}`}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.split('').map((ch, c) => (
            <GridCell key={c} ch={ch} size={size} borderColor={colors.border} floor={colors.surface} />
          ))}
        </View>
      ))}
      {legend ? <Text style={[styles.legend, { color: colors.textMuted }]}>{legend}</Text> : null}
    </View>
  );
}

/** Una casilla: pared, robot, salida, meta o letra de destino; si no, piso vacío. */
function GridCell({ ch, size, borderColor, floor }: { ch: string; size: number; borderColor: string; floor: string }) {
  const base = { width: size, height: size, borderColor };
  if (ch === '#') {
    return (
      <View style={[styles.cell, base, { backgroundColor: '#334155' }]}>
        <View style={[styles.brick, { width: size * 0.7 }]} />
        <View style={[styles.brick, { width: size * 0.7 }]} />
      </View>
    );
  }
  if (ch === 'R') {
    return (
      <View style={[styles.cell, base, { backgroundColor: floor }]}>
        <Mascot size={size * 0.85} animated={false} />
      </View>
    );
  }
  if (ch === 'M') {
    return (
      <View style={[styles.cell, base, { backgroundColor: '#DCFCE7' }]}>
        <Ionicons name="flag" size={size * 0.62} color="#15803D" />
      </View>
    );
  }
  if (ch === 'S') {
    return (
      <View style={[styles.cell, base, { backgroundColor: '#EDE9FE' }]}>
        <Ionicons name="navigate-circle" size={size * 0.68} color={palette.violet} />
      </View>
    );
  }
  if (/[A-Z]/.test(ch)) {
    return (
      <View style={[styles.cell, base, { backgroundColor: palette.cyan }]}>
        <Text style={{ color: palette.night, fontWeight: '800', fontSize: size * 0.46 }}>{ch}</Text>
      </View>
    );
  }
  return <View style={[styles.cell, base, { backgroundColor: floor }]} />;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prompt: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  dataBox: { borderRadius: radius.sm, padding: 12 },
  dataText: { fontSize: 16, lineHeight: 23 },
  code: { backgroundColor: palette.night, borderRadius: radius.sm, padding: 14, gap: 3 },
  codeText: { color: '#E2E8F0', fontFamily: 'monospace', fontSize: 15, lineHeight: 22 },
  gridWrap: { alignItems: 'center', gap: 0 },
  gridRow: { flexDirection: 'row' },
  cell: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  brick: { height: 4, borderRadius: 2, backgroundColor: '#64748B' },
  legend: { fontSize: 13, marginTop: 8, textAlign: 'center' },
});
