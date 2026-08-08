/* ------------------------------------------------------------------ *
 * solver.js — stationäre Wärmediffusion über den Grundriss.
 *
 * Modell: ∇·(k∇T) = 0 auf einem regelmäßigen Gitter. Die Sensoren sind
 * Dirichlet-Randbedingungen (feste Werte auf einer kleinen Scheibe um
 * den Messpunkt), jede Gitterkante zwischen zwei Zellen bekommt eine
 * Leitfähigkeit k: 1 für freie Luft, weniger, wenn die Kante eine Wand
 * kreuzt — je nach Bauteil (Außenwand, Innenwand, Tür, Fenster).
 *
 * Dadurch fällt die Temperatur nicht mit der Luftlinie ab, sondern
 * "fließt" um Wände herum durch die Öffnungen — und ein Nachbarraum
 * hinter einer geschlossenen Tür bleibt spürbar entkoppelt, statt
 * einfach nur weit weg zu sein.
 *
 * Gelöst wird mit SOR (Gauß-Seidel mit Überrelaxation). Weil das Feld
 * zwischen zwei Sensor-Updates fast gleich bleibt, startet jeder Lauf
 * warm vom vorigen Ergebnis und braucht dann nur noch wenige Iterationen.
 * ------------------------------------------------------------------ */

import { pointInPolygon, segIntersectParams, clamp } from './geometry.js';
import { buildWalls, floorplanBounds, DEFAULT_TRANSMITTANCE } from './model.js';

const MIN_CONDUCTANCE = 1e-4;

/**
 * Wie viele Meter freie Luft ein Bauteil mit Durchlässigkeit t ersetzt:
 *   Luft-Äquivalent = (1/t − 1) · WALL_AIR_EQUIVALENT_M
 *
 * Ohne diese Umrechnung hinge die Wirkung einer Wand an der
 * Gitterauflösung: eine Wand belegt immer genau eine Gitterkante, aber
 * ein Raum besteht bei feinem Gitter aus mehr Zellen — die Luft im Raum
 * bekäme also immer mehr Widerstand, die Wand aber nicht. Über den
 * Umweg "entspricht so und so vielen Metern Luft" bleibt das Verhältnis
 * konstant, egal wie fein gerechnet wird.
 *
 * Der Faktor 5 sorgt dafür, dass bei den Voreinstellungen rund vier
 * Fünftel des Temperaturunterschieds an der Wand abfallen und nicht im
 * Raum davor — reale Räume durchmischen sich durch Konvektion viel
 * stärker, als eine reine Wärmeleitungsrechnung es täte.
 */
const WALL_AIR_EQUIVALENT_M = 5;

/** Toleranz für die Zuordnung eines Wandtreffers zu genau einer Gitterkante. */
const FACE_EPS = 1e-6;

export class HeatField {
  constructor(floorplan, options = {}) {
    this.fp = floorplan;
    this.opts = {
      cellSize: 8,
      pxPerMeter: 50,
      sensorRadius: 0.4,
      transmittance: DEFAULT_TRANSMITTANCE,
      ...options,
    };
    this.T = null;
    this._warm = false;
    this.stats = null;
    this._build();
  }

  /** Signatur, mit der die Karte erkennt, ob das Gitter neu gebaut werden muss. */
  static signature(floorplan, options) {
    return JSON.stringify([floorplan, options.cellSize, options.sensorRadius, options.transmittance, options.pxPerMeter]);
  }

  _build() {
    const { cellSize } = this.opts;
    const bounds = floorplanBounds(this.fp, cellSize * 2);
    const cols = Math.max(2, Math.ceil(bounds.w / cellSize));
    const rows = Math.max(2, Math.ceil(bounds.h / cellSize));

    this.bounds = bounds;
    this.cols = cols;
    this.rows = rows;
    this.n = cols * rows;

    this._buildInside();
    this._buildConductance();
  }

  cellCenterX(c) { return this.bounds.minX + (c + 0.5) * this.opts.cellSize; }
  cellCenterY(r) { return this.bounds.minY + (r + 0.5) * this.opts.cellSize; }

  _buildInside() {
    const { cols, rows, n } = this;
    const inside = new Uint8Array(n);
    const rooms = this.fp.rooms || [];

    if (!rooms.length) {
      // Nur Wände gezeichnet, keine Räume: die gesamte Bounding-Box zählt
      // als Fläche, damit auch dieser Workflow ein Feld ergibt.
      inside.fill(1);
      this.inside = inside;
      this.roomOfCell = null;
      return;
    }

    const roomOfCell = new Int16Array(n).fill(-1);
    for (let r = 0; r < rows; r++) {
      const y = this.cellCenterY(r);
      for (let c = 0; c < cols; c++) {
        const x = this.cellCenterX(c);
        for (let i = 0; i < rooms.length; i++) {
          if (pointInPolygon(x, y, rooms[i].points)) {
            inside[r * cols + c] = 1;
            roomOfCell[r * cols + c] = i;
            break;
          }
        }
      }
    }
    this.inside = inside;
    this.roomOfCell = roomOfCell;
  }

  /**
   * Sortiert jede Wand in die Gitterzellen ein, die sie berührt (plus
   * 8er-Nachbarschaft). Für eine Gitterkante müssen dann nur noch die
   * Wände aus dem Bucket ihrer Zelle geprüft werden statt alle.
   */
  _bucketWalls(walls) {
    const { cols, rows, n } = this;
    const cs = this.opts.cellSize;
    const buckets = new Array(n);
    const mark = new Int32Array(n).fill(-1);

    const add = (c, r, wi) => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const idx = r * cols + c;
      if (mark[idx] === wi) return;
      mark[idx] = wi;
      (buckets[idx] || (buckets[idx] = [])).push(wi);
    };

    for (let wi = 0; wi < walls.length; wi++) {
      const w = walls[wi];
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const steps = Math.max(1, Math.ceil((len / cs) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = w.x1 + (w.x2 - w.x1) * t;
        const y = w.y1 + (w.y2 - w.y1) * t;
        const c = Math.floor((x - this.bounds.minX) / cs);
        const r = Math.floor((y - this.bounds.minY) / cs);
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(c + dc, r + dr, wi);
      }
    }
    return buckets;
  }

  /**
   * Durchlässigkeit an einem Wanddurchstoßpunkt. Öffnungen sind eigene
   * Geometrie und gewinnen gegen die Wand — die durchlässigste Öffnung
   * an der Stelle bestimmt den Wert.
   */
  _transmittanceAt(wall, px, py) {
    const trans = this.opts.transmittance;
    let value = trans[wall.type] != null ? trans[wall.type] : trans.interior;
    const tol = Math.max(5, this.opts.cellSize * 0.9);

    for (const o of this.fp.openings || []) {
      const dx = px - o.x, dy = py - o.y;
      const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
      const along = dx * cos + dy * sin;
      const perp = -dx * sin + dy * cos;
      if (Math.abs(along) <= o.width / 2 && Math.abs(perp) <= tol) {
        const t = trans[o.type] != null ? trans[o.type] : trans.door;
        if (t > value) value = t;
      }
    }
    return value;
  }

  /** Durchlässigkeit 0…1 → Leitfähigkeit einer Gitterkante (freie Luft = 1). */
  _conductance(t) {
    if (t >= 1) return 1;
    if (t <= 0) return 0;
    const airMeters = (1 / t - 1) * WALL_AIR_EQUIVALENT_M;
    const extraResistance = (airMeters * this.opts.pxPerMeter) / this.opts.cellSize;
    return 1 / (1 + extraResistance);
  }

  _buildConductance() {
    const { cols, rows, n, inside } = this;
    const walls = buildWalls(this.fp);
    const buckets = this._bucketWalls(walls);

    const condX = new Float32Array(n); // Kante (c,r) → (c+1,r)
    const condY = new Float32Array(n); // Kante (c,r) → (c,r+1)

    const faceConductance = (ax, ay, bx, by, candidates) => {
      let t = 1;
      if (candidates) {
        for (let i = 0; i < candidates.length; i++) {
          const w = walls[candidates[i]];
          const hit = segIntersectParams(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2, FACE_EPS);
          if (!hit) continue;
          // Halboffenes Intervall [0, 1): trifft eine Wand genau einen
          // Zellmittelpunkt, sähen sie sonst BEIDE angrenzenden Kanten
          // und die Wand dämpfte doppelt — sichtbar als sprunghaft
          // stärkere Dämmung, sobald das Gitter zufällig passend liegt.
          if (hit.t >= 1 - FACE_EPS) continue;
          // Mehrere gekreuzte Wände: die dichteste bestimmt den Durchlass.
          // (Kein Produkt — sonst dämpfen zwei deckungsgleiche Raumkanten
          // dieselbe physische Wand doppelt.)
          const value = this._transmittanceAt(w, hit.x, hit.y);
          if (value < t) t = value;
        }
      }
      return this._conductance(t);
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (!inside[idx]) continue;
        const ax = this.cellCenterX(c), ay = this.cellCenterY(r);
        const cand = buckets[idx];

        if (c + 1 < cols && inside[idx + 1]) {
          condX[idx] = faceConductance(ax, ay, this.cellCenterX(c + 1), ay, cand);
        }
        if (r + 1 < rows && inside[idx + cols]) {
          condY[idx] = faceConductance(ax, ay, ax, this.cellCenterY(r + 1), cand);
        }
      }
    }

    this.condX = condX;
    this.condY = condY;
    this.walls = walls;
  }

  /** Zellen, deren Mittelpunkt im Sensorradius liegt → feste Werte. */
  _buildDirichlet(sensorValues) {
    const { cols, rows, n, inside } = this;
    const cs = this.opts.cellSize;
    const radiusPx = Math.max(cs * 0.75, this.opts.sensorRadius * this.opts.pxPerMeter);
    const fixed = new Uint8Array(n);
    const sum = new Float32Array(n);
    const count = new Uint16Array(n);
    let any = false;
    let vMin = Infinity, vMax = -Infinity, vSum = 0, vCount = 0;

    const sensors = this.fp.sensors || [];
    for (let si = 0; si < sensors.length; si++) {
      const value = sensorValues[si];
      if (!Number.isFinite(value)) continue;
      const s = sensors[si];
      const c0 = Math.floor((s.x - radiusPx - this.bounds.minX) / cs);
      const c1 = Math.ceil((s.x + radiusPx - this.bounds.minX) / cs);
      const r0 = Math.floor((s.y - radiusPx - this.bounds.minY) / cs);
      const r1 = Math.ceil((s.y + radiusPx - this.bounds.minY) / cs);
      let hits = 0;

      for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
        for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
          const idx = r * cols + c;
          if (!inside[idx]) continue;
          if (Math.hypot(this.cellCenterX(c) - s.x, this.cellCenterY(r) - s.y) > radiusPx) continue;
          fixed[idx] = 1;
          sum[idx] += value;
          count[idx] += 1;
          hits += 1;
        }
      }

      if (!hits) {
        // Sensor außerhalb der Räume platziert: nächstgelegene Fläche nehmen.
        const idx = this._nearestInsideCell(s.x, s.y);
        if (idx >= 0) {
          fixed[idx] = 1;
          sum[idx] += value;
          count[idx] += 1;
          hits = 1;
        }
      }
      if (hits) {
        any = true;
        vMin = Math.min(vMin, value);
        vMax = Math.max(vMax, value);
        vSum += value;
        vCount += 1;
      }
    }

    if (!any) return null;
    const values = new Float32Array(n);
    for (let i = 0; i < n; i++) if (fixed[i]) values[i] = sum[i] / count[i];
    return { fixed, values, min: vMin, max: vMax, mean: vSum / vCount };
  }

  _nearestInsideCell(x, y) {
    const { cols, rows, inside } = this;
    let best = -1, bestDist = Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (!inside[idx]) continue;
        const d = Math.hypot(this.cellCenterX(c) - x, this.cellCenterY(r) - y);
        if (d < bestDist) { bestDist = d; best = idx; }
      }
    }
    return best;
  }

  /** Zellen, die über leitende Kanten überhaupt einen Sensor "sehen". */
  _reachability(fixed) {
    const { cols, rows, n, condX, condY } = this;
    const reach = new Uint8Array(n);
    const queue = new Int32Array(n);
    let head = 0, tail = 0;
    for (let i = 0; i < n; i++) if (fixed[i]) { reach[i] = 1; queue[tail++] = i; }

    while (head < tail) {
      const idx = queue[head++];
      const c = idx % cols, r = (idx / cols) | 0;
      if (c > 0 && condX[idx - 1] > MIN_CONDUCTANCE && !reach[idx - 1]) { reach[idx - 1] = 1; queue[tail++] = idx - 1; }
      if (c + 1 < cols && condX[idx] > MIN_CONDUCTANCE && !reach[idx + 1]) { reach[idx + 1] = 1; queue[tail++] = idx + 1; }
      if (r > 0 && condY[idx - cols] > MIN_CONDUCTANCE && !reach[idx - cols]) { reach[idx - cols] = 1; queue[tail++] = idx - cols; }
      if (r + 1 < rows && condY[idx] > MIN_CONDUCTANCE && !reach[idx + cols]) { reach[idx + cols] = 1; queue[tail++] = idx + cols; }
    }
    return reach;
  }

  /**
   * @param {number[]} sensorValues Werte in der Reihenfolge von fp.sensors (NaN = unbekannt)
   * @returns {boolean} true, wenn ein Feld vorliegt
   */
  solve(sensorValues) {
    const started = (typeof performance !== 'undefined' ? performance : Date).now();
    const dirichlet = this._buildDirichlet(sensorValues);
    if (!dirichlet) {
      this.T = null;
      this.stats = null;
      return false;
    }

    const { cols, rows, n, inside, condX, condY } = this;
    const { fixed, values } = dirichlet;
    this.reach = this._reachability(fixed);

    let T = this.T;
    if (!T || T.length !== n || !this._warm) {
      T = new Float32Array(n).fill(dirichlet.mean);
    }
    for (let i = 0; i < n; i++) if (fixed[i]) T[i] = values[i];

    const span = Math.max(0.05, dirichlet.max - dirichlet.min);
    const tol = span * 1e-4;
    // Gauß-Seidel braucht grob so viele Durchläufe, wie das Gitter breit
    // ist — die Grenze muss also mit der Auflösung mitwachsen, sonst
    // liefern feine Gitter unfertige Felder.
    const maxIter = this._warm ? 200 : clamp(6 * Math.max(cols, rows), 400, 4000);
    const omega = 1.85;
    let iter = 0;

    for (; iter < maxIter; iter++) {
      let maxDelta = 0;
      for (let r = 0; r < rows; r++) {
        const rowBase = r * cols;
        for (let c = 0; c < cols; c++) {
          const idx = rowBase + c;
          if (!inside[idx] || fixed[idx]) continue;

          let num = 0, den = 0;
          if (c > 0) { const k = condX[idx - 1]; if (k > 0) { num += k * T[idx - 1]; den += k; } }
          if (c + 1 < cols) { const k = condX[idx]; if (k > 0) { num += k * T[idx + 1]; den += k; } }
          if (r > 0) { const k = condY[idx - cols]; if (k > 0) { num += k * T[idx - cols]; den += k; } }
          if (r + 1 < rows) { const k = condY[idx]; if (k > 0) { num += k * T[idx + cols]; den += k; } }
          if (den === 0) continue;

          const target = num / den;
          const delta = omega * (target - T[idx]);
          T[idx] += delta;
          const ad = delta < 0 ? -delta : delta;
          if (ad > maxDelta) maxDelta = ad;
        }
      }
      if (maxDelta < tol) { iter++; break; }
    }

    this.T = T;
    this._warm = true;

    let fMin = Infinity, fMax = -Infinity;
    for (let i = 0; i < n; i++) {
      if (!inside[i] || !this.reach[i]) continue;
      if (T[i] < fMin) fMin = T[i];
      if (T[i] > fMax) fMax = T[i];
    }

    this.stats = {
      min: Number.isFinite(fMin) ? fMin : dirichlet.min,
      max: Number.isFinite(fMax) ? fMax : dirichlet.max,
      sensorMin: dirichlet.min,
      sensorMax: dirichlet.max,
      sensorMean: dirichlet.mean,
      iterations: iter,
      ms: (typeof performance !== 'undefined' ? performance : Date).now() - started,
    };
    return true;
  }

  /** Bilinear interpolierter Feldwert an einer Grundriss-Koordinate, sonst NaN. */
  sample(x, y) {
    if (!this.T) return NaN;
    const { cols, rows, inside, T } = this;
    const cs = this.opts.cellSize;
    const fx = (x - this.bounds.minX) / cs - 0.5;
    const fy = (y - this.bounds.minY) / cs - 0.5;
    const c0 = Math.floor(fx), r0 = Math.floor(fy);
    const tx = fx - c0, ty = fy - r0;

    let num = 0, den = 0;
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const c = clamp(c0 + dc, 0, cols - 1);
        const r = clamp(r0 + dr, 0, rows - 1);
        const idx = r * cols + c;
        if (!inside[idx] || (this.reach && !this.reach[idx])) continue;
        const w = (dc ? tx : 1 - tx) * (dr ? ty : 1 - ty);
        num += w * T[idx];
        den += w;
      }
    }
    return den > 0.05 ? num / den : NaN;
  }
}
