# World systems: time, weather, light, events

State lives in `js/sim-*.js`, appearance in the `js/scene-*.js` renderer files.

The startup idle café never closes: room, customers, Lunafreya, cat, weather
and day/night lighting run without home transitions or conversations, and its
ambient story arcs persist under its own save (narrative.md). The
opening/closing lifecycle applies to the saved game, quiet play included.

## Time

- One hour per real minute (base day **1440 seconds**), except the
  late-closing hold and overnight skip
  ([below](#opening-closing-and-the-next-morning)). Boot is 08:24, for
  preparation. In the first setup the day passes with her hand work (morning
  light as she carries the cat in, late afternoon as the sign goes out) and
  reaches 17:30 as she opens, without a jump: four active service minutes
  until 21:30. Holger's first dialogue, waiting included, consumes none of it.
  Later mornings start at 07:30.
- `world.hour` (0–24 float) drives sky, lighting, mantel clock hands, spawn
  rates and music sparseness.
- Hour edges never replay time skipped by `?hour=` or `__dev.hour()`. Church:
  four distant strikes at noon. Mantel clock: one soft two-note chime at
  09:00, 15:00, 18:00 and 21:00. Back-room kettle: one whistle a day, at a
  slot rolled between 19:00 and 21:30.
- **Regulars** have one daily slot each (`world.regulars`, by roster id),
  with the arrival hour rolled each café day inside their window: Holger
  ~09:00, Gerda ~10:00, Nora ~11:00, Kasper ~13:30, Antonia ~18:30.
  `updateRegulars` brings each in once, never two of the same face. Only
  Antonia sits late enough for the after-dark doze. Roster: characters.md.
- Newer regulars keep a rhythm: Marcel even days from day 4, Ida every third
  day from day 5, Elody odd days from day 6, Saira every third day from day 7,
  Birgit every third day from day 8 and only before noon. A regular who cannot
  get in by 20:30 skips the day. Of several due, the longest absent enters
  first.
- Palette: `SCENE.dayPalette(hour)` interpolates `DAYKEYS` in `scene-core.js`:

| Hour | Sky | daylight | lamp |
| --- | --- | --- | --- |
| 0.0–4.5 | deep night blues | 0.00 | 1.00 |
| 6.5 | dawn peach/amber | 0.50 | 0.50 |
| 9–16.5 | clear day blue | 1.00 | 0.00 |
| 18.5 | dusk orange | 0.55 | 0.45 |
| 20.5 | late blue-violet | 0.12 | 0.90 |
| 22–24 | deep night | 0.00 | 1.00 |

- `daylight` scales the scene's multiply-tint and patron spawn rates. `lamp`
  scales star/moon alpha and the electric pools and blooms: hanging lamps, the
  two nook reading lamps, the reading chair's table lamp by the fire, the
  studio floor lamp by the easel, the little brass piano lamp. Candles have
  per-flame state, tended by Lunafreya.
- Threshold captions: lamps on → "The streetlamps flicker on, one by one.";
  off → "Morning light spills across the floorboards."

## Opening, closing and the next morning

`js/sim-shop.js` owns the lifecycle and late-closing clock hold through the
[explicit simulation contract](architecture.md#shop-lifecycle-contract).
`world.shop` holds the transient phase, current chore and visual state.

### Closing

1. 21:30: arrivals stop. Lunafreya wishes the remaining guests good night from
   the counter, wipes it and makes a closing round. Existing orders are
   finished; seated guests get another 12–22 seconds for a last cup, then
   leave as usual (laptop, borrowed book, umbrella and lap cat included).
   While service is queued she still clears abandoned cups first, terrace
   included.
2. Room empty: she clears tables and snuffs their candles in a circuit:
   reading nook, lower dining tables, piano and artist corner, then upper
   tables and window ledges left to right.
3. Counter: she puts away the pastries. Cakes live only in the counter
   display, away at night and refilled in the morning.
4. Toward the entrance: right curtain, hearth and mantel candles, left
   curtain. She calls the cat down, collects it from its care approach,
   carries it to the door, switches off the interior lamps and leaves.

The clock holds at 22:30 if cleanup runs long. A two-second fade out and
one-second dark pause lead into the apartment.

### Evening at home

- The café clock holds; elapsed story time still receives real dt. Boot adds
  no elapsed time.
- **First evening:** an attended, saved apartment tour, then the required
  two-choice left-window/table planner. Both selections are charged once and
  survive reloads; other choices and sleep are unavailable until the pair is
  selected. Both modes then wait for **go to sleep**.
- **Later idle evenings:** a 90-second unattended routine, its timer paused
  for one autonomous supper (quick bread-and-cheese preparation in the lit
  kitchen, eating at the PC, rinsing the plate). Supper resumes after reload
  and continues in hidden tabs; explicit bedtime can interrupt it.
- **Later game evenings** repeat indoor desk, reading and resting activities
  until sleep is chosen.
- Closing the planner does not start a new day. Explicit sleep first saves a
  bedtime sequence: bathroom through its doorway, teeth, curtains, shared bed
  with the cat, goodnight. Only its completion advances to 07:30 and the dawn
  entrance; reload preserves it. After the first evening, switching to idle
  lets the ordinary routine finish automatically.
- Lighting (renderer-only; no effect on clock, saved routines or attendance):
  warm desk/bedside lamps, a cool computer screen, faint moonlight through the
  window. Kitchen and bathroom walls shield their unlit interiors. Rain
  weakens the moonlight; closed bedtime curtains remove its floor projection.

### The next morning

Lunafreya returns with the cat and first turns on the lamps at the entrance.
She sets the cat on its cushion by the bowls and refills them. A chosen plant:
she fetches its parcel at the entrance, carries it to the left window, unwraps
it for four seconds and lifts it onto the sill over four seconds. Then left
curtains, hearth, right curtains and the pastry case, without returning to the
till between chores. Once the display is ready guests may enter and the normal
arrival schedule rolls into the new café day. Opening chores need no clicks
and never consume a story invitation.

### Clock and save

- `world.clockOffset` skips the sleeping hours without jumping `world.t`, so
  caption, weather, movement and story timers receive only simulated time.
- Schema v9 holds initial wall-shelf work, the home-story/bedtime cursor,
  completed café days, left-window work, home time, wall-clock hour,
  presentation, savings, plant stage/time, partial table/hearth jobs, the
  evening choice and a lifecycle checkpoint.
- Reload holds time spent away and resumes rituals and partial work; transient
  patrons and incomplete orders are not serialized. Only established furnished
  saves boot with the seeded room (three settled strangers and Holger). New
  cafés reload without a crowd; an unfinished mandatory first hello restores
  Holger at the counter.
- `life.daysCompleted` increases once on arriving home, persists through
  reload and never accrues while the app is closed. Existing furnished saves
  migrate as established cafés; unfinished first mornings receive at least 90
  savings; already-open saves keep their balance and opening hour.

## Weather

- `world.rainTarget` re-rolls every 150–420 s: clear (34%), drizzle 0.4 (34%),
  rain 0.8 (24%) or storm 1.0 (8%). `world.rain` eases toward it at 0.18/s;
  `world.storm` lasts until the next non-storm roll.
- Rain drives glass streak count/alpha, window-tap density in the audio
  engine, arrival flavor, umbrellas (patrons' and passers-by's) and the
  doormat, which darkens toward damp coir with `world.rain` (rain-blue sheen
  in a downpour).
- Above `world.rain` 0.3 (`SIM._.WIPE_RAIN`) every arrival wipes their shoes
  on the mat (`wipeFeet`: a soft `shoeWipe` scuff, a few low water flecks),
  umbrella or not. Most wet-weather patrons then shake a furled umbrella at
  the door, park it in the stand and collect it as their last stop on the way
  out. `world.umbrellaStand` stores the visible owner/color links: room state,
  never inventory.
- The 🌧️ toggle forces the *weather* clear, not just rain audio, so sound and
  glass agree. It also cancels storm wash, pending thunder and lightning.
- Transition captions fire only on meaningful changes: rain starting, easing
  to drizzle, stopping, or a storm settling over the street.
- A storm adds a dark continuous rain bed to the glass taps. With rain above
  0.6, lightning rolls every 25–75 s: `world.flash` briefly lifts the two
  window panes and door glass, then a 1–4 s distance gap ends in a low thunder
  rumble. The flash decays at 4/s and adds only faint cool pools below the
  windows after dark, never a full-screen strobe.

## The waterfront (terrace, lake and far quay)

Both windows look onto one continuous small city lake with the scale and warm
facades of Christianshavn. `L.waterfront` holds the banks, near footpath,
terrace anchors and worker's house. `scene-waterfront.js` draws sky, far
apartment buildings, water, railings, lamps and terrace; the window renderer
clips it behind glass, weather, mullions and curtains.

- **Sun:** left to right from 06:00 to 20:00 on a shallow arc; the wall
  between the panes hides the middle of the crossing. `SCENE.sunPosition` and
  `SCENE.windowLight` drive the visible sun, its water reflection, the
  direction/length of incident floor light and the soft indoor glow. Rain
  attenuates all daylight; each curtain attenuates its own beam.
- **Sky and far bank:** slow broad clouds; stars and a moving moon fade in as
  daylight falls below 0.52. Far windows warm at staggered dusk thresholds and
  reflect on the water; near-bank street lamps cast small pools on the path.
- **Entities:** `world.waterfront` holds transient boats, birds and aircraft
  plus two outdoor tables, updated by `sim-waterfront.js` through
  `SIM.update`. Hidden tabs use the same elapsed time; a clock-only overnight
  skip does not teleport a boat. Rendering never spawns, consumes randomness
  or advances the painter's saved progress. Each entity leaves the entire
  shared view before disposal.
- **Traffic:** rowing boats and small sailboats in fair weather, usually
  100–190 s apart, at most two active. Birds in small groups every 45–100 s in
  daylight. A small silent airplane every 7–12 minutes in clear daylight.
  Dev: `__dev.boat({dir, sail, x})`, `__dev.birds({dir, x})`, `__dev.plane({dir, x})`.
- **Sailing ship:** a two-masted wooden ship crosses in either direction at
  2.6 master pixels per second. First opportunity after 6–12 running minutes,
  then 12–24 minutes apart; it waits for fair daylight (daylight > 0.4,
  rain < 0.35) and a free boat slot. At most one ship and two boats total.
  Position and timer use simulation dt, hidden tabs included; it is removed
  beyond the waterfront margins. One rate-limited caption: “a wooden sailing
  ship glides across the lake, its sails full of afternoon light.” Up to two
  eligible indoor guests can watch from the window floor spots
  (characters.md). No unlock, reward, saved event or required interaction.
  Dev: `__dev.ship({x: 210, dir: 1})`.
- **Terrace guests:** the two bistro tables belong to real guests who order
  inside and carry their drink through the door. Fair-weather walk-ins
  sometimes choose them between 08:00 and 20:30; readers can take their own
  book; regulars keep their authored indoor seats. Guests linger, sip and
  read, then stroll away, leaving cups. A sustained shower brings the same
  guest and drink indoors; nobody is punished for rain or the owner's absence.
- **Terrace cleanup:** Lunafreya walks to the door, crosses the terrace,
  collects the abandoned cup, wipes and carries the empties to the counter.
  Table reservations prevent overlap or seating on an uncleared table. Queued
  orders come before a trip; a started trip finishes before service resumes.
  Closing waits for outdoor guests and her final terrace cleanup before the
  indoor closing round and curtains.
- Terrace tables and exterior positions are separate from indoor seats and the
  floor route planner. Outdoor people stay in `world.patrons`, bounded by
  reserved terrace places, not indoor occupancy; they draw at half scale
  beyond the glass, never also in the room.
  Dev: `__dev.spawn({outdoor:true, pianist:false, wantsBook:true, ownBook:true})`
  in fair weather exercises the full ordering journey.

### People on the path and the worker across the water

- `world.passersby` holds silhouettes that walk in master-canvas x along the
  whole facade (`L.waterfront`): a figure leaves the first pane, passes behind
  the wall and reappears in the second a few seconds later. Scenery only: they
  never enter or interact. `drawPassersby` (scene-bg.js) clips them inside
  each pane on the near path, behind terrace guests and under the rain on the
  glass.
- Cadence: every ~9–40 s in daylight, sparser toward dusk, only the odd night
  owl 22:30–06:00; storms halve the traffic. About one in five is a pair
  walking shoulder to shoulder (one object, drawn twice, so they cannot drift
  apart).
- Rain above 0.15 raises umbrellas (patron umbrella colors via
  `shade(·, −0.28)`; a pair shares one wide canopy). In heavy rain most
  walkers hurry: faster steps, a lean, the canopy tilted into the weather.
- Unhurried strollers occasionally slow mid-pane to look in, always at a pane
  still ahead of them, never behind the wall; 18% of those pauses earn a
  caption. Those without umbrellas pause in a visible pane for 6–11 seconds
  and wave once per passage.
  Dev: `__dev.passer({dir, umbrella, pair, pause})`.
- **The street painter**, a persistent story told entirely beyond the glass: a
  weathered apartment building across the water in the door-side window is
  repainted from the top down over seven café days (`street-house` in
  `CAST.arcs`). Its warm, muted-brick band and the ladder position are pure
  views of saved progress. The painter figure works only in fair daylight
  (`daylight > 0.45`, `rain < 0.3`); at night or in wet weather the ladder
  waits by itself while progress continues. The street stays silent.
- When the facade is complete, a brush invitation waits in the glass. Choosing
  it plays the short finishing beat and sets `street-house-painted`: ladder
  and painter retire, the muted-brick facade remains on every boot and one
  extra window glows there after dark. Gerda may add one line if she is
  sitting at that window when the beat is chosen; her presence never gates it.
  Dev: `__dev.age(3)`, `__dev.arc('street-house', {ready:true})`,
  `__dev.shot('window0')`.

## Lighting (the pass that sells the coziness)

**Floor light** (`drawFloorLight` in scene-bg.js): two gently widening window
panes projected onto the floor. Daylight sets intensity, rain softens it, the
hour shifts the projection. Oval floor pools under the reading/studio lamps
follow `pal.lamp`. Both draw **before** depth-sorted furniture and its contact
shadows; the light map and blooms below follow the objects. A cached shadow at
the wall/floor junction adds depth. Visual cues only: no timers, simulation
state or sound triggers.

Applied after all sprites, in `SCENE.drawLighting`:

1. **Local multiply light map.** The ambient color lerps from night
   `rgb(112,120,172)` to day `rgb(255,250,242)`. Warm pools blend into the map
   over the fixed places each source reaches, then the scene is multiplied
   once, so faces, books, upholstery and contact shadows share one
   illumination and keep surface contrast. Nook lamps reach their reading
   chairs; pendants the counter worktop; studio and piano lamps the canvas,
   score and sitter; the bought reading chair has its own small lamp. Electric
   pools follow `pal.lamp` and shop power; all surface pools fade out with
   daylight; active-furniture, working-hearth and live-candle gates apply. The
   cache stores only illumination, keyed by ambient color, source geometry,
   small intensity steps and open windows; moving sprites never enter it.
   Window openings keep their exterior tint, not indoor light.
2. **Compact additive source blooms** (`lighter` composite) mark lamp shades,
   flames and laptop screens without a broad haze. Pendant blooms are clipped
   below the shade rim. Firelight reaches both fireside chairs and follows
   `world.fire.level`: a compact flickering night bloom plus the broader
   daytime bloom; the ember floor keeps it gently lit when low; hearth work
   removes it. Table and mantel candles follow their live 0–1 flame state
   (mantel decor must be present); window poseur tables carry no candle. Open
   laptops get a deliberately faint cool-blue pool and small bloom. Daylight
   pools below the windows and faint storm reflections follow time and
   weather.
3. **Vignette**: radial darkening toward the edges, always.

Speech bubbles and captions draw **after** this pass so they stay readable at
midnight.

### Candle day cycle

When `daylight` falls below 0.5, unlit candles make Lunafreya's dusk round
pending; tables and mantel bloom one stop at a time as she reaches them. The
round waits behind orders, bussing and bowl care, and can park at a stop for a
new queue. At dawn the targets drop to zero and the flames fade over about
60 s. Clock jumps (`?hour=` / `__dev.hour`) snap all flames to the destination
band, so a jump to night does not replay a dusk that never elapsed.

### Hearth burn cycle

`world.fire`, `updateFire` in sim-core. The live burn `level` (0..1) eases
toward a `target` that decays as the log spends itself (`FIRE_BURN` ≈ a full
log to embers in ~3 min), bottoming out at a warm ember floor (`FIRE_EMBER`
0.16), never dark. Flames, glow pool, spark rate and crackle audio all read
`level`. After sitting below `FIRE_LOW` (0.34) for a random grace (20–110 s),
`wantsLog` goes up; nothing nags. A fireside regular with the `tendsFire`
trait (Holger) gets first refusal, rising from the armchair to lay a log;
otherwise Lunafreya reaches it on an idle roll (characters.md). `claimed`
keeps the two tenders from both going. `addLog` sets the target to full: the
fire climbs over ~2 s, throws a burst of sparks and plays `fireCatch()`. The
burn is independent of the clock, so jumps neither snap nor replay it.
Dev: `__dev.fire(0.2)` drops it near embers.

## Particles and small motion

All simulation-clock driven. Particles spawn in `updateParticles` (sim) and
draw in `SCENE.drawParticles`.

- **Steam** (`type: 'steam'`): 1–2 px wisps with sinusoidal drift, from hot
  table cups (first ~45 s after serving), hot vessels at the pass, raised hot
  drinks mid-sip (from the cup rim) and the espresso machine during
  pull/steam/kettle stages. Matcha whisking adds a sparser wisp above the
  chawan. Plates (pastries) and iced-matcha glasses never steam. Brewing and
  hot-drink steam carry fractional emission time over between emissions.
- **Sparks** (`type: 'spark'`): 1-px embers rising inside the firebox, scaled
  by the live burn. A blaze throws more and higher, embers only spit now and
  then, a fresh log sends up a burst of a dozen.
- **Dust mote** (`type: 'mote'`): a single 2-px cream fleck with slow drift,
  spawned for the cat's daylight pounce ritual and removed with that beat.
- **Water drop** (`type: 'drop'`): tiny blue-grey pixels arc from Lunafreya's
  watering-can spout during plant care and fall from a shaken umbrella.
- **Door leaf:** narrows continuously around its left hinge as `door.open`
  changes, window and handle attached. A small cached leaf canvas is redrawn
  only when its sky/flash appearance changes and is blitted at an integer
  width with nearest-neighbor sampling.
- **Table items:** laptop tables place the drink nine pixels toward the front,
  clear of the keyboard. Item rendering and hot-drink steam share
  `SCENE.tableItemOffsetY`, also while the laptop is closed for departure.

## Cat corner state

Bed and bowls occupy the wall-backed right-window corner beside the coffee
cabinet (no decorative plant or watering visit there). The two bowls have
separate feeding anchors.

`world.catBowls = { food, water }` stores both visible levels from 0–1. Food
is consumed in 0.34 steps (roughly three meals), water in 0.2 steps (roughly
five drinks); the renderer quantizes them into glanceable kibble-pile and
water-highlight art. Ambience state, never UI or failure meters. Lunafreya
restores a low bowl to 1 through her normal dt-driven idle loop.

## Spawning and occupancy

Walk-ins, regulars and off-duty neighbours share one arrival timer.

### First days

On day one Holger enters first; other regulars and couples wait for later
days. After the mandatory hello the next arrival is 90–130 seconds away, with
at most two guests present during the short first opening. Later days use the
occupancy rule below. Admission counts people waiting for seats and excludes
seats with abandoned dishes; overdue regulars cannot enter on the same tick. A
full café receives no new entrant.


### Popularity and occupancy

- **Target.** Arrivals respond to installed customer seating and saved service
  time. The target rises smoothly from 50% to 75% over five full service days,
  then to 95% over fifteen, rounded to the nearest guest. A service day is 780
  running seconds (roughly thirteen café hours). The four-seat first opening
  keeps its two-person limit and slower arrival spacing. The piano and artist
  stool are activity stations, excluded from general seating and its occupied
  count. Night keeps the same target; closing still stops new arrivals.
- **Service time.** `life.openSeconds` accrues only in accepting, open café
  simulation ticks, saturating at 11,700 seconds. Hidden play counts; setup,
  held conversations, home, closing, paused play and time with the app closed
  do not. It never decays and needs no score, purchase or attended story.
  Existing saves receive one-time credit from completed café days (four
  minutes for the first opening); old furnished rooms receive at least five
  service days. Partial time saves with ordinary life checkpoints; reload adds
  none.
- **Walk-ins wait for the target.** Below it, an opportunity takes 20–34
  seconds; a deficit of two or more guests advances it twice as fast. At
  target, or without a clean unreserved seat, the opportunity waits.
- **Familiar faces.** A regular whose hour has come, or Keira or Tomas
  dropping in off duty, may take a clean seat one guest past the target (never
  on opening day, never an unclean or reserved seat), so Holger's morning
  espresso stays in the morning.
- **Reading-afternoon guests** (`world.expectedGuests`) are due whatever their
  usual hour, come in before anyone else and may each take one more clean
  seat; while one who can still come has not, nobody else takes a seat they
  would need.
- **What counts.** Incoming orders count toward occupancy and reserve
  admission capacity; at most three guests may be waiting to obtain a seat.
  Departing guests count until they leave but no longer reserve a clean seat.
  Couples require room for both. Working contractors are separate actors.
  Terrace guests use their own reservation and do not suppress indoor
  arrivals.
- **Linger.** After opening day the minimum visit is
  `180 + 25 × target guests + 360 × familiarity` seconds, varied ±10%, where
  familiarity runs from zero to one across fifteen service days. Longer
  authored or ordinary stays are preserved. One barista thus has time to serve
  and tidy while the room fills with settled readers. Closing still uses its
  last-cup departures.

Fullness is a target the café returns to, with a natural opening ramp and
brief gaps during departures, service and cleanup.

### The idle café boots already lived-in

With no opening to ramp from, `SIM.createIdle` seeds the room (`seedRoom` in
sim-core.js) once its boot hour is final (noon, or a dev `?idle&hour=`), as
the room it would be had it run all day. The fully furnished room has sixteen
customer seats and a target of fifteen; the seed leaves it one to three guests
short, so the door brings someone in within the first half minute, without a
rush. It is already Café Flourish: Marcel's sign stands outside the open door,
which looks onto the real street, and the chalkboard carries the name.

- **Regulars keep their hours.** A regular whose rolled arrival hour has
  passed today sits in their usual seat, that far into their visit (the same
  linger floor as above), and is marked done for the day; one whose visit
  would already be over is marked done without a seat. Anyone not due yet
  (every regular at 09:00, Antonia at noon) comes through the door as usual.
  Rhythms and visit gates apply. Hours before the first habit of the day seed
  walk-ins only.
- **Walk-ins are part-way through ordinary stays** on randomly chosen free
  seats (never the piano bench or easel stool): one or two about to leave, one
  or two who have only just sat down (the only cups that still steam), the
  rest spread evenly across a visit with at least a minute and a half left.
  Sip and page clocks start out of step. Readers who brought a book are
  reading; laptops are open at dining tables.
- **Sometimes one more is at the counter** (about six boots in ten), first in
  line and about to order. Never a longer queue at boot.
- **In rain**, three walk-ins in four and the regulars who carry one have an
  umbrella in the stand.

It is set dressing, like the saved game's boot seed: no arrival captions, door
bells or bond changes.

## Projects and first days

Project work is dt-driven and patient: no progress bars, deadlines, decay,
penalties or required acknowledgement clicks, and no completion consumes a
story invitation. Captions:
[Project, gift and home captions](#project-gift-and-home-captions).

### First opening

A fresh café waits behind the entry overlay. On entry Lunafreya brings the cat
to its corner, sets out entrance equipment, coffee equipment and a small cake
stand, then assembles both table sets. Clock and customer arrivals wait until
setup finishes; setup costs nothing and resumes after reload. The morning
includes activity-linked speech (about shelter, not fire heat), a final cat
hug, silent breath, unlocking and placing a handmade “NEW CAFE” sign, carried
from the supplies by the entrance and lowered onto the porch, visible through
the open doorway. Its saved location prevents duplicates. The café's eventual
name remains undecided for future patron conversations.

- The bare hearth stays cold until its improvement is installed. Boarded
  windows have no curtain routine or window light beams. Optional furniture
  controls its paths, activities and perches; absent furniture is never a
  target.
- Initial menu: espresso, cappuccino, chamomile tea and cardamom buns.
- The starting room ends at x=832 and y=516; navigation corners stay within
  x=810 and y=496. Saved room size keeps expansion independent of furniture.
  The full café has its own bounds; apartment framing is the same for both.
- This one-time attended intro pauses dialogue and setup when hidden,
  explicitly paused or while Settings is open. Refocus discards that interval;
  missed speech is never caught up. Skip dialogue releases the attendance hold
  and lets the real assembly/finale finish unattended; it grants no furniture.
  Ordinary days use the elapsed-time background clock.

### Savings and the planner

New cafés begin with 90 coins, enough for the first two planner choices: a
30-coin left-window repair and a 60-coin table with two chairs. Both can be
chosen in one evening, in either order, including across a reload;
affordability never depends on a busy first day. Removing a finished cup at
pickup adds 1 coin, once; seeded drinks and unfinished orders add nothing.
Plant and fireplace are 30 coins each, with the usual one-choice rule outside
the window/table pair.

The planner shows floating thoughts with pixel gold-coin prices, “chosen”, or
a completion checkmark: no item descriptions, instructions or notebook panel.
Savings and unfinished jobs never expire; no costs accrue from absence. The
plant has no floor footprint; the table uses a reserved area until complete.

### Table, hearth and mantel

- **Table:** the kit is unpacked, its legs laid out, top fitted, seats
  assembled, wood wiped and the whole set positioned before any new seating
  opens.
- **Hearth:** she brushes the cooled fireplace, gathers ash, wipes stone and
  polishes the lip. A chosen fireplace rests cold from the following morning
  until cleaning is complete; unchosen fireplaces keep their fire/tending
  behavior. The first fireplace project removes the boards and restores a
  usable bare hearth; fire tending, heat glow and audio then become available.
- Each phase takes 18 seconds of hands-on work, split across short visits
  around service; jobs may take further days.
- **Mantel:** a later 40-coin project on Tomas's independent daytime job
  schedule. He arrives with a shelf and packed decorations. The fire rests
  while he works above it and returns when he has descended and left. Only
  this installation adds mantel candle routines, flames and clock chimes.
  Closing saves the work and lets him climb down before departure.

### Window repair and the second-day visitors

The booked worker enters the following open café with a toolbox, walks to
`L.projects.window.work`, protects the sill, removes boards, repairs the frame
and cleans the glass in four 18-second phases; boards disappear in stages.
Only the left view, its sunlight and its ship-watching spot become available;
the right window stays boarded until its own later repair (same phases,
`L.projects.window2.work`). The worker leaves when finished or at closing.
Partial work survives nights, reloads and mode changes, independently of
Lunafreya's table assembly. Door sounds and the caption limiter apply.

On the second morning the booked window and table jobs proceed autonomously.
Tomas enters first; Keira's table delivery waits until the repair is installed
and he has left, giving the first meetings breathing room. The saved project
stage preserves this order after reload. No greeting is required, and an
already delivered kit can be assembled alongside unfinished window work.
Without a pending window job the delivery proceeds normally. Keira deposits
the kit at its work site and clears the route before assembly starts. Closing
lets both actors exit and preserves partial work. Attended optional
conversations hold obligations through the moment system; ignored invitations
do not hold time, service, work or departure.

### Gerda and the repaired window

Gerda's regular arrival is gated by the completed left-window repair. Pending
table construction delays her return; once it is installed, accepted pillow
delivery becomes due through the ordinary seat-aware arrival scheduler, with
no independent timer or hidden-tab exception. She brings two pillows, places
them at the left sill (the quiet `softThump`) and joins the normal tea queue
with a perch reserved. Her introductions and thanks are manually advanced
conversations, never automatic captions or deadlines.

### Wall shelves and books

The optional 40-coin **three little wall shelves** purchase appears on
ordinary evenings. Keira carries a small kit and folding steps, unwraps it,
fits three boards left of the hearth and packs up. Work can finish unattended
in either mode; closing/reload retain fitted boards and partial work. The kit
reserves only its visible floor space until packed. Empty shelves do not
enable browsing.

Once the shelves are up, the planner offers **a box of books for the shelves**
(25 coins). Lunafreya brings the box in the next morning, sets it under the
boards and, between customers, crouches to take out a handful and reaches each
book onto the wall: the lower board fills first, six secondhand books in all.
Browsing starts once two books stand on the shelves; a reader stands on the
window side, runs a hand along the spines and takes one down, leaving a gap
until it is slid back.

### Room expansion

Tomas and his daughter come after opening (never while the window worker is
in), work until closing and resume the next morning. The door stays propped
open while boards go out; the bell rings only as they arrive and leave.

## Captions (the narrator)

The quiet caption, bottom-left, that makes a glance feel like a story. Long
captions wrap; cream letters have a dark outline and subtle shadow, with no
backing rectangle.

- Pipeline: `caption(world, text, rules)` → eligible observations in
  `captionQueue` (cap 2, eight-second expiry) → rechecked and shown for 4.4 s
  with fade in/out → minimum 6 s gap between starts; sixty-second repeat
  cooldown. Installed features, actual activities, saved history, weather and
  location govern admission and display. Rules, authoring examples and
  progression verification: [the ambience contract](ambience.md).
- Voice: warm, understated, present tense, initial capital enforced centrally,
  no exclamation-mark enthusiasm (one "tak!" allowed). British-cozy rather
  than game-y.
- Prefer **occasional** captions (probability-gated): the narrator speaks only
  when something is worth mentioning.

### Ambient triggers

- **Door and service:** arrivals (rain-aware), orders (`withArticle` for
  correct a/an), Lunafreya serving/tidying/clearing, cup returns, departures
  (rain/night-aware), shoes wiped on the doormat (28% of wet arrivals),
  umbrella shakes/collections, linked-pair arrivals, shared orders and seats,
  occasional tip-jar coins.
- **Seats and tables:** seat choices ("sinks into the armchair by the fire",
  "curls up in the reading nook", "perches on the window seat"), window gazes
  (20% of them, weather/hour-aware: rain on the glass, streetlamps, the street
  drifting by), a passer-by slowing at the glass (18% of pauses), bookshelf
  moments (drifting over, picking a book out, slipping it back), page turns
  (12% of them), murmuring tables (15%), quiet laptop bouts (10%), falling
  asleep and finding the line again.
- **Regulars:** settling into (or finding taken) their usual seat, a weather-
  or recognition-aware arrival opener, the neighbours using the name as they
  arrive (a remembered arrival line), Saira stopping her tapping for a nearby
  reader (35%, only while that reader still reads) or, alone, a rare tapping
  line or musing (10%), a pianist settling at the bench / beginning a sparse
  burst.
- **Lunafreya:** stretching/chalking/watering; her slow spells at the counter
  (sitting down with a book, 40%, held while she reads; a rare page-turn
  glance at the door, 8%; the crossword, 40%, with a rare pencil-to-chin clue
  after Calandra's letter, 15%; her own coffee or the old shop mug, 40%; chin
  in hand for the rain, the fire or the room, 35%; marking her page when
  called, 30%); her rare empty-night piano tune; humming Saira's score behind
  the counter (50%, at most once a café day, worded for the room's chosen
  sound); gifts put in their place (Keira's photographs by the till or beside
  the harbour print, Tomas's frame around them, Saira's score behind the
  counter or above the bed); the old sign glimpsed under the counter as she
  pulls her stool out (after the naming); the dusk/dawn candle ritual.
- **Cat:** movements and petting (including accidental piano plinks), the
  patient empty-bowl wait, Lunafreya's refill/supervision, rain and streetlamp
  window watches, bookshelf survey, counter shoo, aborted ascent, Lunafreya
  ignoring the top shelf, kneading, dust-mote battle, gentle lap dislodging.
  Every repeatable line is probability-gated.
- **World:** weather changes, noon church bells, the evening kettle, lamp
  threshold moments, the sailing ship.
- **Matcha:** three limiter-paced lines. The whisk step may note the bamboo
  patter and pale-green foam (30%); the ice step may note ice singing against
  glass (25%); only the first matcha sip of a visit checks for a slow,
  grassy-sweet sip line (20%). Lunafreya's sixth chalk doodle, a bamboo whisk,
  may likewise be acknowledged when it appears beside the prices.

### Regulars' voices

- `regularLine` (in `sim-patrons.js`) sits at the window-gaze, page-turn,
  laptop-bout and table-murmur seams. For a regular it may pull a bespoke line
  from that character's `lines` pool (`musing` at a solo beat, `overheard` at
  a shared table), suppressing the generic caption so the words replace rather
  than double it. A solo musing has a 3.5% chance of surfacing a rarer
  `backstory` fragment instead. Narrated fragments only, never quoted
  dialogue. Non-regulars are untouched. Pools and voice rules: characters.md.
- While the street-house arc is unfinished, fair-daylight window gazes may
  instead follow the painter's brush; Gerda has three guarded painter musings
  of her own. They retire with the completed arc.
- **Regular continuity (Phase 3).** Two more seams are driven by the persisted
  `bonds` count in the save (Lunafreya's memory of them): `regularArrivalLine`
  chooses the **opener** (a wet-weather line, a recognition line for a face
  she already knows, or the plain arrival) and `specLine` supplies the
  once-per-visit **settle** line and the **usual-seat-taken** patient-look
  line, each falling back to a generic templated line. Every such line stands
  alone. See characters.md (*Continuity*).

### Story beats

A second caption track, `captionScript` (fed by `captionRun`), carries the few
deliberate lines of a chosen beat: they queue in order, drain **ahead of** the
ambient queue and are never dropped by its 2-line cap, still paced by the same
6 s limiter. Only the opt-in narrative beats use it (today Gerda's scarf,
Nora's two gallery unveilings and the street painter's finished facade);
ambient captions keep to `caption()`. A **pending invitation** draws a
persistent bubble (e.g. a yarn ball) over its owner, or a brush at a fixed
scene anchor, via the ordinary bubble system: the only standing UI the
soft-narrative layer adds. See [narrative.md](narrative.md), characters.md
(Gerda's scarf and Nora's gallery) and the street painter above.

### Project, gift and home captions

All use the ordinary quiet caption queue and limiter.

- **Window repair:** the worker's arrival and the clear lake view.
- **Second-day visitors:** their arrival, the kit handoff, and later familiar
  or unintroduced off-duty stops.
- **Table and hearth:** “another little place to settle, whenever you like.”
  and “the hearth is clean; a small fire can glow again.” The first fireplace
  project's completion marks the first small fire catching.
- **Mantel:** completion marks the shelf, clock and candlelight.
- **Gerda:** the clear-window first arrival, warm ordinary returns before
  furnishing, the completed little table, carried knitted pillows, and her two
  placements followed by ordering tea.
- **Wall shelves:** first arrival, “Keira brings a little shelf kit and her
  folding steps”; familiar arrival, “Keira returns with a small bundle of
  shelves”; resumption, “Keira is back to finish the little wall shelves”;
  completion, “three little shelves, waiting for their first books.”
- **Box of books:** “the first books stand on the little shelves.”, “the box
  is folded flat; six secondhand books wait on the little shelves.”, and for
  readers “… drifts over to the little shelves.”, “… wanders over to the
  little shelves.”, “… takes a book down from the little shelves.”
- **Holger's books:** “Holger comes in with a small box held carefully under
  one arm.” (his gift visit); “Holger's books stand together on the little
  shelves; the box is folded flat.”; and reader lines that remember the
  handover: a note “for anyone who stays a while” (lent) or his name inside
  the cover (kept), the bosun's adventure book, the old cookbook read twice,
  and Holger taking down one of his own books “as if calling on an old
  shipmate.”
- **Aksel:** Holger holding the door for a broad man in a navy jumper (the
  first time) or coming in with Aksel already talking about the wind (later)
  replaces Holger's usual arrival line.
- **Piano:** Keira and Tomas bring it in together (their arrival and the
  bundle being tipped into its corner are captioned); Lunafreya's unwrapping
  ends with the piano standing in the corner, lid up, a little out of tune. On
  a quiet night her playing may open with Saira's tune (captioned the bright
  or the gentle way, only while she plays).
- **Room expansion:** the crew's arrival (the first day, then "back for the
  rest"), an occasional board or nail while the partition comes down (8% of
  knocks), the new boards going in, and the finished room.
- **Keepsakes:** “Gerda’s blanket hangs over the chair nearest the fire, for
  whoever gets cold.” or, at home, “Gerda’s blanket goes over the foot of the
  bed.” Gerda’s blanket arc adds three knitting lines about its long rows and
  pattern. If the old shop mug went downstairs, at closing (60%): “Lunafreya
  drinks the last of the coffee from her old mug, standing up.” Maud adds
  “Maud sits on the counter now, in her hand-labelled pot.” or, at home, “Maud
  goes on the windowsill, where she can see the night.”
- **Unpacking at home:** one caption per box (“a picture from the old flat
  goes up above the desk.”, “a string of small lights along the headboard.
  That’s better.”, “her own books, finally, along the windowsill.”, “the
  kettle and two mugs find their way to the kitchen.”, “jumpers, folded, on
  top of the suitcase for now.”, “postcards from home, pinned up by the
  door.”, “the little rug from the old flat goes down by the bed.”) and, after
  the seventh, “the last box is folded flat. It looks as though somebody lives
  here now.”
- **Home and plant:** “home, with a book and a familiar little shadow.” and “a
  little green by the window.”

## Interaction surface (deliberately tiny)

- Click the cat → pet.
- Control bar: volume/mute, rain, fire-crackle audio, music, fullscreen.
- Keyboard: `m`, `f`.
- Everything else watches itself. New interactions must clear a high bar:
  silent-failure-proof, optional, and gentle (see overview.md).
