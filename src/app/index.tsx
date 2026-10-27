import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Body, Button, Card, Loading, Screen } from '@/components/ui';
import { DISCLAIMER } from '@/content/sources';
import { useDb } from '@/db/DatabaseProvider';
import { getSetting, setSetting } from '@/db/settings';
import { useAsyncData } from '@/hooks/useAsyncData';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function Welcome() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data: onboarded, loading } = useAsyncData(() => getSetting(db, 'onboarded'));
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading && onboarded === undefined) return <Loading />;
  if (onboarded === '1') return <Redirect href="/inicio" />;

  const start = async () => {
    setSaving(true);
    try {
      const clean = alias.trim().slice(0, 20);
      if (clean) await setSetting(db, 'alias', clean);
      await setSetting(db, 'onboarded', '1');
      router.replace('/inicio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={[styles.hero, { backgroundColor: palette.night }]}>
        <Mascot size={120} />
        <Text style={styles.brand}>OIEG Quest</Text>
        <Text style={styles.motto}>Entrena tu mente. Supera el reto.</Text>
      </View>
      <Card>
        <Body>
          Practica lógica, patrones, algoritmos y matemáticas para prepararte para la Olimpiada de Informática del Estado
          de Guanajuato. Avanza a tu ritmo, aprende de tus errores y haz simulacros con tiempo.
        </Body>
        <Body muted>Funciona sin internet. Tu progreso se guarda solo en este dispositivo.</Body>
      </Card>
      <Card>
        <Text style={[styles.label, { color: colors.text }]}>¿Cómo quieres que te llame? (opcional)</Text>
        <TextInput
          value={alias}
          onChangeText={setAlias}
          maxLength={20}
          placeholder="Un apodo, no tu nombre completo"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Alias opcional"
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
      </Card>
      <Button label="Comenzar a entrenar" icon="rocket" onPress={start} loading={saving} />
      <Button label="Configuración" icon="settings-outline" variant="ghost" onPress={() => router.push('/ajustes')} />
      <Body muted style={styles.disclaimer}>
        {DISCLAIMER}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, alignItems: 'center', paddingVertical: 28, gap: 6 },
  brand: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: 0.5 },
  motto: { color: palette.cyan, fontSize: 17, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 2, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50, fontSize: 17 },
  disclaimer: { fontSize: 13, textAlign: 'center' },
});
