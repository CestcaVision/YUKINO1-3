/** Resolve local routes under either a root site or a GitHub Pages project path. */
export function sitePath(path: string, base = import.meta.env.BASE_URL ?? "/") {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${base.replace(/\/+$/, "")}${path}`;
}
