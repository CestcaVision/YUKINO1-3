import { describe, expect, it } from "vitest";
import {
  construction,
  cubicPath,
  ribbonGeometry,
  INITIAL_CONTROLS,
  type ControlPoints,
} from "../../src/components/math-art/bezier";
import {
  lorenzStep,
  trajectory,
  traceBookmarks,
  traceProjection,
} from "../../src/components/math-art/lorenz";

describe("mathematical artwork", () => {
  it("de Casteljau construction preserves the endpoints and matches the independent cubic polynomial", () => {
    expect(construction(INITIAL_CONTROLS, 0).point).toEqual(
      INITIAL_CONTROLS[0],
    );
    expect(construction(INITIAL_CONTROLS, 1).point).toEqual(
      INITIAL_CONTROLS[3],
    );
    for (const t of [0.13, 0.5, 0.91]) {
      const weights = [
        (1 - t) ** 3,
        3 * t * (1 - t) ** 2,
        3 * t ** 2 * (1 - t),
        t ** 3,
      ];
      const result = construction(INITIAL_CONTROLS, t);
      expect(result.first).toHaveLength(3);
      expect(result.second).toHaveLength(2);
      for (const axis of [0, 1])
        expect(result.point[axis]).toBeCloseTo(
          INITIAL_CONTROLS.reduce(
            (sum, point, index) => sum + weights[index] * point[axis],
            0,
          ),
          10,
        );
    }
  });
  it("the ribbon stays bounded even with coincident or edge control points", () => {
    const examples: ControlPoints[] = [
      INITIAL_CONTROLS,
      [
        [30, 30],
        [410, 30],
        [30, 410],
        [410, 410],
      ],
      [
        [220, 220],
        [220, 220],
        [220, 220],
        [220, 220],
      ],
    ];
    for (const points of examples) {
      for (const line of ribbonGeometry(points)) {
        const coordinates = line.d.match(/-?\d+\.\d+/g)!.map(Number);
        expect(
          coordinates.every(
            (value) => Number.isFinite(value) && value >= 24 && value <= 416,
          ),
        ).toBe(true);
      }
      expect(cubicPath(points)).toContain("C");
    }
  });
  it("the Lorenz integrator preserves all three analytical equilibria", () => {
    const v = Math.sqrt((8 / 3) * 27);
    for (const point of [
      [0, 0, 0],
      [v, v, 27],
      [-v, -v, 27],
    ] as const) {
      lorenzStep(point).forEach((coordinate, index) =>
        expect(coordinate).toBeCloseTo(point[index], 12),
      );
    }
  });
  it("the orbit stays bounded, contains both lobes and its rotated projection fits the artwork", () => {
    expect(trajectory).toHaveLength(4000);
    expect(
      trajectory.every((point) =>
        point.every((value) => Number.isFinite(value) && Math.abs(value) < 4),
      ),
    ).toBe(true);
    expect(trajectory.some(([x]) => x < -1)).toBe(true);
    expect(trajectory.some(([x]) => x > 1)).toBe(true);
    for (const yaw of [-3, -1, 0, 1, 3]) {
      expect(
        traceProjection({ yaw, pitch: 0.8 }).every((point) =>
          point.every((value) => value > 30 && value < 410),
        ),
      ).toBe(true);
    }
    expect(traceBookmarks(6)).toHaveLength(4);
    expect(traceBookmarks(0)).toHaveLength(0);
  });
});
