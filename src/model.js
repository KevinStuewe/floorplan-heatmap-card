/* ------------------------------------------------------------------ *
 * model.js — Data model, defaults, and derivations from the floor plan.
 *
 * The floor plan consists of four object types:
 *
 *   rooms     Polygons. Their edges ARE walls — you don't draw an
 *             outline twice. Whether an edge is an exterior or interior
 *             wall is determined automatically (see buildWalls).
 *   walls     Freestanding wall segments for dividers that don't bound
 *             a room (room divider, alcove, closet wall).
 *   openings  Doors, passages, and windows. Deliberately STANDALONE
 *             geometry (center + angle + width) instead of attached to
 *             a specific wall: if two room edges coincide, a door
 *             automatically opens both.
 *   sensors   Measurement points with an HA entity.
 *
 * Coordinates are abstract "floor plan pixels". px_per_meter translates
 * them into meters — relevant only for labels and sensor radii, the
 * field itself is scale-free.
 * ------------------------------------------------------------------ */

import { pointInPolygon, polygonArea, bboxOfPoints } from './geometry.js';

export const DEFAULTS = {
  title: '',
  unit: '°C',
  min: 18,
  max: 26,
  auto_range: false,
  palette: 'coolwarm',
  opacity: 0.85,
  cell_size: 8,
  sensor_radius: 0.4,
  show_isotherms: true,
  isotherm_step: 0.5,
  show_room_labels: true,
  show_values: true,
  show_legend: true,
  show_walls: true,
  px_per_meter: 50,
  background: '',
  background_opacity: 0.25,
  aspect_ratio: '',

  // 2.5D view
  view_mode: 'flat',   // 'flat' = top-down view, 'tilted' = raised walls
  yaw: -22,            // degrees, rotation around the vertical axis
  pitch: 58,           // degrees of elevation angle; 90 = straight down from above
  wall_height: 2.5,    // meters
};

export const VIEW_MODES = ['flat', 'tilted'];

/** Transmittance 0…1 per building component. 1 = free air, 0 = perfect insulation. */
export const DEFAULT_TRANSMITTANCE = {
  exterior: 0.02,
  interior: 0.12,
  door: 0.5,
  passage: 1.0,
  window: 0.08,
};

export const OPENING_TYPES = ['passage', 'door', 'window'];
export const WALL_TYPES = ['interior', 'exterior'];

let uidCounter = 0;
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36).slice(-4)}${uidCounter.toString(36)}`;
}

export function emptyFloorplan() {
  return { rooms: [], walls: [], openings: [], sensors: [] };
}

/** Fills in missing fields and repairs old/incomplete configs. */
export function normalizeConfig(raw) {
  const config = { ...DEFAULTS, ...(raw || {}) };
  const fp = { ...emptyFloorplan(), ...(raw && raw.floorplan ? raw.floorplan : {}) };

  fp.rooms = (fp.rooms || [])
    .map((r) => ({
      id: r.id || uid('r'),
      name: r.name || 'Raum',
      points: (r.points || []).map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]),
    }))
    .filter((r) => r.points.length >= 3);

  fp.walls = (fp.walls || []).map((w) => ({
    id: w.id || uid('w'),
    x1: Number(w.x1) || 0,
    y1: Number(w.y1) || 0,
    x2: Number(w.x2) || 0,
    y2: Number(w.y2) || 0,
    type: WALL_TYPES.includes(w.type) ? w.type : 'interior',
  }));

  fp.openings = (fp.openings || []).map((o) => ({
    id: o.id || uid('o'),
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    angle: Number(o.angle) || 0,
    width: Math.max(4, Number(o.width) || 45),
    type: OPENING_TYPES.includes(o.type) ? o.type : 'door',
    // Door swing only — which end of the opening is the hinge, and
    // which side of the wall the leaf swings into. Purely cosmetic,
    // the solver treats an opening the same regardless.
    flip_hinge: Boolean(o.flip_hinge),
    flip_swing: Boolean(o.flip_swing),
  }));

  fp.sensors = (fp.sensors || []).map((s) => ({
    id: s.id || uid('s'),
    x: Number(s.x) || 0,
    y: Number(s.y) || 0,
    entity: s.entity || s.entity_id || '',
    name: s.name || s.label || '',
  }));

  config.floorplan = fp;
  config.transmittance = { ...DEFAULT_TRANSMITTANCE, ...(raw && raw.transmittance ? raw.transmittance : {}) };
  config.cell_size = Math.max(2, Number(config.cell_size) || DEFAULTS.cell_size);
  config.px_per_meter = Math.max(1, Number(config.px_per_meter) || DEFAULTS.px_per_meter);

  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  config.view_mode = VIEW_MODES.includes(config.view_mode) ? config.view_mode : DEFAULTS.view_mode;
  config.yaw = num(config.yaw, DEFAULTS.yaw);
  // Below ~12° the floor plane becomes so flat that its matrix is no
  // longer invertible — hover values could then no longer be resolved.
  config.pitch = Math.min(90, Math.max(12, num(config.pitch, DEFAULTS.pitch)));
  config.wall_height = Math.min(8, Math.max(0.5, num(config.wall_height, DEFAULTS.wall_height)));
  return config;
}

/** All points of the floor plan — for bounding box and auto-fit. */
export function floorplanPoints(fp) {
  const pts = [];
  for (const room of fp.rooms) pts.push(...room.points);
  for (const wall of fp.walls) pts.push([wall.x1, wall.y1], [wall.x2, wall.y2]);
  for (const s of fp.sensors) pts.push([s.x, s.y]);
  return pts;
}

export function floorplanBounds(fp, pad = 20) {
  return bboxOfPoints(floorplanPoints(fp), pad);
}

export function isEmptyFloorplan(fp) {
  return !fp || (!fp.rooms.length && !fp.walls.length);
}

/**
 * Builds the effective wall list: every room edge plus every freestanding wall.
 *
 * Room edges are classified automatically: if the point just outside the
 * edge (along the outward normal) lies inside another room, it's an
 * interior wall — otherwise an exterior wall. This means you don't have
 * to think about wall types while drawing.
 *
 * Coincident edges (two rooms, exactly the same wall) are deduplicated so
 * the same wall doesn't dampen twice.
 */
export function buildWalls(fp) {
  const walls = [];
  const seen = new Set();
  const key = (x1, y1, x2, y2) => {
    const a = `${Math.round(x1)},${Math.round(y1)}`;
    const b = `${Math.round(x2)},${Math.round(y2)}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  };

  for (const room of fp.rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      const k = key(x1, y1, x2, y2);
      if (seen.has(k)) continue;
      seen.add(k);

      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const probe = 6;
      const nx = (dy / len) * probe;
      const ny = (-dx / len) * probe;
      // Probe both sides of the edge instead of relying on the polygon's
      // winding direction: rooms don't overlap, so only the outside can
      // land inside another room — and this works regardless of which
      // way the polygon was drawn.
      const neighbouring = fp.rooms.some(
        (other) =>
          other.id !== room.id &&
          (pointInPolygon(mx + nx, my + ny, other.points) ||
            pointInPolygon(mx - nx, my - ny, other.points))
      );

      walls.push({
        id: `${room.id}:${i}`,
        x1, y1, x2, y2,
        type: neighbouring ? 'interior' : 'exterior',
        roomId: room.id,
        edge: i,
      });
    }
  }

  for (const w of fp.walls) {
    const k = key(w.x1, w.y1, w.x2, w.y2);
    if (seen.has(k)) continue;
    seen.add(k);
    walls.push({ id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, type: w.type, free: true });
  }

  return walls;
}

/** Endpoints for snapping while drawing. */
export function snapCandidates(fp) {
  const pts = [];
  for (const room of fp.rooms) for (const p of room.points) pts.push({ x: p[0], y: p[1] });
  for (const w of fp.walls) pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
  return pts;
}

export function roomAreaSqm(room, pxPerMeter) {
  return Math.abs(polygonArea(room.points)) / (pxPerMeter * pxPerMeter);
}

/** Outer dimensions of a room (bounding rectangle) in meters. */
export function roomSizeMeters(room, pxPerMeter) {
  const b = bboxOfPoints(room.points);
  return {
    width: (b.maxX - b.minX) / pxPerMeter,
    height: (b.maxY - b.minY) / pxPerMeter,
  };
}

/**
 * Stretches a room polygon to the desired outer dimensions in floor plan pixels.
 *
 * The top-left corner stays fixed — so the room doesn't shift out from
 * under the cursor while typing a new length, and a neighboring room
 * attached at this corner stays flush. For non-rectangular rooms, the
 * whole polygon is scaled proportionally. Axes with no extent
 * (degenerate polygon) are left unchanged: nothing can be scaled from 0.
 */
export function resizeRoomPoints(points, widthPx, heightPx) {
  const b = bboxOfPoints(points);
  const spanX = b.maxX - b.minX;
  const spanY = b.maxY - b.minY;
  const sx = widthPx > 0 && spanX > 1e-6 ? widthPx / spanX : 1;
  const sy = heightPx > 0 && spanY > 1e-6 ? heightPx / spanY : 1;
  return points.map(([x, y]) => [b.minX + (x - b.minX) * sx, b.minY + (y - b.minY) * sy]);
}
