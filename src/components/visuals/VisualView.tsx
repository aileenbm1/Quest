import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import type { FlowNode, ShapeName, Visual } from '@/core/visuals';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Dibujo que acompaña al texto. Es una sola pieza accesible: los lectores de pantalla leen `alt`. */
export function VisualView({ visual }: { visual: Visual }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} accessible accessibilityLabel={visual.alt}>
      <Text style={[styles.heading, { color: colors.textMuted }]} importantForAccessibility="no">
        En dibujo
      </Text>
      <Body visual={visual} />
      {visual.caption ? (
        <Text style={[styles.caption, { color: colors.textMuted }]} importantForAccessibility="no">
          {visual.caption}
        </Text>
      ) : null}
    </View>
  );
}

function Body({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'tiles':
      return <Tiles items={visual.items} steps={visual.steps} indices={visual.indices} />;
    case 'shapes':
      return <Shapes items={visual.items} ellipsis={visual.ellipsis} unknown={visual.unknown} />;
    case 'sticks':
      return <Figures figures={visual.figures} render={(n) => <Sticks n={n} />} label={(n) => `${n} ${n === 1 ? 'cuadrado' : 'cuadrados'}`} />;
    case 'dots':
      return <Figures figures={visual.figures} render={(n) => <TriangleDots n={n} />} label={(_, i) => `Figura ${i + 1}`} />;
    case 'towers':
      return <Figures figures={visual.figures} render={(n) => <Tower n={n} />} label={(_, i) => `Figura ${i + 1}`} />;
    case 'bulbs':
      return <Bulbs states={visual.states} />;
    case 'venn':
      return <Venn left={visual.left} right={visual.right} outside={visual.outside} total={visual.total} />;
    case 'clock':
      return <Clock time={visual.time} />;
    case 'table':
      return <Table head={visual.head} rows={visual.rows} />;
    case 'flow':
      return <Flow nodes={visual.nodes} />;
    case 'binary':
      return <Binary bits={visual.bits} values={visual.values} />;
    case 'pie':
      return <Pie slices={visual.slices} />;
    case 'jugs':
      return <Jugs capacities={visual.capacities} />;
  }
}

// ── Casillas ────────────────────────────────────────────────────────

function Tiles({ items, steps, indices }: { items: string[]; steps?: string[]; indices?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapRow}>
      {items.map((item, i) => {
        const unknown = item === '?';
        const dots = item === '…';
        return (
          <View key={i} style={styles.tileWithStep}>
            <View style={styles.tileCol}>
              <View
                style={[
                  styles.tile,
                  dots
                    ? { borderColor: 'transparent' }
                    : unknown
                      ? { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.surface }
                      : { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.tileText, { color: unknown ? colors.primary : colors.text }]}>{item}</Text>
              </View>
              {indices && !dots ? <Text style={[styles.index, { color: colors.textMuted }]}>{i + 1}</Text> : null}
            </View>
            {steps && i < items.length - 1 ? (
              <View style={styles.step}>
                <Text style={[styles.stepText, { color: colors.primary }]}>{steps[i]}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ── Figuras de colores ──────────────────────────────────────────────

const SHAPE_COLORS: Record<ShapeName, string> = { triangle: '#EF4444', square: '#3B82F6', circle: '#22C55E', star: '#EAB308' };

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Shape({ name, size = 38 }: { name: ShapeName; size?: number }) {
  const fill = SHAPE_COLORS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {name === 'triangle' ? <Polygon points="20,4 37,35 3,35" fill={fill} /> : null}
      {name === 'square' ? <Rect x={5} y={5} width={30} height={30} rx={4} fill={fill} /> : null}
      {name === 'circle' ? <Circle cx={20} cy={20} r={16} fill={fill} /> : null}
      {name === 'star' ? <Polygon points={starPoints(20, 21, 17, 7.5)} fill={fill} /> : null}
    </Svg>
  );
}

function Shapes({ items, ellipsis, unknown }: { items: ShapeName[]; ellipsis?: boolean; unknown?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapRow}>
      {items.map((name, i) => (
        <View key={i} style={styles.tileCol}>
          <Shape name={name} />
          <Text style={[styles.index, { color: colors.textMuted }]}>{i + 1}</Text>
        </View>
      ))}
      {ellipsis ? <Text style={[styles.tileText, { color: colors.text, alignSelf: 'center' }]}>…</Text> : null}
      {unknown ? (
        <View style={styles.tileCol}>
          <View style={[styles.tile, { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.surface }]}>
            <Text style={[styles.tileText, { color: colors.primary }]}>?</Text>
          </View>
          <Text style={[styles.index, { color: colors.primary }]}>{unknown}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Figuras que crecen ──────────────────────────────────────────────

function Figures({ figures, render, label }: { figures: number[]; render: (n: number) => ReactNode; label: (n: number, i: number) => string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.figures}>
      {figures.map((n, i) => (
        <View key={i} style={styles.figure}>
          <View style={styles.figureDraw}>{render(n)}</View>
          <Text style={[styles.figureLabel, { color: colors.text }]}>{label(n, i)}</Text>
        </View>
      ))}
    </View>
  );
}

function Sticks({ n }: { n: number }) {
  const s = 26;
  const pad = 4;
  const w = n * s + pad * 2;
  const h = s + pad * 2;
  const wood = '#B45309';
  const lines: ReactNode[] = [];
  lines.push(<Line key="top" x1={pad} y1={pad} x2={pad + n * s} y2={pad} />);
  lines.push(<Line key="bottom" x1={pad} y1={pad + s} x2={pad + n * s} y2={pad + s} />);
  for (let k = 0; k <= n; k++) lines.push(<Line key={`v${k}`} x1={pad + k * s} y1={pad} x2={pad + k * s} y2={pad + s} />);
  return (
    <Svg width={w} height={h}>
      <G stroke={wood} strokeWidth={4} strokeLinecap="round">
        {lines}
      </G>
    </Svg>
  );
}

function TriangleDots({ n }: { n: number }) {
  const gap = 15;
  const r = 5;
  const w = n * gap + 6;
  const h = n * gap + 6;
  const dots: ReactNode[] = [];
  for (let row = 1; row <= n; row++) {
    for (let c = 0; c < row; c++) {
      const x = 3 + r + ((n - row) * gap) / 2 + c * gap;
      const y = 3 + r + (row - 1) * gap;
      dots.push(<Circle key={`${row}-${c}`} cx={x} cy={y} r={r} fill={palette.violet} />);
    }
  }
  return (
    <Svg width={w} height={h}>
      {dots}
    </Svg>
  );
}

function Tower({ n }: { n: number }) {
  const size = 14;
  const gap = 2;
  const h = n * (size + gap) + 2;
  return (
    <Svg width={size + 4} height={h}>
      {Array.from({ length: n }, (_, k) => (
        <Rect key={k} x={2} y={h - (k + 1) * (size + gap)} width={size} height={size} rx={3} fill={k % 2 === 0 ? palette.violet : palette.cyan} />
      ))}
    </Svg>
  );
}

// ── Focos ───────────────────────────────────────────────────────────

function Bulbs({ states }: { states: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapRow}>
      {[...states].map((s, i) => {
        const on = s === '1';
        return (
          <View key={i} style={styles.tileCol}>
            <Svg width={40} height={52} viewBox="0 0 40 52">
              {on
                ? [0, 1, 2, 3, 4].map((k) => {
                    const a = (-150 + k * 30) * (Math.PI / 180);
                    return (
                      <Line key={k} x1={20 + 16 * Math.cos(a)} y1={19 + 16 * Math.sin(a)} x2={20 + 21 * Math.cos(a)} y2={19 + 21 * Math.sin(a)} stroke="#EAB308" strokeWidth={2.5} strokeLinecap="round" />
                    );
                  })
                : null}
              <Circle cx={20} cy={19} r={12} fill={on ? '#FDE047' : 'none'} stroke={on ? '#CA8A04' : colors.textMuted} strokeWidth={2.5} />
              <Rect x={14} y={31} width={12} height={9} rx={2} fill={colors.textMuted} />
              <Rect x={16} y={41} width={8} height={4} rx={2} fill={colors.textMuted} />
            </Svg>
            <Text style={[styles.index, { color: colors.textMuted }]}>{on ? 'Encendido' : 'Apagado'}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Diagrama de Venn ────────────────────────────────────────────────

function Venn({ left, right, outside, total }: { left: { label: string; count: number }; right: { label: string; count: number }; outside: number; total: number }) {
  const { colors } = useTheme();
  return (
    <Svg width="100%" height={190} viewBox="0 0 300 190">
      <Rect x={4} y={4} width={292} height={182} rx={12} fill="none" stroke={colors.textMuted} strokeWidth={2} />
      <SvgText fontFamily="sans-serif" x={14} y={24} fontSize={13} fontWeight="700" fill={colors.text}>{`Salón: ${total}`}</SvgText>
      <Circle cx={118} cy={100} r={62} fill={palette.violet} fillOpacity={0.28} stroke={palette.violet} strokeWidth={2} />
      <Circle cx={182} cy={100} r={62} fill={palette.cyan} fillOpacity={0.28} stroke="#0E7490" strokeWidth={2} />
      <SvgText fontFamily="sans-serif" x={88} y={96} fontSize={13} fontWeight="700" textAnchor="middle" fill={colors.text}>{left.label}</SvgText>
      <SvgText fontFamily="sans-serif" x={88} y={116} fontSize={20} fontWeight="800" textAnchor="middle" fill={colors.text}>{left.count}</SvgText>
      <SvgText fontFamily="sans-serif" x={212} y={96} fontSize={13} fontWeight="700" textAnchor="middle" fill={colors.text}>{right.label}</SvgText>
      <SvgText fontFamily="sans-serif" x={212} y={116} fontSize={20} fontWeight="800" textAnchor="middle" fill={colors.text}>{right.count}</SvgText>
      <SvgText fontFamily="sans-serif" x={150} y={108} fontSize={26} fontWeight="900" textAnchor="middle" fill={colors.primary}>?</SvgText>
      <SvgText fontFamily="sans-serif" x={150} y={78} fontSize={11} fontWeight="700" textAnchor="middle" fill={colors.textMuted}>Ambos</SvgText>
      <SvgText fontFamily="sans-serif" x={14} y={176} fontSize={13} fontWeight="700" fill={colors.text}>{`Ninguno: ${outside}`}</SvgText>
    </Svg>
  );
}

// ── Reloj ───────────────────────────────────────────────────────────

function Clock({ time }: { time: string }) {
  const { colors } = useTheme();
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const hourAngle = (((hh % 12) + mm / 60) * 30 * Math.PI) / 180;
  const minuteAngle = (mm * 6 * Math.PI) / 180;
  const hand = (angle: number, length: number) => ({ x: 70 + length * Math.sin(angle), y: 70 - length * Math.cos(angle) });
  const h = hand(hourAngle, 32);
  const m = hand(minuteAngle, 50);
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={150} height={150} viewBox="0 0 140 140">
        <Circle cx={70} cy={70} r={64} fill={colors.surface} stroke={colors.text} strokeWidth={3} />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k * 30 * Math.PI) / 180;
          const long = k % 3 === 0;
          const p1 = hand(a, long ? 52 : 56);
          const p2 = hand(a, 61);
          return <Line key={k} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={colors.text} strokeWidth={long ? 3 : 1.5} />;
        })}
        {[12, 3, 6, 9].map((n) => {
          const p = hand(((n % 12) * 30 * Math.PI) / 180, 42);
          return (
            <SvgText fontFamily="sans-serif" key={n} x={p.x} y={p.y + 5} fontSize={14} fontWeight="700" textAnchor="middle" fill={colors.text}>
              {n}
            </SvgText>
          );
        })}
        <Line x1={70} y1={70} x2={h.x} y2={h.y} stroke={colors.text} strokeWidth={5} strokeLinecap="round" />
        <Line x1={70} y1={70} x2={m.x} y2={m.y} stroke={palette.violet} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={70} cy={70} r={4} fill={colors.text} />
      </Svg>
    </View>
  );
}

// ── Tabla ───────────────────────────────────────────────────────────

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
      <View style={[styles.tr, { backgroundColor: colors.primary }]}>
        {head.map((h, i) => (
          <Text key={i} style={[styles.th, { flex: i === 0 ? 0.8 : 1.6, color: colors.onPrimary }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={[styles.tr, { backgroundColor: r % 2 === 0 ? colors.surface : colors.surfaceAlt, borderTopColor: colors.border, borderTopWidth: 1 }]}>
          {row.map((cell, i) => (
            <Text key={i} style={[styles.td, { flex: i === 0 ? 0.8 : 1.6, color: cell === '?' ? colors.primary : colors.text, fontWeight: i === 0 || cell === '?' ? '800' : '500' }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Diagrama de flujo ───────────────────────────────────────────────

function Flow({ nodes }: { nodes: FlowNode[] }) {
  return <FlowList nodes={nodes} />;
}

function FlowList({ nodes }: { nodes: FlowNode[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.flow}>
      {nodes.map((node, i) => {
        const last = i === nodes.length - 1;
        const noContinues = node.t === 'decision' && node.no === undefined;
        return (
          <View key={i} style={styles.flowItem}>
            <FlowBox node={node} />
            {!last ? (
              <View style={styles.arrow}>
                <Ionicons name="arrow-down" size={18} color={colors.textMuted} />
                {noContinues ? <Text style={[styles.branch, { color: colors.danger }]}>No</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function FlowBox({ node }: { node: FlowNode }) {
  const { colors } = useTheme();
  if (node.t === 'start' || node.t === 'end') {
    return (
      <View style={[styles.pill, { backgroundColor: node.t === 'start' ? colors.primary : colors.textMuted }]}>
        <Text style={[styles.flowText, { color: '#FFFFFF' }]}>{node.text}</Text>
      </View>
    );
  }
  if (node.t === 'step') {
    return (
      <View style={[styles.stepBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.flowText, { color: colors.text }]}>{node.text}</Text>
      </View>
    );
  }
  if (node.t === 'decision') {
    return (
      <View style={styles.decisionWrap}>
        <View style={[styles.decision, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <Ionicons name="help-circle" size={18} color={colors.warning} />
          <Text style={[styles.flowText, { color: colors.text }]}>{node.text}</Text>
        </View>
        <View style={styles.branches}>
          <View style={styles.branch1}>
            <Text style={[styles.branch, { color: colors.success }]}>Sí →</Text>
            <View style={[styles.stepBox, styles.branchBox, { backgroundColor: colors.surface, borderColor: colors.success }]}>
              <Text style={[styles.flowText, { color: colors.text }]}>{node.si}</Text>
            </View>
          </View>
          {node.no !== undefined ? (
            <View style={styles.branch1}>
              <Text style={[styles.branch, { color: colors.danger }]}>No →</Text>
              <View style={[styles.stepBox, styles.branchBox, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
                <Text style={[styles.flowText, { color: colors.text }]}>{node.no}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  }
  if (node.t !== 'loop') return null;
  return (
    <View style={[styles.loop, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
      <View style={styles.loopHead}>
        <Ionicons name="repeat" size={18} color={colors.primary} />
        <Text style={[styles.flowText, { color: colors.primary, fontWeight: '800' }]}>{node.text}</Text>
      </View>
      <FlowList nodes={node.body} />
    </View>
  );
}

// ── Binario ─────────────────────────────────────────────────────────

function Binary({ bits, values }: { bits: string; values: number[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapRow}>
      {[...bits].map((b, i) => (
        <View key={i} style={styles.tileCol}>
          <Text style={[styles.index, { color: colors.primary, fontWeight: '800' }]}>{values[i]}</Text>
          <View
            style={[
              styles.tile,
              b === '?'
                ? { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.surface }
                : { borderColor: colors.border, backgroundColor: b === '1' ? colors.primary : colors.surface },
            ]}
          >
            <Text style={[styles.tileText, { color: b === '?' ? colors.primary : b === '1' ? colors.onPrimary : colors.text }]}>{b}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Pizza ───────────────────────────────────────────────────────────

function Pie({ slices }: { slices: number }) {
  const r = 58;
  const cx = 64;
  const lines = Array.from({ length: slices }, (_, k) => {
    const a = (k * 2 * Math.PI) / slices - Math.PI / 2;
    return <Line key={k} x1={cx} y1={cx} x2={cx + r * Math.cos(a)} y2={cx + r * Math.sin(a)} stroke="#92400E" strokeWidth={2} />;
  });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={130} height={130}>
        <Circle cx={cx} cy={cx} r={r} fill="#FBBF24" stroke="#B45309" strokeWidth={4} />
        <Circle cx={cx} cy={cx} r={r - 8} fill="none" stroke="#F59E0B" strokeWidth={1.5} />
        {lines}
        {[[-22, -20], [20, -30], [34, 14], [-8, 30], [-34, 12]].map(([dx, dy], i) => (
          <Circle key={i} cx={cx + dx!} cy={cx + dy!} r={4.5} fill="#DC2626" />
        ))}
      </Svg>
    </View>
  );
}

// ── Jarras ──────────────────────────────────────────────────────────

function Jugs({ capacities }: { capacities: number[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.figures}>
      {capacities.map((c, i) => {
        const h = 28 + c * 16;
        const w = 40 + c * 6;
        return (
          <View key={i} style={styles.figure}>
            <Svg width={w + 8} height={h + 8}>
              <Path d={`M4 4 L${w + 4} 4 L${w - 2} ${h + 4} L10 ${h + 4} Z`} fill="none" stroke={colors.text} strokeWidth={3} strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.figureLabel, { color: colors.text }]}>{`Jarra de ${c} L`}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: 1, padding: 12, gap: 10 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  caption: { fontSize: 13, textAlign: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  tileWithStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  tileCol: { alignItems: 'center', gap: 2 },
  tile: { minWidth: 40, height: 40, paddingHorizontal: 6, borderRadius: radius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 18, fontWeight: '800' },
  index: { fontSize: 11, fontWeight: '600' },
  step: { alignItems: 'center', justifyContent: 'center', height: 40 },
  stepText: { fontSize: 12, fontWeight: '800' },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end', justifyContent: 'center' },
  figure: { alignItems: 'center', gap: 6 },
  figureDraw: { justifyContent: 'flex-end' },
  figureLabel: { fontSize: 13, fontWeight: '700' },
  table: { borderWidth: 1, borderRadius: radius.sm, overflow: 'hidden' },
  tr: { flexDirection: 'row' },
  th: { padding: 8, fontWeight: '800', fontSize: 14 },
  td: { padding: 8, fontSize: 15 },
  flow: { alignItems: 'center', gap: 0 },
  flowItem: { alignItems: 'center', alignSelf: 'stretch' },
  arrow: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingVertical: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  stepBox: { borderRadius: radius.sm, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'center' },
  flowText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  decisionWrap: { alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  decision: { flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 2, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  branches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  branch1: { alignItems: 'center', gap: 4 },
  branch: { fontSize: 13, fontWeight: '800' },
  branchBox: { marginTop: 0 },
  loop: { borderWidth: 2, borderRadius: radius.md, padding: 10, gap: 6, alignSelf: 'stretch', alignItems: 'center' },
  loopHead: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
