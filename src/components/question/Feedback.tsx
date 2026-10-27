import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { describeCorrectAnswer, describeResponse } from '@/core/grading';
import type { GradeResult, Lesson, Question } from '@/core/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Mascot } from '../Mascot';
import { Button } from '../ui';

const MESSAGES: Record<GradeResult, { title: string; icon: 'checkmark-circle' | 'close-circle' | 'help-circle' | 'document-text' }> = {
  correcta: { title: '¡Correcto!', icon: 'checkmark-circle' },
  incorrecta: { title: 'Todavía no', icon: 'close-circle' },
  vacia: { title: 'Sin respuesta', icon: 'help-circle' },
  no_verificable: { title: 'Respuesta registrada', icon: 'document-text' },
};

/** Retroalimentación después de responder: resultado, procedimiento, concepto y otro ejemplo. */
export function Feedback({
  question,
  response,
  result,
  lesson,
}: {
  question: Question;
  response: string | null;
  result: GradeResult;
  lesson?: Lesson | null;
}) {
  const { colors } = useTheme();
  const [showExample, setShowExample] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [fade]);

  const tone =
    result === 'correcta'
      ? { bg: colors.successSoft, fg: colors.success }
      : result === 'no_verificable'
        ? { bg: colors.infoSoft, fg: colors.info }
        : { bg: colors.dangerSoft, fg: colors.danger };
  const msg = MESSAGES[result];
  const wrong = result === 'incorrecta' || result === 'vacia';

  return (
    <Animated.View style={[styles.wrap, { opacity: fade }]} accessibilityLiveRegion="polite">
      <View style={[styles.banner, { backgroundColor: tone.bg }]}>
        <Ionicons name={msg.icon} size={28} color={tone.fg} />
        <Text style={[styles.bannerText, { color: tone.fg }]}>{msg.title}</Text>
      </View>

      {result === 'no_verificable' ? (
        <Text style={[styles.body, { color: colors.text }]}>
          {question.verification === 'pendiente'
            ? 'Esta pregunta todavía no tiene una solución verificada, así que no se califica. Compara tu respuesta con la referencia y consúltala con tu profesor.'
            : 'Esta es una pregunta abierta: la app no puede calificarla de forma fiable. Compara tu respuesta con la solución de referencia.'}
        </Text>
      ) : null}

      <Row label="Tu respuesta" value={describeResponse(question, response)} />
      <Row
        label={question.answer.kind === 'reference' ? 'Solución de referencia' : 'Respuesta correcta'}
        value={describeCorrectAnswer(question)}
        strong
      />

      <View style={[styles.box, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Procedimiento</Text>
        <Text style={[styles.body, { color: colors.text }]}>{question.explanation}</Text>
      </View>

      {wrong && lesson ? (
        <View style={[styles.box, { borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.mascotRow}>
            <Mascot size={44} mood="animo" animated={false} />
            <Text style={[styles.body, { color: colors.text, flex: 1 }]}>
              Equivocarse es parte de aprender. Guardé este ejercicio para repasarlo en otra sesión.
            </Text>
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>La idea clave</Text>
          <Text style={[styles.body, { color: colors.text }]}>{lesson.keyIdea}</Text>
          {showExample ? (
            <View style={{ gap: 4 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Otro ejemplo</Text>
              <Text style={[styles.body, { color: colors.text, fontWeight: '600' }]}>{lesson.exampleProblem}</Text>
              {lesson.exampleSolution.map((s, i) => (
                <Text key={i} style={[styles.body, { color: colors.text }]}>
                  {i + 1}. {s}
                </Text>
              ))}
            </View>
          ) : (
            <Button label="Ver otro ejemplo" variant="ghost" icon="bulb-outline" compact onPress={() => setShowExample(true)} />
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.body, { color: colors.text, fontWeight: strong ? '700' : '400' }]}>{value}</Text>
    </View>
  );
}

export function HintBox({ hints }: { hints: string[] }) {
  const { colors } = useTheme();
  const [shown, setShown] = useState(0);
  if (hints.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {hints.slice(0, shown).map((h, i) => (
        <View key={i} style={[styles.hint, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="bulb" size={18} color={colors.warning} />
          <Text style={[styles.body, { color: colors.text, flex: 1 }]}>
            Pista {i + 1}: {h}
          </Text>
        </View>
      ))}
      {shown < hints.length ? (
        <Button
          label={`Pedir una pista (${shown + 1} de ${hints.length})`}
          variant="ghost"
          icon="bulb-outline"
          compact
          onPress={() => setShown((n) => n + 1)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md },
  bannerText: { fontSize: 20, fontWeight: '800' },
  box: { borderRadius: radius.md, padding: 12, gap: 6 },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 16, lineHeight: 23 },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hint: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.sm, alignItems: 'flex-start' },
});
