/* ------------------------------------------------------------------ *
 * projection.js — axonometric 2.5D projection.
 *
 * Two angles control the view:
 *   yaw    rotation around the vertical axis — walking around the model
 *   pitch  elevation angle: 90° = straight down, smaller = flatter
 *
 * Deliberately a PARALLEL projection, not a perspective one. The reason
 * isn't just taste: it makes the mapping of the floor plane (z = 0) an
 * affine transformation, expressible as a 2×3 matrix passed to
 * ctx.transform(). The pre-computed heatmap can then be stamped onto the
 * floor unmodified. A perspective view would need a homography, which
 * Canvas 2D doesn't support — the floor would have to be split into
 * tiles and approximated piecewise.
 *
 * Screen coordinates (y points down):
 *   rx =  (x−ox)·cos θ − (y−oy)·sin θ
 *   ry =  (x−ox)·sin θ + (y−oy)·cos θ
 *   sx =  rx
 *   sy =  ry·sin φ − z·cos φ
 *
 * At φ = 90° the z term drops out, leaving exactly the top-down view.
 * `ry` is also the depth key: the larger it is, the closer to the
 * viewer — used to sort for the painter's algorithm.
 * ------------------------------------------------------------------ */

import { floorplanPoints } from './model.js';

export const DEG = Math.PI / 180;

/** Below this, the floor matrix becomes singular and can no longer be inverted. */
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
  // Include the top and bottom edge: the wall tops rise above the
  // floor plan outline and need to be part of the image.
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

/** Aspect ratio of the projected scene — used for the stage height. */
export function projectedAspect(options) {
  const extent = rawExtent(options);
  return extent.width / extent.height;
}

/**
 * @param {object} options floorplan, yaw/pitch (radians), wallHeight, width, height, padding
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

  // Affine matrix of the floor plane for ctx.transform(a, b, c, d, e, f):
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
    // How strongly the floor plane appears compressed: 1 = top-down
    // view, toward 0 = nearly horizontal view. Circles on the floor
    // become ellipses as a result.
    flatness: sp,
    project,
    depthOf: (x, y) => (x - ox) * sy + (y - oy) * cy,
    floorMatrix: [a, b, c, d, matE, matF],
    floorPoint: (x, y) => [a * x + c * y + matE, b * x + d * y + matF],
    /** Screen point back onto the floor plane — for the hover value. */
    unprojectFloor: (sx, sy2) => {
      if (Math.abs(det) < 1e-9) return null;
      const px = sx - matE, py = sy2 - matF;
      return { x: (d * px - c * py) / det, y: (-b * px + a * py) / det };
    },
  };
}
