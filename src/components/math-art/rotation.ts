import type { View } from "./geometry";

// Shared gesture plumbing only; both artworks retain their own geometry and state.
export function attachRotation(
  svg: SVGSVGElement,
  view: View,
  initial: View,
  redraw: () => void,
  signal: AbortSignal,
) {
  let pointer: { id: number; x: number; y: number } | undefined;
  svg.setAttribute("tabindex", "0");
  svg.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      svg.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  svg.addEventListener(
    "pointermove",
    (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      view.yaw += (event.clientX - pointer.x) * 0.008;
      view.pitch = Math.max(
        -0.8,
        Math.min(0.9, view.pitch + (event.clientY - pointer.y) * 0.006),
      );
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      redraw();
    },
    { signal },
  );
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    svg.addEventListener(
      event,
      () => {
        pointer = undefined;
      },
      { signal },
    );
  }
  svg.addEventListener(
    "keydown",
    (event) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if (event.key === "Home") Object.assign(view, initial);
      if (event.key === "ArrowLeft") view.yaw -= 0.12;
      if (event.key === "ArrowRight") view.yaw += 0.12;
      if (event.key === "ArrowUp")
        view.pitch = Math.max(-0.8, view.pitch - 0.08);
      if (event.key === "ArrowDown")
        view.pitch = Math.min(0.9, view.pitch + 0.08);
      redraw();
    },
    { signal },
  );
  signal.addEventListener("abort", () => {
    if (pointer && svg.hasPointerCapture(pointer.id))
      svg.releasePointerCapture(pointer.id);
  });
}
