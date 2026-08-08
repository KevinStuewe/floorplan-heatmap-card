/* ------------------------------------------------------------------ *
 * editor.js — das Formular im Lovelace-Konfigurationsdialog.
 *
 * Bewusst schlank gehalten: alles Räumliche passiert im Vollbild-Editor
 * (plan-editor.js), hier stehen nur die Darstellungs- und Modellwerte.
 * ------------------------------------------------------------------ */

import { DEFAULT_TRANSMITTANCE, normalizeConfig } from './model.js';
import { PALETTE_NAMES, paletteGradientCss } from './palette.js';
import { openPlanEditor } from './plan-editor.js';
import { t, detectLanguage } from './i18n.js';

const PALETTE_LABEL_KEYS = {
  coolwarm: 'editor.paletteCoolwarm',
  thermal: 'editor.paletteThermal',
  viridis: 'editor.paletteViridis',
  inferno: 'editor.paletteInferno',
  turbo: 'editor.paletteTurbo',
};

const TRANSMITTANCE_LABEL_KEYS = {
  exterior: 'label.exterior',
  interior: 'label.interior',
  door: 'label.door',
  window: 'label.window',
  passage: 'label.passage',
};

const FORM_STYLES = `
  :host { display: block; }
  .wrap { display: flex; flex-direction: column; gap: 16px; padding-bottom: 8px; }
  h3 {
    margin: 0 0 10px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .07em;
    color: var(--secondary-text-color);
  }
  .card {
    border: 1px solid var(--divider-color, rgba(127,140,158,.25));
    border-radius: 12px; padding: 14px;
  }
  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field > label {
    display: block; font-size: 12px; color: var(--secondary-text-color); margin-bottom: 5px;
  }
  .row { display: flex; gap: 10px; }
  .row > * { flex: 1; min-width: 0; }
  input[type=text], input[type=number], select {
    width: 100%; box-sizing: border-box;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color, rgba(127,140,158,.35));
    border-radius: 8px; padding: 8px 10px; font-size: 14px; font-family: inherit;
  }
  input:focus, select:focus { outline: none; border-color: var(--primary-color); }
  input[type=range] { width: 100%; accent-color: var(--primary-color); }
  input:disabled { opacity: .5; }
  .check {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--primary-text-color);
    cursor: pointer; padding: 5px 0;
  }
  .check input { accent-color: var(--primary-color); width: 16px; height: 16px; margin: 0; }
  .value { float: right; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
  .plan-button {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: var(--primary-color); color: var(--text-primary-color, #fff);
    border: none; border-radius: 12px; padding: 14px 16px;
    font-size: 14px; font-weight: 600; font-family: inherit;
    cursor: pointer; text-align: left;
  }
  .plan-button:hover { filter: brightness(1.08); }
  .plan-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; flex: none; }
  .plan-button .sub { display: block; font-weight: 400; font-size: 12px; opacity: .85; margin-top: 2px; }
  .swatch { height: 10px; border-radius: 999px; margin-top: 8px; }
  .seg {
    display: flex; gap: 4px; padding: 4px;
    border: 1px solid var(--divider-color, rgba(127,140,158,.35)); border-radius: 10px;
  }
  .seg button {
    flex: 1; background: transparent; border: none; border-radius: 7px;
    color: var(--primary-text-color); font-family: inherit; font-size: 12.5px;
    padding: 8px 6px; cursor: pointer;
  }
  .seg button:hover { background: var(--divider-color, rgba(127,140,158,.2)); }
  .seg button.active { background: var(--primary-color); color: var(--text-primary-color, #fff); font-weight: 600; }
  [hidden] { display: none; }
  details summary {
    cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: .07em;
    text-transform: uppercase; color: var(--secondary-text-color); padding: 4px 0;
  }
  details[open] summary { margin-bottom: 10px; }
  .note { font-size: 12px; color: var(--secondary-text-color); line-height: 1.5; margin-top: 8px; }
`;

export class FloorplanHeatmapCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    // Home Assistant spiegelt jede von uns gemeldete Änderung sofort
    // wieder herein. Würden wir darauf neu rendern, wäre der gerade
    // gezogene Regler mitten in der Bewegung durch ein frisches Element
    // ersetzt — das Ziehen bräche nach dem ersten Schritt ab.
    const serialized = JSON.stringify(config);
    if (serialized === this._configJson) return;
    this._configJson = serialized;
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    // Ein Neurendern bei jedem hass-Update würde Regler mitten in der
    // Bewegung ersetzen (siehe setConfig) — deshalb nur bei tatsächlichem
    // Sprachwechsel (typischerweise: erstes hass-Update nach dem Erzeugen).
    const prevLang = this._hass ? this._lang() : null;
    this._hass = hass;
    if (this._config && this._lang() !== prevLang) this._render();
  }

  _lang() {
    return detectLanguage(this._hass);
  }

  _emit(patch, rerender = true) {
    this._config = { ...this._config, ...patch };
    this._configJson = JSON.stringify(this._config);
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true })
    );
    if (rerender) this._render();
  }

  _render() {
    const cfg = normalizeConfig(this._config);
    const fp = cfg.floorplan;
    const lang = this._lang();
    const tr = (key, vars) => t(lang, key, vars);
    const counts = tr('editor.counts', {
      rooms: fp.rooms.length, sensors: fp.sensors.length, openings: fp.openings.length,
    });

    this.shadowRoot.innerHTML = `
      <style>${FORM_STYLES}</style>
      <div class="wrap">
        <button class="plan-button" id="openPlan">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h8M11 4v16"/></svg>
          <span>${tr('editor.openPlanButton')}
            <span class="sub">${counts}</span>
          </span>
        </button>

        <div class="card">
          <h3>${tr('editor.sectionDisplay')}</h3>
          <div class="field">
            <label>${tr('editor.fieldTitle')}</label>
            <input type="text" data-key="title" value="${escapeAttr(cfg.title)}" placeholder="${tr('card.defaultTitle')}">
          </div>
          <div class="row">
            <div class="field">
              <label>${tr('editor.fieldUnit')}</label>
              <input type="text" data-key="unit" value="${escapeAttr(cfg.unit)}" placeholder="°C">
            </div>
            <div class="field">
              <label>${tr('editor.fieldPalette')}</label>
              <select data-key="palette">
                ${PALETTE_NAMES.map((p) => `<option value="${p}" ${cfg.palette === p ? 'selected' : ''}>${tr(PALETTE_LABEL_KEYS[p]) || p}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="swatch" style="background:${paletteGradientCss(cfg.palette)}"></div>

          <div class="field" style="margin-top:12px">
            <label class="check"><input type="checkbox" data-key="auto_range" ${cfg.auto_range ? 'checked' : ''}>
              ${tr('editor.autoRange')}</label>
          </div>
          <div class="row">
            <div class="field">
              <label>${tr('editor.fieldMin')}</label>
              <input type="number" data-key="min" step="0.5" value="${cfg.min}" ${cfg.auto_range ? 'disabled' : ''}>
            </div>
            <div class="field">
              <label>${tr('editor.fieldMax')}</label>
              <input type="number" data-key="max" step="0.5" value="${cfg.max}" ${cfg.auto_range ? 'disabled' : ''}>
            </div>
          </div>
          <div class="field">
            <label>${tr('editor.fieldOpacity')} <span class="value" data-out="opacity">${Math.round(cfg.opacity * 100)} %</span></label>
            <input type="range" data-key="opacity" min="0.2" max="1" step="0.05" value="${cfg.opacity}">
          </div>
        </div>

        <div class="card">
          <h3>${tr('editor.sectionView')}</h3>
          <div class="field">
            <div class="seg">
              <button data-view="flat" class="${cfg.view_mode === 'flat' ? 'active' : ''}">${tr('editor.viewFlat')}</button>
              <button data-view="tilted" class="${cfg.view_mode === 'tilted' ? 'active' : ''}">${tr('editor.viewTilted')}</button>
            </div>
          </div>
          <div ${cfg.view_mode === 'tilted' ? '' : 'hidden'}>
            <div class="field">
              <label>${tr('editor.fieldYaw')} <span class="value" data-out="yaw">${Math.round(cfg.yaw)}°</span></label>
              <input type="range" data-key="yaw" min="-180" max="180" step="1" value="${cfg.yaw}">
            </div>
            <div class="field">
              <label>${tr('editor.fieldPitch')} <span class="value" data-out="pitch">${Math.round(cfg.pitch)}°</span></label>
              <input type="range" data-key="pitch" min="12" max="90" step="1" value="${cfg.pitch}">
            </div>
            <div class="field">
              <label>${tr('editor.fieldWallHeight')} <span class="value" data-out="wall_height">${cfg.wall_height.toFixed(2)} m</span></label>
              <input type="range" data-key="wall_height" min="1" max="4" step="0.05" value="${cfg.wall_height}">
            </div>
            <div class="note">${tr('editor.viewAngleNote')}</div>
          </div>
        </div>

        <div class="card">
          <h3>${tr('editor.sectionShow')}</h3>
          <label class="check"><input type="checkbox" data-key="show_walls" ${cfg.show_walls ? 'checked' : ''}> ${tr('editor.showWalls')}</label>
          <label class="check"><input type="checkbox" data-key="show_room_labels" ${cfg.show_room_labels ? 'checked' : ''}> ${tr('editor.showRoomLabels')}</label>
          <label class="check"><input type="checkbox" data-key="show_values" ${cfg.show_values ? 'checked' : ''}> ${tr('editor.showValues')}</label>
          <label class="check"><input type="checkbox" data-key="show_legend" ${cfg.show_legend ? 'checked' : ''}> ${tr('editor.showLegend')}</label>
          <label class="check"><input type="checkbox" data-key="show_isotherms" ${cfg.show_isotherms ? 'checked' : ''}> ${tr('editor.showIsotherms')}</label>
          <div class="field" style="margin-top:8px">
            <label>${tr('editor.isothermStep')} <span class="value" data-out="isotherm_step">${cfg.isotherm_step} ${cfg.unit}</span></label>
            <input type="range" data-key="isotherm_step" min="0.1" max="2" step="0.1" value="${cfg.isotherm_step}" ${cfg.show_isotherms ? '' : 'disabled'}>
          </div>
        </div>

        <div class="card">
          <details>
            <summary>${tr('editor.sectionModel')}</summary>
            <div class="field">
              <label>${tr('editor.cellSize')} <span class="value" data-out="cell_size">${cfg.cell_size} px</span></label>
              <input type="range" data-key="cell_size" min="3" max="20" step="1" value="${cfg.cell_size}">
              <div class="note">${tr('editor.cellSizeNote')}</div>
            </div>
            <div class="field">
              <label>${tr('editor.sensorRadius')} <span class="value" data-out="sensor_radius">${cfg.sensor_radius.toFixed(2)} m</span></label>
              <input type="range" data-key="sensor_radius" min="0.1" max="1.5" step="0.05" value="${cfg.sensor_radius}">
              <div class="note">${tr('editor.sensorRadiusNote')}</div>
            </div>

            <h3 style="margin-top:16px">${tr('editor.sectionTransmittance')}</h3>
            ${Object.keys(DEFAULT_TRANSMITTANCE).map((key) => `
              <div class="field">
                <label>${tr(TRANSMITTANCE_LABEL_KEYS[key]) || key} <span class="value" data-out="trans:${key}">${Math.round(cfg.transmittance[key] * 100)} %</span></label>
                <input type="range" data-trans="${key}" min="0" max="1" step="0.01" value="${cfg.transmittance[key]}">
              </div>`).join('')}
            <div class="note">${tr('editor.transmittanceNote')}</div>
          </details>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('openPlan').onclick = () => this._openPlanEditor();

    this.shadowRoot.querySelectorAll('[data-view]').forEach((btn) => {
      btn.onclick = () => this._emit({ view_mode: btn.dataset.view });
    });

    this.shadowRoot.querySelectorAll('[data-key]').forEach((input) => {
      const key = input.dataset.key;
      const handler = () => {
        let value;
        if (input.type === 'checkbox') value = input.checked;
        else if (input.type === 'number' || input.type === 'range') value = parseFloat(input.value);
        else value = input.value;
        if (typeof value === 'number' && !Number.isFinite(value)) return;

        // Schieberegler dürfen kein Neurendern auslösen — sonst wird das
        // Element beim Ziehen ersetzt. Stattdessen nur die Zahl daneben
        // nachziehen; das übrige Formular hängt nicht an diesen Werten.
        if (input.type === 'range') {
          this._setReadout(key, value, cfg.unit);
          this._emit({ [key]: value }, false);
          return;
        }
        this._emit({ [key]: value });
      };
      // Textfelder erst beim Verlassen übernehmen, damit der Fokus nicht
      // nach jedem Tastendruck verloren geht.
      if (input.type === 'text') input.onchange = handler;
      else input.oninput = handler;
    });

    this.shadowRoot.querySelectorAll('[data-trans]').forEach((input) => {
      input.oninput = () => {
        const key = input.dataset.trans;
        const value = parseFloat(input.value);
        const readout = this.shadowRoot.querySelector(`[data-out="trans:${key}"]`);
        if (readout) readout.textContent = `${Math.round(value * 100)} %`;
        this._emit({ transmittance: { ...this._readTransmittance() } }, false);
      };
    });
  }

  /** Liest alle Durchlässigkeits-Regler aus dem Formular. */
  _readTransmittance() {
    const out = { ...DEFAULT_TRANSMITTANCE, ...(this._config.transmittance || {}) };
    this.shadowRoot.querySelectorAll('[data-trans]').forEach((input) => {
      const value = parseFloat(input.value);
      if (Number.isFinite(value)) out[input.dataset.trans] = value;
    });
    return out;
  }

  _setReadout(key, value, unit) {
    const el = this.shadowRoot.querySelector(`[data-out="${key}"]`);
    if (!el) return;
    const format = {
      opacity: (v) => `${Math.round(v * 100)} %`,
      isotherm_step: (v) => `${v} ${unit}`,
      cell_size: (v) => `${v} px`,
      sensor_radius: (v) => `${v.toFixed(2)} m`,
      yaw: (v) => `${Math.round(v)}°`,
      pitch: (v) => `${Math.round(v)}°`,
      wall_height: (v) => `${v.toFixed(2)} m`,
    }[key];
    if (format) el.textContent = format(value);
  }

  async _openPlanEditor() {
    const cfg = normalizeConfig(this._config);
    const result = await openPlanEditor({
      floorplan: cfg.floorplan,
      pxPerMeter: cfg.px_per_meter,
      background: cfg.background,
      backgroundOpacity: cfg.background_opacity,
      hass: this._hass,
    });
    if (!result) return;
    // `config-changed` verpufft, wenn Home Assistant den Dialog samt
    // Formular in der Zwischenzeit abgeräumt hat — dann wäre die ganze
    // Zeichenarbeit lautlos verloren. Lieber sichtbar melden.
    if (!this.isConnected) {
      console.warn(t(this._lang(), 'editor.dialogClosedWarning'));
      return;
    }
    this._emit({
      floorplan: result.floorplan,
      px_per_meter: result.px_per_meter,
      background: result.background,
      background_opacity: result.background_opacity,
    });
  }
}

function escapeAttr(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
