import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Body, Button, Card, ErrorNotice, Loading, Screen, SectionTitle, Title } from '@/components/ui';
import { DISCLAIMER, OFFICIAL_REFERENCES } from '@/content/sources';
import { useDatabase } from '@/db/DatabaseProvider';
import { getSchemaVersion } from '@/db/migrations';
import { resetProgress } from '@/db/progress';
import { getContentStatus } from '@/db/questions';
import { deleteSetting, getSetting, setSetting } from '@/db/settings';
import { useAsyncData } from '@/hooks/useAsyncData';
import { radius } from '@/theme/colors';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'claro', label: 'Claro' },
  { value: 'oscuro', label: 'Oscuro' },
];

export default function Ajustes() {
  const { db } = useDatabase();
  const { colors, preference, setPreference } = useTheme();
  const [alias, setAlias] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const { data, error, reload } = useAsyncData(async () => {
    const [savedAlias, content, schema, contentVersion] = await Promise.all([
      getSetting(db, 'alias'),
      getContentStatus(db),
      getSchemaVersion(db),
      getSetting(db, 'content_version'),
    ]);
    return { savedAlias, content, schema, contentVersion };
  });

  if (error) return <Screen><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;
  const aliasValue = alias ?? data.savedAlias ?? '';

  const saveAlias = async () => {
    try {
      const clean = aliasValue.trim().slice(0, 20);
      if (clean) await setSetting(db, 'alias', clean);
      else await deleteSetting(db, 'alias');
      setMessage('Alias guardado.');
      reload();
    } catch (e) {
      setActionError(e);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      '¿Borrar todo tu progreso?',
      'Se eliminarán tus respuestas, lecciones completadas, simulacros, insignias y plan. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetProgress(db);
              setMessage('Tu progreso se reinició.');
            } catch (e) {
              setActionError(e);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Title>Ajustes</Title>
      {message ? <Body style={{ color: colors.success, fontWeight: '700' }}>{message}</Body> : null}
      {actionError ? <ErrorNotice error={actionError} /> : null}

      <Card>
        <SectionTitle>Alias (opcional)</SectionTitle>
        <Body muted>Usa un apodo. No escribas tu nombre completo ni otros datos personales.</Body>
        <TextInput
          value={aliasValue}
          onChangeText={setAlias}
          maxLength={20}
          placeholder="Tu apodo"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Alias"
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
        <Button label="Guardar alias" icon="save" variant="secondary" compact onPress={saveAlias} />
      </Card>

      <Card>
        <SectionTitle>Tema visual</SectionTitle>
        <View style={styles.row}>
          {THEMES.map((t) => {
            const selected = preference === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setPreference(t.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`Tema ${t.label}`}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface }]}
              >
                <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '700' }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionTitle>Privacidad y tus datos</SectionTitle>
        <Body>
          OIEG Quest no pide correo, teléfono, CURP, ubicación ni contactos. No tiene anuncios, compras, chat ni analítica. Tu
          progreso se guarda solo en este dispositivo y no se envía a nadie.
        </Body>
        <Body muted>
          Para borrar tus datos: usa el botón de abajo, o en Android ve a Ajustes › Aplicaciones › OIEG Quest › Almacenamiento ›
          Borrar datos. Desinstalar la app también borra todo.
        </Body>
        <Button label="Reiniciar mi progreso" icon="trash" variant="danger" onPress={confirmReset} />
      </Card>

      <Card>
        <SectionTitle>Contenido local</SectionTitle>
        <Body>
          {data.content.total} ejercicios en {data.content.modules} módulos y {data.content.lessons} lecciones, disponibles sin internet.
        </Body>
        <Body muted>
          Originales verificados: {data.content.original} · Oficiales: {data.content.official} · Pendientes de revisión:{' '}
          {data.content.pending}
        </Body>
        <Body muted>
          Versión de la base de datos: {data.schema} · Versión del contenido: {data.contentVersion ?? '—'}
        </Body>
      </Card>

      <Card>
        <SectionTitle>Fuentes oficiales</SectionTitle>
        <Body muted>
          Los ejercicios de la app son originales. Consulta siempre la convocatoria y los exámenes anteriores en el sitio oficial.
        </Body>
        {OFFICIAL_REFERENCES.map((r) => (
          <Pressable key={r.url} onPress={() => Linking.openURL(r.url).catch(() => {})} accessibilityRole="link" style={{ paddingVertical: 4 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{r.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.note}</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <SectionTitle>Acerca de</SectionTitle>
        <Body>OIEG Quest · versión {Constants.expoConfig?.version ?? '1.0.0'}</Body>
        <Body muted>Entrena tu mente. Supera el reto.</Body>
        <Body muted>{DISCLAIMER}</Body>
        <Body muted>Completar el plan o los simulacros no garantiza aprobar ni avanzar a las siguientes etapas.</Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 2, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50, fontSize: 17 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
});
