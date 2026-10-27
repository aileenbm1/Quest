import { StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABELS, LEVEL_NAMES, QUESTION_TYPE_LABELS, type Question } from '@/core/types';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Tag } from '../ui';

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
      {d?.grid ? <GridView rows={d.grid} legend={d.gridLegend} /> : null}
    </View>
  );
}

export function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <View style={styles.code} accessible accessibilityLabel={`Algoritmo: ${lines.join('. ')}`}>
      {lines.map((line, i) => (
        <Text key={i} style={styles.codeText}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const CELL_STYLE: Record<string, { bg: string; fg: string }> = {
  '#': { bg: '#334155', fg: '#334155' },
  R: { bg: palette.violet, fg: '#FFFFFF' },
  S: { bg: palette.violet, fg: '#FFFFFF' },
  M: { bg: '#16A34A', fg: '#FFFFFF' },
};

export function GridView({ rows, legend }: { rows: string[]; legend?: string }) {
  const { colors } = useTheme();
  const cols = Math.max(...rows.map((r) => r.length));
  const size = Math.min(44, Math.floor(300 / Math.max(cols, 1)));
  return (
    <View style={styles.gridWrap} accessible accessibilityLabel={`Cuadrícula de ${rows.length} filas por ${cols} columnas. ${legend ?? ''}`}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.split('').map((ch, c) => {
            const special = CELL_STYLE[ch];
            const isLetter = /[A-Z]/.test(ch) && !special;
            return (
              <View
                key={c}
                style={[
                  styles.cell,
                  {
                    width: size,
                    height: size,
                    borderColor: colors.border,
                    backgroundColor: special?.bg ?? (isLetter ? palette.cyan : colors.surface),
                  },
                ]}
              >
                {ch !== '.' && ch !== '#' ? (
                  <Text style={{ color: special?.fg ?? palette.night, fontWeight: '800', fontSize: size * 0.42 }}>{ch}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      {legend ? <Text style={[styles.legend, { color: colors.textMuted }]}>{legend}</Text> : null}
    </View>
  );
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
  cell: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  legend: { fontSize: 13, marginTop: 8, textAlign: 'center' },
});
