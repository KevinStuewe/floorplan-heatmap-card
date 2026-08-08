# Grundriss-Heatmap für Home Assistant

Eine Lovelace-Karte, die aus einzelnen Temperatursensoren ein flächiges
Temperaturbild über deinen Grundriss rechnet — und dabei Wände, Türen und
Fenster als Wärmewiderstand behandelt.

Ein Sensor hinter einer Wand ist zwar räumlich nah, thermisch aber weit weg.
Genau das bildet die Karte ab: durch eine offene Tür „fließt" die Wärme,
durch eine Außenwand praktisch gar nicht.

---

## Installation

1. `dist/floorplan-heatmap-card.js` nach `config/www/` kopieren.
2. In Home Assistant unter **Einstellungen → Dashboards → ⋮ → Ressourcen**
   eine neue Ressource anlegen:
   - URL: `/local/floorplan-heatmap-card.js`
   - Typ: **JavaScript-Modul**
3. Browser-Cache leeren, Karte über **Karte hinzufügen → Grundriss-Heatmap**
   einfügen.

Es gibt keine Abhängigkeiten und keinen Build-Schritt — eine Datei genügt.

## Grundriss zeichnen

Im Konfigurationsdialog der Karte gibt es oben den Knopf
**Grundriss & Sensoren bearbeiten**. Der öffnet einen Vollbild-Editor.

| Werkzeug | Taste | Was es tut |
|---|---|---|
| Auswählen | `V` | Objekte anklicken, verschieben, Eckpunkte an den Griffen ziehen, Raummaße rechts eintippen |
| Raum | `R` | Ziehen ergibt ein Rechteck, einzelne Klicks ein Polygon (Enter schließt) |
| Wand | `W` | Freistehende Wände, die keinen Raum begrenzen — Raumteiler, Nischen |
| Tür / Fenster | `D` | Auf eine Wand klicken; die Öffnung rastet darauf ein |
| Sensor | `S` | Messpunkt setzen und eine Entity zuweisen |
| Löschen | `X` | Element anklicken zum Entfernen |
| Maßstab | `M` | Strecke bekannter Länge abklicken und Meterwert eintragen |

Weiteres: Mausrad zoomt, mittlere Maustaste oder Leertaste schiebt,
`Cmd/Strg+Z` macht rückgängig, `Entf` löscht die Auswahl, `Esc` bricht ab.

**Zwei Dinge, die Zeit sparen:**

- Räume werden als geschlossene Polygone gezeichnet — deren Kanten *sind*
  die Wände. Du zeichnest also keine Wand doppelt. Ob eine Kante Außen-
  oder Innenwand ist, erkennt die Karte selbst daran, ob dahinter ein
  anderer Raum liegt.
- Türen sind eigenständige Objekte und nicht an eine bestimmte Wand
  gehängt. Grenzen zwei Räume aneinander, öffnet eine einzelne Tür
  deshalb automatisch beide Raumkanten.
- Grob gezeichnete Räume musst du nicht per Griff nachziehen: mit
  ausgewähltem Raum stehen rechts **Breite** und **Länge** in Metern als
  Eingabefelder. Der Raum wird auf das eingetippte Maß gestreckt, die
  linke obere Ecke bleibt stehen. Türen und Fenster wandern dabei nicht
  mit — nach größeren Korrekturen also kurz prüfen.

## Wie gerechnet wird

Die Karte legt ein Gitter über den Grundriss und löst darauf eine
stationäre Wärmediffusion: **∇·(k∇T) = 0**.

- Die Sensoren sind Festwerte auf einer kleinen Scheibe um ihren Messpunkt.
- Jede Gitterkante bekommt eine Leitfähigkeit `k`: 1 für freie Luft,
  weniger, wenn sie eine Wand kreuzt.
- Gelöst wird mit SOR (Gauß-Seidel mit Überrelaxation). Zwischen zwei
  Sensor-Updates startet der Löser warm vom vorigen Ergebnis und braucht
  dann nur noch wenige Durchläufe.

Die Durchlässigkeit eines Bauteils wird intern in „so und so viele Meter
freie Luft" umgerechnet. Das klingt umständlich, ist aber wichtig: eine
Wand belegt immer genau eine Gitterkante, ein Raum bei feinerem Gitter
aber immer mehr Zellen. Ohne diese Umrechnung würde eine Wand also umso
schwächer, je genauer man rechnet.

Bei den Voreinstellungen fallen rund vier Fünftel des Temperaturunter­schieds
an der Wand ab und nicht im Raum davor. Das entspricht der Realität besser
als eine reine Wärmeleitungsrechnung, weil sich Raumluft durch Konvektion
viel stärker durchmischt, als Leitung allein es täte.

Flächen, die über keinen Pfad einen Sensor erreichen — etwa ein Raum
hinter einer komplett dichten Wand — bleiben leer, statt einen erfundenen
Wert anzuzeigen.

## 2,5D-Ansicht

Mit `view_mode: tilted` werden die Wände aufgestellt und man blickt schräg
auf das Modell. **In der Karte selbst lässt sich mit gedrückter Maustaste
drehen und kippen** — das bleibt eine reine Ansichtssache und überschreibt
die konfigurierten Winkel nicht; ein kleiner Knopf oben rechts setzt sie
zurück.

Türen und Fenster sind dabei keine aufgemalten Symbole, sondern fehlende
Geometrie: eine Tür lässt den Wandquader weg und setzt nur den Sturz
darüber, ein Fenster bekommt Brüstung, Sturz und eine durchscheinende
Scheibe. Man sieht der Wohnung also direkt an, wo die Wärme durchkann.

Die Projektion ist **parallel (axonometrisch)**, nicht perspektivisch. Das
ist nicht nur eine Stilfrage: dadurch ist die Abbildung der Bodenebene eine
affine Transformation, und die fertig gerechnete Heatmap kann unverzerrt
als Bild darauf gelegt werden. Eine perspektivische Ansicht bräuchte eine
Homographie, die Canvas 2D nicht beherrscht — der Boden müsste in Kacheln
zerlegt und stückweise angenähert werden. Verdeckung entsteht über den
Maleralgorithmus; ein Z-Buffer ist nicht nötig, weil jedes Wandstück ein
konvexer Quader ist.

| Wert | Bedeutung |
|---|---|
| `yaw` | Drehung um die Hochachse in Grad, −180…180 |
| `pitch` | Höhenwinkel in Grad: `90` = senkrecht von oben, kleiner = flacher. Unter 12° wird die Bodenmatrix singulär, deshalb dort begrenzt |
| `wall_height` | Wandhöhe in Metern |

Die Bauteilmaße (Wanddicke 24/12 cm, Türhöhe 2,0 m, Fensterbrüstung 0,9 m,
Sturz 2,1 m) sind fest verdrahtet und leiten sich über `px_per_meter` aus
dem Grundriss ab — **auch dafür lohnt sich das Kalibrieren des Maßstabs.**

Das Temperaturfeld ändert sich durch die Ansicht nicht; sie ist reine
Darstellung.

## Konfiguration

Alles ist über den grafischen Editor erreichbar. In YAML sieht es so aus:

```yaml
type: custom:floorplan-heatmap-card
title: Temperaturverteilung
unit: °C
min: 18                 # untere Grenze der Farbskala
max: 26                 # obere Grenze
auto_range: false       # true = Skala folgt den Messwerten
palette: coolwarm       # coolwarm | thermal | viridis | inferno | turbo
opacity: 0.85

view_mode: flat         # flat = Draufsicht | tilted = 2,5D mit Wänden
yaw: -22                # Grad, Drehung um die Hochachse
pitch: 58               # Grad Höhenwinkel; 90 = senkrecht von oben
wall_height: 2.5        # Meter

cell_size: 8            # Gitterauflösung in px, kleiner = genauer, langsamer
sensor_radius: 0.4      # Meter; Fläche um den Messpunkt mit festem Wert
show_isotherms: true
isotherm_step: 0.5
show_walls: true
show_room_labels: true
show_values: true
show_legend: true
px_per_meter: 50
background: /local/grundriss.png   # optionaler Referenzplan
background_opacity: 0.25

transmittance:          # Durchlässigkeit 0…1 je Bauteil
  exterior: 0.02        # Außenwand
  interior: 0.12        # Innenwand
  door: 0.5             # Tür
  window: 0.08          # Fenster
  passage: 1.0          # offener Durchgang

floorplan:
  rooms:
    - id: wz
      name: Wohnzimmer
      points: [[0, 0], [350, 0], [350, 300], [0, 300]]
  walls: []             # nur freistehende Wände
  openings:
    - { id: o1, x: 150, y: 300, angle: 0, width: 50, type: door }
  sensors:
    - { id: s1, x: 175, y: 150, entity: sensor.wohnzimmer_temperatur, name: Wohnzimmer }
```

Koordinaten sind abstrakte Grundriss-Pixel. `px_per_meter` übersetzt sie in
Meter — das brauchst du für Beschriftungen, den Sensorradius und die
Wandstärke-Umrechnung. **Kalibriere den Maßstab einmal** (Werkzeug `M`),
sonst wirken die Wände zu stark oder zu schwach.

`angle` einer Öffnung ist im Bogenmaß: `0` = waagrecht, `1.5708` = senkrecht.
Im Editor wird das automatisch gesetzt.

## Nicht nur Temperatur

Die Karte liest schlicht den numerischen Zustand der zugewiesenen Entities.
Für Luftfeuchtigkeit reichen andere `min`/`max`-Werte und eine passende
`unit`. Lässt du `unit` weg, wird sie aus der ersten Entity übernommen.

## Entwicklung

```bash
node build.mjs                # src/ → dist/floorplan-heatmap-card.js
node --test "test/*.test.mjs" # Solver-Tests
```

Der Build hängt die Module ohne npm-Abhängigkeit aneinander und bricht ab,
wenn zwei Module denselben Namen auf oberster Ebene definieren.

Zum Ausprobieren ohne Home-Assistant-Instanz:

```bash
python3 -m http.server 8777
# dann http://localhost:8777/demo/ öffnen
```

Die Demo baut `hass` nach, zeigt eine Beispielwohnung mit sechs Sensoren
und lässt den Vollbild-Editor öffnen.

### Aufbau

| Datei | Aufgabe |
|---|---|
| `src/geometry.js` | Vektor- und Polygonhelfer |
| `src/palette.js` | Farbskalen und Legendenverläufe |
| `src/model.js` | Datenmodell, Defaults, automatische Wandklassifikation |
| `src/solver.js` | Gitteraufbau und Diffusionslöser |
| `src/isotherms.js` | Marching Squares für Linien gleicher Temperatur |
| `src/renderer.js` | Zeichnen von Feld, Wänden, Türen in der Draufsicht |
| `src/projection.js` | Axonometrische Projektion für die 2,5D-Ansicht |
| `src/scene3d.js` | Baukörper aus dem Grundriss und deren Darstellung |
| `src/card.js` | die Lovelace-Karte |
| `src/editor.js` | Formular im Konfigurationsdialog |
| `src/plan-editor.js` | Vollbild-Grundrisseditor (SVG) |

## Lizenz

MIT
