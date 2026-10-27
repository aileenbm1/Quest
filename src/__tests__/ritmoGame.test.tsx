import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RitmoGame } from '@/components/games/RitmoGame';
import { generateRhythm, PADS, RHYTHM_TRIES } from '@/games/ritmo';
import { mulberry32 } from '@/games/rng';
import { ThemeProvider } from '@/theme/ThemeProvider';

const SEED = 7;

async function startRound() {
  jest.useFakeTimers();
  await render(
    <ThemeProvider>
      <RitmoGame startLevel={1} seed={SEED} rounds={1} onFinish={jest.fn()} />
    </ThemeProvider>,
  );
  // Termina de reproducir el ritmo para que sea el turno del estudiante.
  await act(async () => {
    jest.runAllTimers();
  });
  return generateRhythm(1, mulberry32(SEED));
}

/** Cuántas veces aparece el color: el botón siempre, más cada casilla dibujada del patrón. */
const drawn = (label: string) => screen.getAllByLabelText(label).length - 1;

afterEach(() => jest.useRealTimers());

describe('Ritmo de colores: el patrón no se dibuja hasta acabar las oportunidades', () => {
  it('mientras quedan oportunidades el patrón está oculto', async () => {
    const rhythm = await startRound();
    for (const pad of PADS) expect(drawn(pad.label)).toBe(0);

    const wrong = PADS.find((p) => p.id !== rhythm.expected[0])!;
    for (let i = 1; i < RHYTHM_TRIES; i++) {
      await fireEvent.press(screen.getByRole('button', { name: wrong.label }));
      for (const pad of PADS) expect(drawn(pad.label)).toBe(0);
    }
    expect(screen.getByText(/Te queda 1 oportunidad/)).toBeTruthy();
  });

  it('al perder la última oportunidad se revela el patrón completo', async () => {
    const rhythm = await startRound();
    const wrong = PADS.find((p) => p.id !== rhythm.expected[0])!;
    for (let i = 0; i < RHYTHM_TRIES; i++) {
      await fireEvent.press(screen.getByRole('button', { name: wrong.label }));
    }
    expect(screen.getByText(/El patrón era/)).toBeTruthy();
    const total = PADS.reduce((n, pad) => n + drawn(pad.label), 0);
    expect(total).toBe(rhythm.shown.length + rhythm.expected.length);
  });
});
