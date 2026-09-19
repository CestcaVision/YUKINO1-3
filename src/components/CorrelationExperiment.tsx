import { useMemo, useState } from "react";

const DEFAULTS = { n: 40, outlierCount: 0, confound: false, seed: 42 };
const MAX_N = 200;
const MIN_N = 10;
const MAX_OUTLIERS = 10;
const MAX_SEED = 9999;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = { x: number; y: number; outlier: boolean };

function generateData(
  n: number,
  outlierCount: number,
  confound: boolean,
  seed: number,
): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = rand();
    const z = rand() > 0.5;
    const noise = (rand() - 0.5) * 0.5;
    const yOffset = confound ? (z ? 0.36 : 0.08) : 0.12;
    pts.push({
      x,
      y: Math.max(0.01, Math.min(0.99, 0.62 * x + yOffset + noise)),
      outlier: false,
    });
  }
  for (let i = 0; i < outlierCount; i++) {
    const x = rand();
    const noise = (rand() - 0.5) * 0.12;
    pts.push({
      x,
      y: Math.max(0.01, Math.min(0.99, 0.88 - x + noise)),
      outlier: true,
    });
  }
  return pts;
}

function pearson(pts: Point[]): number {
  const n = pts.length;
  if (n < 2) return 0;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = Math.sqrt(
    pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) *
      pts.reduce((s, p) => s + (p.y - my) ** 2, 0),
  );
  return den === 0 ? 0 : num / den;
}

function ols(pts: Point[]): { slope: number; intercept: number } {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: 0.5 };
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (sxx === 0) return { slope: 0, intercept: my };
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
  return { slope, intercept: my - slope * mx };
}

const L = 15;
const T = 8;
const R = 8;
const B = 18;
const W = 100;
const H = 80;
const PW = W - L - R;
const PH = H - T - B;

const toX = (x: number) => L + x * PW;
const toY = (y: number) => T + (1 - y) * PH;

export default function CorrelationExperiment() {
  const [n, setN] = useState(DEFAULTS.n);
  const [outlierCount, setOutlierCount] = useState(DEFAULTS.outlierCount);
  const [confound, setConfound] = useState(DEFAULTS.confound);
  const [seedInput, setSeedInput] = useState(String(DEFAULTS.seed));

  const seed = (() => {
    const parsed = parseInt(seedInput, 10);
    if (isNaN(parsed)) return DEFAULTS.seed;
    return Math.max(0, Math.min(MAX_SEED, parsed));
  })();

  const data = useMemo(
    () => generateData(n, outlierCount, confound, seed),
    [n, outlierCount, confound, seed],
  );

  const r = useMemo(() => pearson(data), [data]);
  const { slope, intercept } = useMemo(() => ols(data), [data]);

  // Compute where the OLS line enters/exits the [0,1]×[0,1] data box so the
  // SVG segment is geometrically accurate even for steep slopes.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const yAtX = (x: number) => slope * x + intercept;
  const xAtY = (y: number) => slope === 0 ? 0 : (y - intercept) / slope;
  // Find the two boundary intersections and keep the ones inside [0,1]×[0,1].
  const candidates: [number, number][] = [
    [0, yAtX(0)],
    [1, yAtX(1)],
    [xAtY(0), 0],
    [xAtY(1), 1],
  ].filter(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1) as [number, number][];
  const x0 = candidates.length >= 2 ? candidates[0][0] : 0;
  const y0 = candidates.length >= 2 ? candidates[0][1] : clamp(intercept);
  const x1 = candidates.length >= 2 ? candidates[candidates.length - 1][0] : 1;
  const y1 = candidates.length >= 2 ? candidates[candidates.length - 1][1] : clamp(slope + intercept);

  const rStr = r.toFixed(3);
  const magnitude = Math.abs(r);
  const strength =
    magnitude >= 0.7 ? "strong" : magnitude >= 0.4 ? "moderate" : "weak";
  const direction =
    r > 0.1 ? "positive" : r < -0.1 ? "negative" : "near-zero";
  const sign = intercept >= 0 ? "+" : "−";
  const slopeStr = slope.toFixed(2);
  const intStr = Math.abs(intercept).toFixed(2);

  function reset() {
    setN(DEFAULTS.n);
    setOutlierCount(DEFAULTS.outlierCount);
    setConfound(DEFAULTS.confound);
    setSeedInput(String(DEFAULTS.seed));
  }

  const titleText = `Scatter plot: ${data.length} points. Pearson r = ${rStr}.`;

  return (
    <section
      className="correlation-demo"
      aria-label="Correlation and regression experiment"
    >
      <div className="correlation-controls">
        <label htmlFor="ce-n">
          Sample size: <strong>{n}</strong>
          <input
            id="ce-n"
            type="range"
            min={MIN_N}
            max={MAX_N}
            step={5}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <label htmlFor="ce-outliers">
          Outliers: <strong>{outlierCount}</strong>
          <input
            id="ce-outliers"
            type="range"
            min={0}
            max={MAX_OUTLIERS}
            step={1}
            value={outlierCount}
            onChange={(e) => setOutlierCount(Number(e.target.value))}
          />
        </label>
        <label className="correlation-checkbox" htmlFor="ce-confound">
          <input
            id="ce-confound"
            type="checkbox"
            checked={confound}
            onChange={(e) => setConfound(e.target.checked)}
          />
          Show confounding variable
        </label>
        <label htmlFor="ce-seed">
          Random seed
          <input
            id="ce-seed"
            type="number"
            min={0}
            max={MAX_SEED}
            step={1}
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
          />
        </label>
        <button type="button" onClick={reset}>
          Reset to defaults
        </button>
      </div>

      <svg
        className="correlation-plot"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="ce-title"
      >
        <title id="ce-title">{titleText}</title>
        <line x1={L} y1={T} x2={L} y2={T + PH} className="plot-axis" />
        <line
          x1={L}
          y1={T + PH}
          x2={L + PW}
          y2={T + PH}
          className="plot-axis"
        />
        <line
          x1={L + PW * 0.25}
          y1={T + PH}
          x2={L + PW * 0.25}
          y2={T + PH + 2}
          className="plot-tick"
        />
        <line
          x1={L + PW * 0.5}
          y1={T + PH}
          x2={L + PW * 0.5}
          y2={T + PH + 2}
          className="plot-tick"
        />
        <line
          x1={L + PW * 0.75}
          y1={T + PH}
          x2={L + PW * 0.75}
          y2={T + PH + 2}
          className="plot-tick"
        />
        <text
          x={L + PW / 2}
          y={H - 2}
          textAnchor="middle"
          className="plot-label"
        >
          x
        </text>
        <text
          x={5}
          y={T + PH / 2}
          textAnchor="middle"
          className="plot-label"
          transform={`rotate(-90 5 ${T + PH / 2})`}
        >
          y
        </text>
        <line
          x1={toX(x0)}
          y1={toY(y0)}
          x2={toX(x1)}
          y2={toY(y1)}
          className="ce-reg-line"
        />
        {data.map((pt, i) => (
          <circle
            key={i}
            cx={toX(pt.x)}
            cy={toY(pt.y)}
            r={0.9}
            className={pt.outlier ? "ce-outlier" : "ce-point"}
          />
        ))}
      </svg>

      <p className="correlation-summary" aria-live="polite">
        <strong>r = {rStr}</strong> ({strength} {direction} association).{" "}
        ŷ = {slopeStr}x {sign} {intStr}.{" "}
        {data.length} point{data.length !== 1 ? "s" : ""}.
        {outlierCount > 0 &&
          ` ${outlierCount} outlier${outlierCount !== 1 ? "s" : ""} (orange).`}
        {confound && " Confounder active: data splits into two groups."}
      </p>
    </section>
  );
}
