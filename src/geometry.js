/* ------------------------------------------------------------------ *
 * geometry.js — kleine Vektor-/Polygon-Helfer.
 * Alle Koordinaten sind "Grundriss-Pixel" (siehe model.js).
 * ------------------------------------------------------------------ */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Vorzeichenbehaftete Fläche; > 0 = gegen den Uhrzeigersinn (bei y-nach-unten: im Uhrzeigersinn). */
export function polygonArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  }
  return a / 2;
}

export function polygonCentroid(pts) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const cross = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    a += cross;
    cx += (pts[j][0] + pts[i][0]) * cross;
    cy += (pts[j][1] + pts[i][1]) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    // Entartetes Polygon: einfacher Mittelwert.
    const n = pts.length || 1;
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (6 * a), cy / (6 * a)];
}

/**
 * Schnittparameter zweier Strecken A→B und C→D.
 * Liefert { t, u, x, y } mit P = A + t·(B−A) = C + u·(D−C), sonst null.
 * Parallele Strecken gelten als schnittfrei.
 *
 * `eps` weitet den zulässigen Bereich beidseitig auf [−eps, 1+eps]. Der
 * Solver braucht das, um Treffer exakt am Streckenende noch zu sehen und
 * sie dann selbst eindeutig einer Seite zuzuordnen.
 */
export function segIntersectParams(ax, ay, bx, by, cx, cy, dx, dy, eps = 0) {
  const r1x = bx - ax, r1y = by - ay;
  const r2x = dx - cx, r2y = dy - cy;
  const denom = r1x * r2y - r1y * r2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((cx - ax) * r2y - (cy - ay) * r2x) / denom;
  const u = ((cx - ax) * r1y - (cy - ay) * r1x) / denom;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return { t, u, x: ax + t * r1x, y: ay + t * r1y };
}

export function segIntersects(ax, ay, bx, by, cx, cy, dx, dy) {
  return segIntersectParams(ax, ay, bx, by, cx, cy, dx, dy) !== null;
}

export function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const cx = x2 - x1, cy = y2 - y1;
  const lenSq = cx * cx + cy * cy;
  let t = lenSq > 0 ? ((px - x1) * cx + (py - y1) * cy) / lenSq : 0;
  t = clamp(t, 0, 1);
  return { x: x1 + t * cx, y: y1 + t * cy, t };
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const c = closestPointOnSegment(px, py, x1, y1, x2, y2);
  return Math.hypot(px - c.x, py - c.y);
}

export function bboxOfPoints(points, pad = 0) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, w: 1, h: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    const x = Array.isArray(p) ? p[0] : p.x;
    const y = Array.isArray(p) ? p[1] : p.y;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

/** Rastet einen Winkel auf 0°/90°/180°/270° ein, wenn er nah genug dran liegt. */
export function axisSnap(x1, y1, x2, y2, toleranceDeg = 6) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: x2, y: y2, snapped: false };
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  for (const target of [0, 90, -90, 180, -180]) {
    let diff = Math.abs(angle - target);
    if (diff > 180) diff = 360 - diff;
    if (diff <= toleranceDeg) {
      const rad = (target * Math.PI) / 180;
      return { x: x1 + Math.cos(rad) * len, y: y1 + Math.sin(rad) * len, snapped: true };
    }
  }
  return { x: x2, y: y2, snapped: false };
}
