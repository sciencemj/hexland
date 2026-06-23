// src/ui/components/Board.tsx
import type { State, NodeId, EdgeId, HexId, Terrain, Resource } from '../../engine/types';
import { VIEW, hexPolygon, hexCenterPx, nodePoint, edgeSegment } from '../geometry';

const RES_PORT_ICON: Record<Resource, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };

// Per-terrain palette: a lit top tint → base → shaded bottom, for a domed 3D look.
const TERRAIN_GRAD: Record<Terrain, { light: string; base: string; dark: string }> = {
  forest:    { light: '#3f9b46', base: '#2e7d32', dark: '#1c5421' }, // lumber
  hills:     { light: '#d2864f', base: '#bf6a3a', dark: '#8f4a26' }, // brick
  pasture:   { light: '#98d486', base: '#7cc36b', dark: '#579a4b' }, // sheep
  fields:    { light: '#f2d36a', base: '#e3bb43', dark: '#bd9530' }, // wheat
  mountains: { light: '#a8abb1', base: '#8a8d93', dark: '#63666c' }, // ore
  desert:    { light: '#e7d9b5', base: '#d4c294', dark: '#b09d70' },
};

const TERRAIN_ICON: Record<Terrain, string> = {
  forest: '🌲', hills: '🧱', pasture: '🐑', fields: '🌾', mountains: '⛰️', desert: '🏜️',
};

const PIP: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

interface BoardProps {
  state: State;
  highlightNodes?: NodeId[]; highlightEdges?: EdgeId[]; highlightHexes?: HexId[];
  recentEdges?: Set<EdgeId>; recentNodes?: Set<NodeId>;
  onNode?: (id: NodeId) => void; onEdge?: (id: EdgeId) => void; onHex?: (id: HexId) => void;
}

export function Board({ state, highlightNodes = [], highlightEdges = [], highlightHexes = [],
  recentEdges, recentNodes, onNode, onEdge, onHex }: BoardProps) {
  const colorOf = (owner: number) => state.players[owner]!.color;
  const hlN = new Set(highlightNodes), hlE = new Set(highlightEdges), hlH = new Set(highlightHexes);

  return (
    <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      style={{ width: '100%', maxWidth: 720, display: 'block', margin: '0 auto', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
      <defs>
        {Object.entries(TERRAIN_GRAD).map(([k, g]) => (
          <linearGradient key={k} id={`t-${k}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor={g.light} />
            <stop offset="55%" stopColor={g.base} />
            <stop offset="100%" stopColor={g.dark} />
          </linearGradient>
        ))}
        <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="coin" cx="0.38" cy="0.30" r="0.8">
          <stop offset="0%" stopColor="#fdf6e3" />
          <stop offset="70%" stopColor="#efe0bd" />
          <stop offset="100%" stopColor="#d9c79c" />
        </radialGradient>
        <radialGradient id="sea" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0%" stopColor="#1e4d68" />
          <stop offset="100%" stopColor="#0c1f30" />
        </radialGradient>
        <radialGradient id="robber" cx="0.38" cy="0.30" r="0.85">
          <stop offset="0%" stopColor="#5b5b5b" />
          <stop offset="100%" stopColor="#111111" />
        </radialGradient>
        <filter id="hexShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.45" />
        </filter>
        <filter id="pieceShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" floodColor="#000000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* sea background */}
      <rect x="0" y="0" width={VIEW.width} height={VIEW.height} fill="url(#sea)" />

      {/* terrain hexes + tokens */}
      {state.board.hexes.map(h => {
        const c = hexCenterPx(h.id);
        const red = h.token === 6 || h.token === 8;
        const pips = h.token ? PIP[h.token] ?? 0 : 0;
        return (
          <g key={`h${h.id}`}>
            <polygon data-hex={h.id} points={hexPolygon(h.id)} fill={`url(#t-${h.terrain})`}
              stroke="#0b1d2b" strokeWidth={1.5} strokeLinejoin="round" filter="url(#hexShadow)" />
            {/* top sheen for a lit, raised feel */}
            <polygon points={hexPolygon(h.id)} fill="url(#gloss)" pointerEvents="none" />
            {/* resource motif */}
            <text x={c.x} y={c.y - (h.token !== null ? 14 : -8)} textAnchor="middle"
              fontSize={h.token !== null ? 22 : 34} opacity={h.token !== null ? 0.5 : 0.9}
              pointerEvents="none">{TERRAIN_ICON[h.terrain]}</text>

            {h.token !== null && (
              <g filter="url(#pieceShadow)">
                <circle cx={c.x} cy={c.y + 6} r={15} fill="url(#coin)" stroke="#b9a884" strokeWidth={1} />
                <text x={c.x} y={c.y + 8} textAnchor="middle" fontSize={16} fontWeight={800}
                  fill={red ? '#c0392b' : '#2a2a2a'} fontFamily="Georgia, 'Times New Roman', serif"
                  pointerEvents="none">{h.token}</text>
                {/* probability pips */}
                {Array.from({ length: pips }).map((_, i) => (
                  <circle key={i} cx={c.x - (pips - 1) * 2 + i * 4} cy={c.y + 17} r={1.3}
                    fill={red ? '#c0392b' : '#444'} />
                ))}
              </g>
            )}

            {state.board.robberHex === h.id && (
              <g data-robber filter="url(#pieceShadow)" pointerEvents="none">
                <ellipse cx={c.x} cy={c.y - 18} rx={9} ry={11} fill="url(#robber)" stroke="#000" strokeWidth={1} />
                <circle cx={c.x} cy={c.y - 26} r={5} fill="url(#robber)" stroke="#000" strokeWidth={1} />
              </g>
            )}

            {hlH.has(h.id) && (
              <polygon points={hexPolygon(h.id)} fill="rgba(255,255,255,0.22)" stroke="#fff"
                strokeWidth={3} style={{ cursor: 'pointer' }} onClick={() => onHex?.(h.id)} />
            )}
          </g>
        );
      })}

      {/* harbors: a badge in the sea + dock lines to the two harbor intersections */}
      {state.board.portSlots.map(slot => {
        const e = state.board.edges[slot]!;
        const port = state.board.nodes[e.nodeIds[0]]!.port;
        if (!port) return null;
        const seg = edgeSegment(slot);
        const a = nodePoint(e.nodeIds[0]), b = nodePoint(e.nodeIds[1]);
        let dx = seg.mx - VIEW.width / 2, dy = seg.my - VIEW.height / 2;
        const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        const px = seg.mx + dx * 27, py = seg.my + dy * 27; // pushed out into the sea
        const isAny = port === 'any';
        return (
          <g key={`p${slot}`} pointerEvents="none">
            <line x1={px} y1={py} x2={a.x} y2={a.y} stroke="#caa46a" strokeWidth={1.6} strokeDasharray="2.5 2.5" opacity={0.75} />
            <line x1={px} y1={py} x2={b.x} y2={b.y} stroke="#caa46a" strokeWidth={1.6} strokeDasharray="2.5 2.5" opacity={0.75} />
            <g transform={`translate(${px},${py})`}>
              <rect x={-16} y={-12} width={32} height={24} rx={6} fill="#11314a" stroke="#caa46a" strokeWidth={1.3} />
              {isAny
                ? <text x={0} y={4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#f2e6c8">3:1</text>
                : <>
                    <text x={0} y={-1} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#f2e6c8">2:1</text>
                    <text x={0} y={10} textAnchor="middle" fontSize={10}>{RES_PORT_ICON[port as Resource]}</text>
                  </>}
            </g>
          </g>
        );
      })}

      {/* roads */}
      {state.board.edges.map(e => {
        const s = edgeSegment(e.id);
        if (e.road) return (
          // No SVG filter here: a <line> has a degenerate (1-D) bounding box, which
          // makes an objectBoundingBox filter region collapse and renders nothing in
          // WebKit/WKWebView. The dark underlay line below is the road's outline/depth.
          <g key={`e${e.id}`} className={recentEdges?.has(e.id) ? 'fx-drop' : undefined}>
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#0b1d2b" strokeWidth={9} strokeLinecap="round" />
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={colorOf(e.road.owner)} strokeWidth={6} strokeLinecap="round" />
          </g>
        );
        if (hlE.has(e.id)) return (
          <g key={`e${e.id}`}>
            {/* visible dashed marker */}
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke="#ffffff" strokeWidth={6} strokeDasharray="4 4" pointerEvents="none" />
            {/* wide invisible hit target so the road is easy to click */}
            <line data-edge-hl x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke="transparent" strokeWidth={18} strokeLinecap="round"
              pointerEvents="all" style={{ cursor: 'pointer' }} onClick={() => onEdge?.(e.id)} />
          </g>
        );
        return null;
      })}

      {/* buildings + clickable target rings */}
      {state.board.nodes.map(n => {
        const p = nodePoint(n.id);
        const hl = hlN.has(n.id);
        if (n.building) {
          const fill = colorOf(n.building.owner);
          const dropClass = recentNodes?.has(n.id) ? 'fx-drop' : undefined;
          const house = `${p.x},${p.y - 9} ${p.x + 7},${p.y - 3} ${p.x + 7},${p.y + 7} ${p.x - 7},${p.y + 7} ${p.x - 7},${p.y - 3}`;
          const piece = n.building.type === 'city' ? (
            <g className={dropClass} filter="url(#pieceShadow)">
              <rect x={p.x - 9} y={p.y - 4} width={18} height={13} rx={2} fill={fill} stroke="#0b1d2b" strokeWidth={1.5} />
              <rect x={p.x - 9} y={p.y - 11} width={9} height={9} rx={1.5} fill={fill} stroke="#0b1d2b" strokeWidth={1.5} />
              <rect x={p.x - 9} y={p.y - 4} width={18} height={3} fill="rgba(255,255,255,0.25)" />
            </g>
          ) : (
            <g className={dropClass} filter="url(#pieceShadow)">
              <polygon points={house} fill={fill} stroke="#0b1d2b" strokeWidth={1.5} strokeLinejoin="round" />
              <polygon points={`${p.x},${p.y - 9} ${p.x + 7},${p.y - 3} ${p.x - 7},${p.y - 3}`} fill="rgba(255,255,255,0.28)" />
            </g>
          );
          return (
            <g key={`n${n.id}`}>
              {piece}
              {/* a node that's a legal target (e.g. upgrading this settlement to a city) gets a clickable ring */}
              {hl && (
                <circle data-node-hl cx={p.x} cy={p.y} r={15} fill="rgba(44,255,180,0.18)"
                  stroke="#2cffb4" strokeWidth={3} style={{ cursor: 'pointer' }} onClick={() => onNode?.(n.id)} />
              )}
            </g>
          );
        }
        if (hl) return <circle key={`n${n.id}`} data-node-hl cx={p.x} cy={p.y} r={9}
          fill="rgba(255,255,255,0.85)" stroke="#2c8" strokeWidth={3} style={{ cursor: 'pointer' }} onClick={() => onNode?.(n.id)} />;
        return null;
      })}
    </svg>
  );
}
