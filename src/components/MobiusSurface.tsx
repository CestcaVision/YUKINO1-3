import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Point = [number, number, number];
type Curve = { points: Point[]; accent: boolean };
type Face = Curve & { u: number; v: number };
const TAU = Math.PI * 2;
const INITIAL_COLOUR_PHASE = -1.1;
const INITIAL_VIEW = { pitch: 0.16, yaw: -0.12, roll: -0.05 };

function surface(u: number, v: number): Point {
  const radius = 1.4 + v * Math.cos(u / 2);
  return [radius * Math.cos(u), radius * Math.sin(u), v * Math.sin(u / 2)];
}

function sample(count: number, point: (t: number) => Point): Point[] {
  return Array.from({ length: count + 1 }, (_, i) => point(i / count));
}

// A fixed mesh: animation changes the camera, never the geometry.
const curves: Curve[] = [
  ...Array.from({ length: 9 }, (_, i) => ({
    points: sample(56, (t) => surface(t * TAU, -0.52 + (i / 8) * 1.04)),
    accent: false,
  })),
  ...Array.from({ length: 56 }, (_, i) => ({
    points: sample(12, (t) => surface((i / 56) * TAU, -0.52 + t * 1.04)),
    accent: false,
  })),
  // Following the edge twice around reveals the single continuous boundary.
  { points: sample(192, (t) => surface(t * TAU * 2, 0.52)), accent: true },
];

// Each cell shares its corners with the existing 56 × 8 wireframe grid.
const faces: Face[] = Array.from({ length: 56 * 8 }, (_, index) => {
  const column = Math.floor(index / 8);
  const row = index % 8;
  const u0 = (column / 56) * TAU;
  const u1 = ((column + 1) / 56) * TAU;
  const v0 = -0.52 + (row / 8) * 1.04;
  const v1 = -0.52 + ((row + 1) / 8) * 1.04;
  return {
    points: [
      surface(u0, v0),
      surface(u1, v0),
      surface(u1, v1),
      surface(u0, v1),
    ],
    accent: false,
    u: (u0 + u1) / 2,
    v: (v0 + v1) / 2,
  };
});

function faceColour(face: Face, phase: number) {
  const wave = Math.pow((Math.sin(face.u - phase) + 1) / 2, 5);
  // Even dependence on v keeps the colour continuous across the twisted seam.
  const ripple = Math.sin(7 * face.u - phase * 0.8) * Math.cos(face.v * 14);
  const strength = 0.03 + wave * 0.92 + (ripple + 1) * 0.02;
  const base = [248, 250, 253];
  const blue = [30, 78, 216];
  return `rgb(${base.map((channel, index) => Math.round(channel + (blue[index] - channel) * strength)).join(", ")})`;
}

function project(curve: Curve, pitch: number, yaw: number, roll: number) {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  let depth = 0;
  const d = curve.points
    .map(([x, y, z], index) => {
      const rx = x * cy + z * sy;
      const rz = -x * sy + z * cy;
      const ry = y * cp - rz * sp;
      const cameraZ = y * sp + rz * cp;
      const scale = 100 * (5 / (5 - cameraZ));
      depth += cameraZ;
      // Rotate in the image plane while retaining a slight three-dimensional tilt.
      const px = 240 + (rx * cr - ry * sr) * scale;
      const py = 210 + (rx * sr + ry * cr) * scale;
      return `${index === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(" ");
  return {
    d,
    depth: depth / curve.points.length,
    opacity: curve.accent
      ? 0.9
      : 0.25 + ((depth / curve.points.length + 2) / 4) * 0.35,
  };
}

const initialPaths = curves.map((curve) =>
  project(curve, INITIAL_VIEW.pitch, INITIAL_VIEW.yaw, INITIAL_VIEW.roll),
);
const initialFaces = faces
  .map((face, index) => ({
    index,
    ...project(face, INITIAL_VIEW.pitch, INITIAL_VIEW.yaw, INITIAL_VIEW.roll),
  }))
  .sort((a, b) => a.depth - b.depth || a.index - b.index);
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerMotion = () => false;

export default function MobiusSurface() {
  const svgRef = useRef<SVGSVGElement>(null);
  const view = useRef({ ...INITIAL_VIEW });
  const colourPhase = useRef(INITIAL_COLOUR_PHASE);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerMotion,
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(
      svg.querySelectorAll<SVGPathElement>(".surface-mesh, .surface-edge"),
    );
    const faceGroup = svg.querySelector<SVGGElement>(".surface-faces")!;
    const facePaths = Array.from(
      faceGroup.querySelectorAll<SVGPathElement>("path"),
    ).sort((a, b) => Number(a.dataset.face) - Number(b.dataset.face));
    let previousOrder = "";
    const container = svg.parentElement!;
    container.dataset.ready = "true";
    let frame = 0;
    let previousTime = 0;
    let visible = false;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const animate = !paused && !reducedMotion;
    const draw = () => {
      const projectedFaces = faces
        .map((face, index) => {
          const projected = project(
            face,
            view.current.pitch,
            view.current.yaw,
            view.current.roll,
          );
          facePaths[index].setAttribute("d", `${projected.d} Z`);
          facePaths[index].setAttribute(
            "fill",
            faceColour(face, colourPhase.current),
          );
          return { index, depth: projected.depth };
        })
        .sort((a, b) => a.depth - b.depth || a.index - b.index);
      // Paint back to front so colour follows the surface through every rotation.
      const order = projectedFaces.map(({ index }) => index).join(",");
      if (order !== previousOrder) {
        faceGroup.replaceChildren(
          ...projectedFaces.map(({ index }) => facePaths[index]),
        );
        previousOrder = order;
      }
      curves.forEach((curve, index) => {
        const projected = project(
          curve,
          view.current.pitch,
          view.current.yaw,
          view.current.roll,
        );
        paths[index].setAttribute("d", projected.d);
        paths[index].setAttribute("opacity", String(projected.opacity));
      });
    };
    const tick = (time: number) => {
      frame = 0;
      if (animate && visible && !document.hidden) {
        if (previousTime) {
          const elapsed = Math.min(time - previousTime, 50);
          colourPhase.current += elapsed * 0.00085;
          if (!dragging) view.current.yaw += elapsed * 0.000075;
        }
        previousTime = time;
        frame = requestAnimationFrame(tick);
      }
      draw();
    };
    const refresh = () => {
      previousTime = 0;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      refresh();
    });
    observer.observe(svg);
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      svg.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      view.current.yaw += (event.clientX - lastX) * 0.008;
      view.current.pitch = Math.max(
        -1.3,
        Math.min(1.3, view.current.pitch + (event.clientY - lastY) * 0.008),
      );
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const up = () => {
      dragging = false;
    };
    const key = (event: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if (event.key === "Home") view.current = { ...INITIAL_VIEW };
      if (event.key === "ArrowLeft") view.current.yaw -= 0.12;
      if (event.key === "ArrowRight") view.current.yaw += 0.12;
      if (event.key === "ArrowUp")
        view.current.pitch = Math.max(-1.3, view.current.pitch - 0.12);
      if (event.key === "ArrowDown")
        view.current.pitch = Math.min(1.3, view.current.pitch + 0.12);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("lostpointercapture", up);
    svg.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("lostpointercapture", up);
      svg.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [paused, reducedMotion]);

  return (
    <div className="mobius-surface">
      <svg
        ref={svgRef}
        viewBox="0 0 480 420"
        role="img"
        tabIndex={0}
        aria-label="Interactive Möbius strip. Drag or use arrow keys to rotate; press Home to reset the view."
      >
        <title>A surface with one side and one continuous edge</title>
        <g className="surface-faces">
          {initialFaces.map(({ index, d }) => (
            <path
              key={index}
              data-face={index}
              className="surface-face"
              d={`${d} Z`}
              fill={faceColour(faces[index], INITIAL_COLOUR_PHASE)}
            />
          ))}
        </g>
        {curves.map((curve, index) => (
          <path
            key={index}
            d={initialPaths[index].d}
            opacity={initialPaths[index].opacity}
            className={curve.accent ? "surface-edge" : "surface-mesh"}
          />
        ))}
      </svg>
      <div className="surface-caption">
        <div>
          <span className="surface-name">Möbius strip</span>
          <span className="surface-detail">
            One surface. One continuous edge.
          </span>
        </div>
        <button
          type="button"
          className="surface-motion"
          disabled={reducedMotion}
          onClick={() => setPaused((value) => !value)}
        >
          {reducedMotion
            ? "Motion off"
            : paused
              ? "Play animation"
              : "Pause animation"}
        </button>
      </div>
      <p className="surface-hint">Drag to explore</p>
    </div>
  );
}
