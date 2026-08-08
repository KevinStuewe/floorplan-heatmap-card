/* ------------------------------------------------------------------ *
 * projection.js — axonometrische 2,5D-Projektion.
 *
 * Zwei Winkel steuern die Ansicht:
 *   yaw    Drehung um die Hochachse — man läuft um das Modell herum
 *   pitch  Höhenwinkel: 90° = senkrecht von oben, kleiner = flacher
 *
 * Bewusst eine PARALLELE Projektion, keine perspektivische. Der Grund
 * ist nicht nur Geschmack: die Abbildung der Bodenebene (z = 0) ist
 * dadurch eine affine Transformation und lässt sich als 2×3-Matrix an
 * ctx.transform() übergeben. Die fertig gerechnete Heatmap kann also
 * unverändert als Bild auf den Boden gelegt werden. Eine perspektivische
 * Ansicht bräuchte eine Homographie, die Canvas 2D nicht beherrscht —
 * man müsste den Boden in Kacheln zerlegen und stückweise annähern.
 *
 * Bildschirmkoordinaten (y zeigt nach unten):
 *   rx =  (x−ox)·cos θ − (y−oy)·sin θ
 *   ry =  (x−ox)·sin θ + (y−oy)·cos θ
 *   sx =  rx
 *   sy =  ry·sin φ − z·cos φ
 *
 * Bei φ = 90° fällt der z-Term weg und es bleibt exakt die Draufsicht.
 * `ry` ist zugleich der Tiefenschlüssel: je größer, desto näher am
 * Betrachter — danach wird für den Maleralgorithmus sortiert.
 * ------------------------------------------------------------------ */

import { floorplanPoints } from './model.js';

export const DEG = Math.PI / 180;

/** Flacher als das wird die Bodenmatrix singulär und nicht mehr umkehrbar. */
export const MIN_PITCH_DEG = 12;
export const MAX_PITCH_DEG = 90;

export function clampPitch(deg) {
  return Math.min(MAX_PITCH_DEG, Math.max(MIN_PITCH_DEG, deg));
}

function rawExtent({ floorplan, yaw, pitch, wallHeight }) {
  const points = floorplanPoints(floorplan);
  if (!points.length) points.push([0, 0], [100, 100]);

  let ox = 0, oy = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  ox = (minX + maxX) / 2;
  oy = (minY + maxY) / 2;

  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);

  let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
  // Ober- und Unterkante mitnehmen: die Wandkronen ragen nach oben aus
  // dem Grundriss heraus und gehören mit ins Bild.
  for (const [x, y] of points) {
    const rx = (x - ox) * cy - (y - oy) * sy;
    const ry = (x - ox) * sy + (y - oy) * cy;
    for (const z of [0, wallHeight]) {
      const py = ry * sp - z * cp;
      if (rx < pMinX) pMinX = rx;
      if (rx > pMaxX) pMaxX = rx;
      if (py < pMinY) pMinY = py;
      if (py > pMaxY) pMaxY = py;
    }
  }

  return {
    ox, oy, cy, sy, sp, cp,
    minX: pMinX, minY: pMinY,
    width: Math.max(1, pMaxX - pMinX),
    height: Math.max(1, pMaxY - pMinY),
  };
}

/** Seitenverhältnis der projizierten Szene — für die Höhe der Bühne. */
export function projectedAspect(options) {
  const extent = rawExtent(options);
  return extent.width / extent.height;
}

/**
 * @param {object} options floorplan, yaw/pitch (Bogenmaß), wallHeight, width, height, padding
 */
export function createProjection(options) {
  const { width, height, padding = 8 } = options;
  const e = rawExtent(options);

  const availW = Math.max(1, width - padding * 2);
  const availH = Math.max(1, height - padding * 2);
  const scale = Math.min(availW / e.width, availH / e.height);
  const tx = padding + (availW - e.width * scale) / 2 - e.minX * scale;
  const ty = padding + (availH - e.height * scale) / 2 - e.minY * scale;

  const { ox, oy, cy, sy, sp, cp } = e;

  const project = (x, y, z = 0) => {
    const rx = (x - ox) * cy - (y - oy) * sy;
    const ry = (x - ox) * sy + (y - oy) * cy;
    return {
      x: rx * scale + tx,
      y: (ry * sp - z * cp) * scale + ty,
      depth: ry,
    };
  };

  // Affine Matrix der Bodenebene für ctx.transform(a, b, c, d, e, f):
  //   sx = a·x + c·y + e     sy = b·x + d·y + f
  const a = cy * scale;
  const b = sy * sp * scale;
  const c = -sy * scale;
  const d = cy * sp * scale;
  const matE = tx - (ox * cy - oy * sy) * scale;
  const matF = ty - (ox * sy + oy * cy) * sp * scale;
  const det = a * d - b * c;

  return {
    scale,
    // Wie stark die Bodenebene gestaucht erscheint: 1 = Draufsicht,
    // gegen 0 = fast waagrechter Blick. Kreise auf dem Boden werden
    // damit zu Ellipsen.
    flatness: sp,
    project,
    depthOf: (x, y) => (x - ox) * sy + (y - oy) * cy,
    floorMatrix: [a, b, c, d, matE, matF],
    floorPoint: (x, y) => [a * x + c * y + matE, b * x + d * y + matF],
    /** Bildschirmpunkt zurück auf die Bodenebene — für den Hover-Wert. */
    unprojectFloor: (sx, sy2) => {
      if (Math.abs(det) < 1e-9) return null;
      const px = sx - matE, py = sy2 - matF;
      return { x: (d * px - c * py) / det, y: (-b * px + a * py) / det };
    },
  };
}
