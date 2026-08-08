/* ------------------------------------------------------------------ *
 * isotherms.js — Marching Squares über das gelöste Feld.
 *
 * Liefert Liniensegmente gleicher Temperatur. Die machen den Verlauf
 * ablesbar, ohne dass man Farben schätzen muss — besonders dort, wo die
 * Palette flach wird.
 * ------------------------------------------------------------------ */

/**
 * @param {HeatField} field
 * @param {number} step Abstand der Isothermen in Messeinheiten (z.B. 0.5 °C)
 * @returns {{level:number, segments:number[][]}[]} Segmente als [x1,y1,x2,y2] in Grundriss-Koordinaten
 */
export function computeIsotherms(field, step, maxLevels = 40) {
  if (!field || !field.T || !field.stats || !(step > 0)) return [];
  const { cols, rows, inside, T, reach } = field;
  const cs = field.opts.cellSize;
  const { minX, minY } = field.bounds;

  const first = Math.ceil(field.stats.min / step) * step;
  const last = Math.floor(field.stats.max / step) * step;
  if (!(last >= first)) return [];
  if ((last - first) / step > maxLevels) return [];

  const valid = (idx) => inside[idx] && (!reach || reach[idx]);
  const cx = (c) => minX + (c + 0.5) * cs;
  const cy = (r) => minY + (r + 0.5) * cs;

  const out = [];
  for (let level = first; level <= last + 1e-9; level += step) {
    const segments = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const i00 = r * cols + c;
        const i10 = i00 + 1;
        const i01 = i00 + cols;
        const i11 = i01 + 1;
        if (!valid(i00) || !valid(i10) || !valid(i01) || !valid(i11)) continue;

        const v00 = T[i00], v10 = T[i10], v01 = T[i01], v11 = T[i11];
        const code =
          (v00 > level ? 1 : 0) | (v10 > level ? 2 : 0) | (v11 > level ? 4 : 0) | (v01 > level ? 8 : 0);
        if (code === 0 || code === 15) continue;

        const x0 = cx(c), x1 = cx(c + 1), y0 = cy(r), y1 = cy(r + 1);
        const interp = (a, b) => (level - a) / (b - a || 1e-9);
        // Kantenmittelpunkte der Zelle: oben, rechts, unten, links
        const top = [x0 + (x1 - x0) * interp(v00, v10), y0];
        const right = [x1, y0 + (y1 - y0) * interp(v10, v11)];
        const bottom = [x0 + (x1 - x0) * interp(v01, v11), y1];
        const left = [x0, y0 + (y1 - y0) * interp(v00, v01)];

        const push = (a, b) => segments.push([a[0], a[1], b[0], b[1]]);
        switch (code) {
          case 1: case 14: push(left, top); break;
          case 2: case 13: push(top, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(right, bottom); break;
          case 6: case 9: push(top, bottom); break;
          case 7: case 8: push(left, bottom); break;
          case 5: push(left, top); push(right, bottom); break;
          case 10: push(top, right); push(left, bottom); break;
          default: break;
        }
      }
    }
    if (segments.length) out.push({ level: Math.round(level * 100) / 100, segments });
  }
  return out;
}
