/**
 * Die 2,5D-Geometrie ohne Browser prüfen: was von einer Wand übrig bleibt,
 * wenn eine Tür, ein Fenster oder ein Durchgang darin sitzt.
 *
 * renderScene bekommt zusätzlich einen Attrappen-Kontext — der fängt
 * wenigstens Tippfehler und falsche Aufrufe im Zeichenpfad ab, den ich
 * sonst nirgends ausführen könnte.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { wallSolids, renderScene, GEOMETRY } from '../src/scene3d.js';
import { createProjection, DEG } from '../src/projection.js';
import { normalizeConfig } from '../src/model.js';
import { HeatField } from '../src/solver.js';

const PX_PER_M = 50;
const WALL_H = 2.5;
const HEIGHT_PX = WALL_H * PX_PER_M;

function plan(openings = []) {
  return normalizeConfig({
    px_per_meter: PX_PER_M,
    cell_size: 10,
    floorplan: {
      rooms: [
        { id: 'l', name: 'Links', points: [[0, 0], [300, 0], [300, 400], [0, 400]] },
        { id: 'r', name: 'Rechts', points: [[300, 0], [600, 0], [600, 400], [300, 400]] },
      ],
      openings,
      sensors: [
        { id: 'a', x: 100, y: 200, entity: 'sensor.a' },
        { id: 'b', x: 500, y: 200, entity: 'sensor.b' },
      ],
    },
  }).floorplan;
}

const solids = (openings) => wallSolids(plan(openings), { pxPerMeter: PX_PER_M, wallHeight: WALL_H });

/** Die Baukörper, die auf der Trennwand bei x = 300 sitzen. */
const onDivider = (list) => list.filter((s) => Math.round(s.x1) === 300 && Math.round(s.x2) === 300);

/** Steht an der Stelle y auf der Trennwand in dieser Höhe etwas? */
function solidAt(list, y, z) {
  return onDivider(list).some((s) => {
    const lo = Math.min(s.y1, s.y2), hi = Math.max(s.y1, s.y2);
    return !s.glass && y >= lo - 0.01 && y <= hi + 0.01 && z >= s.z0 - 0.01 && z <= s.z1 + 0.01;
  });
}

const doorAt = (type) => [{ id: 'o', x: 300, y: 200, angle: Math.PI / 2, width: 90, type }];

test('eine Wand ohne Öffnung ist ein durchgehender Quader über die volle Höhe', () => {
  const divider = onDivider(solids([]));
  assert.equal(divider.length, 1);
  assert.equal(divider[0].z0, 0);
  assert.ok(Math.abs(divider[0].z1 - HEIGHT_PX) < 1e-9);
});

test('ein Durchgang lässt die Wand dort vollständig weg', () => {
  const list = solids(doorAt('passage'));
  assert.ok(!solidAt(list, 200, 10), 'unten muss die Öffnung frei sein');
  assert.ok(!solidAt(list, 200, HEIGHT_PX - 10), 'und oben ebenso — ein Durchgang geht bis zur Decke');
  assert.ok(solidAt(list, 40, 10), 'neben der Öffnung steht die Wand weiter');
  assert.ok(solidAt(list, 360, 10), 'auf der anderen Seite auch');
});

test('eine Tür lässt nur den Sturz darüber stehen', () => {
  const list = solids(doorAt('door'));
  const doorTop = GEOMETRY.doorHeight * PX_PER_M;
  assert.ok(!solidAt(list, 200, doorTop - 10), 'unterhalb der Türhöhe ist die Wand offen');
  assert.ok(solidAt(list, 200, doorTop + 10), 'oberhalb sitzt der Sturz');
  assert.ok(solidAt(list, 40, 10), 'neben der Tür bleibt die Wand stehen');
});

test('ein Fenster bekommt Brüstung, Sturz und eine Scheibe dazwischen', () => {
  const list = solids(doorAt('window'));
  const sill = GEOMETRY.windowSill * PX_PER_M;
  const head = GEOMETRY.windowHead * PX_PER_M;

  assert.ok(solidAt(list, 200, sill / 2), 'unter dem Fenster steht die Brüstung');
  assert.ok(!solidAt(list, 200, (sill + head) / 2), 'auf Fensterhöhe ist die Wand offen');
  assert.ok(solidAt(list, 200, head + 5), 'darüber sitzt der Sturz');

  const panes = onDivider(list).filter((s) => s.glass);
  assert.equal(panes.length, 1, 'genau eine Scheibe');
  assert.ok(Math.abs(panes[0].z0 - sill) < 1e-9 && Math.abs(panes[0].z1 - head) < 1e-9);
});

test('Außenwände sind dicker als Innenwände', () => {
  const list = solids([]);
  const inner = onDivider(list)[0];
  const outer = list.find((s) => s.exterior);
  assert.ok(outer, 'die Außenkanten müssen als solche erkannt sein');
  assert.ok(outer.halfT > inner.halfT, `außen ${outer.halfT} muss dicker sein als innen ${inner.halfT}`);
});

test('die Wandhöhe schlägt auf die Baukörper durch', () => {
  const low = wallSolids(plan([]), { pxPerMeter: PX_PER_M, wallHeight: 2.0 });
  assert.ok(Math.abs(onDivider(low)[0].z1 - 100) < 1e-9);
});

/* --- Rauchtest des Zeichenpfads ------------------------------------ */

/** Zeichenkontext-Attrappe: zählt nur mit, was aufgerufen wurde. */
function mockContext() {
  const counts = {};
  const record = (name) => (...args) => { counts[name] = (counts[name] || 0) + 1; return args; };
  const ctx = {
    counts,
    canvas: { ownerDocument: { createElement: () => ({ getContext: () => ctx }) } },
  };
  for (const name of [
    'save', 'restore', 'transform', 'setTransform', 'clip', 'drawImage', 'beginPath',
    'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'ellipse', 'arc',
    'fillText', 'strokeText', 'clearRect', 'putImageData',
  ]) ctx[name] = record(name);
  return ctx;
}

function scene(openings, overrides = {}) {
  const floorplan = plan(openings);
  const config = normalizeConfig({ px_per_meter: PX_PER_M, cell_size: 10, floorplan });
  const field = new HeatField(floorplan, {
    cellSize: 10, pxPerMeter: PX_PER_M,
    sensorRadius: config.sensor_radius, transmittance: config.transmittance,
  });
  field.solve([24, 18]);

  const projection = createProjection({
    floorplan, yaw: -22 * DEG, pitch: 58 * DEG,
    wallHeight: HEIGHT_PX, width: 800, height: 500, padding: 10,
  });

  const ctx = mockContext();
  const result = renderScene(ctx, {
    floorplan,
    field,
    isotherms: [{ level: 21, segments: [[10, 10, 20, 20]] }],
    projection,
    buffer: { width: field.cols, height: field.rows },
    clipPath: null,
    opacity: 0.85,
    pxPerMeter: PX_PER_M,
    wallHeight: WALL_H,
    showWalls: true,
    showRoomLabels: true,
    colors: {
      wallExterior: [150, 160, 176], wallInterior: [186, 194, 206],
      glass: 'rgba(0,0,0,.2)', glassEdge: '#fff', isotherm: '#fff',
      label: '#fff', labelHalo: '#000', stem: '#fff',
    },
    ...overrides,
  });
  return { ctx, result, projection, floorplan };
}

test('renderScene läuft durch und zeichnet Boden, Wände und Beschriftungen', () => {
  const { ctx, result } = scene([]);
  assert.equal(ctx.counts.drawImage, 1, 'die Heatmap wird genau einmal auf den Boden gelegt');
  assert.equal(ctx.counts.transform, 1, 'und dafür genau einmal die Bodenmatrix gesetzt');
  assert.ok(ctx.counts.fill > 10, 'die Wandflächen müssen gefüllt werden');
  assert.equal(ctx.counts.fillText, 2, 'ein Raumname je Raum');
  assert.equal(result.sensors.length, 2);
});

test('die zurückgegebenen Sensorpunkte liegen auf Messhöhe über dem Fußpunkt', () => {
  const { result, projection, floorplan } = scene([]);
  floorplan.sensors.forEach((s, i) => {
    const expected = projection.project(s.x, s.y, GEOMETRY.sensorHeight * PX_PER_M);
    assert.ok(Math.abs(result.sensors[i].x - expected.x) < 1e-9);
    assert.ok(Math.abs(result.sensors[i].y - expected.y) < 1e-9);
    assert.ok(result.sensors[i].y < result.sensors[i].floorY, 'der Chip sitzt über dem Bodenpunkt');
  });
});

test('ohne Wände wird deutlich weniger gezeichnet', () => {
  const withWalls = scene([]).ctx.counts.fill;
  const without = scene([], { showWalls: false }).ctx.counts.fill || 0;
  assert.ok(without < withWalls, `${without} muss kleiner sein als ${withWalls}`);
});

test('ein Fenster erzeugt zusätzliche Glasflächen', () => {
  const plain = scene([]).ctx.counts.fill;
  const glazed = scene(doorAt('window')).ctx.counts.fill;
  assert.ok(glazed > plain, `mit Fenster ${glazed} vs. ohne ${plain}`);
});
