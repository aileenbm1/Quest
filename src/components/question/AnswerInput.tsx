import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Question } from '@/core/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '../ui';

interface Props {
  question: Question;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

/** Campo de respuesta adecuado para cada tipo de pregunta. */
export function AnswerInput({ question, value, onChange, disabled }: Props) {
  const spec = question.answer;
  if (spec.kind === 'order' && question.options) {
    return <OrderingInput question={question} value={value} onChange={onChange} disabled={disabled} />;
  }
  if (question.options && question.options.length > 0) {
    return <OptionList question={question} value={value} onChange={onChange} disabled={disabled} />;
  }
  return <FreeTextInput question={question} value={value} onChange={onChange} disabled={disabled} />;
}

function OptionList({ question, value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.options} accessibilityRole="radiogroup">
      {question.options!.map((o) => {
        const selected = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={o.label}
            style={[
              styles.option,
              {
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary + '1F' : colors.surface,
              },
            ]}
          >
            <View style={[styles.optionKey, { backgroundColor: selected ? colors.primary : colors.surfaceAlt }]}>
              <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '800' }}>
                {o.key.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FreeTextInput({ question, value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const kind = question.answer.kind;
  const multiline = kind === 'reference';
  const placeholder =
    question.data?.answerHint ??
    (kind === 'number'
      ? 'Escribe un número'
      : kind === 'sequence'
        ? 'Escribe los valores separados por coma'
        : multiline
          ? 'Escribe tu respuesta con pasos numerados'
          : 'Escribe tu respuesta');
  return (
    <View style={{ gap: 6 }}>
      {question.data?.answerHint ? (
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{question.data.answerHint}</Text>
      ) : null}
      <TextInput
        testID="answer-input"
        value={value ?? ''}
        onChangeText={(t) => onChange(t.length > 0 ? t : null)}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={kind === 'number' ? 'numeric' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        accessibilityLabel="Tu respuesta"
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      />
    </View>
  );
}

function OrderingInput({ question, value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const options = question.options!;
  const order = value ? value.split(',') : options.map((o) => o.key);
  const label = (k: string) => options.find((o) => o.key === k)?.label ?? k;
  const move = (index: number, delta: number) => {
    const next = [...order];
    const j = index + delta;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next.join(','));
  };
  return (
    <View style={styles.options}>
      <Text style={{ color: colors.textMuted }}>Usa las flechas para mover cada paso a su lugar.</Text>
      {order.map((k, i) => (
        <View key={k} style={[styles.option, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.optionKey, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{i + 1}</Text>
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>{label(k)}</Text>
          <View style={styles.arrows}>
            <ArrowButton icon="arrow-up" label={`Subir «${label(k)}»`} onPress={() => move(i, -1)} disabled={disabled || i === 0} />
            <ArrowButton
              icon="arrow-down"
              label={`Bajar «${label(k)}»`}
              onPress={() => move(i, 1)}
              disabled={disabled || i === order.length - 1}
            />
          </View>
        </View>
      ))}
      {value === null && !disabled ? (
        <Button label="Confirmar este orden" variant="ghost" icon="checkmark" compact onPress={() => onChange(order.join(','))} />
      ) : null}
    </View>
  );
}

function ArrowButton({ icon, label, onPress, disabled }: { icon: 'arrow-up' | 'arrow-down'; label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.arrow, { backgroundColor: colors.surfaceAlt, opacity: disabled ? 0.35 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 56,
  },
  optionKey: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 16, lineHeight: 22 },
  input: { borderWidth: 2, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, minHeight: 54 },
  inputMultiline: { minHeight: 140, textAlignVertical: 'top', fontSize: 16 },
  arrows: { gap: 6 },
  arrow: { width: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
