# Art — pixel style guide & layout map

All art is drawn programmatically in the `js/scene-*.js` renderer files — no image assets. The
scene renders to a **960×600 (16:10) master canvas**; a 16:9 window shows the
**960×540 crop starting at y=36**, and other aspects a variable crop (visible
height 540–600, width 936–960). The overscan strips — top 36 px (upper wall,
picture rail, lamp cords) and bottom 24 px (front floorboards) plus 12 px per
side — are **texture only, never content**. The viewport manager in main.js
cover-fits the window: integer device-pixel scales present pixelated
(1920×1080 and 1920×1200 fullscreen are both an exact ×2), fractional scales
via sharp-bilinear. The scene was migrated from the original 480×270 buffer
by the mechanical transform **x′ = 2x, y′ = 2y + 36**, and the Phase 2
**detail pass** (executed; plan doc retired to git history) redrew every
region at native resolution: character faces/hands/hair, hero props,
architecture textures, retuned atmosphere and real typography.

## Style rules

- **Whole pixels only.** Integer coordinates, `fillRect`-first drawing. The
  few ellipses (table tops, shadows, rug) read as soft shapes at this scale.
- **Minimum feature size 2 px** (at 960) for art — keeps the cozy chunk; no
  "HD remaster" drift. Two sanctioned exceptions: 1 px rain streaks (finer
  rain is the point) and typography (see *Typography* below).
- **Derived shades, not new hexes.** Clothing folds, hair shine, creases use
  `shade(hex, ±f)` in `scene-core.js` (memoized lighten/darken) so the palette stays
  small while pool colors gain depth. Texture noise (floor grain, knots,
  brick tint) uses the deterministic `h2(x, y)` hash — the static background
  renders once, so its randomness must be stable.
- **One ruler: CH = 60 px** (a standing character, head ~20 of it — chibi
  kept). Everything is sized relative to CH (see the table below); the
  proportion pass (executed; plan doc in git history) unified the scales.
  People are ~24 px wide × 60 tall; seated ~52 (drawn a touch hunched — cozy).
  The cat is ~28×21.
- **The café ruler** (tuned values; ratios between neighbors matter more than
  absolutes): door 102 h (1.7 CH), window 80 h, fireplace breast 120 h
  (firebox 48), counter 42 total (slab 14 + front 28), menu board 108×68,
  floor lamp 68, coat stand ~70, table top at ~32 above the floor (Ø 64),
  stool seat at ~18, armchair ~70, bookshelf 120 (2 CH, plus crown), nook
  side-table top ~26. **Deliberate exceptions:** the espresso
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
| Fireside armchairs | `#8a3d3d` (highlights `#9c4848` / `#a05252`) |
| Nook wing chairs | `#4a7a5a` (highlights/fronts derived via `shade()`) |
| Book spines | reuse clothing/accent hexes (`BOOKCOLS` in `scene-furniture.js`) |
| Rugs | `#a34d3b` / `#8f5a3a` |
| Crockery | `#e8e0d0`, saucers `#d9d2c0` |
| Cat | `#d98d4a`, stripes `#b5702e`, chest `#f0e0c8` |
| Metal / machine | `#b8bfc7`, dark `#3c414d`, highlight `#d3d9de` |
| Pastry glaze pink | `#d9738a` (light `#e8b4c4`) |
| Chalk / caption text | `#e8dfc9` / `rgba(240,225,195,·)` |

Time-of-day sky colors live in the `DAYKEYS` table (see world.md).

## Layout map (`SCENE.L` in `js/scene-core.js` — the single source of truth)

Exact positions live in `SCENE.L` only; read them there (or screenshot with
`?dev&overlay`, which labels every anchor). **House rule:** a coordinate
appears in docs only when the sentence is about *why* it has that value —
everything else says "see `SCENE.L.<key>`". The room's shape, top to bottom:

```
y=0   ── master top: 36 px overscan strip (texture only — croppable)
          picture rail, hanging-lamp cords (L.lamp1/lamp2)
y=36  ── 16:9 crop top
          wall band: door + bell (L.door, L.bell), window (L.win), fireplace
          breast with mantel clock/candles + firewood basket (L.fire), menu
          chalkboard, two dish shelves, wainscot, espresso machine
          (L.machine — drawn in the background layer)
y=232 ── wall meets floor (L.wallY — kept high so the floor, the life layer,
          dominates the frame)
          counter along the right (L.counter: slab → front face → baseline;
          register, tip jar, pastry case, flowers on top; serve spot at the
          pass = L.serveSpot); Nora's walking line behind it at y=286
          (L.baristaHome — see depth model for why); order and pickup spots
          in front (L.orderSpot, L.pickupSpot; the queue fans back-left)
          fireside armchair pair flanking the hearth rug, facing in toward
          it (L.armchairs; dir ±1, the right chair is the mirrored art)
y=368 ── the walking lane (L.lane — all pathing routes through this corridor
          between the wall furniture and the tables)
          four round tables (L.tables, tagged "by the window" / "near the
          fire"); each seats two at ±L.stoolDX facing inward — chair (with
          back) on the left, stool on the right; a lit candle jar on every
          table; coat stand by the door (L.coatStand), plants at the
          counter's ends (L.plants), rugs
          reading nook, bottom right (L.library): bookshelf (2 CH + crown;
          browse spot in front, loanable spines vanish while borrowed), two
          green wing chairs each with a side table for the sitter's drink
          and a floor reading lamp, magazine basket at the shelf's foot
y=576 ── 16:9 crop bottom
y=600 ── master bottom: 24 px overscan strip (plus 12 px per side)
```

Tall furniture that can fully hide a walker is declared once in
`L.occluders` (bookshelf, counter) — the layout overlay, `__dev.audit()`,
and the sim all read that one list. Walk targets must never land inside an
occluder's box (see the depth model below for the bookshelf lesson).

Every floor-standing piece also gets a **footprint** box in `L.footprints`
(derived in scene-core.js from the same `L` entries the art uses; drawn in
blue by the overlay). The audit's journey check walks every L-shaped route
against these: no target may *stand* inside one, and no walk leg may *cross*
one — except boxes marked `passable` (the torso-height tables), whose
behind/in-front passes the baseline sort renders correctly. Seats are never
passable: a walker crossing a stool crosses whoever sits on it. New furniture
added to an existing `L` list gets its footprint automatically; a new *kind*
of furniture needs a footprint entry alongside its art.

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
- **Each wing chair is split** (fireside pair and nook pair share one
  construction, `wingChairBack`/`wingChairFront` with a color swatch): back
  part (baseline y−4) draws behind the sitter (y), the seat-front/armrest
  (baseline y+12) draws in front — the sitter nestles *into* the chair.
- **The bookshelf** is one drawable at its `L.occluders` baseline; anyone on
  the lane above it is correctly occluded by it. Keep walk targets (seats,
  bus spots) and walk routes out of its occluder x-span so nobody vanishes
  behind it — Nora busses the nook side tables through the declared clear
  columns (`busVia` on `L.library.sideTables`), and `__dev.audit()`'s
  journey check flags any violation.

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

- **Chalk: a 6×10 hand** (`SCENE.chalkText`, `CHALK` glyphs in `scene-core.js`) with
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
3. If characters use it, add seat entries / path targets in the relevant sim file reading
   from `L`, and keep clear of the walking lane (y 368 ± 16).
4. Keep it out of the overscan strips (y < 36, y > 576, x < 12, x > 948) —
   they may be cropped on 16:9 displays.
5. Check occlusion at dawn/day/dusk/night (`__dev.hour(h)` jumps) and with a
   patron seated nearby; finish with `__dev.audit()` → 0 problems.
