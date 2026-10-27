import { render } from '@testing-library/react-native';
import { VisualView } from '@/components/visuals/VisualView';
import { ALL_QUESTIONS, LESSONS } from '@/content';
import { VISUALS } from '@/content/visuals';
import type { FlowNode, Visual } from '@/core/visuals';
import { ThemeProvider } from '@/theme/ThemeProvider';

const questionIds = new Set(ALL_QUESTIONS.map((q) => q.id));
const lessonIds = new Set(LESSONS.map((l) => l.id));

function flowSize(nodes: FlowNode[]): number {
  return nodes.reduce((n, node) => n + 1 + (node.t === 'loop' ? flowSize(node.body) : 0), 0);
}

describe('dibujos de ejercicios y lecciones', () => {
  it('cada dibujo pertenece a un ejercicio o a una lección que existe', () => {
    for (const id of Object.keys(VISUALS)) {
      expect(questionIds.has(id) || lessonIds.has(id)).toBe(true);
    }
  });

  it('todos tienen descripción para lectores de pantalla, sin repetir la de otro', () => {
    const alts = Object.values(VISUALS).map((v) => v.alt);
    for (const alt of alts) expect(alt.trim().length).toBeGreaterThan(20);
    expect(new Set(alts).size).toBe(alts.length);
  });

  it('los datos de cada tipo de dibujo son coherentes', () => {
    for (const [id, v] of Object.entries(VISUALS)) {
      switch (v.kind) {
        case 'tiles':
          expect(v.items.length).toBeGreaterThan(1);
          if (v.steps) expect(v.steps.length).toBe(v.items.length - 1);
          break;
        case 'shapes':
          expect(v.items.length).toBeGreaterThan(1);
          break;
        case 'sticks':
        case 'dots':
        case 'towers':
          expect(v.figures.length).toBeGreaterThan(0);
          expect(v.figures.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
          break;
        case 'bulbs':
          expect(v.states).toMatch(/^[01]+$/);
          break;
        case 'binary':
          expect(v.bits).toMatch(/^[01?]+$/);
          expect(v.values).toHaveLength(v.bits.length);
          // Cada casilla vale el doble que la de su derecha.
          v.values.slice(0, -1).forEach((value, i) => expect(value).toBe(v.values[i + 1]! * 2));
          break;
        case 'clock':
          expect(v.time).toMatch(/^(1[0-2]|[1-9]):[0-5]\d$/);
          break;
        case 'venn':
          expect(v.left.count + v.right.count).toBeGreaterThan(0);
          break;
        case 'table':
          for (const row of v.rows) expect(row).toHaveLength(v.head.length);
          break;
        case 'flow':
          expect(flowSize(v.nodes)).toBeGreaterThan(0);
          break;
        case 'pie':
          expect(v.slices).toBeGreaterThanOrEqual(2);
          break;
        case 'jugs':
          expect(v.capacities.length).toBeGreaterThan(0);
          break;
      }
      expect(id).toBeTruthy();
    }
  });

  it('los dibujos coinciden con los datos del ejercicio', () => {
    // Palillos: 1, 2 y 3 cuadrados (el enunciado dice 4, 7 y 10 palillos).
    expect((VISUALS['pat-08'] as Extract<Visual, { kind: 'sticks' }>).figures).toEqual([1, 2, 3]);
    // Triángulos de puntos: figuras 1 a 4.
    expect((VISUALS['pat-11'] as Extract<Visual, { kind: 'dots' }>).figures).toEqual([1, 2, 3, 4]);
    // El reloj muestra la hora de salida del enunciado.
    expect((VISUALS['mix-07'] as Extract<Visual, { kind: 'clock' }>).time).toBe('8:45');
    // Venn: 18 + 15 de fútbol y básquetbol, 5 ninguno, 30 en total.
    const venn = VISUALS['mix-05'] as Extract<Visual, { kind: 'venn' }>;
    expect([venn.left.count, venn.right.count, venn.outside, venn.total]).toEqual([18, 15, 5, 30]);
    // Los focos de log-14 empiezan apagados; el dibujo de dep-09 tiene 5.
    expect((VISUALS['log-14'] as Extract<Visual, { kind: 'bulbs' }>).states).toBe('00000');
    expect((VISUALS['dep-09'] as Extract<Visual, { kind: 'bulbs' }>).states).toHaveLength(5);
  });

  it('las secuencias dibujadas son las del enunciado', () => {
    const tiles = (id: string) => (VISUALS[id] as Extract<Visual, { kind: 'tiles' }>).items;
    const prompt = (id: string) => ALL_QUESTIONS.find((q) => q.id === id)!.prompt;
    expect(prompt('pat-01')).toContain(tiles('pat-01').slice(0, -1).join(', '));
    expect(prompt('pat-04')).toContain(tiles('pat-04').slice(0, 5).join(', '));
    expect(prompt('pat-10')).toContain(tiles('pat-10').slice(0, -1).join(', '));
    expect(prompt('pat-13')).toContain(tiles('pat-13').slice(0, 6).join(', '));
    expect(prompt('pat-14')).toContain(tiles('pat-14').slice(0, 5).join(', '));
  });

  it.each(Object.entries(VISUALS))('%s se dibuja sin errores y es accesible', async (_id, visual) => {
    const screen = await render(
      <ThemeProvider>
        <VisualView visual={visual} />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText(visual.alt)).toBeTruthy();
  });
});
