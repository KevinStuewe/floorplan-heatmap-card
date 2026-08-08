/* ------------------------------------------------------------------ *
 * scene3d.js — zeichnet die 2,5D-Ansicht.
 *
 * Reihenfolge und Verdeckung entstehen durch den Maleralgorithmus: alle
 * Wandflächen werden gesammelt, nach Tiefe sortiert und von hinten nach
 * vorn gezeichnet. Ein Z-Buffer ist nicht nötig, weil jedes Wandstück ein
 * konvexer Quader ist — dessen Rückseiten werden zwangsläufig von seinen
 * eigenen Vorderseiten überdeckt, ganz ohne Backface-Culling.
 *
 * Türen und Fenster sind keine aufgemalten Symbole, sondern fehlende
 * Geometrie: eine Tür lässt den Wandquader dort weg und setzt nur einen
 * Sturz darüber, ein Fenster bekommt Brüstung, Sturz und eine
 * durchscheinende Scheibe dazwischen.
 * ------------------------------------------------------------------ */

import { buildWalls } from './model.js';
import { wallGaps, wallCovers } from './renderer.js';
import { polygonCentroid } from './geometry.js';

/** Bauteilmaße in Metern. */
export const GEOMETRY = {
  thicknessExterior: 0.24,
  thicknessInterior: 0.12,
  doorHeight: 2.0,
  windowSill: 0.9,
  windowHead: 2.1,
  sensorHeight: 1.3,
};

/** Richtung, aus der das Modell beleuchtet wird (oben links). */
const LIGHT = [-0.55, -0.835];

const shadeRgb = (rgb, factor) =>
  `rgb(${Math.round(rgb[0] * factor)}, ${Math.round(rgb[1] * factor)}, ${Math.round(rgb[2] * factor)})`;

/**
 * Die fünf sichtbaren Flächen eines Wandquaders (der Boden entfällt —
 * von oben schaut niemand darunter).
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
 * Baut die Baukörper des Grundrisses: pro Wand die Quader, die nach Abzug
 * der Öffnungen übrig bleiben, plus die Glasscheiben der Fenster.
 *
 * Absichtlich frei von Zeichenkram und in Grundriss-Koordinaten — so ist
 * die eigentlich knifflige Logik (was bleibt von einer Wand mit Tür?)
 * ohne Canvas prüfbar.
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
        add(t0, t1, doorHeight, height); // nur der Sturz bleibt stehen
        continue;
      }
      add(t0, t1, 0, sill);        // Brüstung
      add(t0, t1, head, height);   // Sturz
      add(t0, t1, sill, head, true); // Scheibe
    }
  }
  return solids;
}

/**
 * @returns {{sensors: {x:number,y:number,floorX:number,floorY:number}[]}}
 *          Bildschirmpositionen der Sensoren, damit die Karte ihre Chips
 *          darüber legen kann.
 */
export function renderScene(ctx, params) {
  const {
    floorplan, field, isotherms, projection, buffer,
    clipPath, opacity, pxPerMeter, wallHeight,
    showWalls, showRoomLabels, colors,
  } = params;

  const sensorZ = GEOMETRY.sensorHeight * pxPerMeter;

  /* --- Boden: Heatmap als affin transformiertes Bild ---------------- */
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

  /* --- Isothermen: Punkte einzeln projizieren, damit die Strichstärke
         nicht mitverzerrt wird ----------------------------------------- */
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

  /* --- Raumnamen liegen auf dem Boden und dürfen von nahen Wänden
         verdeckt werden, deshalb vor den Wänden ------------------------ */
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

  /* --- Wände ------------------------------------------------------- */
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

    // Projizieren, Tiefe mitteln, von hinten nach vorn sortieren.
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

  /* --- Sensoren: Standfuß auf dem Boden, Mast bis auf Messhöhe.
         Bewusst zuletzt und ohne Tiefentest — die eigenen Messpunkte
         soll man immer sehen, auch hinter einer Wand. ------------------ */
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
