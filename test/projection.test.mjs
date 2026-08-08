/**
 * Die 2,5D-Ansicht lässt sich nicht durch Hinsehen prüfen — also werden
 * hier die Eigenschaften festgenagelt, an denen man einen Fehler in der
 * Projektion sonst erst am schiefen Bild merken würde.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjection, projectedAspect, clampPitch, DEG } from '../src/projection.js';
import { wallGaps, wallCovers } from '../src/renderer.js';
import { normalizeConfig } from '../src/model.js';

const FLOORPLAN = normalizeConfig({
  floorplan: {
    rooms: [
      { id: 'a', name: 'A', points: [[0, 0], [400, 0], [400, 300], [0, 300]] },
      { id: 'b', name: 'B', points: [[400, 0], [700, 0], [700, 300], [400, 300]] },
    ],
    sensors: [{ id: 's', x: 200, y: 150, entity: 'sensor.a' }],
  },
}).floorplan;

const WALL_HEIGHT = 125; // 2,5 m bei 50 px/m

const make = (yawDeg, pitchDeg, width = 800, height = 500) =>
  createProjection({
    floorplan: FLOORPLAN,
    yaw: yawDeg * DEG,
    pitch: pitchDeg * DEG,
    wallHeight: WALL_HEIGHT,
    width,
    height,
    padding: 10,
  });

test('die Bodenmatrix und project() beschreiben dieselbe Abbildung', () => {
  // Beide sind unabhängig voneinander hergeleitet — die Matrix analytisch,
  // project() direkt aus den Formeln. Weichen sie ab, läge die Heatmap
  // gegenüber den Wänden verschoben.
  for (const [yaw, pitch] of [[0, 90], [-22, 58], [137, 33], [-95, 71]]) {
    const p = make(yaw, pitch);
    for (const [x, y] of [[0, 0], [700, 300], [355, 120], [-50, 400]]) {
      const viaProject = p.project(x, y, 0);
      const [mx, my] = p.floorPoint(x, y);
      assert.ok(
        Math.abs(viaProject.x - mx) < 1e-6 && Math.abs(viaProject.y - my) < 1e-6,
        `yaw=${yaw} pitch=${pitch} bei (${x},${y}): project=(${viaProject.x.toFixed(4)}, ${viaProject.y.toFixed(4)}) vs. Matrix=(${mx.toFixed(4)}, ${my.toFixed(4)})`
      );
    }
  }
});

test('unprojectFloor kehrt die Bodenabbildung exakt um', () => {
  for (const [yaw, pitch] of [[0, 90], [-22, 58], [137, 33], [60, 15]]) {
    const p = make(yaw, pitch);
    for (const [x, y] of [[0, 0], [700, 300], [355, 120]]) {
      const screen = p.project(x, y, 0);
      const back = p.unprojectFloor(screen.x, screen.y);
      assert.ok(back, 'die Matrix muss umkehrbar sein');
      assert.ok(
        Math.abs(back.x - x) < 1e-4 && Math.abs(back.y - y) < 1e-4,
        `yaw=${yaw} pitch=${pitch}: (${x},${y}) → (${back.x.toFixed(4)}, ${back.y.toFixed(4)})`
      );
    }
  }
});

test('bei 90° Höhenwinkel bleibt es exakt die Draufsicht', () => {
  const p = make(0, 90);
  const floor = p.project(200, 150, 0);
  const top = p.project(200, 150, WALL_HEIGHT);
  assert.ok(Math.abs(floor.y - top.y) < 1e-9, 'ohne Neigung darf die Höhe nichts verschieben');

  // Und die Abbildung ist eine reine Skalierung: gleiche Abstände bleiben gleich.
  const dx = p.project(400, 150, 0).x - p.project(200, 150, 0).x;
  const dy = p.project(200, 300, 0).y - p.project(200, 150, 0).y;
  assert.ok(Math.abs(dx / 200 - dy / 150) < 1e-9, 'x und y müssen gleich skaliert werden');
});

test('geneigt ragen Wände nach oben ins Bild', () => {
  const p = make(-22, 58);
  const floor = p.project(200, 150, 0);
  const top = p.project(200, 150, WALL_HEIGHT);
  assert.ok(top.y < floor.y - 5, `die Wandkrone muss über dem Fußpunkt liegen (${top.y.toFixed(1)} vs. ${floor.y.toFixed(1)})`);
  assert.ok(Math.abs(top.x - floor.x) < 1e-9, 'senkrechte Kanten bleiben senkrecht');
});

test('die Tiefe wächst zum Betrachter hin', () => {
  const p = make(0, 55);
  // yaw = 0: größeres y ist weiter „vorne", also näher am Betrachter
  // und muss weiter unten im Bild landen.
  const hinten = p.project(200, 0, 0);
  const vorne = p.project(200, 300, 0);
  assert.ok(p.depthOf(200, 300) > p.depthOf(200, 0), 'Tiefenschlüssel muss nach vorn zunehmen');
  assert.ok(vorne.y > hinten.y, 'näher am Betrachter heißt weiter unten im Bild');
});

test('die ganze Szene passt in die Bühne', () => {
  const width = 800, height = 500, padding = 10;
  for (const [yaw, pitch] of [[0, 90], [-22, 58], [137, 33], [-95, 71], [45, 15]]) {
    const p = make(yaw, pitch, width, height);
    for (const room of FLOORPLAN.rooms) {
      for (const [x, y] of room.points) {
        for (const z of [0, WALL_HEIGHT]) {
          const s = p.project(x, y, z);
          assert.ok(
            s.x >= padding - 0.01 && s.x <= width - padding + 0.01 &&
            s.y >= padding - 0.01 && s.y <= height - padding + 0.01,
            `yaw=${yaw} pitch=${pitch}: (${x},${y},${z}) landet bei (${s.x.toFixed(1)}, ${s.y.toFixed(1)}) außerhalb`
          );
        }
      }
    }
  }
});

test('projectedAspect passt zum tatsächlich genutzten Bereich', () => {
  for (const [yaw, pitch] of [[0, 90], [-22, 58], [137, 33]]) {
    const aspect = projectedAspect({
      floorplan: FLOORPLAN, yaw: yaw * DEG, pitch: pitch * DEG, wallHeight: WALL_HEIGHT,
    });
    // Spannt man die Bühne in diesem Verhältnis auf, soll die Szene sie
    // weitgehend ausfüllen. Exakt kann es nicht aufgehen, weil der Rand
    // ein absoluter Pixelwert ist und sich nicht in ein Seitenverhältnis
    // falten lässt — aber ein grob falsches Verhältnis würde hier als
    // breiter leerer Streifen auffallen.
    const height = 400, width = height * aspect;
    const p = make(yaw, pitch, width, height);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const room of FLOORPLAN.rooms) {
      for (const [x, y] of room.points) {
        for (const z of [0, WALL_HEIGHT]) {
          const s = p.project(x, y, z);
          minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
          minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
        }
      }
    }
    const slackX = (width - 20) - (maxX - minX);
    const slackY = (height - 20) - (maxY - minY);
    assert.ok(slackX > -0.5 && slackY > -0.5, `Szene läuft über den Rand hinaus (yaw=${yaw})`);
    assert.ok(
      Math.min(slackX, slackY) < 0.5,
      `mindestens eine Achse muss exakt aufgefüllt sein (yaw=${yaw}: ${slackX.toFixed(1)} / ${slackY.toFixed(1)})`
    );
    assert.ok(
      slackX / width < 0.06 && slackY / height < 0.06,
      `zu viel Leerraum (yaw=${yaw}: ${slackX.toFixed(1)} px × ${slackY.toFixed(1)} px)`
    );
  }
});

test('eine Drehung um 360° landet wieder am Ausgangspunkt', () => {
  const a = make(30, 58).project(355, 120, 60);
  const b = make(390, 58).project(355, 120, 60);
  assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6);
});

test('der Höhenwinkel wird auf den umkehrbaren Bereich begrenzt', () => {
  assert.equal(clampPitch(0), 12);
  assert.equal(clampPitch(-40), 12);
  assert.equal(clampPitch(140), 90);
  assert.equal(clampPitch(58), 58);
});

/* --- Wandzerlegung ------------------------------------------------- */

const WALL = { x1: 0, y1: 0, x2: 400, y2: 0, type: 'interior' };

test('eine Wand ohne Öffnung ist ein einziges durchgehendes Stück', () => {
  assert.deepEqual(wallGaps(WALL, []), [[0, 1]]);
  assert.deepEqual(wallCovers(WALL, []), []);
});

test('Lücken und Öffnungen zerlegen die Wand lückenlos', () => {
  const openings = [
    { id: 'o1', x: 100, y: 0, angle: 0, width: 40, type: 'door' },
    { id: 'o2', x: 300, y: 0, angle: 0, width: 60, type: 'window' },
  ];
  const gaps = wallGaps(WALL, openings);
  const covers = wallCovers(WALL, openings);

  assert.equal(covers.length, 2, 'beide Öffnungen müssen der Wand zugeordnet werden');
  const total =
    gaps.reduce((sum, [a, b]) => sum + (b - a), 0) +
    covers.reduce((sum, c) => sum + (c.t1 - c.t0), 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `Stücke und Öffnungen müssen zusammen die ganze Wand ergeben, waren ${total}`);
});

test('eine quer stehende Öffnung gehört nicht zu dieser Wand', () => {
  const quer = [{ id: 'o', x: 200, y: 0, angle: Math.PI / 2, width: 40, type: 'door' }];
  assert.deepEqual(wallCovers(WALL, quer), []);
  assert.deepEqual(wallGaps(WALL, quer), [[0, 1]]);
});

test('eine Öffnung abseits der Wand wird nicht zugeordnet', () => {
  const fern = [{ id: 'o', x: 200, y: 90, angle: 0, width: 40, type: 'door' }];
  assert.deepEqual(wallCovers(WALL, fern, 8), []);
});
