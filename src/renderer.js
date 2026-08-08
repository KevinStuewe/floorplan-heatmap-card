/* ------------------------------------------------------------------ *
 * renderer.js — zeichnet Feld und Grundriss auf ein Canvas.
 *
 * Das Feld wird in Gitterauflösung in eine ImageData geschrieben und
 * dann hochskaliert — aber vorher auf die Raumpolygone geclippt. Ohne
 * dieses Clipping "blutet" die Heatmap über die Außenwände hinaus, was
 * im alten Demo-Stand der auffälligste Makel war.
 * ------------------------------------------------------------------ */

import { paletteLUT } from './palette.js';
import { clamp, polygonCentroid, closestPointOnSegment } from './geometry.js';
import { buildWalls } from './model.js';

/** Abbildung Grundriss-Koordinaten → Canvas-Koordinaten (einpassend, seitenverhältnistreu). */
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
 * Färbt das gelöste Feld in ein Canvas in Gitterauflösung.
 *
 * Eigene Funktion, damit die Karte das Ergebnis zwischenspeichern kann:
 * beim Drehen der 2,5D-Ansicht ändert sich nur die Projektion, nicht das
 * Feld — dann wäre es Verschwendung, die Farben jedes Mal neu zu rechnen.
 */
export function heatmapBuffer(doc, field, opts) {
  const { cols, rows, inside, T, reach } = field;
  const lut = paletteLUT(opts.palette);
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

/** Feld als Farbfläche in der flachen Draufsicht. */
export function renderField(ctx, field, view, opts) {
  const { cols, rows } = field;
  const buffer = opts.buffer || heatmapBuffer(ctx.canvas.ownerDocument, field, opts);
  const cs = field.opts.cellSize;
  // Die ImageData-Pixel sind Zellmittelpunkte; das halbe Zellmaß Versatz
  // sorgt dafür, dass die Interpolation nicht um eine halbe Zelle wandert.
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
 * Ordnet einer Wand die Öffnungen zu, die auf ihr liegen, und gibt deren
 * Abschnitte als Parameter t ∈ [0, 1] entlang der Wand zurück.
 *
 * Die Zuordnung ist rein geometrisch — Öffnungen kennen ihre Wand nicht.
 * Das ist Absicht: liegen zwei Raumkanten aufeinander, öffnet eine
 * einzelne Tür so beide, ohne dass sie doppelt gepflegt werden müsste.
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

/** Die Abschnitte einer Wand, die KEINE Öffnung bedeckt. */
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
    const dxp = wall.x2 - wall.x1, dyp = wall.y2 - wall.y1;
    for (const [t0, t1] of wallGaps(wall, openings, Math.max(6, 8 / view.scale))) {
      ctx.beginPath();
      ctx.moveTo(view.toX(wall.x1 + dxp * t0), view.toY(wall.y1 + dyp * t0));
      ctx.lineTo(view.toX(wall.x1 + dxp * t1), view.toY(wall.y1 + dyp * t1));
      ctx.stroke();
    }
  }

  // Öffnungen: Fenster als dünne durchgehende Linie, Türen als Schwelle
  // mit angedeutetem Türblatt, Durchgänge bleiben leer.
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
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      const radius = Math.hypot(bx - ax, by - ay);
      const start = Math.atan2(by - ay, bx - ax);
      ctx.arc(ax, ay, radius, start, start - Math.PI / 2, true);
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
