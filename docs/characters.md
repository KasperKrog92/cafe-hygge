> **Game branch:** this document describes the retained companion café at
> `reference.html`. [game.md](game.md) documents the current Fleur de Lune slice;
> [overview.md](overview.md) takes precedence for game direction. In this game,
> Lunafreya is the playable owner, not the visiting artist.

# Characters

The café's cast: one barista, a rotating pool of patrons, and a cat. All
behavior is dt-driven state machines in `js/sim-patrons.js` and
`js/sim-characters.js`; all drawing is
`SCENE.drawPerson` / `SCENE.drawCat` in `js/scene-people.js`.

The September 2026 material pass adds derived skin/jaw shading and profile
noses, shoulder and sweater side tones, visible page markings and shaped cat
haunch/fur highlights. Character size, roster colours, pose selection and
behavior are preserved. `__dev.poses()` renders the actual roster across both
profiles, front/back and seated reading for future visual review (see
[art-workflow.md](art-workflow.md)).

---

## Nora — the barista

The café's constant. She never leaves for the night (someone has to keep the
fire company). Sea-blue top, cream apron (neck straps, pocket, tie bow at the
back), long brown hair with a side-part fringe (`hairStyle: 1`).

**Home position:** behind the counter at `L.baristaHome` (706, 286) — the y
matters; see art.md. She exits the counter through the gap at x = 616 when she
needs to be out on the floor.

### Order flow

Orders queue in `barista.orders` (FIFO). For each order she walks to the right
station and works through timed steps (each with its own sound):

| Drink prep | Steps (station x → action, duration) |
| --- | --- |
| `coffee_milk` (cappuccino, cinnamon latte, flat white) | 664 grind 1.5 s → tamp 0.55 s → 678 pull 2.4 s → 706 steam 1.8 s |
| `coffee` (espresso) | grind → tamp → pull |
| `tea` (chamomile) | 700 kettle pour 2.0 s |
| `milk` (hot chocolate) | 706 steam 1.8 s |
| `matcha_hot` (matcha latte) | `L.matchaBar.x` scoop 0.8 s → 700 kettle pour 1.4 s → `L.matchaBar.x` whisk 2.2 s → 706 steam 1.8 s |
| `matcha_iced` (iced matcha) | `L.matchaBar.x` scoop 0.8 s → 700 kettle pour 1.0 s → `L.matchaBar.x` whisk 2.2 s → ice 1.0 s |
| `food` (bun, croissant) | 858 fetch from pastry case 1.4 s |

Where she stands sets which way she faces. The espresso-machine steps (grind,
tamp, pull, steam, kettle — `MACHINE_STAGES`) are worked on the back wall above
her standing line, so she's shown from **behind** (`heading: 'up'` — apron ties
and bow to the room). The matcha bar and pastry case sit on the front counter,
so scoop, whisk, ice and fetch face the room (**front**); she walks between
stations in profile, and serves from the front. Then
she carries the cup/glass/plate to the pass (`L.serveSpot` = 744, 266),
sets it down (clink), and rings the counter bell (*ding*). During machine-stage
steps the machine light blinks and steam particles rise (`world.brew`). Matcha
whisking instead animates the chasen and a pale-green surface in the chawan,
with sparser steam there; the iced finish visibly fills a glass at the matcha
bar.

### Idle life (only when nobody is queueing)

Every 6–15 s she picks a task. The priority ladder is service first, then
daily care, then small counter-life:

- **Bus a table** (priority if any table has an abandoned cup — `item.owner
  === null`): walks out and clears the whole table in one visit — every
  abandoned piece picked up a beat apart (a clink each, wipe swish once the
  stack is squared), then carried home together. Two or more pieces render
  as a saucer-and-cup stack in her hands; a rare caption (30%) marks the
  armful. Routes come from `SIM._.busRoute` (shared with `__dev.audit()`), every leg
  axis-aligned: big tables are approached by dropping from the lane at the
  bus spot; the nook side tables via their declared `busVia` columns, which
  thread between the wing chairs and reading lamps (a straight drop would
  cut through them — the audit's journey check proves each route); the tall
  window tables at a spot on their floor line (the tabletop itself is up at
  the sill).
- **Refill the cat bowls** (priority immediately below bussing): when food is
  below 0.34 or water below 0.2, follows the declared `refillRoute` to the
  cat corner, crouches for 1.6 s, pours quietly, and restores the low bowls
  to 1. The cat may supervise. The route is shared with `__dev.audit()`.
- **Light the candles** (next priority): when daylight falls below 0.5,
  carries one lit taper around every dining and nook table, then the mantel.
  Each flame blooms over about 2 s. A queue arrival lets her finish the
  current candle, park the round, serve, and resume at the next unlit stop.
  The chained `candleRoute` is shared with `__dev.audit()`.
- **Water the plants** (after candle and bowl care): once per café day between
  09:00 and 16:00, carries a copper can to the counter plant and both floor
  plants. A queue arrival parks the round after the current plant. The three
  cumulative `waterRoute` paths are shared with `__dev.audit()`.
- **Feed the fire** (after plant care): when the hearth has burned low and no
  fireside regular is already tending it (`world.fire.wantsLog && !claimed`),
  she crosses via the fire's clear column, takes a log in hand for a beat, and
  lays it on — the fire catches and climbs (`addLog`; see the hearth burn cycle
  in world.md). Never urgent: a fireside regular gets first refusal, and she
  only reaches the fire on an idle roll. The `fireRoute` is shared with
  `__dev.audit()`; `__dev.noraDo('fire')` forces it.
- **Play the piano** (below plant care): after at least 30 truly empty seconds
  with daylight below 0.35, a 25% candidate roll may send her out through the
  lane and the piano's clear descent column. She sits and plays sparsely for
  60–120 s, then observes a 600–1200 s cooldown. A doorbell, queue, or order
  ends the phrase; she stands, returns behind the counter, and serves. The
  route is shared with `__dev.audit()`.
- **Chalk the menu** (due every 600–1200 s): reaches up behind the counter for
  3 s; the cached board then remembers a different heart, curled cat,
  steaming cup, sprig, umbrella, or bamboo whisk. Rain weights the umbrella
  heavily; the whisk's matching caption describes it appearing by the prices.
- **Stretch** (30% candidate after 20 quiet seconds with a truly empty café):
  both arms overhead for 2.2 s, then back to watching the room.
- **Wipe the counter** (35% of the ordinary pool): cloth in hand, three slow swishes.
- **Polish a cup** (22%): stands still, cup in hand.
- **Tidy the pastry case** (18%): walks to the case, soft clink.
- Otherwise just stands, watching the room (drawn in the front view, facing
  out from behind the counter).

If anyone is waiting in the queue she stays at the till, facing the room;
the patron at the front steps up and turns to face her across the counter
(their back view meeting her front view).

---

## Patrons

Generated on spawn from pools, so every visitor is a little different.

**Names (Danish):** a name style is selected first, with equal odds, then a
name from its pool. The feminine pool is Freja, Astrid, Ida, Clara, Sofie,
Maja, Ellen, Alma; the masculine pool is Søren, Mikkel, Emil, Anton, Johan,
Viggo, Oskar, Karl. Custom dev-harness names use a neutral `custom` style.

**Appearance rolls:** 5 skin tones, 8 hair colors, 9 top colors, 5 trouser
colors; 40% wear a scarf (knotted, with a hanging tail); 40% have long hair;
4 hair styles (classic / side-part / curly / bun, uniform roll). Patrons with
a masculine name style have a 30% beard roll; other styles do not, preserving
the former 15% overall rate while keeping names and facial hair coherent.
Walk speed 46–60 px/s, animated as a 4-frame cycle.

**Personality rolls:**

- `wantsBook` (35%) — a reader. 45% of readers brought their own book
  (`ownBook`); the rest borrow one from the nook bookshelf. Readers prefer
  the nook chairs / fireside armchairs; they read at tables too.
- `chatty` (55%) — will murmur with a table-mate.
- `murmurPitch` (125–235 Hz) — their voice in the murmur synth.
- `laptop` — 16% of non-readers by day, 6% from 21:00–07:00. They prefer a
  dining table; when only perches or wing chairs remain, the trait stays
  dormant and the visit proceeds normally.
- `pianist` — 10% of patrons who are neither readers nor laptop users; never
  a couple member or Holger. They take the piano bench only when it and the
  world-level 300–600 s music cooldown are free. Otherwise the trait stays
  dormant and the visit proceeds normally.

**Order:** weighted pick — cappuccino 3, cinnamon latte 2.5, flat white 2,
matcha latte 1.8, chamomile tea 1.6, hot chocolate 1.6, iced matcha 1.4,
espresso 1.2, cardamom bun 1.2, butter croissant 1.

### Patron lifecycle (states)

```
(enterDelay) → (wipeFeet) → (shake → parkUmbrella) → enter → queueing → ordering
  → waitDrink → pickup → (browse) → toSeat → seated
  ⇄ (fetchBook → backToSeat) ⇄ (toFire → atFire → backToSeat)
  → (closeLaptop) → (returnBook)
  → (return) → (collectUmbrella) → exit
```

1. **enter** — appears at the door (bell jingle, door swings, thud ~1.1 s
   later), walks to the back of the queue. Queue slots fan out diagonally from
   the till (`L.orderSpot` 696, 316). Coming in from the rain
   (`world.rain > SIM._.WIPE_RAIN`, 0.3): **wipeFeet** holds ~1.3 s on the
   coir doormat (`L.doormat`), scuffing the wet off with a soft double scuff
   (`SND.shoeWipe`) and a few water flecks kicked low off the shoes — every
   wet arrival wipes, umbrella or not. In rain, 75% also carry a furled
   umbrella: **shake** follows for 1.1 s with five falling drops and a soft
   flap, then **parkUmbrella** takes the declared door-to-stand route and
   adds the umbrella to `world.umbrellaStand` before queueing.
2. **ordering** — when at slot 0 and Nora is free: 2 s with a speech bubble
   showing their order icon; caption fires ("Freja orders a cappuccino.").
3. **waitDrink** — steps aside to the lowest free waiting spot (the cluster
   drifts down-left from the pass; spots free up on pickup) until their cup
   appears at the pass with their id on it.
4. **pickup** — takes the cup (clink). Book-borrowers (`wantsBook` without
   `ownBook`) first **browse** the bookshelf (2.5–5.5 s at the browse spot,
   page-turn sound, `hasShelfBook = true` — a spine visibly leaves the shelf),
   then pick a seat. Seat choice: spots where an abandoned drink still waits
   for Nora are avoided while cleaner seats exist (two cups would share one
   saucer spot); borrowers prefer the nook chairs; readers in general prefer
   nook chairs / fireside armchairs / window perches; otherwise a random free
   seat. If the café is full they take it to go.
   **Window perches** are reached by walking to the seat's floor spot and
   hopping up onto the sill. Furniture-aware routing finds a clear approach
   around the fireside armchairs, both arriving and leaving; short trips can
   cross open floor directly. Both perches at a window share the
   tall table under the glass for their drinks.
   The rightmost perch uses a floor approach 12 px left of the sill position,
   leaving room beside the counter plant when stepping up or down.
   A pianist may instead take the appended piano bench; its drink goes to the
   dedicated saucer spot on the lid, so sipping, steam, cup return, abandoned
   cup avoidance, and Nora's normal bussing all use the shared table pipeline.
5. **seated** — the long, cozy middle (stay 100–260 s):
   - **Sipping** (drinks only): every 9–22 s, a 1.3 s animation — the cup,
     handle-less matcha bowl, or iced glass rises from the table (the table
     item hides, the right vessel appears in hand), sip sound at the peak,
     then it is set down (soft clink). Readers lower the book for the sip and
     pick it back up. Steam rises while a drink is hot (first ~45 s); the iced
     matcha never steams. Either matcha may earn one first-sip caption check
     per visitor.
     Nook sitters rest their drink on their own little side table.
   - **Reading** (readers): page-turn sound every 12–26 s; occasional caption.
   - **Laptop work** (day-weighted non-readers at dining tables): an open
     16 px laptop shares the tabletop with the drink. Every 6–14 s they type
     for 2–3.5 s, with alternating forearms and sparse keystroke clusters;
     sipping pauses their hands. The open screen casts a very faint cool glow
     after dark. Before leaving they close the lid for 0.6 s and tuck it under
     the free arm.
   - **Piano playing** (active pianist trait at the bench): 1–3 quiet
     40–90 s bursts with 8–20 s sit-backs between them. The `playing` pose
     reaches both forearms sideways to the keys; sipping pauses the hands and
     felt-piano engine together, then resumes the same burst. The final burst
     starts the room-wide cooldown, and the music box yields while keys sound.
   - **Dozing** (only one at a time): after dark, a reader in a fireside or
     nook wing chair with more than a minute left may fall asleep over the
     lowered book for 40–110 s. Closed eyes, slow breathing, and an occasional
     `zzz` bubble carry the beat; page and sip clocks pause. They wake on their
     own, or on 25% of doorbells, and continue reading. Nora never intervenes.
   - **Fetching a book**: a seated non-reader at a table sometimes wanders to
     the bookshelf mid-stay (seat and drink stay put), browses, and walks
     back with the book tucked under an arm (`holding: 'book'`), then reads.
   - **Chatting** (chatty, with a seated table-mate): every 16–34 s, a "…"
     bubble + murmur; the mate replies 1.2–2 s later with their own pitch.
     Two window sitters share a table, so a window pair can murmur across
     the glass.
   - **Watching the window** (window sitters): every 20–50 s the street pulls
     their gaze for 3.5–8 s — the head turns toward the glass (the window is on
     the wall behind the seat, so this shows the **back** of the head) while the
     body keeps leaning on its cushion (`gazeFacing`); a sip turns the head back.
     Occasional caption, weather- and hour-aware (rain on the glass /
     streetlamps / the street drifting by).
6. **leaving** — 40% carry their cup back to the counter ("returns the cup —
   tak!"); the rest leave it for Nora. Anyone with a borrowed book stops at
   the shelf first to slide it home (**returnBook**, ~1.1 s — the spine
   reappears). Exit via the door (bell again). Armchair readers wander out
   cup-in-hand — the café allows it. A reader with the cat asleep on their
   lap waits while `SIM.dislodgeCat` hops the cat gently to the floor; one
   second later the patron stands and continues the normal departure.
   A parked umbrella is always collected last, after book and cup returns;
   the return route is declared in `L.patronRoutes`, and the furled umbrella
   shares the off hand with a carried drink or closed laptop.

**Spawning:** roughly every 26 s at full daylight stretching to ~80 s at
night. Caps: 7 patrons in daytime, 4 in the evening, 2 between 23:00 and 06:00
(the night owls). Four patrons are pre-seated at boot — among them **Holger**,
already settled in his fireside armchair with a book (see *Boot-seeding a
familiar face*), plus a reader in the nook and a sitter on the first window
sill — so the café opens onto a recognisable, unhurried room.

### Couples

When a normal spawn fires with room for two, 22% are a linked pair. The
second comes through the still-open door 1.2–1.8 s later without a second
bell. In rain they share the first patron's umbrella. They remain FIFO queue
neighbors and order individually, but the first pickup atomically reserves
both sides of one clean dining table, then both window perches if no dining
pair is free; without a pair of seats they both take their drinks to go.
At the table they murmur every 12–26 s, with a rare heart bubble. Their stays
share one 120–260 s roll with a small individual wobble; once both expire,
they leave 0.8 s apart and share one cup-bussing decision.

### The regulars

The regulars are the fixed faces — a roster kept as pure data in
`js/characters-roster.js` (`window.CAST.regulars`), read by the sim at world
creation. Each row fixes a look, a drink, a set of habits, a usual seat, an
arrival window, and the pools of lines they might overhear or muse aloud.
`makeRegular(world, spec)` stamps a row over a plain patron;
`world.regulars` holds one schedule slot per id (`{ lastDay, day, hour,
force }`), and `updateRegulars` brings each in once per café day within its
window. Most regulars ride an existing behavior; Lunafreya adds the dedicated
painting/sketching habit described below.

| Regular | Arrives | Drink | Usual seat | Rides | Character |
| --- | --- | --- | --- | --- | --- |
| **Holger** | ~09:00 | espresso, own book | left fireside armchair | reading | stoic; never chats |
| **Gerda** | ~10:00 | chamomile tea | window perch | window-gazing, chatty | warm, older; watches the street |
| **Lunafreya** | ~11:00 | flat white | artist stool above the piano | painting, later sketching | deliberate; paints the café into its walls |
| **Kasper** | ~13:30 | iced matcha | dining table | laptop typing | young writer; mutters at the screen |
| **Freya** | ~18:30 | matcha latte, own book | right fireside armchair | reading, dozing | evening reader; drifts off by the fire |

Deliberate contrasts keep them from blurring together: morning versus dusk
(only Freya sits late enough that the after-dark doze can take her), silent
versus chatty (Holger's story arrives as solo musings, Gerda's as overheard
talk), and one of each existing behavior.

**Usual seats.** Each row's `seat` names a `SEAT_PREFS` predicate in
`sim-core.js` (`firesideLeft`, `firesideRight`, `windowPerch`, `nook`,
`diningTable`, `artistStool`). `freeSeat` steers a regular to a free preferred seat and marks
`usualSeat`; on arrival they settle into it with their own `settle` line
("Holger lowers himself into the usual armchair and opens his book"). If every
preferred seat is taken, one `usualTaken` patient-look line fires and they fall
back to the normal seating rules. Both pull from the spec via `specLine` and
fall back to a generic templated line when a row has no bespoke pool. Readers
settle in with a book, the writer keeps typing, the window-watcher keeps her
eyes on the street.

**Continuity — Nora's memory (Phase 3).** The café remembers its regulars.
When a regular arrives while the reader is present, `noteRegularVisit` bumps a
persisted bond in the `MEMORY` save (`bonds[id].visits`, `lastDay`, `known`) —
this is *Nora's* memory of them ([narrative.md](narrative.md) §5), and it is
the only thing that accrues just by being present. The **opener** then reflects
it: `regularArrivalLine` prefers a weather line (`arrivalRain`) when they come
in wet, otherwise — for a face Nora already knows — sometimes a recognition
line (`arrivalReturn`, "Holger takes his corner as though he never left it"),
otherwise the plain `arrival`. Every branch still stands alone; recognition is
flavor, never a thread the reader must have followed. Bonds are free-form data
in the save, created lazily, so a fresh café simply starts knowing no one and
an old save grows the field without a version bump. `warmth` is reserved for
the later conversation phase.

**Boot-seeding a familiar face (Phase 3).** So the café never opens onto only
strangers, `seedRegular` seats **Holger** in his fireside armchair at boot,
reading, and marks his schedule done-for-today so `updateRegulars` never brings
a second Holger the same café day. It is set-dressing — no arrival caption, no
bond bump (recognition accrues on the arrivals the reader actually watches). If
his armchair is somehow taken at boot the seed is skipped gracefully.

**Tending the fire.** Holger carries the `tendsFire` trait: an old sailor's
habit of keeping the fire he sits by fed. While seated in a fireside armchair,
when the hearth has burned low (`world.fire.wantsLog`) and no one else is on it,
he sets down the book, rises, walks to the hearth via the fire's clear column,
lays a log (`addLog` — the same catch Nora's tending triggers), and returns to
his chair to read on — the seat stays his throughout, exactly like slipping off
to the bookshelf (`toFire → atFire → backToSeat`). He gets first refusal over
Nora; his `fireUp`/`fire` line pools narrate the rising and the log going on. The
trait is opt-in per roster row, so other fireside regulars can inherit the habit
later.

**Appearance & habits.** Holger: grey hair and beard, forest-green jumper,
dark-red scarf, 130 Hz murmur, 46 px/s. Gerda: bun of grey hair, mauve top and
warm-red scarf, a slower 40 px/s. Lunafreya: long golden-blonde hair wound into
a large high bun with loose face-framing strands, warm-red top under a
paint-flecked cream smock, deliberate 42 px/s. Kasper: long brown hair, muted-blue top,
brisk 52 px/s. Freya: long red hair, mossy-green top. Each carries a fixed umbrella
colour brought reliably in rain, a fixed stay range, and its own `nameStyle`
(no name special-case remains in `nameStyleFor`; the roster names live outside
the random `PATRON_NAMES` pools so no walk-in ever shares one). The fresh 08:24
boot reaches Holger's window within its first real minute; `__dev.ff()` walks a
full day of arrivals quickly, and `__dev.regular(id)` forces any one in.

**Their voices (the passive "listen in").** Each row carries four line pools in
`lines`: `arrival` (one line as they come in), `overheard` (a shared-table
murmur), `musing` (a solo beat — reading, window-gazing, typing), and
`backstory` (a rarer drip). `regularLine(world, p, context)` in `sim-patrons.js`
sits at the caption seams that already fired around these behaviors: it pulls
from the matching pool and, if it speaks, suppresses the generic line, so a
regular's own words replace "turns a page" rather than doubling it. A solo
musing has a small chance (`BACKSTORY_GATE`, 3.5%) of surfacing a backstory
fragment instead — a life leaks out only across many visits (Holger's sea years,
Gerda's Erik, Kasper's unfinished chapter, Freya's re-read). Seams and contexts:
window-gaze and reading page-turn and laptop bout → `musing`; the table murmur →
`overheard`. A `chatty: false` regular (Holger, Kasper, Freya) carries no
`overheard` pool by design — their narrative is solo; only Gerda's overheard
pool ever fires, and only when a walk-in shares her window table.

**Voice rules for the pools.** Warm, understated, lowercase-cozy, Danish flavor
welcome — the same narrator voice as every other caption. These passive ambient
lines still **stand alone**: none may lean on having read a previous one, so the
glanceable layer never asks the reader to catch up. Continuity now lives one
layer down, in the story **arcs** ([narrative.md](narrative.md)) — which the
reader only ever advances by taking an invitation, never by happening to catch a
caption. Keep the pools un-plot-heavy and unurgent, and — here — narrated
fragments, not quoted dialogue. (Quoted back-and-forth is reserved for the
opt-in conversation beats; see [narrative.md](narrative.md) §6.)

Gerda's `arcMusings` add one guarded exception without turning ambient lines
into plot delivery: while the `street-house` arc is unfinished and the painter
is actually visible in fair daylight, a window-gaze musing may notice his
rhythm, the brush line, or how far the warm colour has travelled. The pool
retires when the finishing beat is chosen. If Gerda is perched at the first
window at that exact chosen moment, her optional `presenceBeat` line joins the
caption run; she colours the moment but never gates it.

### Gerda's scarf — the reference story arc

Gerda carries the café's first end-to-end **story arc** (`gerda-scarf` in
`CAST.arcs`; the loop is [narrative.md](narrative.md) §8). It is the worked
example of the whole soft-narrative pattern, and it realises the roadmap's older
"a knitter… a slowly growing scarf" idea with a payoff that waits for you.

- **Knitting (passive, glanceable).** While the arc is unfinished (`stage 0`),
  Gerda knits whenever she is seated and not sipping/gazing: crossing needles and
  a small scarf growing in her lap, its length reading the arc's saved
  `progress`. A soft wooden `SND.needle()` tick (quieter than the fire) and the
  occasional `knitLines` musing carry it. Purely ambient — ignore it forever and
  nothing is lost.
- **Progress (idle, café days).** The scarf grows one row per café day (24 real
  minutes of the café running — hidden tabs included) in `updateNarrative`'s
  quiet tick; a closed café holds still. What you *see* is what is *saved*.
- **The invitation (waits forever).** At `progress ≥ rows` the arc raises a soft
  **yarn-ball bubble** over Gerda whenever she is present. It never pulses, never
  counts down, never expires — the invitation-waits rule.
- **The beat (chosen).** Tapping it plays a short caption run: Gerda casts off,
  holds the scarf up, and loops it around the cat. A heart blooms over both, the
  `cat-wore-scarf` flag is set for good, and Gerda's bond warms. Afterward she
  stops knitting and simply visits as a familiar face.

A companion reader who never taps the bubble loses nothing; the café is still
whole. Dev: `__dev.regular('gerda')`, then `__dev.age(5)` to ripen the scarf and
`__dev.arc('gerda-scarf', {ready:true})` to raise the invitation at once.

### Lunafreya's gallery — the first multi-stage owned arc

Lunafreya keeps a permanent studio above the corner piano (`L.artist`): a tall
easel, backless stool, paint table with its own serviced saucer, and a nearby
watch spot. Her flat white follows the normal order, sip, steam, bussing, and
abandoned-cup rules. While `lunafreya-paintings` is active she paints in 2–4 s
bouts separated by 8–18 s rests; a sip pauses both hands and sound. The profile
pose reaches left to the canvas (or down to mix a palette), and `SND.brush()`
keeps the bristle whisper below the fire. After both paintings she uses the
same stool with a small sketchbook instead.

The canvas deterministically reads saved `(stage, progress)`: charcoal lines,
underpaint, colour masses, then detail. Stage 0 is the cat on the sill
(including Gerda's scarf if that flag exists); after 10 café days its palette
bubble waits over Lunafreya until tapped, then the finished work hangs above
the fireplace. Stage 1 is the hearth; after 12 more café days its chosen beat
hangs the smaller study above the door. Each stage owns its own caption run and
lasting flag, so reloads restore exactly the right canvas and wall gallery.

While Lunafreya is present and actively painting, one non-couple patron at a
time may leave their drink and reserved seat, walk to `L.artist.watch`, look for
6–12 s, and return (`toEasel → watchingArtist → backFromEasel`). A single soft
exchange may use Lunafreya's `overheard` pool; it never stacks watchers or
interrupts service. Dev: `__dev.regular('lunafreya')`,
`__dev.arc('lunafreya-paintings', {ready:true})`, or boot an exact screenshot
state with `?dev&arc=lunafreya-paintings&stage=1&progress=7`.

---

## The cat

Orange tabby, no name (it has not told anyone yet). The café's true owner. Once
Gerda's scarf arc completes it wears a small warm-red scarf for good — a neck
band `drawCat` carries across its poses, driven by the persisted
`cat-wore-scarf` flag (see Gerda's scarf, above).

**Places and weights:** floor choices are the fireplace rug, the window-side
spot, the big rug, the armchair side, the reading-nook rug, and its own cushion
in `L.catCorner`. The cushion is strongly preferred after a meal; the fire
rug gains weight in the evening; the nook and shorter rests gain weight from
23:00–06:00. A weighted choice can instead lead to the middle of either
window sill (×2.5 in rain, ×2 at night) or the bookshelf top while the second
nook chair is free, or to the piano lid (weight 0.9, ×1.5 in the evening)
while the bench and piano voice are free. Safe pairs keep the old straight-line walk; the pairs that
clip furniture use the declared `catRoute` waypoints checked by the audit.

**Needs, without consequences:** `hungerT` rolls 420–720 s and `thirstT`
500–800 s. The cat walks to `L.catCorner.eatSpot`, eats for 6–10 s (0.34 food),
or drinks for 3–5 s (0.2 water); 80% of meals are followed by a drink. Food
and water are visible, quantized bowl art in `world.catBowls`. If a bowl is
empty, the cat sits beside it facing Nora, occasionally meows, and retries
after 60–120 s. Nothing harmful happens; Nora eventually performs her refill
task.

**Core states:** `sleep` (purrs, occasional "zzz"), `sit`, `groom`, `stretch`,
`walk`, and `loaf` remain the quiet loop. New states are `hop` (0.35–0.55 s
parabolic tween; silent up, `softThump` on the final floor landing), `eat`,
`drink`, `perch` (back view at the window), `knead`, `pounce`, and `lap`.
`cat.surface` (`floor`, `sill`, `shelfTop`, `counter`, `machine`, `backShelf`,
`pianoKeys`, `pianoTop`, or `lap`) prevents floor habits from firing in mid-caper.

**High places:** window visits hop from the declared stand spot to the middle
of the sill, where the cat watches the rain/streetlamp or curls to sleep.
Bookshelf visits use the nook chair back as a step, then settle for 60–180 s;
if that chair becomes occupied, the cat takes the declared direct escape hop.
On any high perch, its head occasionally tracks the nearest walking patron
for 2–4 s. `gazeFacing` changes the head/attention without changing the pose.

**Piano claim:** from its declared stand the cat hops onto the grouped keys
(2–3 soft accidental plinks), then to the lid for a 60–180 s loaf, sit, or
sleep with its tail draped over the edge. A pianist who arrives later does not
dislodge it—the shared tableau is intentional. The cat leaves by one direct,
silent-front hop to the declared floor dismount; only that landing gets the
usual `softThump`, so the keys never sound twice.

**Counter caper:** only in a quiet café with no queue, order, or active brew,
the cat rarely hops onto the counter's right end, pads along the slab, and
loafs (sniffing waiting cups for one second, never touching). Nora notices in
3–8 s when free, walks behind the counter, swishes, and shoos it down. The
rarer grand ascent goes counter → espresso-machine top → cleared back-bar
shelf gap; a 30% half-way catch aborts it. On the top shelf the cat loafs or
sits 60–180 s with its tail draped below the board.

**Small rituals:** on a rug or cushion, 30% of pre-sleep arrivals knead for
2.5–4 s and purr. In strong daylight a rare dust mote near the first window
starts a three-hop `pounce`, followed by a dignity-restoring groom. A reading
patron in a fireside or nook wing chair can attract a lap visit; the cat hops
to a derived lap anchor, curls, and purrs while sipping and page turns continue.
The door bell turns an awake floor cat's head toward the door for about 2 s.

**Petting:** clicking within ~36 px of the cat triggers `SIM.petCat` — heart
bubble, meow or purr, caption "The cat purrs happily." If asleep on a normal
surface, it sits up; lap cats stay settled. Walking, hopping, and pouncing are
not interrupted.
This is today the café's only direct interaction, and the template for the ones
to come. The narrative layer adds one more — tapping a soft **invitation** bubble
to take a story beat ([narrative.md](narrative.md)) — built on this same click
handler and held to this same bar. Any interaction the café gains must stay this
gentle: optional, never necessary, never nagging, and — for story beats —
patient, waiting until the reader chooses it, never expiring.

---

## Adding characters (guidance)

- New patron *variety* (outfits, hairstyles, accessories) goes in the
  appearance pools + `SCENE.drawPerson`.
- New patron *behavior* belongs in `updateSeated` as another timer-driven
  habit (like sipping/reading), with a quiet sound and an occasional caption.
- A second staff member or a café dog would need their own entity + drawables
  entry in `SIM.entityDrawables` — follow the cat as the template.
- Every character action should be **slow, periodic, and interruptible** —
  nothing urgent, nothing that demands watching.


## Animation audit — 5 September 2026

Walking phases follow actual distance (24 px per human stride, 8 px per cat
paw cycle). The walker spends its entire speed × dt budget through route
corners, without snapping the final 3.2 px or pausing for a simulation tick.
One shoe lifts while the other remains at the baseline. Carrying hands stay
steady. Eyes blink briefly on each character's own animation clock.

Readers visibly turn a page for 0.8 seconds when the page-turn sound fires;
that transient timer lives on the patron, never in the narrative save. Sips
use smoothstep easing and bring the rim to mouth height. Knitting needles,
sketching pencils and grooming heads now move; the sleeping cat breathes by
one pixel. Piano hands use the keyboard's layout anchor. Nora's whisk hand
and the chasen share the same action clock. Preparation, wiping and polishing
have working-hand poses; wiping and restocking work timers begin on arrival.

Cat hops include 0.10 seconds of anticipation and 0.12 seconds of landing,
with a tucked airborne pose in between. Fixed asymmetric poses mirror with
facing, including their scarves. Airborne cats do not carry a false contact
shadow underneath their bodies. Existing hop routes and surface anchors remain
in use. Nora now approaches the chalkboard at `L.noraCare.chalk` (893, 238),
writes with a small hand stroke, then returns via `chalkHome` to the counter.

The repeatable motion gallery and scenario coverage are described in
[animations.md](animations.md). The animation timers do not change arc progress
or the invitation-waits rule.
