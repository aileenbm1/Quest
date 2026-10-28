import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';
import { useGoBack } from '@/hooks/useGoBack';

function Finish() {
  const goBack = useGoBack('/inicio');
  return (
    <Pressable accessibilityRole="button" onPress={goBack}>
      <Text>Terminar</Text>
    </Pressable>
  );
}

const routes = {
  inicio: () => <Text>Pantalla de inicio</Text>,
  practica: Finish,
};

describe('botón «Terminar» / «Volver»', () => {
  it('sin historial (enlace directo o página recargada en la web) lleva al inicio', async () => {
    await renderRouter(routes, { initialUrl: '/practica' });
    await fireEvent.press(screen.getByRole('button', { name: 'Terminar' }));
    expect(screen).toHavePathname('/inicio');
  });
});
