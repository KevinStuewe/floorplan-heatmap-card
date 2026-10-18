/* ------------------------------------------------------------------ *
 * renderer.js — draws the field and floor plan onto a canvas.
 *
 * The field is written into an ImageData at grid resolution and then
 * scaled up — but clipped to the room polygons first. Without this
 * clipping, the heatmap "bleeds" past the exterior walls, which was the
 * most noticeable flaw in the old demo state.
 * ------------------------------------------------------------------ */

import { paletteLUT } from './palette.js';
import { clamp, polygonCentroid, closestPointOnSegment } from './geometry.js';
import { buildWalls } from './model.js';

/** Mapping floor-plan coordinates → canvas coordinates (fit, aspect-ratio preserving). */
export function computeView(bounds, width, height, padding = 8) {
  const availW = Math.max(1, width - padding * 2);
  const availH = Math.max(1, height - padding * 2);
  const scale = Math.min(availW / bounds.w, availH / bounds.h);
  const offsetX = padding + (availW - bounds.w * scale) / 2 - bounds.minX * scale;
  const offsetY = padding + (availH - bounds.h * scale) / 2 - bounds.minY * scale;
  return {
    scale,
    offsetX,
    offsetY,
    toX: (x) => x * scale + offsetX,
    toY: (y) => y * scale + offsetY,
    fromX: (px) => (px - offsetX) / scale,
    fromY: (py) => (py - offsetY) / scale,
  };
}

export function roomsPath(rooms, view) {
  const path = new Path2D();
  for (const room of rooms) {
    const pts = room.points;
    if (pts.length < 3) continue;
    path.moveTo(view.toX(pts[0][0]), view.toY(pts[0][1]));
    for (let i = 1; i < pts.length; i++) path.lineTo(view.toX(pts[i][0]), view.toY(pts[i][1]));
    path.closePath();
  }
  return path;
}

/**
 * Colors the solved field into a canvas at grid resolution.
 *
 * A separate function so the card can cache the result: rotating the
 * 2.5D view only changes the projection, not the field — recomputing
 * the colors every time would be wasteful.
 */
export function heatmapBuffer(doc, field, opts) {
  const { cols, rows, inside, T, reach } = field;
  const lut = paletteLUT(opts.palette, opts.paletteStops);
  const min = opts.min;
  const span = Math.max(1e-6, opts.max - opts.min);

  const buffer = doc.createElement('canvas');
  buffer.width = cols;
  buffer.height = rows;
  const bctx = buffer.getContext('2d');
  const img = bctx.createImageData(cols, rows);
  const data = img.data;

  for (let i = 0; i < cols * rows; i++) {
    const p = i * 4;
    if (!inside[i] || (reach && !reach[i])) { data[p + 3] = 0; continue; }
    const ratio = clamp((T[i] - min) / span, 0, 1);
    const l = (ratio * 255) | 0;
    data[p] = lut[l * 4];
    data[p + 1] = lut[l * 4 + 1];
    data[p + 2] = lut[l * 4 + 2];
    data[p + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  return buffer;
}

/** Field as a colored surface in the flat top-down view. */
export function renderField(ctx, field, view, opts) {
  const { cols, rows } = field;
  const buffer = opts.buffer || heatmapBuffer(ctx.canvas.ownerDocument, field, opts);
  const cs = field.opts.cellSize;
  // The ImageData pixels are cell centers; the half-cell-size offset
  // ensures the interpolation doesn't drift by half a cell.
  const dx = view.toX(field.bounds.minX + cs * 0.5);
  const dy = view.toY(field.bounds.minY + cs * 0.5);
  const dw = cols * cs * view.scale;
  const dh = rows * cs * view.scale;

  ctx.save();
  if (opts.clipPath) ctx.clip(opts.clipPath);
  ctx.globalAlpha = opts.opacity;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(buffer, dx, dy, dw, dh);
  ctx.restore();
}

export function renderIsotherms(ctx, isotherms, view, opts) {
  if (!isotherms.length) return;
  ctx.save();
  if (opts.clipPath) ctx.clip(opts.clipPath);
  ctx.lineWidth = 1;
  ctx.strokeStyle = opts.color || 'rgba(255,255,255,0.35)';
  const path = new Path2D();
  for (const band of isotherms) {
    for (const [x1, y1, x2, y2] of band.segments) {
      path.moveTo(view.toX(x1), view.toY(y1));
      path.lineTo(view.toX(x2), view.toY(y2));
    }
  }
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Assigns to a wall the openings that lie on it, and returns their
 * sections as parameter t ∈ [0, 1] along the wall.
 *
 * The assignment is purely geometric — openings don't know their wall.
 * That's intentional: if two room edges coincide, a single door opens
 * both without needing to be maintained twice.
 */
export function wallCovers(wall, openings, tol = 8) {
  const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  const wallAngle = Math.atan2(dy, dx);
  const covers = [];

  for (const o of openings || []) {
    let da = Math.abs(((o.angle - wallAngle) * 180) / Math.PI) % 180;
    if (da > 90) da = 180 - da;
    if (da > 15) continue;

    const near = closestPointOnSegment(o.x, o.y, wall.x1, wall.y1, wall.x2, wall.y2);
    if (Math.hypot(o.x - near.x, o.y - near.y) > tol) continue;

    const hx = (Math.cos(o.angle) * o.width) / 2;
    const hy = (Math.sin(o.angle) * o.width) / 2;
    const t1 = ((o.x - hx - wall.x1) * dx + (o.y - hy - wall.y1) * dy) / (len * len);
    const t2 = ((o.x + hx - wall.x1) * dx + (o.y + hy - wall.y1) * dy) / (len * len);
    const a = clamp(Math.min(t1, t2), 0, 1);
    const b = clamp(Math.max(t1, t2), 0, 1);
    if (b - a > 1e-4) covers.push({ t0: a, t1: b, opening: o });
  }

  covers.sort((p, q) => p.t0 - q.t0);
  return covers;
}

/**
 * A door's leaf geometry: the hinge point, the closed-leaf endpoint
 * (across the opening, at wall level), and the open-leaf endpoint (a
 * quarter turn from the hinge). All in floor-plan coordinates.
 *
 * `flip_hinge` swaps which end of the opening the hinge sits at.
 * `flip_swing` mirrors which side of the wall the leaf swings into —
 * defined relative to the wall's own angle, not the hinge, so a real
 * door keeps opening into the same room when only the hinge is flipped.
 */
export function doorSwingGeometry(o) {
  const hx = (Math.cos(o.angle) * o.width) / 2;
  const hy = (Math.sin(o.angle) * o.width) / 2;
  const p1 = { x: o.x - hx, y: o.y - hy };
  const p2 = { x: o.x + hx, y: o.y + hy };
  const hinge = o.flip_hinge ? p2 : p1;
  const close = o.flip_hinge ? p1 : p2;
  const perp = o.angle + (o.flip_swing ? Math.PI / 2 : -Math.PI / 2);
  const open = { x: hinge.x + Math.cos(perp) * o.width, y: hinge.y + Math.sin(perp) * o.width };
  const start = Math.atan2(close.y - hinge.y, close.x - hinge.x);
  let end = Math.atan2(open.y - hinge.y, open.x - hinge.x);
  // atan2 alone could pick the long way around (270°) instead of the
  // true 90° turn — pull it back within one turn of start.
  while (end - start > Math.PI) end -= 2 * Math.PI;
  while (end - start < -Math.PI) end += 2 * Math.PI;
  return { hinge, close, open, start, end, radius: o.width, anticlockwise: end < start };
}

/** The sections of a wall that are NOT covered by an opening. */
export function wallGaps(wall, openings, tol = 8) {
  const covers = wallCovers(wall, openings, tol);
  if (!covers.length) {
    return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) < 1e-6 ? [] : [[0, 1]];
  }
  const gaps = [];
  let cursor = 0;
  for (const { t0, t1 } of covers) {
    if (t0 > cursor) gaps.push([cursor, t0]);
    cursor = Math.max(cursor, t1);
  }
  if (cursor < 1) gaps.push([cursor, 1]);
  return gaps;
}

export function renderFloorplan(ctx, fp, view, opts) {
  const walls = opts.walls || buildWalls(fp);
  const wallColor = opts.wallColor || '#2c3440';
  const openings = fp.openings || [];

  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = wallColor;

  for (const wall of walls) {
    ctx.lineWidth = Math.max(2, (wall.type === 'exterior' ? 7 : 4.5) * view.scale);
    const half = ctx.lineWidth / 2;
    const dxp = wall.x2 - wall.x1, dyp = wall.y2 - wall.y1;
    for (const [t0, t1] of wallGaps(wall, openings, Math.max(6, 8 / view.scale))) {
      let ax = view.toX(wall.x1 + dxp * t0), ay = view.toY(wall.y1 + dyp * t0);
      let bx = view.toX(wall.x1 + dxp * t1), by = view.toY(wall.y1 + dyp * t1);
      // Square off only the ends that are real room-polygon corners (t=0/1),
      // not ends cut by an opening — otherwise adjoining walls leave a
      // notch at the joint (butt caps don't fill a right-angle corner).
      const segLen = Math.hypot(bx - ax, by - ay);
      if (segLen > 1e-6) {
        const nx = (bx - ax) / segLen, ny = (by - ay) / segLen;
        if (t0 <= 1e-9) { ax -= nx * half; ay -= ny * half; }
        if (t1 >= 1 - 1e-9) { bx += nx * half; by += ny * half; }
      }
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }

  // Openings: windows as a thin continuous line, doors as a threshold
  // with an indicated door leaf, passages stay empty.
  for (const o of openings) {
    const hx = (Math.cos(o.angle) * o.width) / 2;
    const hy = (Math.sin(o.angle) * o.width) / 2;
    const ax = view.toX(o.x - hx), ay = view.toY(o.y - hy);
    const bx = view.toX(o.x + hx), by = view.toY(o.y + hy);

    if (o.type === 'window') {
      ctx.lineWidth = Math.max(1.5, 2.5 * view.scale);
      ctx.strokeStyle = opts.windowColor || '#6aa9ff';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    } else if (o.type === 'door') {
      ctx.lineWidth = Math.max(1, 1.5 * view.scale);
      ctx.strokeStyle = opts.doorColor || 'rgba(140,150,165,0.9)';
      const g = doorSwingGeometry(o);
      const hpx = view.toX(g.hinge.x), hpy = view.toY(g.hinge.y);
      ctx.beginPath();
      ctx.moveTo(hpx, hpy);
      ctx.arc(hpx, hpy, g.radius * view.scale, g.start, g.end, g.anticlockwise);
      ctx.stroke();
    }
  }
  ctx.restore();

  if (opts.showRoomLabels) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.max(10, Math.min(15, 13 * view.scale))}px var(--fh-font, system-ui, sans-serif)`;
    for (const room of fp.rooms) {
      const [cx, cy] = polygonCentroid(room.points);
      const x = view.toX(cx), y = view.toY(cy);
      ctx.lineWidth = 3;
      ctx.strokeStyle = opts.labelHalo || 'rgba(0,0,0,0.45)';
      ctx.strokeText(room.name, x, y);
      ctx.fillStyle = opts.labelColor || '#ffffff';
      ctx.fillText(room.name, x, y);
    }
    ctx.restore();
  }
}
