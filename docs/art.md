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
  "HD remaster" drift. Sanctioned exceptions: 1 px rain streaks (finer rain
  is the point), watering droplets, and typography (see *Typography* below).
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
  absolutes): door 102 h (1.7 CH), window glass 176×140, fireplace brickwork 120 h
  with a plastered chimney continuing to the ceiling (firebox 48), counter 42 total (slab 14 + front 28), menu board 116×100,
  floor lamp 68, coat stand ~70, table top at ~32 above the floor (Ø 64),
  stool seat at ~18, armchair ~70, bookshelf 120 (2 CH, plus crown), nook
  side-table top ~26, window-perch cushions 24, window poseur tables ~52 to
  the top (tall on purpose: the top must meet the sill so a perched sitter
  can reach their drink), corner upright piano body 46 (0.77 CH) with an
  18 px brass lamp. **Deliberate exceptions:** the espresso
  machine (40 h) and pastry case stay a notch above strict scale so brewing
  stays legible — don't "fix" them; mugs stay oversized (charm).
- **One projection: 3/4 top-down.** The camera sits above and in front of
  the room. Floor planes are foreshortened and visible (elliptical table
  tops, the rug, stool seats, the counter slab); vertical faces draw
  straight-on; wall-mounted pieces (windows, fireplace, menu, shelves) are
  pure front elevations — that flatness is correct, leave it. Every
  *free-standing* prop needs three cues to sit in the room: a grounding
  shadow (next rule), a straight-on front face, and a **visible top
  plane** — a lighter band a few px tall, scaled to the piece's real depth
  (the counter slab and the table ellipses set the foreshortening). A tall
  piece missing its top plane reads as a cardboard cutout. The bookshelf
  crown now shows a 6 px top; the piano keeps a narrower 3 px lid plane
  appropriate to its side profile and existing cat anchor.
- **Grounding shadows.** Every floor-standing thing (tables, seats, armchair,
  lamp, coat stand, umbrella crock, plants, baskets — and every character) gets a soft
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
| Doormat (coir) | `#8a6142` (border `#4a3222`); darkened via `shade(·, −0.32·rain)` when damp, rain-blue sheen `#cfe0ec` |
| Crockery | `#e8e0d0`, saucers `#d9d2c0` |
| Matcha service | tea `#8a9a4a`; hot bowl uses the crockery pair; iced glass reuses tip-jar `rgba(200,220,230,0.7)`, milk `#e8dfc9`, pastry pink `#d9738a` |
| Cat | `#d98d4a`, stripes `#b5702e`, chest `#f0e0c8` |
| Metal / machine | `#b8bfc7`, dark `#3c414d`, highlight `#d3d9de` |
| Pastry glaze pink | `#d9738a` (light `#e8b4c4`) |
| Chalk / caption text | `#e8dfc9` / `rgba(240,225,195,·)` |

Time-of-day sky colors live in the `DAYKEYS` table (see world.md).

## Material and volume pass (September 2026)

The fixed comparison loop is documented in [art-workflow.md](art-workflow.md).
The café keeps CH=60, the existing layout, and the same warm palette:

- Side-view armchairs have stepped rounded crowns, recessed inner padding,
  button seams, a softly lit horizontal arm roll, cushion piping and a shaded
  skirt. The backrest remains the only vertical; `m()` mirrors every detail.
  Back/front drawable baselines and seated occlusion stay in their original positions.
- Floor lamps have tapered linen shades, broad lower rims, short fold highlights
  and lit wooden stems. Plants have overlapping pointed leaves and tapered
  terracotta pots with an open soil rim. The shared `leaf()` helper lives in
  scene-core; details stay inside the existing plant envelope.
- Tables have restrained satin rim highlights and underside shading; the
  bookshelf has a visible crown plane, lit stiles, shelf recesses and rounded
  book-spine shading. The piano lid shows depth within its existing silhouette.
  The counter slab casts a short shadow onto its bevelled plank face.
  Shelf ceramics have rim and side shading; chrome and pastry-case glass use
  narrow reflections and recessed side tones instead of uniformly flat fills.
- Skin uses derived temple/jaw shadows, cheek highlights and a small profile
  nose. Sweaters have shaded sides and lit shoulders; reading books have page
  markings. Cat resting/walking silhouettes gain haunch and fur highlights.
- Floorboard tones follow staggered joints. Rugs have sparse border stitches
  and low-contrast geometric motifs, with quiet centres. All surface texture
  uses `h2()` and is cached in the static background, never regenerated at random.
- Incident window light and oval reading-lamp pools draw below the furniture
  and its contact shadows. The existing lighting pass still tints and blooms
  the whole scene. See world.md for the time/weather response.

## Layout map (`SCENE.L` in `js/scene-core.js` — the single source of truth)

Exact positions live in `SCENE.L` only; read them there (or screenshot with
`?dev&overlay`, which labels every anchor). **House rule:** a coordinate
appears in docs only when the sentence is about *why* it has that value —
everything else says "see `SCENE.L.<key>`". The room's shape, top to bottom:

```
y=0   ── master top: 36 px overscan strip (texture only — croppable)
          picture rail, counter pendant cords (L.pendants)
y=36  ── 16:9 crop top
          wall band: door + bell (L.door, L.bell), broad low-silled window
          (L.win), fireplace
          breast with mantel clock/candles + firewood basket (L.fire), second
          broad low-silled window (L.win2 — same glass, its own stretch of town; the moon hangs
          in L.win only); passers-by cross both panes as trouser-swatch
          silhouettes on the near pavement, feet cropped by the sill,
          umbrellas up in rain (drawPassersby in scene-bg.js; behavior in
          world.md). Both panes are deliberately much wider and taller than
          one character-height, and their deep sills finish just above the
          wall/floor line: the street is a second living layer, not a narrow
          wall decoration. The door-side window sits close to the fireplace
          bay and carries the persistent street-painter facade (weathered blue
          to muted brick, filled top-down from saved arc progress), ladder, and
          tiny working silhouette. Full rust-red drapes frame both views, with
          broad pleated crowns and long lower folds gathered at mid-window by
          brass tiebacks; enough glass stays open for weather, the street, and
          seated silhouettes to remain glanceable;
          both deep sills are window perches (L.winSeats):
          a back cushion against each side frame (red pair by the door, green
          near the counter — the wing-chair swatches) with one plant between,
          and a slim poseur table under each window (L.winTables) whose top
          meets the sill; then behind the counter: two short dish shelves with
          the menu chalkboard (L.menu) at their right; shelf 1 keeps a clear
          32+ px right-end cat gap, with its displaced books on shelf 2 and
          tiny plant beside the pastry case — two matching counter pendants
          (L.pendants) hang above the shelves and menu — wainscot, espresso
          machine (L.machine — drawn in the background layer)
y=232 ── wall meets floor (L.wallY — kept high so the floor, the life layer,
          dominates the frame)
          counter along the right (L.counter: slab → front face → baseline;
          register, tip jar, pastry case, tiny plant, and the matcha caddy /
          clay chawan / bamboo chasen at L.matchaBar on top; serve spot at the
          pass = L.serveSpot); Nora's walking line behind it at y=286
          (L.baristaHome — see depth model for why); order and pickup spots
          in front (L.orderSpot, L.pickupSpot; the queue fans back-left)
          fireside armchair pair flanking the hearth rug, facing in toward
          it (L.armchairs; dir ±1, the right chair is the mirrored art);
          under window 1, `L.catCorner` holds a worn red cushion plus
          terracotta food and blue-grey water bowls (quantized visible levels)
y=368 ── the walking lane (L.lane — keep this corridor clear
          between the wall furniture and the tables)
          four round tables (L.tables, tagged "by the window" / "near the
          fire"); each seats two at ±L.stoolDX facing inward — chair (with
          back) on the left, stool on the right; a candle jar on every
          table; coat stand and slatted umbrella crock by the door
          (L.coatStand / L.umbrellaStand), a woven coir doormat across the
          threshold (L.doormat, centred on doorSpot — damp arrivals wipe their
          shoes on it; darkens with world.rain), plants at the
          counter's ends (L.plants), rugs
          reading nook, bottom right (L.library): bookshelf (2 CH + crown;
          browse spot in front, loanable spines vanish while borrowed), two
          green wing chairs each with a candle side table for the sitter's drink
          and a floor reading lamp, magazine basket at the shelf's foot
          corner upright, bottom left (L.piano): seen in profile, back to the
          room's left edge — tall narrow dark-wood case, keybed a short stub
          toward the backless bench (cream keys peeking past the cheek, never
          a long row), the score's edge on the rest, toe block and one brass
          pedal at the floor. The lid's three lives stack in DEPTH, not left
          to right: brass lamp arched at the back, saucer spot at the front
          edge, the cat's anchor between — draw order (lamp behind cat, cat
          behind drink) keeps the overlaps honest. Its whole shadow stays
          above the caption strip
          Lunafreya's permanent studio directly above/right of that piano
          (L.artist): a 40×54 canvas on a tall A-frame easel, a backless
          artist stool, a small serviced paint table, and one declared watch
          spot. The easel faces into the room; the canvas grows from saved arc
          progress and rests primed after both works are hung. A floor lamp
          (L.artist.lamp, the library sprite) stands on the open floor left of
          the easel, lighting the canvas after dark
y=576 ── 16:9 crop bottom
y=600 ── master bottom: 24 px overscan strip (plus 12 px per side)
```

Tall furniture that can fully hide a walker is declared once in
`L.occluders` (artist easel, bookshelf, counter) — the layout overlay, `__dev.audit()`,
and the sim all read that one list. Walk targets must never land inside an
occluder's box (see the depth model below for the bookshelf lesson).

Every floor-standing piece also gets a **footprint** box in `L.footprints`
(derived in scene-core.js from the same `L` entries the art uses; drawn in
blue by the overlay). The audit's journey check walks the generated routes
against these: no target may *stand* inside one, and no walk leg may *cross*
one — except boxes marked `passable` (the torso-height tables), whose
behind/in-front passes the baseline sort renders correctly. Seats are never
passable: a walker crossing a stool crosses whoever sits on it. New furniture
added to an existing `L` list gets its footprint automatically; a new *kind*
of furniture needs a footprint entry alongside its art.

The floor planner also avoids `passable` tables when choosing new routes and
shortcuts, with 10 px shoulder and 2 px floor clearance. The `passable` audit
exception remains for authored interaction routes. Run `tools/verify-pathing.js`
in a disposable `?dev` browser for all seat/service pairs, sampled collision
checks (including tables), arrival checks, and distance comparisons.

## Depth model (painter's algorithm)

Every furniture piece and character is a `{y, draw}` drawable; the list is
sorted by baseline `y` (feet / front edge) each frame and drawn in order.
Rules that keep it looking right:

- **Background layer** (drawScene) = anything wall-mounted or behind
  everything: wall, windows, door, fireplace, menu, shelves, machine, rugs.
  Static parts render once into an offscreen cache; the two windows, door,
  Lunafreya's two flag-keyed paintings (above fireplace / above
  door), hanging lamps, flames, clock hands, candle flames and machine
  are painted over it every frame (in that order — it preserves the old
  overlap behavior). The small entrance print is cached with the static wall.
- **Stools** get baseline just *under* their sitter (stable sort + furniture-
  first push order breaks the tie), so sitters overlap the stool.
- **Tables** get baseline `cy+32` so tabletops overlap a sitter's knees.
- **The counter** is one drawable at baseline 306: it hides the lower body of
  anyone standing behind it. That is why **Nora's y must stay 286** — she
  reads hip-up above the slab (y 264–278), legs hidden. Lower and she
  vanishes; higher and she floats above it.
- **Each armchair is drawn from the SIDE, facing `dir`** (fireside pair and
  nook pair share one construction, `wingChairBack`/`wingChairFront` with a
  color swatch). The **backrest is the only vertical element**; it stands at
  the back — behind the sitter, on the side away from the facing direction —
  and draws in the back half (baseline y−4). The **near armrest is a
  horizontal roll** that protrudes forward in the facing direction; it and the
  seat cushion draw in the front half (baseline y+12), so the arm passes in
  front of the sitter and hides their lap and legs — you see them from about
  the waist up. `m()` mirrors the whole thing for `dir = −1`. Do **not** read
  this chair as a front view: there are no left/right wings, just one back and
  one forward-reaching arm.
- **Window perches sit on the wall, not the floor**: a perched sitter's
  baseline is up at the sill, so they sort before all floor furniture and
  render straight onto the background window — cushions draw in the wall
  layer behind them, the poseur table at its floor line in front. The sitter
  hops between the floor spot and the perch in one frame (the same instant
  pose flip every chair uses). Poseur-table footprints are `passable`.
- **Cat aerial perches use their surface baseline** rather than the floor:
  mid-window anchors sort at the lowered sill line (currently y=216) so the
  poseur tabletop overlaps the paw
  line; the bookshelf anchor sits 4 px above its crown; the counter anchor is
  2 px below the slab top so the slab hides the paws; the back-bar anchor
  sits on shelf 1; the piano path touches the keybed stub, then the lid
  (2 px below the lid top, so the lid strip hides the paws), and dismounts
  directly to the clear floor in front. These anchors are deliberately
  exempt from floor footprint rules and instead checked against their
  declared surface by `__dev.audit()`.
- **The piano lamp is its own drawable** one baseline above the cat's lid
  anchor (the wing-chair split, applied to the lid's depth stack): it stands
  at the back of the lid, so a resting cat must cover its stem while the
  case drawable — and the drink drawn with it at the floor baseline — stays
  in front of the cat. Break the stack and the lamp floats over the cat.
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
palm under plate, hands on book covers). Hair comes in **five styles** —
0 classic cap, 1 side-part fringe, 2 curly, 3 bun, 4 Lunafreya's large wrapped
bun with face-framing strands — plus the long-hair back fall (suppressed by
either bun); cap gets a `shade()` shine streak. Clothing:
shoulder light + centre fold + hem on tops, creases on trousers, scarf knot
with hanging tail and fringe, and Nora's apron has neck straps, waistband,
pocket and a tie bow at the back. Options per character: scarf, long hair,
`hairStyle`, `beard`, apron (Nora), `holding` (`cup`/`glass`/`plate`/`cloth`),
`armUp` 0–1 (sip animation lifts the cup toward the face), `reading` (open
book replaces held items while seated), `typing` (forearms alternate toward
the table), `playing` (the same alternating forearm language turned sideways
toward the piano keys, with a 1 px sway), and `dozing` (head and book lower,
eye closes). Lunafreya adds `painting` (the working arm lifts so the brush
strokes ON the canvas panel — not the tray line, where it visually vanishes),
`sketching` (a kraft-covered pad in the lap, dark cover so the pale pages read
against the smock), and a paint-flecked smock overlay drawn as an APRON: a bib
narrower than the shoulders, so it never reads as a held-open book. A furled umbrella
or closed laptop tucks under the mirror-side arm so it can coexist with a
cup. Facing is ±1 (side profile both
ways); the face details and hair-back column flip with it.

Standing and walking bodies also have **front and back views**, driven by
`heading`: the shared walker sets `'down'` on mostly-vertical legs longer
than 24 px heading down the room (door → lane, lane → seat, Nora's exit
column and candle/water descents) and `'up'` on the same legs heading up it
(walking out to the door, returning a cup, Nora walking home); horizontal
legs and arrival clear it, and short vertical hops keep the current view so
nothing flashes mid-journey. State code sets `heading` directly too: Nora
faces the room (`'down'`) while idle at the till. While prepping a drink her
facing follows the station — the espresso-machine steps (`MACHINE_STAGES`) are
on the back wall above her standing line, so she turns her back (`'up'`); the
matcha bar and pastry case are on the front counter, so those she faces the
room. An ordering patron turns heading-up to meet her across the counter.

The **back head is reused on a seated sitter** as well: a window-watcher's gaze
turns toward the glass, which is on the wall behind the seat, so it draws the
back of the head (`gazeFacing`) while the body keeps its seated lean — a doze
keeps the slumped profile instead.

Both views share a step-in-place walk (trailing shoe lifts 2 px on stride
frames, same 4-frame clock), arms hanging at both sides with a 1 px
counter-swing, and held items riding at the hip in the near hand (cup,
matcha bowl, iced glass, plate, cloth, book, level watering can, upright
taper — the can's spout only shows from the front); umbrella and packed
laptop draw unchanged. The **front** head is symmetric: two brows/eyes,
centred mouth, blush on both cheeks, front variants of all five hair
styles, long hair falling both sides; the scarf knot centres and the apron
loses its back-tie bow. The **back** head is hair down to a narrow neck
between two nape tapers — the bun a darker mid-head blob, curls bumping
crown and nape, the side-part a faint groove, long hair one sheet over the
neck onto the shoulders; the back scarf is the wrap band plus one tail down
the back, and the apron shows straps, waistband and a centred tie bow.
`sit`, `stretch` and `reach` always draw in profile.

Nora adds two quiet standing poses: `stretch` (both arms overhead with a
2 px sway) and `reach` (one arm raised for board/candle care). Her held props
also include a copper watering can (level while walking, tipped while
pouring) and a cream taper with a two-tone flame once struck.

The cat: ears are drawn as base + tip triangles with a pink inner ear on the
facing side, and one ear flicks now and then (sine-gated on `animT`). Tails
are segmented curves — wrapped around the paws when sitting (tip swaying),
raised and arcing in walk (tip sways most), curled along the body in sleep —
with a pale tip; walking/loafing bodies carry back stripes, sitting adds a
muzzle + pink nose, sleeping/lap curl a closed-eye line. New variants are a
back-view window perch (haunches, shoulder taper, rear ears, sill-curled tail),
head-down eat/drink with a tiny lapping tongue, kneading loaf with alternating
2 px front paws, quicker-legged pounce, the stretched mid-hop pose, and a
back-shelf/piano-lid tail that hangs and sways below the board or lid.

## Typography

- **Chalk: a 6×10 hand** (`SCENE.chalkText`, `CHALK` glyphs in `scene-core.js`) with
  2 px strokes and a ±1 px per-character jitter so boards look hand-written.
  Used on the menu board ("CAFÉ HYGGE", KAFFE / MATCHA / KAKAO / BOLLER + price
  dashes + one small changing doodle: heart, sleeping cat, steaming cup,
  sprig, umbrella, or bamboo whisk). The doodle id invalidates the static
  background cache only when Nora finishes chalking. Glyph set is caps A–Y
  subset + É; extend the map when a new word needs a missing letter.
- **Captions render as bitmap text**: each caption is drawn once at 10 px
  into an offscreen canvas, thresholded to crisp 1-bit glyphs in the caption
  cream (+ dark shadow copy), then blitted ×2 nearest-neighbour — a 20 px
  pixel-look line with zero font assets. Cached per caption text; fades via
  `globalAlpha`.

## Lighting & effects

See world.md for the lighting pass. When adding art, remember: warm glows are
*additive* and cheap — a new lamp needs a `glow()` call in `drawLighting`
scaled by `pal.lamp`. Table and mantel candles are the exception: their visible
flame and additive glow share the same 0–1 live state, blooming when Nora
lights them and fading after dawn; each keeps its slow phase-offset flicker.
The **fire** is the other such live-state prop: its flame heights
(`drawFireDynamic`), spark rate, glow-pool radius/alpha, and crackle audio all
scale off `world.fire.level`, so the whole hearth dims to embers together and
climbs together when a log goes on — but the coal bed and glow never reach zero
(the ember floor). See the hearth burn cycle in world.md.
Speech bubbles/captions draw after lighting on purpose.
Open laptops are the single cool exception: dark 16×3 base, 14×10 screen,
blue-grey one-pixel text, and a faint radius-18 glow scaled by darkness.

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

## Back-wall refinement — 5 September 2026

The fireplace has a continuous plastered chimney breast with shallow side
shadows, a soldier-course brick lintel, and a wider stone hearth with a visible
front edge. The mantel clock, candles and plant retain their usable positions;
Lunafreya's cat painting still hangs in the clear space above them.

Both rust-red curtains finish just above the sill, with long lower pleats.
Brass casement catches and restrained glass reflections add detail; all exterior
rendering, including rain, is clipped to each window opening. Window reading
ledges stay clear of ceiling pendants, leaving the street views open.
The small print at L.wallFrame
is centered above the entrance, clear of the bell, window trim and later
hearth painting. Back-bar shelf bevels, contact shadows and stepped brackets
clarify how the dishes are supported while keeping the cat's upper perch clear.
Static wall details remain cached.

Ceiling lighting is concentrated at the counter: two matching shallow copper
pendants at `L.pendants`, one above the machine/pass and one above the pastry
case. Their cords continue to the unseen ceiling; equal rim heights and clear
space above the shelves/menu make them read as a pair. Stepped domes widen
downward to broad rims with recessed warm undersides, rather than exposed bulbs.
Shade art and bloom share each pendant's x/y anchor, and each counter pool sits
directly below its source at a height derived from `L.counter.slabY`. Compact
source bloom is clipped below the rim; electric light fades with `pal.lamp`.
The reading areas retain their floor lamps, candles and firelight.

The back-bar menu now sits slightly left and lower at L.menu (808,112), sized
116×100. A six-pixel wooden surround, recessed slate, and projecting chalk
tray give it depth. The centered heading and four rows use wider vertical
spacing, with separate columns for price dashes and Nora's changing doodle;
all six doodles fit inside the frame. Chalk and a small eraser rest on the tray.


## Animation and contact — 5 September 2026

The motion pass keeps the pixel silhouettes and existing furniture projection.
Shoes remain grounded during walking, sip rims meet mouths, piano hands use
`L.piano.keyboardY`, and the whisk hand shares the bowl's animation phase.
Nora's chalk stop is (893, 238), close enough to touch the board; she returns
to her normal y=286 service line afterwards. Cat hops have their own mirrored
crouch/tuck/landing poses. See [animations.md](animations.md) for coverage and
repeatable motion review commands.
