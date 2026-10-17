import { useEffect, useId, useRef, useState } from "react";
import HalftoneReveal, { type HalftoneRevealProps } from "./HalftoneReveal";
import "./HalftoneHero.css";

type PrintConfig = Required<
  Omit<HalftoneRevealProps, "src" | "alt" | "className" | "style" | "controls">
>;
type Props = Pick<HalftoneRevealProps, "src" | "alt"> & Partial<PrintConfig>;

const DEFAULT_CONFIG: PrintConfig = {
  fit: "contain",
  mode: "mono",
  shape: "dot",
  cellSize: 6,
  angle: 45,
  dotScale: 1,
  inkColor: "#0d0d0d",
  accentColor: "#ff4f2a",
  paperColor: "#ffffff",
  contrast: 1.1,
  brightness: 0,
  invert: false,
  roughness: 0,
  misregistration: 0,
  revealRadius: 160,
  softness: 0.6,
  linger: 1.2,
  reverse: false,
  wander: false,
  clickBurst: true,
  intro: true,
  meshBlur: 16,
  meshOpacity: 0.85,
};

const PRESETS = {
  newsprint: { label: "Newsprint", settings: {} },
  riso: {
    label: "Riso",
    settings: {
      mode: "duotone",
      cellSize: 7,
      angle: 22,
      roughness: 0.35,
      misregistration: 0.4,
      inkColor: "#2442ff",
      accentColor: "#ff48a5",
    },
  },
  process: { label: "Process", settings: { mode: "color", cellSize: 7 } },
  engraving: {
    label: "Engraving",
    settings: { shape: "line", cellSize: 5, angle: 30 },
  },
  pop: {
    label: "Pop",
    settings: { mode: "color", cellSize: 14, dotScale: 1.05, contrast: 1.25 },
  },
  grit: {
    label: "Grit",
    settings: { shape: "ellipse", cellSize: 7, angle: 60, roughness: 0.7 },
  },
  mobius: {
    label: "Hologram",
    settings: {
      mode: "mesh",
      shape: "square",
      cellSize: 10,
      angle: 0,
      dotScale: 0.65,
      inkColor: "#1e4ed8",
      accentColor: "#1e4ed8",
      paperColor: "#ffffff",
      roughness: 0,
      intro: false,
    },
  },
} satisfies Record<string, { label: string; settings: Partial<PrintConfig> }>;
type Preset = keyof typeof PRESETS;

const RANGES = [
  {
    key: "meshBlur",
    label: "Opacity blur",
    min: 0,
    max: 32,
    step: 1,
    unit: "px",
  },
  {
    key: "meshOpacity",
    label: "Line opacity",
    min: 0,
    max: 1,
    step: 0.05,
    unit: "",
  },
  { key: "cellSize", label: "Cell size", min: 2, max: 30, step: 1, unit: "px" },
  { key: "angle", label: "Angle", min: 0, max: 180, step: 1, unit: "°" },
  {
    key: "dotScale",
    label: "Dot scale",
    min: 0.2,
    max: 2,
    step: 0.05,
    unit: "",
  },
  {
    key: "contrast",
    label: "Contrast",
    min: 0.2,
    max: 2.5,
    step: 0.05,
    unit: "",
  },
  {
    key: "brightness",
    label: "Brightness",
    min: -0.5,
    max: 0.5,
    step: 0.05,
    unit: "",
  },
  {
    key: "roughness",
    label: "Roughness",
    min: 0,
    max: 1,
    step: 0.05,
    unit: "",
  },
  {
    key: "misregistration",
    label: "Misregistration",
    min: 0,
    max: 1,
    step: 0.05,
    unit: "",
  },
  {
    key: "revealRadius",
    label: "Reveal radius",
    min: 20,
    max: 320,
    step: 10,
    unit: "px",
  },
  { key: "softness", label: "Softness", min: 0, max: 1, step: 0.05, unit: "" },
  { key: "linger", label: "Linger", min: 0, max: 4, step: 0.1, unit: "s" },
] as const;
const TOGGLES = [
  { key: "invert", label: "Invert" },
  { key: "reverse", label: "Reverse" },
  { key: "wander", label: "Wander" },
  { key: "clickBurst", label: "Click burst" },
  { key: "intro", label: "Intro" },
] as const;

export default function HalftoneHero({ src, alt, ...initialConfig }: Props) {
  const [defaults] = useState(() => ({ ...DEFAULT_CONFIG, ...initialConfig }));
  const [config, setConfig] = useState(defaults);
  const [preset, setPreset] = useState<Preset | "custom">("newsprint");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const id = useId();

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      )
        details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      const details = detailsRef.current;
      if (event.key === "Escape" && details?.open) {
        event.preventDefault();
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const update = <K extends keyof PrintConfig>(
    key: K,
    value: PrintConfig[K],
  ) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setPreset("custom");
  };

  return (
    <HalftoneReveal
      src={src}
      alt={alt}
      {...config}
      controls={
        <details className="halftone-customizer" ref={detailsRef}>
          <summary>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 17h16" />
              <circle cx="9" cy="7" r="3" fill="var(--color-paper)" />
              <circle cx="15" cy="17" r="3" fill="var(--color-paper)" />
            </svg>
            Customize
          </summary>
          <div
            className="halftone-config-panel"
            role="group"
            aria-label="Make it your own."
          >
            <div className="halftone-config-header">
              <div>
                <h2 id={`${id}-title`}>Make it your own.</h2>
                <p>Changes apply live.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfig(defaults);
                  setPreset("newsprint");
                }}
              >
                Reset
              </button>
            </div>
            <div className="halftone-config-grid">
              <label className="halftone-config-field">
                <span>Preset</span>
                <select
                  aria-label="Preset"
                  value={preset}
                  onChange={(event) => {
                    const selected = event.currentTarget.value;
                    if (selected in PRESETS) {
                      const key = selected as Preset;
                      setConfig({ ...defaults, ...PRESETS[key].settings });
                      setPreset(key);
                    }
                  }}
                >
                  {Object.entries(PRESETS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                  <option value="custom" disabled>
                    Custom
                  </option>
                </select>
              </label>
              <label className="halftone-config-field">
                <span>Mode</span>
                <select
                  aria-label="Mode"
                  value={config.mode}
                  onChange={(event) =>
                    update(
                      "mode",
                      event.currentTarget.value as PrintConfig["mode"],
                    )
                  }
                >
                  <option value="mono">Mono</option>
                  <option value="duotone">Duotone</option>
                  <option value="color">Color</option>
                  <option value="mesh">Holographic mesh</option>
                </select>
              </label>
              <label className="halftone-config-field">
                <span>Shape</span>
                <select
                  aria-label="Shape"
                  value={config.shape}
                  onChange={(event) =>
                    update(
                      "shape",
                      event.currentTarget.value as PrintConfig["shape"],
                    )
                  }
                >
                  {["dot", "ellipse", "square", "diamond", "line", "cross"].map(
                    (shape) => (
                      <option key={shape} value={shape}>
                        {shape.charAt(0).toUpperCase() + shape.slice(1)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="halftone-config-field">
                <span>Fit</span>
                <select
                  aria-label="Fit"
                  value={config.fit}
                  onChange={(event) =>
                    update(
                      "fit",
                      event.currentTarget.value as PrintConfig["fit"],
                    )
                  }
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
              {(
                [
                  { key: "inkColor", label: "Ink" },
                  { key: "accentColor", label: "Accent" },
                  { key: "paperColor", label: "Paper" },
                ] as const
              ).map(({ key, label }) => (
                <label
                  className="halftone-config-field halftone-config-color"
                  key={key}
                >
                  <span>{label}</span>
                  <span className="halftone-color-value">
                    <input
                      aria-label={label}
                      type="color"
                      value={config[key]}
                      onChange={(event) =>
                        update(key, event.currentTarget.value)
                      }
                    />
                    <output>{config[key]}</output>
                  </span>
                </label>
              ))}
              {RANGES.filter(
                ({ key }) =>
                  config.mode === "mesh" ||
                  (key !== "meshBlur" && key !== "meshOpacity"),
              ).map(({ key, label, min, max, step, unit }) => (
                <label
                  className="halftone-config-field halftone-config-range"
                  htmlFor={`${id}-${key}`}
                  key={key}
                >
                  <span>
                    {key === "dotScale" && config.mode === "mesh"
                      ? "Line width"
                      : label}
                    <output htmlFor={`${id}-${key}`}>
                      {Number(config[key].toFixed(2))}
                      {unit}
                    </output>
                  </span>
                  <input
                    id={`${id}-${key}`}
                    aria-label={
                      key === "dotScale" && config.mode === "mesh"
                        ? "Line width"
                        : label
                    }
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={config[key]}
                    onChange={(event) =>
                      update(key, event.currentTarget.valueAsNumber)
                    }
                  />
                </label>
              ))}
              {TOGGLES.map(({ key, label }) => (
                <label
                  className="halftone-config-field halftone-config-toggle"
                  key={key}
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={config[key]}
                    onChange={(event) =>
                      update(key, event.currentTarget.checked)
                    }
                  />
                </label>
              ))}
            </div>
            <div className="halftone-config-footer">
              <span>Esc or click outside to close</span>
              <button
                type="button"
                onClick={() => {
                  if (detailsRef.current) {
                    detailsRef.current.open = false;
                    detailsRef.current.querySelector("summary")?.focus();
                  }
                }}
              >
                Done
              </button>
            </div>
          </div>
        </details>
      }
    />
  );
}
