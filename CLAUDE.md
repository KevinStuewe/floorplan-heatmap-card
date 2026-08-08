# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Home Assistant Lovelace custom card (`floorplan-heatmap-card`). It turns a
hand-drawn floor plan plus a handful of temperature sensors into a continuous
heatmap by solving steady-state heat diffusion (`∇·(k∇T) = 0`) on a grid,
where walls/doors/windows are grid-edge conductances rather than just visual
lines. See `README.md` for the full user-facing explanation of the physics,
the floor plan editor, and the config schema — read it before touching
`solver.js` or `model.js`, since the "why" behind the math lives there, not
in code comments.

Zero runtime dependencies, no bundler/framework — plain Web Components and
Canvas 2D. Comments and commit messages in this repo are in German; write
your own commit messages in English per global instructions, but match
existing comment style (sparse, explaining *why* not *what*) if editing
existing files.

## Commands

```bash
node build.mjs                 # bundles src/*.js → dist/floorplan-heatmap-card.js
node --test "test/*.test.mjs"  # run all tests
node --test test/solver.test.mjs         # run a single test file
node --check dist/floorplan-heatmap-card.js  # syntax-check the bundle
npm run check                  # build + syntax-check + full test suite (do this before considering a change done)

python3 -m http.server 8777    # then open http://localhost:8777/demo/
```

The demo (`demo/index.html`) fakes a minimal `hass` object, shows a sample
apartment with six sensors, and opens the fullscreen plan editor — use it to
visually verify changes without a Home Assistant instance.

There is no lint config; match surrounding style.

## Build system

`build.mjs` is a hand-rolled bundler, **not webpack/esbuild/rollup**. It
concatenates `src/*.js` in the fixed dependency order listed in
`MODULES`, strips `import`/`export` syntax, and wraps the result in an
IIFE. It has no module resolution — it just deletes import lines and
`export` keywords — so:

- **New source files must be added to the `MODULES` array in `build.mjs`**,
  in an order that comes after their dependencies.
- **All top-level `const`/`function`/`class` names across every `src/*.js`
  file share one flat namespace.** The build fails fast with a "Namenskollision"
  error if two files declare the same top-level name — pick unique names.
- Regular ES `import`/`export` is still used within `src/` for editor/IDE
  support and for the test suite (tests import straight from `src/*.mjs`
  modules, not from `dist/`); the build step is what erases it for the
  dependency-free HA runtime.
- Always run `node build.mjs` after editing `src/` — `dist/` is a generated
  artifact checked into the repo and consumed directly by Home Assistant, so
  stale bundles are a real regression, not just a build hygiene issue.

## Architecture

Data flow: **config → floorplan model → grid solver → renderer (2D or 3D)**.

```
model.js        normalizeConfig() sanitizes YAML/JSON card config, fills
                 defaults, and derives the effective wall list from room
                 polygons (buildWalls). Rooms are drawn as closed polygons;
                 their EDGES are the walls — there is no separate "draw a
                 wall around the room" step. Interior vs. exterior wall
                 classification is automatic: probe both sides of an edge
                 for another room polygon. Openings (door/window/passage)
                 are standalone geometry (center + angle + width), not
                 attached to a specific wall — if two rooms share an edge,
                 one opening automatically cuts both room edges at once.

solver.js       HeatField: builds a regular grid over the floor plan and
                 solves steady-state diffusion via SOR (Gauss-Seidel with
                 over-relaxation). Sensors are Dirichlet boundary conditions
                 on a small disc around their point. Wall transmittance is
                 converted to an equivalent thickness of free air
                 (WALL_AIR_EQUIVALENT_M) so wall resistance stays constant
                 regardless of grid resolution — a wall always occupies
                 exactly one grid edge, but a room has more cells at finer
                 resolution, so this conversion keeps the two comparable.
                 The solver is warm-started from the previous solution
                 between sensor updates for cheap incremental re-solves.

isotherms.js    Marching squares over the solved field for isotherm lines.

renderer.js     Flat top-down 2D rendering: field, walls, openings, room
                 labels, onto a canvas.

projection.js   Axonometric (parallel, not perspective) projection for the
                 tilted 2.5D view. Deliberately parallel because the floor
                 (z=0) then maps via an affine transform that Canvas 2D's
                 ctx.transform() can express directly, so the pre-computed
                 flat heatmap can be stamped onto the tilted floor
                 unmodified. Perspective would need a homography (not
                 supported by Canvas 2D) and per-tile approximation instead.

scene3d.js       Builds and renders the 3D wall geometry for tilted view
                 using buildWalls() from model.js. Occlusion is via
                 painter's algorithm (sort faces by depth, draw back to
                 front) — no z-buffer needed because every wall segment is
                 a convex box, so its own front faces always cover its back
                 faces. Doors/windows are absent geometry, not sprites: a
                 door removes the wall box and leaves only a lintel; a
                 window gets sill + lintel + a translucent pane.

card.js          The Lovelace custom element (`floorplan-heatmap-card`).
                 Composes the above into layers: background image → heat
                 field (clipped to room polygons) → isotherms → walls/doors/
                 windows/labels → sensor chips (real DOM elements, so
                 they're hoverable/clickable and open HA's more-info dialog).

editor.js        The card's config-editor form (Home Assistant's GUI card
                 editor).

plan-editor.js   The standalone fullscreen SVG floor plan editor (draw
                 rooms/walls/openings/sensors, calibrate scale, etc. — see
                 README's tool table for the keybindings). This is the
                 largest and most stateful module in the codebase.

geometry.js      Low-level vector/polygon helpers (point-in-polygon, segment
                 intersection, bbox, polygon area/centroid) used throughout.

palette.js       Color scales (coolwarm/thermal/viridis/inferno/turbo) and
                 legend gradients.

index.js         Registers the custom elements with the browser and with
                 Home Assistant's customCards registry.
```

Key invariant to preserve when changing floor plan geometry logic: all
coordinates in `floorplan` data are unitless "floor plan pixels";
`px_per_meter` is the only place scale enters, used for sensor radius, wall
thickness-equivalent, and room-dimension labels. Don't let meters and
floor-plan-pixels mix without going through that conversion.

## Tests

`node --test`-based (no test framework dependency). Tests build small
synthetic floor plans (e.g. two rooms sharing a wall, with/without an
opening) via `normalizeConfig()` and assert on physically meaningful
properties of the solved field — e.g. that a closed wall measurably damps
heat transfer and an opening measurably restores it — not on incidental
implementation details. Follow that style for new solver/model tests: prefer
asserting on the physics/geometry outcome over exact internal values.
