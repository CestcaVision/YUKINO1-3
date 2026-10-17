import {
  curve,
  project,
  TRACE_VIEW,
  smoothPath2,
  type Point3,
  type Point2,
  type View,
} from "./geometry";

// Lorenz, Deterministic Nonperiodic Flow (1963), equations (25)-(27).
// sigma = 10, rho = 28, beta = 8/3. Fixed-step fourth-order Runge–Kutta.
// https://doi.org/10.1175/1520-0469(1963)020<0130:DNF>2.0.CO;2
function derivative([x, y, z]: Point3): Point3 {
  return [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
}

function advance(point: Point3, delta: Point3, amount: number): Point3 {
  return [
    point[0] + delta[0] * amount,
    point[1] + delta[1] * amount,
    point[2] + delta[2] * amount,
  ];
}

export function lorenzStep(point: Point3, dt = 0.008): Point3 {
  const a = derivative(point);
  const b = derivative(advance(point, a, dt / 2));
  const c = derivative(advance(point, b, dt / 2));
  const d = derivative(advance(point, c, dt));
  const value = (index: number) =>
    point[index] +
    (dt / 6) * (a[index] + 2 * b[index] + 2 * c[index] + d[index]);
  return [value(0), value(1), value(2)];
}

export function lorenzTrajectory(): Point3[] {
  let point: Point3 = [0.1, 0, 0];
  const points: Point3[] = [];
  for (let index = 0; index < 9200; index++) {
    point = lorenzStep(point);
    // Remove the initial transient and keep a bounded, reusable 4,000-point orbit.
    if (index >= 1200 && index % 2 === 0) {
      points.push([point[0] / 15, point[1] / 15, (point[2] - 25) / 15]);
    }
  }
  return points;
}

export const trajectory = lorenzTrajectory();

export function traceProjection(view: View = TRACE_VIEW) {
  const points = trajectory.map((point) => project(point, view, 119).point);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const fit = Math.min(1, 368 / (maxX - minX), 368 / (maxY - minY));
  return points.map(
    ([x, y]) =>
      [
        220 + (x - (minX + maxX) / 2) * fit,
        220 + (y - (minY + maxY) / 2) * fit,
      ] as Point2,
  );
}

export function traceGeometry(view: View = TRACE_VIEW) {
  const projected = traceProjection(view);
  const chunks = [];
  for (let index = 0; index < trajectory.length - 1; index += 64) {
    chunks.push({
      ...curve(trajectory.slice(index, index + 65), view, 119),
      d: smoothPath2(projected.slice(index, index + 65)),
    });
  }
  return chunks;
}

export function traceTail(points: readonly Point2[], position: number) {
  const end = Math.max(0, Math.min(points.length - 1, Math.round(position)));
  return {
    d: smoothPath2(points.slice(Math.max(0, end - 90), end + 1)),
    point: points[end],
  };
}

// Visually separated positions along the mathematical orbit. These are navigation
// bookmarks for real updates, not values inferred from the user's publication data.
export function traceBookmarks(count: number) {
  const points = traceProjection();
  const bookmarks: number[] = [];
  for (
    let index = 560;
    index < points.length && bookmarks.length < Math.min(4, count);
    index += 97
  ) {
    const [x, y] = points[index];
    if (
      bookmarks.every(
        (chosen) =>
          Math.hypot(x - points[chosen][0], y - points[chosen][1]) > 86,
      )
    )
      bookmarks.push(index);
  }
  return bookmarks;
}
