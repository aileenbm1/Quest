import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

function TabIcon({ name, size, focused }: { name: IconName; size: number; focused: boolean }) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={focused ? colors.primary : colors.textMuted} />;
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border, minHeight: 62 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{ title: 'Inicio', tabBarIcon: ({ focused, size }) => <TabIcon name="home" size={size} focused={focused} /> }}
      />
      <Tabs.Screen
        name="academia"
        options={{ title: 'Academia', tabBarIcon: ({ focused, size }) => <TabIcon name="school" size={size} focused={focused} /> }}
      />
      <Tabs.Screen
        name="simulador"
        options={{ title: 'Simulador', tabBarIcon: ({ focused, size }) => <TabIcon name="timer" size={size} focused={focused} /> }}
      />
      <Tabs.Screen
        name="progreso"
        options={{ title: 'Progreso', tabBarIcon: ({ focused, size }) => <TabIcon name="stats-chart" size={size} focused={focused} /> }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{ title: 'Ajustes', tabBarIcon: ({ focused, size }) => <TabIcon name="settings" size={size} focused={focused} /> }}
      />
    </Tabs>
  );
}
