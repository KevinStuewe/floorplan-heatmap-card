/**
 * Prüft die Maß-Ableitungen für Räume — die Grundlage der Maßeingabe im
 * Grundriss-Editor.
 *
 *   node --test test/
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { roomAreaSqm, roomSizeMeters, resizeRoomPoints } from '../src/model.js';

const PPM = 50;
const rect = (w, h, x = 0, y = 0) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const close = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≉ ${expected}`);

test('roomSizeMeters liefert die Außenmaße in Metern', () => {
  const size = roomSizeMeters({ points: rect(150, 200, 20, 40) }, PPM);
  close(size.width, 3);
  close(size.height, 4);
});

test('roomSizeMeters misst auch bei nicht rechteckigen Räumen die Bounding-Box', () => {
  // L-Form innerhalb von 200 × 100 px.
  const size = roomSizeMeters({ points: [[0, 0], [200, 0], [200, 50], [100, 50], [100, 100], [0, 100]] }, PPM);
  close(size.width, 4);
  close(size.height, 2);
});

test('resizeRoomPoints setzt exakte Maße und lässt die linke obere Ecke stehen', () => {
  const room = { points: rect(150, 200, 20, 40) };
  room.points = resizeRoomPoints(room.points, 5 * PPM, 2.5 * PPM);

  assert.deepEqual(room.points[0], [20, 40]);
  const size = roomSizeMeters(room, PPM);
  close(size.width, 5);
  close(size.height, 2.5);
  close(roomAreaSqm(room, PPM), 12.5, 1e-9);
});

test('resizeRoomPoints zieht ein Polygon proportional mit', () => {
  const points = [[0, 0], [200, 0], [200, 50], [100, 50], [100, 100], [0, 100]];
  const scaled = resizeRoomPoints(points, 400, 200);

  assert.deepEqual(scaled, [[0, 0], [400, 0], [400, 100], [200, 100], [200, 200], [0, 200]]);
});

test('resizeRoomPoints lässt eine Achse ohne Ausdehnung oder ohne Zielmaß unangetastet', () => {
  // Entartet: alle Punkte auf einer Waagerechten — die Höhe bleibt 0.
  const flat = resizeRoomPoints([[0, 10], [100, 10], [50, 10]], 200, 300);
  assert.deepEqual(flat, [[0, 10], [200, 10], [100, 10]]);

  // Kein (bzw. ungültiges) Zielmaß für Y ⇒ nur X wird skaliert.
  const onlyX = resizeRoomPoints(rect(100, 100), 300, 0);
  assert.deepEqual(onlyX, [[0, 0], [300, 0], [300, 100], [0, 100]]);
});
