// src/ui/components/Board.tsx
import type { State, NodeId, EdgeId, HexId, Terrain } from '../../engine/types';
import { VIEW, hexPolygon, hexCenterPx, nodePoint, edgeSegment } from '../geometry';

const TERRAIN_COLOR: Record<Terrain, string> = {
  forest: '#2e7d32', hills: '#bf6a3a', pasture: '#7cc36b',
  fields: '#e8c24a', mountains: '#8a8d93', desert: '#d8c79a',
};

interface BoardProps {
  state: State;
  highlightNodes?: NodeId[]; highlightEdges?: EdgeId[]; highlightHexes?: HexId[];
  onNode?: (id: NodeId) => void; onEdge?: (id: EdgeId) => void; onHex?: (id: HexId) => void;
}

export function Board({ state, highlightNodes = [], highlightEdges = [], highlightHexes = [], onNode, onEdge, onHex }: BoardProps) {
  const colorOf = (owner: number) => state.players[owner]!.color;
  const hlN = new Set(highlightNodes), hlE = new Set(highlightEdges), hlH = new Set(highlightHexes);

  return (
    <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} style={{ width: '100%', maxWidth: 720, background: '#15324a', borderRadius: 12 }}>
      {/* terrain hexes + tokens */}
      {state.board.hexes.map(h => {
        const c = hexCenterPx(h.id);
        const red = h.token === 6 || h.token === 8;
        return (
          <g key={`h${h.id}`}>
            <polygon points={hexPolygon(h.id)} fill={TERRAIN_COLOR[h.terrain]} stroke="#0d2233" strokeWidth={2} />
            {h.token !== null && (
              <>
                <circle cx={c.x} cy={c.y} r={15} fill="#f3ead2" stroke="#0d2233" />
                <text x={c.x} y={c.y + 5} textAnchor="middle" fontSize={15} fontWeight={700}
                  fill={red ? '#c0392b' : '#222'}>{h.token}</text>
              </>
            )}
            {state.board.robberHex === h.id && (
              <circle data-robber cx={c.x} cy={c.y - 22} r={9} fill="#1a1a1a" stroke="#fff" />
            )}
            {hlH.has(h.id) && (
              <polygon points={hexPolygon(h.id)} fill="rgba(255,255,255,0.25)" stroke="#fff"
                strokeWidth={3} style={{ cursor: 'pointer' }} onClick={() => onHex?.(h.id)} />
            )}
          </g>
        );
      })}

      {/* roads */}
      {state.board.edges.map(e => {
        const s = edgeSegment(e.id);
        if (e.road) return <line key={`e${e.id}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={colorOf(e.road.owner)} strokeWidth={7} strokeLinecap="round" />;
        if (hlE.has(e.id)) return <line key={`e${e.id}`} data-edge-hl x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="#ffffff" strokeWidth={6} strokeDasharray="4 4" style={{ cursor: 'pointer' }} onClick={() => onEdge?.(e.id)} />;
        return null;
      })}

      {/* buildings */}
      {state.board.nodes.map(n => {
        const p = nodePoint(n.id);
        if (n.building) {
          const fill = colorOf(n.building.owner);
          const r = n.building.type === 'city' ? 11 : 8;
          return <rect key={`n${n.id}`} x={p.x - r} y={p.y - r} width={r * 2} height={r * 2}
            rx={n.building.type === 'city' ? 2 : 6} fill={fill} stroke="#0d2233" strokeWidth={2} />;
        }
        if (hlN.has(n.id)) return <circle key={`n${n.id}`} data-node-hl cx={p.x} cy={p.y} r={9}
          fill="rgba(255,255,255,0.85)" stroke="#2c8" strokeWidth={3} style={{ cursor: 'pointer' }} onClick={() => onNode?.(n.id)} />;
        return null;
      })}
    </svg>
  );
}
