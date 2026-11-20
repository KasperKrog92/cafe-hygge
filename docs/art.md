# Art — pixel style guide & layout map

All art is drawn in code by the `js/scene-*.js` renderer files: no image
assets. The scene renders to a **960×600 (16:10) master canvas**; a 16:9
window shows the **960×540 crop starting at y=36**, other aspects a variable
crop (visible height 540–600, width 936–960). The overscan strips (top 36 px:
upper wall, picture rail, lamp cords; bottom 24 px: front floorboards; 12 px
per side) are **texture only, never content**. The viewport manager in main.js
cover-fits the window: integer device-pixel scales present pixelated
(1920×1080 and 1920×1200 fullscreen are both exactly ×2), fractional scales
via sharp-bilinear.

## Style rules

- **Whole pixels only.** Integer coordinates, `fillRect`-first. The few
  ellipses (table tops, shadows, rug) read as soft shapes at this scale.
- **Minimum feature size 2 px** (at 960): keeps the cozy chunk, no "HD
  remaster" drift. Exceptions: 1 px rain streaks (finer rain is the point),
  watering droplets, typography.
- **Derived shades, not new hexes.** Folds, hair shine and creases use
  `shade(hex, ±f)` in `scene-core.js` (memoized lighten/darken), so the
  palette stays small while pool colors gain depth. Texture noise (floor
  grain, knots, brick tint) uses the deterministic `h2(x, y)` hash: the static
  background renders once, so its randomness must be stable.
- **One ruler: CH = 60 px**, a standing character (head ~20 of it: chibi
  kept). Size everything in CH; see the ruler table.
- **One projection: 3/4 top-down**, camera above and in front. Floor planes
  are foreshortened and visible (elliptical table tops, rug, stool seats,
  counter slab); vertical faces draw straight-on; wall-mounted pieces
  (windows, fireplace, menu, shelves) are pure front elevations, and that
  flatness is correct. Every *free-standing* prop needs a grounding shadow, a
  straight-on front face and a **visible top plane**: a lighter band a few px
  tall, scaled to the piece's real depth (counter slab and table ellipses set
  the foreshortening). Without it a tall piece reads as a cardboard cutout.
  The bookshelf crown shows a 6 px top; the piano a narrower 3 px lid plane,
  fitting its side profile and cat anchor.
- **Grounding shadows.** Every floor-standing thing (tables, seats, armchair,
  lamp, entrance screen, umbrella crock, plants, baskets, every character)
  gets a soft `rgba(20,12,8,~0.2)` contact ellipse, or it looks unmoored.
- **Warm limited palette.** Woods and creams dominate; accents come from
  clothing, the red armchair, plants and pastry pinks. Reuse existing hexes
  before adding new ones.
- **Imperfection is charm**: flames wobble on layered sines, steam drifts on a
  sine, candles flicker with per-seed phase. Nothing should look mechanical.

### The ruler table

Tuned values; ratios between neighbors matter more than absolutes.

| Thing | Size (px) |
| --- | --- |
| Standing person | ~24 wide × 60 tall (CH) |
| Seated person | ~52, a touch hunched (cozy) |
| Cat | ~28×21 |
| Door | 102 h (1.7 CH) |
| Window glass | 176×140 |
| Fireplace brickwork | 120 h, firebox 48; a plastered chimney continues to the ceiling |
| Counter | 42 total (slab 14 + front 28) |
| Menu board | 116×100 |
| Floor lamp | 68 |
| Entrance screen | 42 |
| Table top | ~32 above the floor (Ø 64) |
| Stool seat | ~18 |
| Armchair | ~70 |
| Bookshelf | 120 (2 CH, plus crown) |
| Nook side-table top | ~26 |
| Window-perch cushions | 24 |
| Window poseur tables | ~52 to the top (tall on purpose: the top must meet the sill so a perched sitter can reach their drink) |
| Corner upright piano | body 46 (0.77 CH), with an 18 px brass lamp |

**Deliberate exceptions:** the espresso machine (40 h) and pastry case stay a
notch above strict scale so brewing stays legible; don't "fix" them. Mugs stay
oversized (charm).

## Core palette

| Use | Hex |
| --- | --- |
| Upper wall | `#e3cfa7` |
| Wainscot / window sill | `#6e4a33` (lines `#5f402c`) |
| Floor planks | `#9c6b43` (seams `#7d5334` at restrained opacity) |
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

## Materials and volume

Comparison loop: [art-workflow.md](art-workflow.md). Material detail stays
inside CH=60, the existing layout and the warm palette.

- **Armchairs** (side view): stepped rounded crowns, recessed inner padding,
  button seams, softly lit horizontal arm roll, cushion piping, shaded skirt.
  The backrest is the only vertical; `m()` mirrors every detail. Back/front
  drawable baselines and seated occlusion do not move.
- **Floor lamps**: tapered linen shades, broad lower rims, short fold
  highlights, lit wooden stems.
- **Plants**: overlapping pointed leaves (shared `leaf()` helper, scene-core),
  tapered terracotta pots with an open soil rim, inside the plant envelope.
- **Tables**: restrained satin rim highlights, underside shading.
- **Bookshelf**: visible crown plane, lit stiles, shelf recesses, rounded
  book-spine shading. **Piano**: lid depth within its silhouette.
- **Counter**: slab casts a short shadow onto its bevelled plank face. Till:
  raised display, foreshortened key deck, recessed drawer. Pastry case:
  stepped top plane, shaded right return, restrained glass reflections; its
  two shelves empty and refill with service.
- **Crockery**: shelf, table and held pieces share `ceramic()` (scene-core):
  stepped rims and feet, shaded sides, recessed drink surface. Each caller
  keeps its size, handle direction and hand/surface anchors. The old shop mug
  keeps its brown band, hot matcha its wider bowl. Iced drinks share
  `drinkGlass()` rim, reflection and base across carrying, sipping and table
  poses. Shelf plates have separate rims and undersides, the teapot an open
  handle, jars lid and side depth.
- **People**: derived temple/jaw shadows, cheek highlights, small profile
  nose; sweaters with shaded sides and lit shoulders. Cat resting/walking
  silhouettes have haunch and fur highlights.
- **Books**: seated readers show colored outside covers and spine fold with a
  thin top page edge; turning pages and the reaching hand pass behind the
  covers, peeking above the rim. Borrowed books keep their gold, red or blue
  shelf color while carried and read; the shelf spine stays absent until
  returned. Own books default to warm red.
- **Floor and rugs**: board tones follow staggered joints; seams, grain and
  knots are subdued so open floor stays quiet. Main rug: muted red field,
  narrow binding, sparse border stitches. Smaller rugs: low-contrast geometric
  motifs. All surface texture uses `h2()` and is cached in the static
  background, never regenerated at random.
- **Light on surfaces**: incident window light and oval reading-lamp pools
  draw below furniture and its contact shadows. A shared local light map warms
  nearby surfaces, people and books but keeps their dark seams and contact
  shadows; compact blooms mark the sources. Time/weather response: world.md.

## Layout map (`SCENE.L` in `js/scene-core.js` — the single source of truth)

Exact positions live in `SCENE.L` only; read them there (or screenshot with
`?dev&overlay`, which labels every anchor). **House rule:** a coordinate
appears in docs only when the sentence is about *why* it has that value;
everything else says "see `SCENE.L.<key>`". The room, top to bottom:

```
y=0   ── master top: 36 px overscan strip (texture only, croppable)
          picture rail, counter pendant cords (L.pendants)
y=36  ── 16:9 crop top
          wall band, left to right: door + bell (L.door, L.bell); broad
          low-silled window (L.win); fireplace breast with mantel
          clock/candles + firewood basket (L.fire); second broad low-silled
          window (L.win2, another slice of the SAME waterfront); behind the
          counter two short dish shelves with the menu chalkboard (L.menu) at
          their right and two matching pendants (L.pendants) above; wainscot;
          espresso machine (L.machine) on its own rear cabinet (L.backBar)
          both deep sills are window perches (L.winSeats): a back cushion
          against each side frame (red pair by the door, green near the
          counter: the wing-chair swatches), one plant between, a slim poseur
          table under each window (L.winTables) whose top meets the sill
          shelf 1 keeps a clear 32+ px right-end cat gap; its displaced books
          sit on shelf 2, its tiny plant beside the pastry case
y=232 ── wall meets floor (L.wallY, kept high so the floor, the life layer,
          dominates the frame)
          counter along the right (L.counter: slab → front face → baseline)
          with register, tip jar, pastry case, tiny plant, and matcha caddy /
          clay chawan / bamboo chasen at L.matchaBar; serve spot at the pass =
          L.serveSpot; Lunafreya's walking line behind it at y=286
          (L.baristaHome, see depth model); order and pickup spots in front
          (L.orderSpot, L.pickupSpot; the queue fans back-left)
          fireside armchair pair flanking the hearth rug, facing in (L.armchairs;
          dir ±1, the right chair is the mirrored art); two round wooden side
          tables at the inner arms (L.fireTables), reusing the nook pedestal
          and candle, leave the cat's rug and hearth approach open; each
          carries its own sitter's cup or pastry plate
          cat corner (`L.catCorner`) against the wall below the right window,
          beside the coffee cabinet: red cushion in a compact wicker bed,
          terracotta food / blue-grey water bowls on a woven pad (quantized
          visible levels)
y=368 ── the walking lane (L.lane: keep this corridor clear between the wall
          furniture and the tables)
          four round tables (L.tables, tagged "by the window" / "near the
          fire"), each seating two at ±L.stoolDX facing inward: chair (with
          back) left, stool right; a candle jar on every table
          by the door: low timber entrance screen with brass pegs and a scarf,
          sage ceramic umbrella crock (L.entranceScreen / L.umbrellaStand),
          woven coir doormat across the threshold (L.doormat, centred on
          doorSpot; damp arrivals wipe their shoes on it; darkens with
          world.rain)
          plants at the counter's right end (L.plants), rugs
          reading nook, bottom right (L.library): bookshelf (2 CH + crown;
          browse spot in front, loanable spines vanish while borrowed), two
          green wing chairs each with a candle side table for the sitter's
          drink and a floor reading lamp, magazine basket at the shelf's foot
          corner upright piano, bottom left (L.piano); Nora's permanent studio
          directly above/right of it (L.artist)
y=576 ── 16:9 crop bottom
y=600 ── master bottom: 24 px overscan strip (plus 12 px per side)
```

### Placement and future room use

Before choosing furniture coordinates, read the [progression roadmap](progression-roadmap.md),
its upgrade catalogue and any current improvement brief in [plans](plans/).
Compare the candidate's full visible silhouette and footprint with both the
current room and its documented later uses. Check window repair and use, doors,
exterior sightlines, planned furnishings/improvements, and the space people need
to deliver, install, use and maintain them. Temporary disrepair, missing furniture
and features that have not shipped do not release their documented space.

Known constraints, without inventing a complete future layout:

- Both café windows (`L.win` and `L.win2`) are reserved for repaired windows and
  their exterior views. The roadmap's C3/C5 stages and window-repair catalogue
  preserve that use. Boards are temporary; do not put a bookshelf in front of
  either window. Preserve repair access and the documented sill/perch, drape
  and window-table uses when evaluating nearby furniture.
- The entrance and its access remain available for guests, delivery workers
  and the carried street sign. The main lane and counter order/pickup access
  remain circulation space, including during delivery and installation.
- The full-room reading nook (`L.library`) is a reference for the later reading
  chair, lamp, shelf and browsing relationships. Its coordinates do not establish
  an approved C0 placement: the smaller room must accommodate those relationships
  without silently relying on the planned room expansion. The roadmap also calls
  for counter/kitchen growth, piano, art and terrace access; inspect their relevant
  plans before using space they may need. Unspecified dimensions remain decisions,
  not invented reservations with guessed coordinates.
- The reading chair is the left fireside wing chair at `L.armchairs[0]`
  (298, 296), facing the hearth, with the first fire table beside it: the
  fireside position the fuller room already uses, below the left window's
  right perch (whose `via` 240 descent was designed around it). Its lamp is a
  10 px amber shade on a stem at the back of the side table (x − 1), clear of
  a reader's book; the grey moving-blanket bundle and the unwrapped chair use
  the chair's own footprint while she works from (298, 334).
- Keira's photographs (`L.projects.photo.spot`, 752, 198) are two small prints
  pinned to the wall panel behind the till, right of the machine, below the
  full room's back-bar shelves and left of its menu board; Tomas's pine frame
  (30×15) goes around both there. They are personal keepsakes, not the later
  art display. Upstairs they hang beside the harbour print (`L.home.photo`).
- Lunafreya's stool (`L.counterStool`) is not floor furniture: it lives under
  the counter at the till and appears only as her seated body behind the slab.
  It follows the till, so a later counter extension moves it with the service
  position rather than reserving floor space.
- **Owner correction, 8 September 2026:** a large bookcase at (534,258) was
  rejected for obscuring the right window. The bookshelf purchase is three
  short wall-mounted shelves in the small patch left of the hearth (see
  *Wall shelves and their books*). The large bookcase remains a later idea.
- Keep the cat home beside the coffee station (see *Cat home*) in future
  counter/kitchen planning. Future right-window work should retain access from
  the west; its unbuilt repair choreography must be checked when authored.
  Earlier furnished geometry is a reference, not a reason to preserve a
  conflicting decorative plant.

Only after this check should placement proceed to collision/path audits and
rendered review. A zero-problem audit establishes current simulation clearance;
it cannot approve obscured views or resolve conflicts with future plans. Raise
the specific conflict or missing layout decision with the owner before placement.

### Occluders, footprints and clearance

- **Occluders.** Tall furniture that can fully hide a walker is declared once
  in `L.occluders` (artist easel, bookshelf, counter); the layout overlay,
  `__dev.audit()` and the sim all read it. Walk targets never land inside an
  occluder's box.
- **Footprints.** Every floor-standing piece has a box in `L.footprints`
  (derived in scene-core.js from the `L` entries the art uses; blue in the
  overlay). The audit's journey check walks generated routes against them: no
  target may *stand* inside one, no walk leg may *cross* one, except boxes
  marked `passable` (the torso-height tables), whose behind/in-front passes
  the baseline sort renders correctly. Seats are never passable: a walker
  crossing a stool crosses whoever sits on it. Additions to an existing `L`
  list get a footprint automatically; a new *kind* needs its own entry
  alongside its art.
- **Planner clearance.** New routes and shortcuts avoid `passable` tables by
  18 px side and 14 px depth; the `passable` audit exception remains for
  authored interaction routes. Seats reserve 22 px side and 24 px depth even
  while empty, keeping through traffic off readers' knees; wing chairs reserve
  48 px in front so a passing walker's full silhouette clears the reader. Door
  traffic enters the open floor at `L.entryApproach` before crossing in front
  of the fireside pair.
- **Endpoints.** Close interaction endpoints relax only the first/last leg's
  outside margins; solid furniture stays blocked. Only an actual
  chair/bench/stool (footprint `seat: true`) admits its own sitter on an
  arrival or departure leg. Stops near a plant may relax the adjacent
  clearance margin, never cross its solid box.
- **Check.** Run `tools/verify-pathing.js` in a disposable `?dev` browser: all
  seat/service pairs, sampled collision checks (including tables), arrival
  checks, distance comparisons.

## Depth model (painter's algorithm)

Every furniture piece and character is a `{y, draw}` drawable, sorted by
baseline `y` (feet / front edge) each frame and drawn in order.

- **Background layer** (drawScene): anything wall-mounted or behind everything
  (wall, windows, door, fireplace, menu, shelves, rugs). Static parts render
  once into an offscreen cache; the two windows, door, Nora's two flag-keyed
  paintings (above fireplace / above door), hanging lamps, flames, clock hands
  and candle flames are painted over it every frame, in that order. The small
  entrance print is cached with the static wall.
- **Stools**: baseline just *under* their sitter (stable sort + furniture-first
  push order breaks the tie), so sitters overlap the stool.
- **Tables**: baseline `cy+32`, so tabletops overlap a sitter's knees. On
  dining and side tables, candle jars and flames draw before the serving
  items, so drinks and plates overlap them in front.
- **The counter** is one drawable at baseline 306, hiding the lower body of
  anyone behind it. That is why **Lunafreya's service-line y stays 286**: she
  reads hip-up above the slab (y 264–278), legs hidden. Lower and she
  vanishes. At the rear worktop she steps up to `L.backBar.workY`.
- **Each armchair is drawn from the SIDE, facing `dir`** (fireside and nook
  pairs share one construction, `wingChairBack`/`wingChairFront`, with a color
  swatch). The **backrest is the only vertical element**: behind the sitter,
  on the side away from the facing direction, drawn in the back half (baseline
  y−4). The **near armrest is a horizontal roll** protruding forward in the
  facing direction; it and the seat cushion draw in the front half (baseline
  y+12), so the arm hides the sitter's lap and legs and you see them from
  about the waist up. `m()` mirrors it all for `dir = −1`. Do **not** read
  this chair as a front view: no left/right wings, just one back and one
  forward-reaching arm.
- **Window perches sit on the wall, not the floor**: a perched sitter's
  baseline is up at the sill, so they sort before all floor furniture and
  render straight onto the background window; cushions draw in the wall layer
  behind them, the poseur table at its floor line in front. The sitter hops
  between floor spot and perch in one frame (the instant pose flip every chair
  uses). Poseur-table footprints are `passable`.
- **Cat aerial perches use their surface baseline**, not the floor. Mid-window
  anchors sort at the lowered sill line (currently y=216) so the poseur
  tabletop overlaps the paw line. Bookshelf anchor: 4 px above its crown.
  Counter anchor: 2 px below the slab top, so the slab hides the paws.
  Back-bar anchor: on shelf 1. Piano path: touches the keybed stub, then the
  lid (2 px below the lid top, so the lid strip hides the paws), then
  dismounts directly to the clear floor in front. These anchors are
  deliberately exempt from floor footprint rules and checked against their
  declared surface by `__dev.audit()`.
- **The piano lid's three lives stack in DEPTH**, not left to right: brass
  lamp arched at the back, the cat's anchor between, saucer spot at the front
  edge. The lamp is its own drawable one baseline above the cat's lid anchor
  (the wing-chair split), so a resting cat covers its stem while the case
  drawable, and the drink drawn with it at the floor baseline, stays in front
  of the cat. Break the stack and the lamp floats over the cat.
- **The bookshelf** is one drawable at its `L.occluders` baseline; anyone on
  the lane above it is correctly occluded. Keep walk targets (seats, bus
  spots) and routes out of its occluder x-span so nobody vanishes behind it.
  Lunafreya busses the nook side tables through the declared clear columns
  (`busVia` on `L.library.sideTables`); `__dev.audit()`'s journey check flags
  violations.
- **A carried cat shares its carrier's drawable**: at closing Lunafreya
  carries the sleeping-cat sprite in the same depth-sorted drawable as her
  body, hands beneath it, no floating contact shadow.

## People (drawPerson)

A standing character is 60 px (legs 16, torso 24, head 16 + hair); seated ~52,
slightly hunched. Poses: `stand`, `walk` (**4-frame** cycle at 8 fps: stride /
passing / stride / passing, 2 px bob and a subtle arm swing on the passing
frames), `sit` (bent legs, lowered head). Standing and seated characters get a
slow 1 px idle breathe (head bob). Facing is ±1 (side profile both ways); face
details and the hair-back column flip with it.

- **Faces**: hair-colored brow + 3×4 eye, mouth, soft blush (or a beard, 15%
  of patrons).
- **Hair**, **five styles**: 0 classic cap (with a `shade()` shine streak),
  1 side-part fringe, 2 curly, 3 bun, 4 Lunafreya's large wrapped bun with
  face-framing strands; plus the long-hair back fall (suppressed by either
  bun).
- **Hands** wherever an arm ends or an item is held (cup grip, palm under
  plate, hands on book covers).
- **Clothing**: shoulder light and hem on tops, a front fold or back shoulder
  yoke, creases on trousers, a scarf knot with hanging tail and fringe.
  Profile shirts: a narrower side plane, near sleeve below the ear,
  overlapping trouser legs, far arm hidden by the torso. Apron bibs and
  pockets face forward: narrow front edge in profile, full panel from the
  front, straps and ties from behind. Lunafreya and Nora share this garment
  projection, standing and seated.
- **Options**: scarf, long hair, `hairStyle`, `beard`, apron (Lunafreya),
  `holding` (`cup`/`glass`/`plate`/`cloth`), `armUp` 0–1 (the sip lifts the
  cup toward the face), `reading` (open book replaces held items while
  seated), `typing` (forearms alternate toward the table), `playing` (the same
  forearms turned sideways toward the piano keys, with a 1 px sway), `dozing`
  (head and book lower, eye closes). A furled umbrella or closed laptop tucks
  under the mirror-side arm so it can coexist with a cup.
- **Nora** adds `painting` (the working arm lifts so the brush strokes ON the
  canvas panel, not the tray line, where it visually vanishes), `sketching` (a
  kraft-covered pad in the lap, dark cover so the pale pages read against the
  smock), and a paint-flecked smock overlay drawn as an APRON: a bib narrower
  than the shoulders, so it never reads as a held-open book.

### Front and back views

Standing and walking bodies have front and back views, driven by `heading`.
The shared walker sets `'down'` on mostly-vertical legs longer than 24 px
heading down the room (door → lane, lane → seat, Lunafreya's exit column and
candle/water descents) and `'up'` on the same legs heading up it (walking out
to the door, returning a cup, Lunafreya walking home). Horizontal legs and
arrival clear it; short vertical hops keep the current view so nothing flashes
mid-journey. `sit`, `stretch` and `reach` always draw in profile.

State code sets `heading` too. Lunafreya faces the room (`'down'`) while idle
at the till. While prepping, her facing follows the station: the
espresso-machine steps (`MACHINE_STAGES`) are on the back wall above her
standing line, so she turns her back (`'up'`); the matcha bar and pastry case
are on the front counter, so there she faces the room. An ordering patron
turns heading-up to meet her across the counter.

Both views share a step-in-place walk (trailing shoe lifts 2 px on stride
frames, same 4-frame clock), arms hanging at both sides with a 1 px
counter-swing, and held items riding at the hip in the near hand (cup, matcha
bowl, iced glass, plate, cloth, book, level watering can, upright taper; the
can's spout shows only from the front). Umbrella and packed laptop draw
unchanged.

- **Front**: symmetric head, two brows/eyes, centred mouth, blush on both
  cheeks, front variants of all five hair styles, long hair falling both
  sides; the scarf knot centres and the apron loses its back-tie bow.
- **Back**: hair down to a narrow neck between two nape tapers. Bun: a darker
  mid-head blob. Curls bump crown and nape. Side-part: a faint groove. Long
  hair: one sheet over the neck onto the shoulders. Scarf: the wrap band plus
  one tail down the back. Apron: straps, waistband and a centred tie bow.
- **Back head on a seated sitter**: a window-watcher's gaze turns toward the
  glass, on the wall behind the seat, so it draws the back of the head
  (`gazeFacing`) while the body keeps its seated lean. A doze keeps the
  slumped profile instead.
- **Rear-facing kneeling work** draws hands and tools before the torso and
  sleeves. Only small outer edges show during assembly or hearth work; the
  moving hand cannot appear through the character's back.

### Contact and seated activity

Motion keeps the pixel silhouettes and furniture projection; coverage and
repeatable motion review commands are in [animations.md](animations.md).

- Shoes stay grounded while walking. Sip rims meet mouths; sip elbows connect
  to the moving grip. The whisk hand shares the bowl's animation phase.
- Seated sleeves bend continuously through elbows to prop grips.
- Typing alternates small fingertip taps with held beats, shoulders still.
- Piano wrists reach `L.piano.keyboardY` from connected forearms.
- Reading: a dark cover edge, a supporting arm, a single turning hand
  following the lifted leaf; dozer arms follow the lowered book.
- Sketching keeps a support hand at the pad and joins the pencil hand to its
  elbow. Painting and mixing keep canvas/tray contact with connected wrists.
- Knitting: crossed needle shafts, attached grips, sparse stitch marks across
  the scarf, at its saved progress-driven size.

### Lunafreya's extra poses

- `stretch` (both arms overhead with a 2 px sway) and `reach` (one arm raised
  for board/candle care).
- Held props include a copper watering can (level while walking, tipped while
  pouring) and a cream taper with a two-tone flame once struck.
- **Chalking the menu**: she stops at (893, 238), close enough to touch the
  board, then returns to her y=286 service line.
- **On her stool** she is the ordinary profile sitter at `L.counterStool`
  (712, 286), 8 px lower than standing; the counter hides the stool and her
  lap. Her book (slate `#5a7a8a`) or folded crossword (`#e8e0d0`, a 7 px grid,
  clue lines and a gold pencil) is held 3 px higher than a patron's
  (`p.stool`), so it clears the slab between the cups and the cash tin.
- **Her own coffee**: a cup (or the old shop mug: cream with one `#4a3222`
  band) held at the chest and lifted to her lips on an eased `armUp`.
- **Chin in hand**: near elbow on the slab line (y − 21), hand under her jaw.
- The mug, crossword and paperback also have hip/chest carries for the few
  steps to and from the till.
- **Kneeling at the hearth**: one knee down and one foot planted while the
  brush moves at the hearth lip.
- The first-morning finale adds closed-eye hug, gather, breath and unlocking
  poses at the ordinary character size.
- At home she is drawn without her apron.

### Named characters

All reuse the CH=60 person renderer with fixed colors. Props follow actor
baselines and staff-clearance routes.

- **Marcel**: skin `#b57a4a`, short dark hair, beard, painter's cream top
  `#d8c9ad`, slate trousers (the cream and cap tones of the far-bank figure).
- **Ida**: auburn bun, deep red cardigan `#9c4848`, ochre scarf. Her notes are
  2×4 paper tabs above every third shelved book.
- **Elody**: dark curly long hair, green work jacket `#6b7a55`, rust scarf.
- **Saira**: long black hair with a side-part fringe (style 1), dusty blue top
  `#7a89a5`, navy trousers, rose scarf `#d9738a`; her tapping hand lifts 2 px
  per tap.
- **Birgit**: short light-brown curls (style 2), terracotta top `#b5654a`,
  brown trousers, cream neckerchief `#e8dfc9`, flour-coloured on purpose.
- **Keira**: dark bun, rust jacket, ochre scarf, navy trousers. Her narrow
  wheeled hand trolley carries a strapped ochre kit, is empty after handoff
  and leaves with her.
- **Tomas**: side-parted brown hair, short beard, blue-grey shirt, slate
  trousers; he keeps his wooden tool case. Off-duty visits have neither
  trolley nor tool case.
- **Tomas's daughter**: brown hair up (style 3), terracotta work top, navy
  trousers; carried boards are two pale planks over the shoulder.
- **The window worker**: muted blue work shirt, small handled toolbox, the
  shared kneel/reach animations.

### The cat

- **Ears**: base + tip triangles with a pink inner ear on the facing side; one
  ear flicks now and then (sine-gated on `animT`).
- **Tails**: segmented curves with a pale tip. Wrapped around the paws when
  sitting (tip swaying), raised and arcing in walk (tip sways most), curled
  along the body in sleep.
- **Bodies**: walking/loafing carry back stripes, sitting adds a muzzle + pink
  nose, sleeping/lap curl a closed-eye line.
- **Variants**: back-view window perch (haunches, shoulder taper, rear ears,
  sill-curled tail), head-down eat/drink with a tiny lapping tongue, kneading
  loaf with front paws pressing in turn, a reaching batting paw, the stretched
  mid-hop pose, and a back-shelf/piano-lid tail that hangs and sways below the
  board or lid. Hops have mirrored crouch/tuck/landing poses.
- **Walking**, four views: both profiles, a foreshortened front with cream
  muzzle, a rear with hidden face and a tail rooted at the rump. All four paws
  use offset distance-driven stance/lift phases; the tail follows that cycle.
  Vertical views use the dominant travel direction, even on short approaches.
  The opening `shopWalk` shares these sprites.
- **Small life**: awake faces blink quietly; grooming lifts a cream paw to the
  face; drinking retracts its tongue; the 1.6-second stretch lowers the
  shoulders and reaches forward before releasing. Scarves follow the vertical
  neck and bowing stretch as well as mirrored poses.
- The same cat sprite and scarf appear at home.

## Typography

- **Chalk: a 6×10 hand** (`SCENE.chalkText`, `CHALK` glyphs in `scene-core.js`)
  with 2 px strokes and a ±1 px per-character jitter so boards look
  hand-written. The menu board carries "CAFÉ HYGGE", KAFFE / MATCHA / KAKAO /
  BOLLER, price dashes and one small changing doodle (heart, sleeping cat,
  steaming cup, sprig, umbrella or bamboo whisk). Once the café is named the
  title reads CAFÉ FLOURISH, chalked on a 7 px advance instead of 8 so the
  whole name fits the slate. The doodle id invalidates the static background
  cache only when Lunafreya finishes chalking. Glyph set: caps A–Y subset + É;
  extend the map when a new word needs a missing letter.
- **Captions use readable, antialiased text**: 24 px Jersey 10 with 26 px line
  spacing, warm cream with a 3 px dark stroke (1.5 px outside the letter) and
  a subtle shadow, cached per text on a transparent canvas. No backing
  rectangle or tiny-font thresholding. Lines wrap at 540 master pixels; the
  padded text canvas sits at x=24 with its bottom at y=568, inside desktop
  crops. The caption fade applies to text, outline and shadow together. The
  welcome subtitle is fully opaque; its sound hint uses larger,
  higher-contrast text.
- **Jersey 10** is bundled: the owner chose it as option C in the desktop font
  comparison ([source](https://github.com/google/fonts/tree/main/ofl/jersey10)).
  Font and SIL Open Font License live in `assets/fonts/`; no external font
  service is contacted. The caption cache rebuilds after the font loads, so a
  temporary fallback never stays cached. Its chunky, blocky shapes keep
  ordinary uppercase/lowercase and Danish letters.

## Lighting & effects

See world.md for the lighting pass.

- **Night map.** Café night lighting is an opaque, cached illumination map:
  cool ambient shade, then warm pools over the fixed places reached by lamps
  and fire. Multiplying the scene by it lights faces, books and furniture
  together without lifting dark seams into a foggy halo. Nook lamps reach the
  reading places, pendants the worktop, firelight the fireside chairs. Pools
  stay anchored to the room and never follow a patron. Intensity fades with
  daylight; the daytime palette and hearth bloom remain.
- **The map caches illumination only**, in small intensity steps; it never
  captures sprites or changes simulation state. Open window rectangles keep
  their exterior tint, so indoor pools cannot wash over the distant town.
- **A new lamp** needs a surface-light pool and a restrained source `glow()`
  in `drawLighting`, scaled by `SCENE.lampLevel(world)` and its furniture
  gate. `SCENE.lampLevel(world)` applies the interior switch without changing
  the street's lighting: lamp glows disappear when Lunafreya turns the switch
  off.
- **Candles.** Table and mantel candles use their own 0–1 live flame state for
  pool and bloom, rising when Lunafreya lights them and fading after dawn;
  each keeps its phase-offset source flicker. Mantel light also requires the
  mantel decor.
- **The fire** is the other live-state prop: flame heights
  (`drawFireDynamic`), spark rate, surface-light intensity, source bloom and
  crackle audio all scale off `world.fire.level`, so the hearth dims to embers
  together and climbs together when a log goes on. The coal bed and glow never
  reach zero (the ember floor). Hearth burn cycle: world.md.
- **Curtains** draw across each window independently from
  `world.shop.curtains[0/1]` (0 open, 1 closed), with pixel folds and a
  central seam. Curtain state attenuates that window's incident daylight pool.
- **Order.** Speech bubbles/captions draw after lighting on purpose.
  `composeFrame` applies the overnight fade after the complete room, bubbles
  and caption, so dev captures and the visible canvas share the transition.
- **Open laptops are the single cool exception**: a 22-pixel shallow keyboard
  deck, a straight upright side-view screen hinged at its inner edge,
  blue-grey text glints, and a faint local blue pool with a compact source
  bloom, scaled by darkness. Hidden or closed laptops emit no light. The
  screen faces its sitter; `SCENE.laptopGeometry` shares keyboard and screen
  anchors with hands and light. The keyboard sits near the table edge. Working
  arms draw with the tabletop after the props; bodies keep their seated
  baseline behind the table. Cups sit nine pixels forward beside a laptop, and
  their steam uses the same offset; these near-plane drinks draw after the
  laptop and typing hands, whatever order the items were placed in.

## Adding furniture — checklist

1. Coordinates into `SCENE.L` (never inline).
2. Wall-mounted → draw in `drawScene`. Floor-standing → push a drawable with a
   correct baseline in `furnitureDrawables`.
3. If characters use it, add seat entries / path targets in the relevant sim file reading
   from `L`, and keep clear of the walking lane (y 368 ± 16).
4. Keep it out of the overscan strips (y < 36, y > 576, x < 12, x > 948):
   they may be cropped on 16:9 displays.
5. Check occlusion at dawn/day/dusk/night (`__dev.hour(h)` jumps) and with a
   patron seated nearby; finish with `__dev.audit()` → 0 problems.

## The café, place by place

### Back wall

- **Fireplace.** Continuous plastered chimney breast with shallow side
  shadows, soldier-course brick lintel, wider stone hearth with a visible
  front edge. Mantel clock, candles and plant keep their usable positions;
  Nora's cat painting hangs in the clear space above them.
- **Windows and drapes.** Full rust-red drapes frame both views: broad pleated
  crowns, long lower pleats gathered at mid-window by brass tiebacks,
  finishing just above the sill. Enough glass stays open for weather, the
  street and seated silhouettes to stay glanceable. Brass casement catches and
  restrained glass reflections add detail. All exterior rendering, rain
  included, is clipped to each window opening. Window reading ledges stay
  clear of ceiling pendants, leaving the street views open.
- **Entrance print.** The small print at L.wallFrame is centered above the
  entrance, clear of the bell, window trim and later hearth painting.
- **Back-bar shelves.** Bevels, contact shadows and stepped brackets show how
  the dishes are supported while keeping the cat's upper perch clear. Static
  wall details stay cached.
- **Pendants.** Ceiling lighting is concentrated at the counter: two matching
  shallow copper pendants at `L.pendants`, one above the machine/pass, one
  above the pastry case. Cords continue to the unseen ceiling; equal rim
  heights and clear space above the shelves/menu make them read as a pair.
  Stepped domes widen downward to broad rims with recessed warm undersides,
  not exposed bulbs. Shade art and bloom share each pendant's x/y anchor; each
  counter pool sits directly below its source at a height derived from
  `L.counter.slabY`. Compact source bloom is clipped below the rim; electric
  light fades with `pal.lamp`. The reading areas keep their floor lamps,
  candles and firelight.
- **Menu board.** At L.menu (808,112), sized 116×100. A six-pixel wooden
  surround, recessed slate and projecting chalk tray give it depth. The
  centered heading and four rows use wide vertical spacing, with separate
  columns for price dashes and Lunafreya's changing doodle; all six doodles
  fit inside the frame. Chalk and a small eraser rest on the tray.

### Rear coffee station

`L.backBar` is a separate wooden cabinet against the wall: broad top plane,
overhanging edge, recessed cupboard fronts, floor contact shadow. The espresso
machine's base visibly rests on the worktop; stacked saucers and a folded
towel show the clear prep end. A strip of floor remains between cabinet and
serving slab. `SCENE.drawCoffeeStation` paints cabinet then machine as one
furniture drawable at the cabinet baseline, before Lunafreya and the front
counter; its solid footprint participates in routing. Lunafreya approaches
`L.backBar.workY` for machine stages and returns to `L.baristaHome.y` for
front-counter work and service. Machine station x positions derive from
`L.machine`; the cat transit anchor follows the warming tray.

### Cat home

The full-size cat has a compact wicker bed at (620,246), against the wall
below the lower-right corner of the right window, immediately left of the
coffee cabinet. Its woven pad is present from C0: part of the bed, not a
room-rug purchase. Shared reservation: x602–638/y232–266. Food and water bowls
sit at (610,262)/(628,262); the cat faces each bowl from its own feeding
anchor. Lunafreya approaches at (590,274), crouches to pour, and
gathers/lowers the cat with hands following its body. The bed's baseline
matches the resting cat so the rim cannot paint over it.

No decorative floor plant or watering stop stands at (612,262). The
counter/rightmost plants and purchased first sill plant keep their use. The
window view, sill-length drapes, window-seat access and coffee staff exit stay
available.

### Entrance bay and door

- **Screen.** A side-on, 42 px timber screen defines the entrance aisle:
  receding cap, recessed near post, brass pegs, hanging sage scarf. Two-pixel
  slices sort by their own floor baselines; four conservative footprint boxes
  derive from `L.entranceScreen` and keep the real entrance routes clear. It
  is lower than a standing character and needs no full-height occluder.
- **Umbrella stand.** A small sage ceramic crock at its real drop-off/pickup
  position, with live contents. Umbrellas are centered as a group inside the
  recessed opening, drawn over its back rim and behind the near lip; their
  folded fabric continues into the crock.
- **Door.** Hinged animation, recessed lower panels, brass lever, beveled
  frame/threshold.
- **The open door** (`SCENE.drawDoorStreet`, scene-waterfront.js), in game and
  idle café alike, shows the same street as the windows: the waterfront is
  painted over the door's span, so far quay, water, railing and pavement carry
  on to the left with their joints and posts in phase, and one extra far house
  (x 30, sage) stands where only the door can see it. Below the pavement the
  near paving runs down to a stone step, and outside patrons on the terrace
  pass across it. In the game the first-day walk outside, the NEW CAFE sign
  and Marcel's sign stand on that near paving by the step.

### Street signs

**The "NEW CAFE" sign** uses two uneven scrap boards, nail marks and
hand-painted 3×5 letters (a wider W). `L.intro` owns its storage, pickup and
porch anchors; the pickup stands just in front of the stored sign, so it moves
only from wall to hands. Held from behind, the sign is clipped to the board
ends that show past her body. It is carried visibly and lowered outside
through the clipped doorway, where she walks out and back over the sill (the
clip hides her feet); the door leaf occludes the porch correctly.

**Café Flourish** is Marcel's painted board (`SCENE.drawFlourishSign`) on the
same little legs: a dark green frame `#3f5a44` round a green panel `#4a7a5a`,
CAFÉ in the first sign's blocky 2-pixel letters and FLOURISH in narrow
1×2-pixel ones, both cream `#f5e8cb`, with a gold `#c9a04a` swash under the
name that curls up at both ends (left out for "plain"). It stands on the
doorstep at full size, 11 px left of the first sign's place so it sits inside
the door opening; while both are out the first one stands in front of it.

In the idle café Marcel's sign stands out on the pavement instead: centred in
the doorway at the terrace's depth (`terraceY + 2`), drawn by
`SCENE.drawFlourishSignFar`, a 34×19 board on short legs with CAFÉ and
FLOURISH in one-pixel letters and a short gold swash, so it reads at a
distance without the blur of scaling the full sign down. The idle café is
already named (`cafeSign` installed, `cafe-named` set).

### Piano corner and Nora's studio

The corner upright (L.piano) is seen in profile, back to the room's left edge:
tall narrow dark-wood case, keybed a short stub toward the backless bench
(cream keys peeking past the cheek, never a long row), the score's edge on the
rest, toe block and one brass pedal at the floor. Its whole shadow stays above
the caption strip. The lid's depth stack is in the depth model.

Nora's studio (L.artist): a 40×54 canvas on a tall A-frame easel, a backless
artist stool, a small serviced paint table and one declared watch spot. The
easel faces into the room; the canvas grows from saved arc progress and rests
primed after both works are hung. A floor lamp (L.artist.lamp, the library
sprite) stands on the open floor left of the easel, lighting the canvas after
dark.

### Waterfront

`scene-waterfront.js` composes one exterior behind both panes. Banks, path,
terrace and worker's building read `L.waterfront`; the two windows keep their
own framing and sill positions. Top to bottom: a little sky, warm pitched-roof
apartment blocks on the far quay, reflective blue-green water, then a nearby
footpath with railings, lamps and two bistro tables.

- **Facades**: warm ochre, terracotta, weathered blue and pale sage, with
  pitched tile roofs, small dormers, cornices, doors and sash windows. The
  reserved painter's facade, the door-side building on the FAR quay, changes
  from blue to terracotta with saved progress, preserving the seven-day
  repaint arc, ladder and tiny working figure. Fixed architecture uses
  deterministic detail; night shades use a small quantized palette to keep the
  shade cache bounded.
- **Water**: broken facade/window reflections and sparse slow ripple lines.
  Sailboats and rowing boats sit between the quays.
- **Near pavement**: rails locate its far edge; low-contrast paving joints
  leave the terrace legible. Bistro tables have elliptical tops, pedestal
  feet, two chairs and an owner-linked cup. One guest occupies each table; the
  opposite chair keeps Lunafreya's approach visible. Passers walk behind the
  terrace guests.
- **People**: outdoor patrons and Lunafreya are rasterized with the person
  renderer and shown at half size with nearest sampling (the indoor ruler
  remains CH=60), so clothes, book, sip, gait and Lunafreya's apron stay
  recognizable without a second cast. Near-path silhouettes are 26–30 px tall
  with visible feet above the sill. The worker across the lake is more distant
  still.
- **Sky and light**: one sun and one moon move across the full exterior; the
  wall naturally hides their middle crossing. Sunlight projects away from the
  actual sun position: morning and afternoon beams reverse direction and low
  sun lengthens them. A cloudy sky softens the floor beams and indoor glow
  together. After dusk, lit sash windows, streetlamp pools, stars and the moon
  make the same geography visible at night.
- **The wooden sailing ship**, an occasional lake visitor, is an 84-pixel
  timber hull with two masts up to 60 pixels above its waterline,
  substantially larger than the 24-pixel small boats. Cream gaff sails,
  stepped rigging, a bowsprit, ochre strake, stern windows, three tiny crew
  and a muted red pennant establish its silhouette. Mirroring in local integer
  coordinates supports both headings. Its wake/reflection, subpixel travel
  rounded for drawing and restrained one-pixel bob share the waterfront
  lighting and both panes' continuous clipping. Window visitors use a
  back-facing standing pose and an animated raised hand; pavement figures stop
  their stride and raise an arm.

### Closing and opening

The counter pastry-case shelves empty during closing and refill during
opening. Lunafreya and the carried cat disappear only after reaching the door.
Switch and pastry work positions live in `L.shop`; other chores reuse existing
layout anchors.

## The first café (C0) and its improvements

Fresh saves show boarded-over windows, a 176 px counter and 84 px coffee
bench. The small machine, grinder, kettle, cups and tiny cake stand appear as
Lunafreya sets them out. There are no room rugs, drapes, wall menu or
fireplace decorations. First setup includes the entrance doormat/umbrella
stand and the wall-backed cat corner beside the coffee station. Two table sets
appear in assembly stages, then join the usual depth-sorted furniture.
Optional furniture and its floor geometry share saved availability flags.
Existing saves retain the fully furnished room.

C0 occupies 832×516 master pixels (832×468 at 16:9). The counter ends just
inside the right edge and the floor shortly beyond the two tables. Full-room
art remains 960×600 for expansion.

### The partition

The partition around the small room (`L.expansion`) is plain plasterboard
`#d9d0bd` with stud marks `#b8ae98`: an 8 px right run along x 832 from the
back wall (its end standing full height against the wall) to the front, and a
front run along y 516 drawn cut away low (a 4 px cap and a 12 px face) so the
room stays in view. Beyond it the strips are dimmed (dusty storeroom floor and
wall) until the room opens. The dust sheets are one worn grey-cream cloth per
strip `rgba(172,163,146,.9)` with creases and a ragged loose end, dark enough
that captions over the front strip stay legible. Where the partition stood a
dark line shows until new boards `#b8875a` are fitted.

### Windows, curtains and the fuller room's places

The first repair opens `L.win` only. The right pane stays boarded, including
its floor projection and ambient window glow, until its own repair
(`L.projects.window2.work`, same phases and drawing). Saved work first reveals
the upper view, then the rest of the glass; completion restores the full
frame, reflection and sill drawing. The worker's anchor is
`L.projects.window.work`; the lane and tables stay clear. Window repairs use
the wall renderer and worker actor only; they must not enter the fireplace
prop branch, whose floor anchors do not exist on window projects.

Curtains follow from `SCENE.curtainStage`: the rail, then the cloth, one
window at a time from Tomas's ladder (`L.projects.drapes`).

The front tables, rugs, chalkboard, back-bar shelves and second fireside chair
use the fuller room's established coordinates; in a game, footprints at
`L.tables[2]` and `[3]` activate through `-site` ids from the kit's delivery
morning.

### Gerda's window table and pillows

The project uses the reserved left `L.winTables[0]` at (216,222), baseline
274, and its two `L.winSeats` approaches/perches. No right-window furniture is
enabled. The small circular top, narrow post and foot match the window-table
art. Lunafreya works from the clear anchor `L.projects.windowSeat.work`
(216,292); kit, post and tabletop appear in saved stages. Repair, drape, shelf
and entrance access stay available.

Gerda's two rust-red cable-knit pillows draw against the side frames on the
sill, warm highlights tracing a few stitches at native scale. The same pillow
renderer draws her visible carried pair, then a single pillow after the first
placement. Each permanent pillow appears only after its own saved placement;
the two perches are enabled once both are down. Existing furnished saves
retain their earlier cushions.

### Fireplace: boards, cleaning and mantel

The modest café's firebox starts with three nailed horizontal timber boards
across its opening and no visible logs. Masonry, plastered flue and low hearth
stone are there; the projecting wooden mantel and corbels are absent.
Unboarding removes one board at each saved six-second boundary. The first
completed improvement adds only a functional fire and its logs.

**Cleaning.** `L.projects.fireplace` puts the supplies at (390,246) and
Lunafreya at (390,274). Ash patches disappear by remembered phase; the clean
stone lip remains. Fire, glow and sparks stay off during the chosen cleaning.

**Mantel.** The project uses the established shelf/corbel envelope at y132–152
and its clock, two candles and plant. The shelf appears once mounted, its
decorations after the final phase. `L.projects.mantel.work` is (390,254),
directly in front of the firebox. Tomas uses a narrow ladder with an 80-pixel
rise, entirely within the hearth frontage; he descends before leaving. The
left wall shelves, window sills and drapes keep their clearance. This purchase
adds no unrelated wall picture.

### Table assembly

`L.projects.table` is centered at (568,450), with Lunafreya working at
(568,496). The set occupies the open space between the fire table and lower
dining table. Its table and seat footprints are reserved from the outset;
parts stay inside that envelope, away from the main lane. Completed art uses
the ordinary dining table/chair/stool renderer and derives from the same state
as usable seats. The intermediate renderer in `scene-home.js` shows the
carton, loose wood, pedestal/top and assembled seats; a cloth and screwdriver
rest during pauses. The empty reserved site casts no shadow while scheduled or
being carried in. The carton has its own contact shadow; the broad table
shadow appears only with the assembled pedestal/top, from the fitting phase
onward.

Table assembly and hearth cleaning run in the untouched furnished café, which
remains the prototype baseline; this is not C0.

### Wall shelves and their books

`L.projects.bookshelf` places three 18-pixel boards at x320–338, y172/195/218,
in the small patch left of the hearth. The full shadow/bracket envelope ends
at x339/y227. Space for 20-pixel book spines starts at y152, below the
projecting mantel/corbel. The left window's sill ends at x318; drapes stay
farther left at these heights, and hearth stone starts at y228. Both window
views, their repair access and the firebox stay clear. The boards are drawn in
the wall pass and have no permanent floor box.

Keira's work anchor is (328,252), with a compact kit at (328,248). Its visible
unfinished floor box is x318–338, y240–248; folding steps lift her for the top
board. The kit's reservation lasts only as long as the physical kit, including
safe overnight partial work; packing removes it. Review with open windows,
open/closed drapes and the later fireside chairs confirms both the wall
silhouette and installation route. This placement does not reserve or
implement a new cat corner.

**Books.** Spines are 3–5 px wide and 11–15 px tall, four to a board (a row
never exceeds 17 px of the 18 px board), lower board first. Each source has
its own six designs in `SCENE.bookDesigns` (the purchased box: red/gold,
green, blue with a cream band, ochre, plum/gold, teal): a lit left edge,
shaded right edge, optional bands and a cream label on wider spines. The open
carton (20×12, same place and footprint as the shelf kit) shows its remaining
spines. Lunafreya works from (352,252) on the hearth side: a side-on
`boxCrouch` over the carton, then a standing side reach with the book upright
at her fingertips. Readers stand at (304,256) on the window side, facing the
wall, and reach along the spines only with free hands (a cup-holder just
looks). Both spots keep the boards, the window perch and the firebox in view.

### The first plant

`L.firstPlant` names the entrance parcel position, its reachable work spot and
the left window sill destination. It adds no floor collision or seat change.
`SCENE.plantDrawables` reads one persisted job stage for
parcel/carry/unwrap/lift or installed art. `composeFrame` selects home or
café, so offscreen shots and the live canvas share it. A rendered plant is
never the persistence trigger.

### The bought piano

It arrives as a grey-blue blanket bundle strapped on Keira's dolly (25×41, two
dark straps) and waits in its corner as a bundle just larger than the upright
(a corner turned back while it is unwrapped); then the bare upright is drawn
until the lid, bench and lamp arrive with the finished set. Tomas walks beside
the dolly.

### Keepsakes and pinned things

- **Maud** is a 10-pixel terracotta pot with a paper label, three green leaves
  and a pink flower (`SCENE.drawMaud`): on the counter at (766,264) between
  the cash tin and cake stand, or on the bedroom sill clear of the curtain.
- **Saira's score** (`SCENE.drawScore`) is one 11×14 sheet of off-white
  manuscript paper with three pencil staves, a few graphite notes, the paler
  ghosts of a rubbed-out line and a pink pin: in the café on the wainscot at
  (784,196), right of the photographs' place and clear of the back-bar shelves
  and the menu board (placed from (774,274) behind the counter); upstairs on
  the wall above the bed at (786,192), clear of the headboard lights. On the
  counter it waits as a folded sheet with two stave lines.
- **Birgit's paper bag** of two small tastes is a 10×10 folded white bag on
  the counter's free left end. **Her recipe card** (`SCENE.drawRecipe`) is an
  11×8 index card with a pink top rule, brown handwriting, a crossed-out red
  note in the margin and a floury thumbprint: leaning at the counter's right
  end at (810,265), past the cake stand and left of the fuller room's pastry
  case (placed from (790,286)); upstairs pinned on the bare upper kitchen wall
  at (172,394), left of the light.
- **Gerda's blanket** is drawn by one helper (`SCENE.drawBlanket`): winter
  blue `#3d4a5c` with a gold dot grid (stars) or sage `#6b7a55` with light
  vertical reeds, a lit top edge and shaded bottom. Folded (18×7) it waits on
  the counter's free left end (x666), rides in her arms, or sits on her bag at
  home; downstairs it is folded over the top rail of the table-hearth chair
  with one end hanging toward the room, drawn inside that chair's drawable so
  a sitter covers it correctly; upstairs it lies across the lower duvet. Her
  lap knitting shows the same colour and marks while it grows.
- **The old shop mug** is a 5×7 cream mug with a dark band: on the desk left
  of the keyboard, or on the back bar right of the kettle (x724; x788 on the
  full counter).
- **Calandra's letter** lies at the desk's left end (11×4, cream, red stamp).
- Invitation icons `letter` and `mug` join the bubble set.

## The apartment

`scene-home.js` composes a sparse room within the same 960×600 master, with no
image assets or second rendering engine. Home anchors and the clear walking
lane live in `L.home`, including both utility-room bounds, door gaps and
fixture anchors.

- **Room.** Warm floorboards, a night window, basic desk/chair/PC and reading
  light, a bed and light, suitcase and seven moving boxes. Bare counters and
  walls keep the just-moved-in feel. Props keep top/front/side tones and
  contact shadows. Small rain streaks keep the scene alive. Boxes remain owned
  scenery in this slice; gradual unpacking belongs to H1.
- **Kitchen and bathroom** occupy the bottom left, bringing one extra open box
  of dishes. Cream-gray kitchen tiles and muted sage bathroom tiles
  distinguish them. Rear walls are 96 px tall, with a low tiled splash zone
  and bare upper plaster reserved for future shelves and a mirror; only the
  side/front walls are cut away. Doorways sit to the right of each fixture
  run.
- **Kitchen.** Sink, two-ring cooker/oven and small fridge share the rear
  wall, with no floor strip behind them; one mug and a towel are unpacked. It
  supports supper preparation and rinsing.
- **Bathroom.** Basin and toilet cistern sit against the back wall, the bowl
  facing open floor with clear approach space in front. The shower hugs the
  left wall, its pipe and gathered curtain on the left; basin and toilet sit
  to its right, clear of the doorway. It supports bedtime brushing.
- **Doors.** Both entrances have paneled wooden doors with brass handles. The
  kitchen leaf rests open inward beside the right jamb; the bathroom is closed
  by default. Its leaf swings open ahead of Lunafreya's bedtime crossing,
  closes while she brushes, and opens again for her exit. The swing is
  reconstructed from her saved route, so reload and attended pauses keep the
  visible state. Door leaves use whole-pixel columns and their projected floor
  baselines.
- **Bed and chair.** The bed is tucked into the rear-right corner: paneled
  headboard, thick mattress, two pillows, folded duvet, low timber rails and
  feet, and an explicit side approach. The PC chair has a padded seat and full
  backrest on a wheeled pedestal; separate depth layers place Lunafreya
  between the cushion and the near backrest.
- **Depth.** The floor ends at y=550, within the desktop crop. The walking
  lane is at y=350, above the rear wall tops, keeping passing characters
  visible. Rear walls sort at their y=454 floor line; fixture baselines
  include their projected depth from that wall. Furniture, ladder, sleeper and
  cat share the room's depth draw list. The bedside lamp sorts separately at
  its own foot, behind Lunafreya when she stands beside the bed, not at the
  bed's foreground baseline.
- **Evening light.** A cool, dark ambient light map with localized warm pools
  from the desk and bedside lamps and a smaller blue monitor glow.
  `L.home.lamps` owns shade and base positions; the bedside floor lamp stands
  high enough to light the pillow and reading book. Utility-room rear walls
  block these pools, leaving the empty kitchen and bathroom in shadow. A small
  kitchen wall light illuminates its walls, fixtures and floor when Lunafreya
  crosses the door threshold and turns off as she leaves, including during
  interrupted bedtime. Four subdued moonlit panes project down-left onto the
  floor, weakening with rain and narrowing with the actual curtain edges until
  closed. Exterior glass and luminous lamp/screen surfaces keep their
  brightness; people, props and contact shadows share the same multiply pass
  before captions/dialogue. The light map is cached by curtain pixels,
  quantized weather and kitchen occupancy, without capturing or mutating the
  simulation.
- **Supper.** `L.home.kitchen` owns the light, doorway/aisle/work anchors and
  preparation plate. Bread and cheese appear on a cream plate, travel in her
  hand, and diminish while she eats beside the keyboard. Preparation, washing
  and a slower hand-to-mouth desk pose accompany the saved supper routine.
- **First evening.** The first tour opens the box beside the PC, assembles the
  timber coat hanger left of the door and hangs sage drapes on the window. A
  temporary stepladder puts Lunafreya's hands at the curtain rod; the cat
  waits below. At bedtime, drapes slide inward, a small blue toothbrush moves
  at her mouth, and the duvet covers her shoulders beneath the pillow; the cat
  sleeps beside her. All route/prop anchors live in `SCENE.L.home.story`.
- **Unpacked belongings.** A framed harbour print (26×22) above the desk's
  right, three postcards by the door, a woven rug ellipse by the bed (under
  people), five spines on the bedroom sill right of Maud's place, folded
  jumpers (blue, ochre) on the suitcase, a kettle on the hob's right ring with
  a second red mug, and warm bulbs every 9 px along the headboard rail with a
  small glow drawn after the home lighting. Folding flattens the carton in
  place.

## Interface

- **Startup choice.** The entry screen presents two large keyboard-accessible
  buttons: gold **Play the game** and dark warm-brown **Enjoy an idle café**,
  with short descriptions of saved story play and unsaved ambience, in the
  cream/gold palette and serif type. The idle café uses the fully furnished
  room and placements; it hides savings and game-only settings. Controls still
  fade when the mouse rests.
- **Speech bubbles.** `scene-intro.js` renders cream speech bubbles through
  `SCENE.composeFrame`. Complete sentences are wrapped before revealing at
  13 px Georgia, with at most three lines. The bubble follows the owner's feet
  without walk bob and stays inside the small-room desktop crop. Only the
  first line carries her name. The small dialogue controls sit above the
  ordinary control bar; complete sentences also reach an accessible live
  region. Stationary game-mode invitations and speaker-attached cream bubbles
  use this presentation.
- **Holger's first invitation** uses the dots bubble with a slow opacity cycle
  (two seconds, never fully invisible). Its hit target stays fixed and active;
  opening it stops the cycle, and reduced-motion preference keeps it steady.
- **Conversation framing** uses a gentle maximum 1.3× zoom, keeping more of
  the café visible. The camera includes the complete dialogue bubble and both
  speakers, inside the room and camera crop; side approaches clear the
  reserved kit and the zoom keeps their feet in frame.
- **Savings display (temporary).** Mouse movement reveals the current saved
  balance 18 CSS pixels from the stage's upper-right corner, in both the café
  and apartment. A small gold pixel-art coin and Jersey 10 numerals sit on a
  translucent dark panel. This DOM overlay stays inside fullscreen, allows
  clicks through to the scene, and fades over 0.6 seconds after 3.2 seconds at
  rest, alongside the controls. It is hidden on the entry screen; earnings and
  purchases update its number without revealing it.
