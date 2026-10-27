import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Mascot } from '@/components/Mascot';
import { Button, friendlyError, Loading } from '@/components/ui';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { openAppDatabase } from '@/db/expoDb';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DatabaseProvider
        open={openAppDatabase}
        renderLoading={() => <Loading label="Preparando tu entrenamiento…" />}
        renderError={(error, retry) => <StorageErrorScreen error={error} onRetry={retry} />}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
            headerBackTitle: 'Atrás',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modulo/[id]" options={{ title: 'Módulo' }} />
          <Stack.Screen name="leccion/[id]" options={{ title: 'Lección' }} />
          <Stack.Screen name="practica" options={{ title: 'Práctica' }} />
          <Stack.Screen name="diagnostico" options={{ title: 'Diagnóstico inicial' }} />
          <Stack.Screen name="examen/[id]" options={{ title: 'Simulacro', gestureEnabled: false }} />
          <Stack.Screen name="resultado/[id]" options={{ title: 'Resultados' }} />
          <Stack.Screen name="plan" options={{ title: 'Plan de preparación' }} />
          <Stack.Screen name="jugar/[juego]" options={{ title: 'Minijuego' }} />
          <Stack.Screen name="reto-dia" options={{ title: 'Reto del día' }} />
        </Stack>
      </DatabaseProvider>
    </>
  );
}

function StorageErrorScreen({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Mascot mood="pensando" size={96} />
      <Text style={[styles.title, { color: colors.text }]}>No pudimos abrir tus datos</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{friendlyError(error)}</Text>
      <Text style={[styles.detail, { color: colors.textMuted }]}>{technicalDetail(error)}</Text>
      <Button label="Intentar de nuevo" icon="refresh" onPress={onRetry} />
    </View>
  );
}

/** Detalle técnico para diagnosticar fallos de almacenamiento (sobre todo en la versión web). */
function technicalDetail(error: unknown): string {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'error desconocido');
  if (Platform.OS !== 'web') return msg;
  const isolated = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;
  return `${msg}
(web · aislamiento ${isolated ? 'activo' : 'INACTIVO'})`;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23, textAlign: 'center' },
  detail: { fontSize: 12, textAlign: 'center' },
});
