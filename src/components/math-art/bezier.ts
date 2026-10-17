import type { Point2 } from "./geometry";

export type ControlPoints = [Point2, Point2, Point2, Point2];
export const INITIAL_CONTROLS: ControlPoints = [
  [50, 104],
  [320, 40],
  [120, 400],
  [390, 336],
];
export const INITIAL_PARAMETER = 0.42;

export function clampPoint([x, y]: Point2, padding = 30): Point2 {
  return [
    Math.max(padding, Math.min(440 - padding, x)),
    Math.max(padding, Math.min(440 - padding, y)),
  ];
}

export function interpolate(a: Point2, b: Point2, t: number): Point2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// de Casteljau construction: three points on the control polygon, then two,
// then the curve point. Each level is only linear interpolation.
export function construction(points: ControlPoints, t: number) {
  const first = [
    interpolate(points[0], points[1], t),
    interpolate(points[1], points[2], t),
    interpolate(points[2], points[3], t),
  ];
  const second = [
    interpolate(first[0], first[1], t),
    interpolate(first[1], first[2], t),
  ];
  return { first, second, point: interpolate(second[0], second[1], t) };
}

// Use the native SVG cubic instead of a sampled polyline, preserving crisp curves
// at any viewport or pixel density. https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/d
export function cubicPath([start, first, second, end]: ControlPoints) {
  return `M${start[0].toFixed(2)} ${start[1].toFixed(2)}C${first[0].toFixed(2)} ${first[1].toFixed(2)} ${second[0].toFixed(2)} ${second[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
}

export function ribbonGeometry(points: ControlPoints) {
  const direction = (a: Point2, b: Point2): Point2 => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
  };
  const middleNormal = direction(points[0], points[3]);
  return Array.from({ length: 23 }, (_, index) => {
    const spread = (index - 11) / 11;
    const first = clampPoint(
      [
        points[1][0] + middleNormal[0] * spread * 140,
        points[1][1] + middleNormal[1] * spread * 140,
      ],
      24,
    );
    const second = clampPoint(
      [
        points[2][0] + middleNormal[0] * spread * 140,
        points[2][1] + middleNormal[1] * spread * 140,
      ],
      24,
    );
    return {
      d: cubicPath([points[0], first, second, points[3]]),
      opacity: 0.25 + (1 - Math.abs(spread)) * 0.27,
    };
  });
}
