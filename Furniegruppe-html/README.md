# Furnie — design reference

This is a design mockup created in a visual design tool, exported as a
standalone page. Treat it as a REFERENCE MOCKUP, not production code:
the markup and inline styles carry the design's precise values — colors,
font sizes, spacing, radii, shadows, layout — which an implementation
should replicate faithfully in its own components and styling system
rather than copy wholesale.

## Contents

- `Main.dc.html` — the artboard (a Design Component: an `<x-dc>`
  template + a small logic class). The values to replicate live in its
  inline `style="…"` attributes and the `<helmet><style>` block.
- `bad360-back.jpg` — referenced resource
- `bad360-bottom.jpg` — referenced resource
- `bad360-front.jpg` — referenced resource
- `bad360-left.jpg` — referenced resource
- `bad360-right.jpg` — referenced resource
- `bad360-top.jpg` — referenced resource
- `rom360-back.jpg` — referenced resource
- `rom360-bottom.jpg` — referenced resource
- `rom360-front.jpg` — referenced resource
- `rom360-left.jpg` — referenced resource
- `rom360-right.jpg` — referenced resource
- `rom360-stol.png` — referenced resource
- `rom360-top.jpg` — referenced resource
- `soverom-basket.png` — referenced resource
- `soverom-box.png` — referenced resource
- `soverom-chair.png` — referenced resource
- `soverom-pedestal.png` — referenced resource
- `soverom.jpg` — referenced resource
- `support.js`, `vendor/react*.js` — the runtime that renders the
  component in a browser; not part of the design.

## Viewing

Serve the folder (e.g. `python3 -m http.server`) and open `Main.dc.html`;
some browsers block the scripts over file://.
