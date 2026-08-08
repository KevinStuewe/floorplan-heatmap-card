*[Deutsche Version](README.de.md)*

# Floorplan Heatmap for Home Assistant

A Lovelace card that turns individual temperature sensors into a continuous
heatmap over your floor plan — treating walls, doors, and windows as
thermal resistance.

A sensor behind a wall may be spatially close, but thermally it's far away.
That's exactly what the card shows: heat "flows" through an open door, but
barely at all through an exterior wall.

---

## Installation

### Via HACS

1. In HACS, under **Frontend**, use the ⋮ menu → **Custom repositories** to
   add this repository as category **Dashboard** (not needed once the card
   is listed in the official HACS store).
2. Install **Floorplan Heatmap** and reload Home Assistant.
3. HACS registers the resource automatically — the card is available
   directly under **Add card → Floorplan Heatmap**.

### Manual

1. Copy `dist/floorplan-heatmap-card.js` to `config/www/`.
2. In Home Assistant, under **Settings → Dashboards → ⋮ → Resources**,
   add a new resource:
   - URL: `/local/floorplan-heatmap-card.js`
   - Type: **JavaScript module**
3. Clear your browser cache, then add the card via
   **Add card → Floorplan Heatmap**.

There are no dependencies and no build step — a single file is enough.

The UI automatically follows the language configured in Home Assistant
(German or English, `hass.language`) — there's no separate card setting
for this.

## Drawing a floor plan

The card's config dialog has a **Edit floor plan & sensors** button at the
top, which opens a fullscreen editor.

| Tool | Key | What it does |
|---|---|---|
| Select | `V` | Click objects to move them, drag corner handles, type room dimensions on the right |
| Room | `R` | Drag for a rectangle, individual clicks for a polygon (Enter closes it) |
| Wall | `W` | Freestanding walls that don't bound a room — room dividers, niches |
| Door / Window | `D` | Click on a wall; the opening snaps onto it |
| Sensor | `S` | Place a measurement point and assign an entity |
| Delete | `X` | Click an element to remove it |
| Scale | `M` | Click off a stretch of known length and enter its value in meters |

More: mouse wheel zooms, middle mouse button or spacebar pans,
`Cmd/Ctrl+Z` undoes, `Del` deletes the selection, `Esc` cancels.

**Two things that save time:**

- Rooms are drawn as closed polygons — their edges *are* the walls, so you
  never draw a wall twice. The card determines whether an edge is an
  exterior or interior wall automatically, by checking whether another
  room lies behind it.
- Doors are standalone objects, not attached to a specific wall. If two
  rooms share an edge, a single door automatically opens both room edges
  at once.
- You don't have to drag handles to fix a roughly drawn room: with a room
  selected, **Width** and **Length** input fields (in meters) appear on
  the right. The room is stretched to the typed dimension, keeping its
  top-left corner fixed. Doors and windows don't move along with it — so
  double-check after larger corrections.

## How the calculation works

The card lays a grid over the floor plan and solves steady-state heat
diffusion on it: **∇·(k∇T) = 0**.

- Sensors are fixed values on a small disc around their measurement point.
- Every grid edge gets a conductance `k`: 1 for free air, less where it
  crosses a wall.
- The solver uses SOR (Gauss-Seidel with over-relaxation). Between sensor
  updates it starts warm from the previous solution and then only needs a
  few more iterations.

A component's transmittance is internally converted into "so many meters
of free air." That sounds roundabout, but it matters: a wall always
occupies exactly one grid edge, while a room has more and more cells at
finer grid resolution. Without this conversion, a wall would get weaker
the more precisely you compute.

With the default settings, roughly four-fifths of the temperature
difference drops across the wall itself rather than in the room in front
of it. That matches reality better than pure conduction would, because
room air mixes far more through convection than conduction alone would
achieve.

Areas that have no path to any sensor — say, a room behind a completely
sealed wall — are left blank instead of showing a made-up value.

## 2.5D view

With `view_mode: tilted`, the walls are raised and you look at the model
from an angle. **You can rotate and tilt right within the card by
dragging with the mouse held down** — that stays a pure view interaction
and doesn't overwrite the configured angles; a small button in the top
right resets it.

Doors and windows aren't painted symbols here, but absent geometry: a door
leaves out the wall box and only places a lintel above it; a window gets a
sill, a lintel, and a translucent pane. So you can see directly where heat
can pass through the apartment.

The projection is **parallel (axonometric)**, not perspective. That's not
just a stylistic choice: it makes the mapping of the floor plane an affine
transformation, so the already-computed heatmap can be laid onto it as an
image without distortion. A perspective view would need a homography,
which Canvas 2D can't do — the floor would have to be broken into tiles
and approximated piecewise. Occlusion is handled via the painter's
algorithm; no z-buffer is needed because every wall segment is a convex
box.

| Value | Meaning |
|---|---|
| `yaw` | Rotation around the vertical axis in degrees, −180…180 |
| `pitch` | Elevation angle in degrees: `90` = straight down from above, smaller = flatter. Below 12° the floor matrix becomes singular, so it's clamped there |
| `wall_height` | Wall height in meters |

Component dimensions (wall thickness 24/12 cm, door height 2.0 m, window
sill 0.9 m, lintel 2.1 m) are hardcoded and derived from the floor plan via
`px_per_meter` — **another reason it's worth calibrating the scale.**

The temperature field itself doesn't change with the view; it's purely a
matter of presentation.

## Configuration

Everything is reachable through the graphical editor. In YAML it looks
like this:

```yaml
type: custom:floorplan-heatmap-card
title: Temperature distribution
unit: °C
min: 18                 # lower bound of the color scale
max: 26                 # upper bound
auto_range: false       # true = scale follows the measured values
palette: coolwarm       # coolwarm | thermal | viridis | inferno | turbo
opacity: 0.85

view_mode: flat         # flat = top-down view | tilted = 2.5D with walls
yaw: -22                # degrees, rotation around the vertical axis
pitch: 58               # degrees elevation angle; 90 = straight down
wall_height: 2.5        # meters

cell_size: 8            # grid resolution in px, smaller = more precise, slower
sensor_radius: 0.4      # meters; area around the measurement point with a fixed value
show_isotherms: true
isotherm_step: 0.5
show_walls: true
show_room_labels: true
show_values: true
show_legend: true
px_per_meter: 50
background: /local/floorplan.png   # optional reference plan
background_opacity: 0.25

transmittance:          # transmittance 0…1 per component
  exterior: 0.02        # exterior wall
  interior: 0.12        # interior wall
  door: 0.5             # door
  window: 0.08          # window
  passage: 1.0          # open passage

floorplan:
  rooms:
    - id: lr
      name: Living Room
      points: [[0, 0], [350, 0], [350, 300], [0, 300]]
  walls: []             # only freestanding walls
  openings:
    - { id: o1, x: 150, y: 300, angle: 0, width: 50, type: door }
  sensors:
    - { id: s1, x: 175, y: 150, entity: sensor.living_room_temperature, name: Living Room }
```

Coordinates are abstract floor plan pixels. `px_per_meter` translates them
into meters — you need this for labels, the sensor radius, and the wall
thickness conversion. **Calibrate the scale once** (tool `M`), otherwise
walls will look too strong or too weak.

An opening's `angle` is in radians: `0` = horizontal, `1.5708` = vertical.
The editor sets this automatically.

## Not just temperature

The card simply reads the numeric state of the assigned entities. For
humidity, just use different `min`/`max` values and a matching `unit`. If
you omit `unit`, it's taken from the first entity.

## Development

```bash
node build.mjs                # src/ → dist/floorplan-heatmap-card.js
node --test "test/*.test.mjs" # solver tests
```

The build concatenates the modules with no npm dependency and fails if two
modules define the same top-level name.

To try it out without a Home Assistant instance:

```bash
python3 -m http.server 8777
# then open http://localhost:8777/demo/
```

The demo fakes a minimal `hass`, shows a sample apartment with six sensors,
and lets you open the fullscreen editor.

### Structure

| File | Purpose |
|---|---|
| `src/geometry.js` | Vector and polygon helpers |
| `src/palette.js` | Color scales and legend gradients |
| `src/model.js` | Data model, defaults, automatic wall classification |
| `src/solver.js` | Grid construction and diffusion solver |
| `src/isotherms.js` | Marching squares for equal-temperature lines |
| `src/renderer.js` | Drawing the field, walls, doors in the top-down view |
| `src/projection.js` | Axonometric projection for the 2.5D view |
| `src/scene3d.js` | Building volumes from the floor plan and their rendering |
| `src/card.js` | The Lovelace card |
| `src/editor.js` | The config dialog form |
| `src/plan-editor.js` | Fullscreen floor plan editor (SVG) |

## License

MIT
