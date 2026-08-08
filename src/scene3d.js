/* ------------------------------------------------------------------ *
 * scene3d.js — renders the 2.5D view.
 *
 * Ordering and occlusion come from the painter's algorithm: all wall
 * faces are collected, sorted by depth, and drawn back to front. A
 * z-buffer isn't needed because every wall piece is a convex box — its
 * back faces are inevitably covered by its own front faces, with no
 * backface culling required.
 *
 * Doors and windows aren't painted-on symbols but absent geometry: a
 * door leaves out the wall box there and places only a lintel above it,
 * a window gets a sill, a lintel, and a translucent pane in between.
 * ------------------------------------------------------------------ */

import { buildWalls } from './model.js';
import { wallGaps, wallCovers } from './renderer.js';
import { polygonCentroid } from './geometry.js';

/** Component dimensions in meters. */
export const GEOMETRY = {
  thicknessExterior: 0.24,
  thicknessInterior: 0.12,
  doorHeight: 2.0,
  windowSill: 0.9,
  windowHead: 2.1,
  sensorHeight: 1.3,
};

/** Direction the model is lit from (top left). */
const LIGHT = [-0.55, -0.835];

const shadeRgb = (rgb, factor) =>
  `rgb(${Math.round(rgb[0] * factor)}, ${Math.round(rgb[1] * factor)}, ${Math.round(rgb[2] * factor)})`;

/**
 * The five visible faces of a wall box (the floor is omitted — nobody
 * looks underneath it from above).
 */
function boxFaces(x1, y1, x2, y2, halfT, z0, z1) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  const ux = dx / len, uy = dy / len;
  const nx = uy * halfT, ny = -ux * halfT;

  const a1 = [x1 + nx, y1 + ny], a2 = [x2 + nx, y2 + ny];
  const b1 = [x1 - nx, y1 - ny], b2 = [x2 - nx, y2 - ny];
  const at = (p, z) => [p[0], p[1], z];

  return [
    { pts: [at(a1, z1), at(a2, z1), at(b2, z1), at(b1, z1)], top: true },
    { pts: [at(a1, z0), at(a2, z0), at(a2, z1), at(a1, z1)], normal: [uy, -ux] },
    { pts: [at(b2, z0), at(b1, z0), at(b1, z1), at(b2, z1)], normal: [-uy, ux] },
    { pts: [at(b1, z0), at(a1, z0), at(a1, z1), at(b1, z1)], normal: [-ux, -uy] },
    { pts: [at(a2, z0), at(b2, z0), at(b2, z1), at(a2, z1)], normal: [ux, uy] },
  ];
}

/**
 * Builds the floor plan's solid bodies: per wall, the boxes left over
 * after subtracting the openings, plus the window panes.
 *
 * Deliberately free of drawing concerns and in floor-plan coordinates —
 * so the actually tricky logic (what's left of a wall with a door?) can
 * be tested without a canvas.
 *
 * @returns {{x1,y1,x2,y2,z0,z1,halfT,exterior,glass}[]}
 */
export function wallSolids(floorplan, opts) {
  const { pxPerMeter, wallHeight } = opts;
  const height = wallHeight * pxPerMeter;
  const doorHeight = GEOMETRY.doorHeight * pxPerMeter;
  const sill = Math.min(GEOMETRY.windowSill * pxPerMeter, height);
  const head = Math.min(GEOMETRY.windowHead * pxPerMeter, height);
  const tol = Math.max(6, pxPerMeter * 0.16);
  const openings = floorplan.openings || [];

  const solids = [];
  for (const wall of buildWalls(floorplan)) {
    const exterior = wall.type === 'exterior';
    const halfT = ((exterior ? GEOMETRY.thicknessExterior : GEOMETRY.thicknessInterior) * pxPerMeter) / 2;
    const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;

    const add = (t0, t1, z0, z1, glass = false) => {
      if (z1 - z0 < 1 || t1 - t0 < 1e-6) return;
      solids.push({
        x1: wall.x1 + dx * t0, y1: wall.y1 + dy * t0,
        x2: wall.x1 + dx * t1, y2: wall.y1 + dy * t1,
        z0, z1, halfT, exterior, glass,
      });
    };

    for (const [t0, t1] of wallGaps(wall, openings, tol)) add(t0, t1, 0, height);

    for (const { t0, t1, opening } of wallCovers(wall, openings, tol)) {
      if (opening.type === 'passage') continue;
      if (opening.type === 'door') {
        add(t0, t1, doorHeight, height); // only the lintel remains standing
        continue;
      }
      add(t0, t1, 0, sill);        // sill
      add(t0, t1, head, height);   // lintel
      add(t0, t1, sill, head, true); // pane
    }
  }
  return solids;
}

/**
 * @returns {{sensors: {x:number,y:number,floorX:number,floorY:number}[]}}
 *          Screen positions of the sensors, so the card can overlay
 *          their chips on top.
 */
export function renderScene(ctx, params) {
  const {
    floorplan, field, isotherms, projection, buffer,
    clipPath, opacity, pxPerMeter, wallHeight,
    showWalls, showRoomLabels, colors,
  } = params;

  const sensorZ = GEOMETRY.sensorHeight * pxPerMeter;

  /* --- Floor: heatmap as an affinely transformed image ---------------- */
  if (field && buffer) {
    const cs = field.opts.cellSize;
    ctx.save();
    ctx.transform(...projection.floorMatrix);
    if (clipPath) ctx.clip(clipPath);
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      buffer,
      field.bounds.minX + cs * 0.5,
      field.bounds.minY + cs * 0.5,
      field.cols * cs,
      field.rows * cs
    );
    ctx.restore();
  }

  /* --- Isotherms: project points individually so the line width
         isn't distorted along with them ----------------------------------------- */
  if (isotherms && isotherms.length) {
    ctx.save();
    ctx.beginPath();
    for (const band of isotherms) {
      for (const [x1, y1, x2, y2] of band.segments) {
        const p1 = projection.floorPoint(x1, y1);
        const p2 = projection.floorPoint(x2, y2);
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
      }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.isotherm;
    ctx.stroke();
    ctx.restore();
  }

  /* --- Room names sit on the floor and may be covered by nearby walls,
         hence drawn before the walls ------------------------ */
  if (showRoomLabels) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.max(10, Math.min(15, 13 * projection.scale))}px system-ui, sans-serif`;
    for (const room of floorplan.rooms) {
      const [cx, cy] = polygonCentroid(room.points);
      const p = projection.floorPoint(cx, cy);
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.labelHalo;
      ctx.strokeText(room.name, p[0], p[1]);
      ctx.fillStyle = colors.label;
      ctx.fillText(room.name, p[0], p[1]);
    }
    ctx.restore();
  }

  /* --- Walls ------------------------------------------------------- */
  if (showWalls) {
    const faces = [];
    for (const s of wallSolids(floorplan, { pxPerMeter, wallHeight })) {
      const base = s.exterior ? colors.wallExterior : colors.wallInterior;
      if (s.glass) {
        faces.push({
          face: {
            pts: [
              [s.x1, s.y1, s.z0], [s.x2, s.y2, s.z0],
              [s.x2, s.y2, s.z1], [s.x1, s.y1, s.z1],
            ],
          },
          base,
          glass: true,
        });
        continue;
      }
      for (const face of boxFaces(s.x1, s.y1, s.x2, s.y2, s.halfT, s.z0, s.z1)) {
        faces.push({ face, base, glass: false });
      }
    }

    // Project, average the depth, sort back to front.
    const drawables = faces.map(({ face, base, glass }) => {
      let depth = 0;
      const points = face.pts.map(([x, y, z]) => {
        const p = projection.project(x, y, z);
        depth += p.depth;
        return p;
      });
      return { points, depth: depth / points.length, face, base, glass };
    });
    drawables.sort((a, b) => a.depth - b.depth);

    ctx.save();
    ctx.lineJoin = 'round';
    for (const item of drawables) {
      ctx.beginPath();
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) ctx.lineTo(item.points[i].x, item.points[i].y);
      ctx.closePath();

      if (item.glass) {
        ctx.fillStyle = colors.glass;
        ctx.fill();
        ctx.strokeStyle = colors.glassEdge;
        ctx.lineWidth = 1;
        ctx.stroke();
        continue;
      }

      const f = item.face;
      let factor = 1;
      if (!f.top) {
        const dot = f.normal ? f.normal[0] * LIGHT[0] + f.normal[1] * LIGHT[1] : 0;
        factor = 0.6 + 0.32 * Math.max(0, dot);
      }
      ctx.fillStyle = shadeRgb(item.base, factor);
      ctx.fill();
      ctx.strokeStyle = shadeRgb(item.base, factor * 0.78);
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* --- Sensors: base on the floor, mast up to measurement height.
         Deliberately drawn last and without depth testing — you should
         always see your own measurement points, even behind a wall. ------------------ */
  const sensorPoints = [];
  ctx.save();
  for (const s of floorplan.sensors) {
    const floor = projection.project(s.x, s.y, 0);
    const head = projection.project(s.x, s.y, sensorZ);
    sensorPoints.push({ x: head.x, y: head.y, floorX: floor.x, floorY: floor.y });

    if (Math.abs(head.y - floor.y) > 1.5) {
      ctx.beginPath();
      ctx.moveTo(floor.x, floor.y);
      ctx.lineTo(head.x, head.y);
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(floor.x, floor.y, 4.5, Math.max(1.2, 4.5 * projection.flatness), 0, 0, Math.PI * 2);
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();

  return { sensors: sensorPoints };
}
