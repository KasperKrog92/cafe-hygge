# Art — pixel style guide & layout map

All art is drawn programmatically in `js/scene.js` — no image assets. The
scene renders to a **960×600 (16:10) master canvas**; a 16:9 window shows the
**960×540 crop starting at y=36**, and other aspects a variable crop (visible
height 540–600, width 936–960). The overscan strips — top 36 px (upper wall,
picture rail, lamp cords) and bottom 24 px (front floorboards) plus 12 px per
side — are **texture only, never content**. The viewport manager in main.js
cover-fits the window: integer device-pixel scales present pixelated
(1920×1080 and 1920×1200 fullscreen are both an exact ×2), fractional scales
via sharp-bilinear. The scene was migrated from the original 480×270 buffer
by the mechanical transform **x′ = 2x, y′ = 2y + 36**, and the Phase 2
**detail pass** (docs/plans/native-resolution.md, executed) redrew every
region at native resolution: character faces/hands/hair, hero props,
architecture textures, retuned atmosphere and real typography.

## Style rules

- **Whole pixels only.** Integer coordinates, `fillRect`-first drawing. The
  few ellipses (table tops, shadows, rug) read as soft shapes at this scale.
- **Minimum feature size 2 px** (at 960) for art — keeps the cozy chunk; no
  "HD remaster" drift. Two sanctioned exceptions: 1 px rain streaks (finer
  rain is the point) and typography (see *Typography* below).
- **Derived shades, not new hexes.** Clothing folds, hair shine, creases use
  `shade(hex, ±f)` in scene.js (memoized lighten/darken) so the palette stays
  small while pool colors gain depth. Texture noise (floor grain, knots,
  brick tint) uses the deterministic `h2(x, y)` hash — the static background
  renders once, so its randomness must be stable.
- **One ruler: CH = 60 px** (a standing character, head ~20 of it — chibi
  kept). Everything is sized relative to CH (see the table below); the
  proportion pass (docs/plans/visual-proportion-pass.md) unified the scales.
  People are ~24 px wide × 60 tall; seated ~52 (drawn a touch hunched — cozy).
  The cat is ~28×21.
- **The café ruler** (tuned values; ratios between neighbors matter more than
  absolutes): door 102 h (1.7 CH), window 80 h, fireplace breast 120 h
  (firebox 48), counter 42 total (slab 14 + front 28), menu board 108×68,
  floor lamp 68, coat stand ~70, table top at ~32 above the floor (Ø 64),
  stool seat at ~18, armchair ~70. **Deliberate exceptions:** the espresso
  machine (40 h) and pastry case stay a notch above strict scale so brewing
  stays legible — don't "fix" them; mugs stay oversized (charm).
- **Grounding shadows.** Every floor-standing thing (tables, seats, armchair,
  lamp, coat stand, plants, baskets — and every character) gets a soft
  `rgba(20,12,8,~0.2)` contact ellipse. Furniture without one looks unmoored.
- **Warm limited palette.** Woods and creams dominate; color accents come from
  clothing, the red armchair, plants, and pastry pinks. Reuse existing hexes
  before adding new ones.
- **Imperfection is charm**: flames wobble on layered sines, steam drifts on a
  sine, candles flicker with per-seed phase. Nothing should look mechanical.

## Core palette

| Use | Hex |
| --- | --- |
| Upper wall | `#e3cfa7` |
| Wainscot / window sill | `#6e4a33` (lines `#5f402c`) |
| Floor planks | `#9c6b43` (seams `#7d5334`) |
| Counter front / dark wood | `#6b4529`, `#5a3d28`, `#4a3222` |
| Counter slab / light wood | `#a8764a` (edge `#c08a58`) |
| Brick (fireplace) | `#7d4437` + variants `#86493c` `#744033` `#8a4d3d` (mortar `#5f3229`) |
| Flames | back layer `#b5481c` → `#e06a1e` → `#f5a83c` → `#f8dc8a` |
| Armchair | `#8a3d3d` (highlights `#a05252`) |
| Rugs | `#a34d3b` / `#8f5a3a` |
| Crockery | `#e8e0d0`, saucers `#d9d2c0` |
| Cat | `#d98d4a`, stripes `#b5702e`, chest `#f0e0c8` |
| Metal / machine | `#b8bfc7`, dark `#3c414d`, highlight `#d3d9de` |
| Pastry glaze pink | `#d9738a` (light `#e8b4c4`) |
| Chalk / caption text | `#e8dfc9` / `rgba(240,225,195,·)` |

Time-of-day sky colors live in the `DAYKEYS` table (see world.md).

## Layout map (`SCENE.L` — the single source of truth)

```
y=0 ─────────────────────────────────────────────── master top (16:9 overscan)
  picture rail at y≈28; hanging lamps at x=318 and x=614 (cords from y=0)
y=36 ────────────────────────────────────────────── 16:9 crop top
y=98..194  window (x 136–264): sky, town silhouette, rain, sill plants
y=130..232 door (x 28–80), bell at (86,132) — 2-frame hinged swing
y=112..232 fireplace breast (x 344–432): mantel y132 (clock, candles, plant),
           firebox x364–412 y180–228, hearth, firewood basket at x440
y=104..172 menu chalkboard (x 470–578) "CAFÉ HYGGE" + chalk doodle
y=104..162 two shelves (x 636–928): cups, jars, books, teapot, plates
y=176..232 wainscot band
y=224..264 espresso machine (x 656–712) — drawn in the background layer
y=232 ───────────────────────────────────────────── wall meets floor
y=264..306 counter (x 640–940): slab 264–278, front 278–306, baseline 306
           register x748, tip jar x794, pastry case x820–896, flowers x914
           serve spot (the pass) at (744,266); footrail line at baseY-10
y=286      Nora's walking line behind the counter (baristaHome 706,286)
y=368 ───── the walking lane (all pathing routes through here)
(696,316)  order spot; queue fans back-left; pickup at (744,316)
(316,384)  armchair (faces the fire), floor lamp at (286,376)
(196,412)  table 1 "by the window"     (414,426) table 2 "near the fire"
(260,520)  table 3                      (516,524) table 4
           each table: seats at ±52 x facing inward — chair (with back) on
           the left, stool on the right; a lit candle jar on every table
rugs: fireplace rug (388,290), big rug (390,450) — reaches up under the lane
plants: (592,384) and (924,404); coat stand near door at (112,332)
(790,540)  magazine basket, (845,534) firewood stack (the bottom-right corner)
y=576 ───────────────────────────────────────────── 16:9 crop bottom
y=600 ───────────────────────────────────────────── master bottom (overscan)
```

## Depth model (painter's algorithm)

Every furniture piece and character is a `{y, draw}` drawable; the list is
sorted by baseline `y` (feet / front edge) each frame and drawn in order.
Rules that keep it looking right:

- **Background layer** (drawScene) = anything wall-mounted or behind
  everything: wall, window, door, fireplace, menu, shelves, machine, rugs.
  Static parts render once into an offscreen cache; the window, door, wall
  frame, hanging lamps, flames, clock hands, candle flames and machine are
  painted over it every frame (in that order — it preserves the old one-pass
  overlap behavior; the wall frame must paint after the window frame edge).
- **Stools** get baseline just *under* their sitter (stable sort + furniture-
  first push order breaks the tie), so sitters overlap the stool.
- **Tables** get baseline `cy+32` so tabletops overlap a sitter's knees.
- **The counter** is one drawable at baseline 306: it hides the lower body of
  anyone standing behind it. That is why **Nora's y must stay 286** — she
  reads hip-up above the slab (y 264–278), legs hidden. Lower and she
  vanishes; higher and she floats above it.
- **The armchair is split**: back part (baseline 380) draws behind the sitter
  (y 384), the seat-front/armrest (baseline 396) draws in front — the sitter
  nestles *into* the chair.

## People (drawPerson)

A standing character is 60 px (legs 16, torso 24, head 16 + hair); seated
~52, slightly hunched. Poses: `stand`, `walk` (**4-frame** cycle at 8 fps —
stride / passing / stride / passing, 2 px bob and a subtle arm swing on the
passing frames), `sit` (bent legs, lowered head). Standing and seated
characters get a slow 1 px idle breathe (head bob).

Faces: hair-colored brow + 3×4 eye, mouth, soft blush (or a beard, 15% of
patrons). Hands are drawn wherever an arm ends or an item is held (cup grip,
palm under plate, hands on book covers). Hair comes in **four styles** —
0 classic cap, 1 side-part fringe, 2 curly, 3 bun — plus the long-hair back
fall (suppressed by the bun); cap gets a `shade()` shine streak. Clothing:
shoulder light + centre fold + hem on tops, creases on trousers, scarf knot
with hanging tail and fringe, and Nora's apron has neck straps, waistband,
pocket and a tie bow at the back. Options per character: scarf, long hair,
`hairStyle`, `beard`, apron (Nora), `holding` (`cup`/`plate`/`cloth`),
`armUp` 0–1 (sip animation lifts the cup toward the face), `reading` (open
book replaces held items while seated). Facing is ±1 (side profile both
ways); the face details and hair-back column flip with it.

The cat: ears are drawn as base + tip triangles with a pink inner ear on the
facing side, and one ear flicks now and then (sine-gated on `animT`). Tails
are segmented curves — wrapped around the paws when sitting (tip swaying),
raised and arcing in walk (tip sways most), curled along the body in sleep —
with a pale tip; walking/loafing bodies carry back stripes, sitting adds a
muzzle + pink nose, sleeping a closed-eye line.

## Typography

- **Chalk: a 6×10 hand** (`SCENE.chalkText`, `CHALK` glyphs in scene.js) with
  2 px strokes and a ±1 px per-character jitter so boards look hand-written.
  Used on the menu board ("CAFÉ HYGGE", KAFFE / KAKAO / BOLLER + price
  dashes + a chalk heart). Glyph set is caps A–Y subset + É; extend the map
  when a new word needs a missing letter.
- **Captions render as bitmap text**: each caption is drawn once at 10 px
  into an offscreen canvas, thresholded to crisp 1-bit glyphs in the caption
  cream (+ dark shadow copy), then blitted ×2 nearest-neighbour — a 20 px
  pixel-look line with zero font assets. Cached per caption text; fades via
  `globalAlpha`.

## Lighting & effects

See world.md for the lighting pass. When adding art, remember: warm glows are
*additive* and cheap — a new lamp needs a `glow()` call in `drawLighting`
scaled by `pal.lamp`. The table candles are the exception: always lit, their
glow scales with darkness (`1 - daylight`) plus a slow per-table flicker.
Speech bubbles/captions draw after lighting on purpose.

## Adding furniture — checklist

1. Coordinates into `SCENE.L` (never inline).
2. Wall-mounted → draw in `drawScene`. Floor-standing → push a drawable with a
   correct baseline in `furnitureDrawables`.
3. If characters use it, add seat entries / path targets in sim.js reading
   from `L`, and keep clear of the walking lane (y 368 ± 16).
4. Keep it out of the overscan strips (y < 36, y > 576, x < 12, x > 948) —
   they may be cropped on 16:9 displays.
5. Check occlusion at dawn/day/dusk/night (`__world.t` jumps) and with a
   patron seated nearby.
