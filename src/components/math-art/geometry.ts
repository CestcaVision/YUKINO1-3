export type Point3 = readonly [number, number, number];
export type Point2 = readonly [number, number];
export interface View {
  yaw: number;
  pitch: number;
}

export const TRACE_VIEW: View = { yaw: -0.55, pitch: 0.12 };

export function project(point: Point3, view: View, scale = 112) {
  const [x, y, z] = point;
  const horizontal = x * Math.cos(view.yaw) - y * Math.sin(view.yaw);
  const forward = x * Math.sin(view.yaw) + y * Math.cos(view.yaw);
  const vertical = z * Math.cos(view.pitch) - forward * Math.sin(view.pitch);
  const depth = forward * Math.cos(view.pitch) + z * Math.sin(view.pitch);
  const perspective = 1 / (1 - depth * 0.055);
  return {
    point: [
      220 + horizontal * scale * perspective,
      220 - vertical * scale * perspective,
    ] as Point2,
    depth,
  };
}

export function path2(points: readonly Point2[]) {
  return points
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join("");
}

// Catmull–Rom tangents expressed as cubic Béziers pass through the ODE samples.
export function smoothPath2(points: readonly Point2[]) {
  if (!points.length) return "";
  let d = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[Math.max(0, index - 1)];
    const b = points[index];
    const c = points[index + 1];
    const e = points[Math.min(points.length - 1, index + 2)];
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(2)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(2)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)} ${c[1].toFixed(2)}`;
  }
  return d;
}

export function curve(points: readonly Point3[], view: View, scale = 112) {
  let depth = 0;
  const projected = points.map((point) => {
    const result = project(point, view, scale);
    depth += result.depth;
    return result.point;
  });
  return {
    d: path2(projected),
    opacity: Math.max(
      0.16,
      Math.min(0.65, 0.38 + (depth / points.length) * 0.16),
    ),
  };
}
