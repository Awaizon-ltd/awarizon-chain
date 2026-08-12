// Decorative constellation backdrop for the landing hero — a fixed set
// of nodes connected by thin lines, with a couple of pulsing accent
// dots. Purely visual (aria-hidden), seeded once at module load so it
// doesn't reshuffle on every render/hydration mismatch.
const NODES = [
  [6, 12], [16, 28], [11, 46], [22, 8], [30, 34], [27, 58],
  [40, 18], [46, 44], [52, 6], [58, 30], [63, 52], [70, 14],
  [76, 38], [82, 22], [88, 50], [93, 10], [96, 34], [84, 60],
  [38, 60], [15, 65],
]

// Edges as index pairs into NODES — a handful of short local links per
// node rather than a dense mesh, so it reads as a sparse network.
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [1, 4], [0, 3], [3, 6], [4, 6], [4, 5],
  [5, 18], [18, 19], [6, 7], [6, 9], [7, 10], [8, 9], [9, 11],
  [9, 12], [10, 13], [11, 14], [12, 13], [13, 15], [13, 16],
  [14, 17], [15, 16], [16, 20 % NODES.length],
]

const PULSE_INDICES = [3, 9, 13, 16]

export default function NetworkBackground() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
      </defs>

      {EDGES.map(([a, b], i) => {
        const [x1, y1] = NODES[a]
        const [x2, y2] = NODES[b]
        return (
          <line key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#8b5cf6" strokeOpacity={0.18} strokeWidth={0.15}
          />
        )
      })}

      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.4}
          fill="#a29ac0" fillOpacity={0.4} />
      ))}

      {PULSE_INDICES.map(i => {
        const [x, y] = NODES[i]
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={2.5} fill="url(#nodeGlow)" opacity={0.35} />
            <circle cx={x} cy={y} r={0.55} fill="#FFD700" />
          </g>
        )
      })}
    </svg>
  )
}
