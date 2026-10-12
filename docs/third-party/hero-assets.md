# Hero assets

The homepage uses React Bits' Halftone Reveal, adapted for an Astro React island,
with a static image fallback, reduced motion, and a keyboard-accessible image
toggle. The shader and interaction implementation are from David Haz's
[React Bits source](https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Animations/HalftoneReveal).
Its license is preserved in [react-bits-license.md](react-bits-license.md).

The custom Hologram preset uses the image's alpha channel as the portrait mask.
A regular, straight grid is clipped to this mask; a blurred luminance field
controls only the blue lines' opacity. `Opacity blur`, `Line opacity`, and
`Line width` adjust the print without warping its geometry. Use a transparent
portrait PNG to define the subject region when replacing the demo image.

`public/images/hero-halftone.png` is the original image used in the
[Halftone Reveal demo](https://reactbits.dev/animations/halftone-reveal):
*Makoto Yuki Minato Arisato render 1* by wtfbooomsh, hosted on DeviantArt's
image CDN. It is demo imagery, separate from the React Bits software license.

Replace `public/images/hero-halftone.png` with your own image to keep the current
URL. To use a different filename, change `heroImage` in `src/pages/index.astro`
and the image's `alt` description. The path uses `sitePath` so it works both at
the domain root and under a GitHub Pages project path.
