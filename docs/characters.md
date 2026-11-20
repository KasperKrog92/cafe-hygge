# Characters

Behaviour reference for Lunafreya, patrons, the regulars, visiting workers and
the cat. Story and voices: [story-bible.md](story-bible.md); narrative rules:
[narrative.md](narrative.md); time, spawning, captions: [world.md](world.md);
motion: [animations.md](animations.md).

Behaviour is dt-driven state machines in `js/sim-patrons.js` and
`js/sim-characters.js`, opening/closing in `js/sim-shop.js`; drawing is
`SCENE.drawPerson` / `SCENE.drawCat` in `js/scene-people.js`.

The startup idle café uses the same people and ordinary habits, with no story
invitations, deliveries or apartment transitions. Saved stories and home
routines belong to the game, including its quiet-play setting.

**Names and IDs.** Lunafreya is the owner at the café and apartment; Nora is the
artist regular. They were swapped on 7 September 2026: appearances travel with
the names, apron/smock follow the jobs. Legacy internal identifiers (`nora`
checkpoints and helpers, `lunafreya` regular ID, `lunafreya-paintings` arc and
painting flags) stay stable to preserve saves. The legacy `__dev.shot("nora")`
owner shortcut remains; use `"barista"` for the owner, `"artist"` for the
studio.

**Drawing people.** CH=60 ruler, roster colours. Shirts and aprons turn with
the body: narrow side plane and overlapping trouser legs in profile, full bib
and pocket from the front, shoulder yoke with apron ties from behind (Nora's
paint-flecked apron too). The visible arm hangs from the lateral shoulder below
the ear; the torso hides the far arm. Seated clothing uses the same
projection. Skin/jaw shading, profile noses and cat haunch/fur highlights are
shared. `__dev.poses()` renders the roster in both profiles, front/back and
seated reading ([art-workflow.md](art-workflow.md)).

---

## Lunafreya

Café owner and player character (`world.barista`). Warm-red top, cream apron
(neck straps, pocket, tie bow at the back), golden-blonde hair in a generous
bun (`hairStyle: 4`). Goes home with the cat after closing.

**Home position:** behind the counter at `L.baristaHome` (706, 286); the y
matters (art.md). She leaves the counter through the gap at x = 616.

**Routing.** All café movement is a furniture-aware path from her current
position to the next work spot, with no fixed aisle waypoints. The counter
front is solid, with a working corridor behind it; 12 px side clearance lets
her use the nook's narrow service gaps without crossing lamps or armchairs.
Service approaches may share their own low table's projected floor space.
Unreachable chores stay pending and are reported by the dev audit, never
played from afar.

### Order flow

Orders queue in `barista.orders` (FIFO). Each is a walk to the station and
timed steps, each with its own sound:

| Drink prep | Steps (station x → action, duration) |
| --- | --- |
| `coffee_milk` (cappuccino, cinnamon latte, flat white) | 664 grind 1.5 s → tamp 0.55 s → 678 pull 2.4 s → 706 steam 1.8 s |
| `coffee` (espresso) | grind → tamp → pull |
| `tea` (chamomile) | 700 kettle pour 2.0 s |
| `milk` (hot chocolate) | 706 steam 1.8 s |
| `matcha_hot` (matcha latte) | `L.matchaBar.x` scoop 0.8 s → 700 kettle pour 1.4 s → `L.matchaBar.x` whisk 2.2 s → 706 steam 1.8 s |
| `matcha_iced` (iced matcha) | `L.matchaBar.x` scoop 0.8 s → 700 kettle pour 1.0 s → `L.matchaBar.x` whisk 2.2 s → ice 1.0 s |
| `food` (bun, croissant) | 858 fetch from pastry case 1.4 s |

Machine steps (grind, tamp, pull, steam, kettle: `MACHINE_STAGES`) happen at
the rear cabinet at `L.backBar.workY`, station x derived from `L.machine`, seen
from **behind** (`heading: 'up'`, apron ties and bow to the room). Scoop,
whisk, ice and fetch are at the front counter (`L.baristaHome.y`), facing the
room (**front**). She walks between stations in profile, carries the
cup/glass/plate to the pass (`L.serveSpot` = 744, 266), sets it down (clink)
and rings the counter bell (*ding*).

During machine steps the machine light blinks and steam rises (`world.brew`).
Whisking animates the chasen and a pale-green surface in the chawan, with
sparser steam; the iced finish visibly fills a glass at the matcha bar.

With a customer at the counter and tables clear, she stays at the till facing
the room; the patron steps up and faces her (their back view, her front view).

### Service priorities

At each free moment, in order:

1. Clear abandoned indoor cups and dirty terrace tables, before starting
   another drink or accepting an order. A drink in progress finishes first.
2. Customers at the counter.
3. Improvement work ([below](#table-hearth-and-gift-work)).
4. Daily care and small counter-life, chosen every 6–15 s.

During closing, queued customers and unfinished orders keep the clearing
priority until service finishes; otherwise customers waiting for a clean table
and closing waiting for those customers would deadlock. Customers still walking
in do not interrupt improvement work; a customer at the front slot or a table
needing clearing pauses it after the current three-second hand action,
preserving progress.

### Care and idle life

In priority order. Named routes are shared with `__dev.audit()`, whose journey
check proves them.

- **Bus a table** (any abandoned cup, `item.owner === null`): one visit clears
  the whole table. Pieces are picked up a beat apart (a clink each, a wipe
  swish once stacked) and carried home together, two or more as a
  saucer-and-cup stack; rare caption (30%). `SIM._.busRoute` legs are
  axis-aligned: big tables by dropping from the lane at the bus spot, nook side
  tables via their `busVia` columns between wing chairs and reading lamps, tall
  window tables from their floor line (the tabletop is up at the sill).
- **Refill the cat bowls** (food below 0.34 or water below 0.2): `refillRoute`
  to the cat corner, a 1.6 s crouch, a quiet pour, low bowls back to 1. The cat
  may supervise.
- **Light the candles** (daylight below 0.5): one lit taper round every dining
  and nook table, then the mantel (`candleRoute`); each flame blooms over about
  2 s. For a customer at the counter she finishes the current candle, serves,
  and resumes at the next unlit stop.
- **Water the plants** (once per café day, between 09:00 and 16:00): a copper
  can to the counter plant, the right floor plant and, when installed, the
  purchased first sill plant (`waterRoute`). A customer at the counter parks
  the round after the current plant. No coffee-side floor plant exists.
- **Feed the fire** (`world.fire.wantsLog && !claimed`: hearth low, no fireside
  regular tending it): crosses via the fire's clear column (`fireRoute`), holds
  a log for a beat and lays it on (`addLog`; burn cycle in world.md). Fireside
  regulars get first refusal; she goes only on an idle roll.
  `__dev.noraDo('fire')` forces it.
- **Play the piano:** after at least 30 truly empty seconds with daylight below
  0.35, a 25% candidate roll sends her via the lane and the piano's clear
  descent column to play sparsely for 60–120 s; then a 600–1200 s cooldown. A
  doorbell, queue or order ends the phrase and she returns to serve.
- **A slow spell** (`js/sim-counter.js`, `SIM._.counterHabits`): only with no
  queue, orders, cups at the pass, tables to clear, pending improvement work,
  conversation or closing; it ends the moment one appears (she is up before a
  new guest reaches the counter).
  - **Stool and book** (45% candidate, 45–110 s cooldown between sessions):
    carries her slate-blue paperback 6 px to the stool at the till
    (`L.counterStool`, 712, 286; hidden by the counter), sits facing the room,
    reads 45–110 s with a page every 9–18 s, then tucks the book away at the
    till. After Calandra's letter (`home-calandra-done`) 35% of sessions are
    the crossword: folded paper, a pencil, now and then a tap on her chin.
    Fire, candles, watering and bowls also get her up.
  - **Own coffee** (15% candidate, at most every 300–600 s): a 2.2 s shot,
    drunk at the till for 18–32 s, a sip every 4–7 s. With the old shop mug
    downstairs (`luna-mug-cafe`) she takes it from the back bar (`L.oldMug`)
    and returns it after; it is never on the bar and in her hand at once. A
    guest arriving sends the cup straight back.
  - **Chin in hand** (12% candidate): near elbow on the slab, 8–16 s.
  - **Hum** (`hum`, `js/sim-saira.js`): once Saira's score is pinned behind the
    counter, at most once a café day she steps over and hums its eight bars
    facing the wall; any customer or chore ends it.
- **Chalk the menu** (every 600–1200 s): a 3 s reach up behind the counter; the
  cached board changes to another of heart, curled cat, steaming cup, sprig,
  umbrella or bamboo whisk. Rain weights the umbrella heavily; the whisk's
  caption has it appearing by the prices.
- **Stretch** (30% candidate after 20 quiet seconds, café truly empty): both
  arms overhead for 2.2 s.
- **Wipe the counter** (35% of the ordinary pool): three slow swishes.
- **Polish a cup** (22%). **Tidy the pastry case** (18%): walks there, soft
  clink.
- Otherwise she stands watching the room, front view.

### Invited meetings

An accepted invitation reserves its speaker while Lunafreya finishes her
current activity, then walks over. Drinks finish through placement at the
pass, chores finish their return route, projects stop at a saved hand-action
boundary. Other guests carry on and may collect ready drinks or leave.
Customers can reach the counter and wait, but no order is taken until she
returns. Other workers and the cat stay autonomous. Closing, new arrivals and
narrative thresholds wait; dialogue never advances unattended.

### Table, hearth and gift work

After opening she carries a chosen kit to the reserved work site: `projectOut`
walks there, `projectWork` animates fastening/wiping or a kneeling brush
stroke, `projectHome` returns empty-handed. A held kit is put down at its site
before she responds; hand work finishes its current three-second action before
table clearing, a customer at the counter or closing takes over. Walking
arrivals do not interrupt. Nine-second visits and an 18-second break leave room
for care routines. Partial phases persist across evenings, reloads and
presentation changes. A finished table enables two normal seats; the cleaned
hearth rejoins ordinary fire tending.

- **Fireplace:** unboarding, sweeping, clearing the flue and laying the first
  fire, with the same interruption rhythm. The mantel is a separate later
  purchase done by [Tomas](#keira-and-tomas).
- **Plant:** a chosen plant adds a morning job after the carried-cat entrance
  and bowl routine, before the curtains: parcel pickup, furniture-aware carry,
  four-second unpack, four-second placement. Package and plant are drawn from
  the saved stage, so a reload resumes one job. Available or installed plants
  add no chore.
- **Gifts:** Holger's book box, Gerda's blanket and the old sign (`cafeSign`)
  are under their characters.

### Terrace round

`sim-waterfront.js` adds `terraceOut → terraceApproach → terraceClear →
terraceBack → terraceHome → idle`. Normal planner inside, the clipped exterior
only from `L.doorSpot`; she collects and wipes for 2.8 seconds at the table and
walks home carrying a stack. Outdoor x positions live separately on the same
entity; nobody is drawn twice. Clearing takes priority over new service;
closing waits for both outdoor tables to be clear before the indoor closing
chores.

### Opening and closing

`updateShop` in `sim-shop.js` runs the phases `open → closing → leaving → night
→ home → dawn → entering → opening → open`. Each chore has an outbound path, a
2.5-second interaction and an optional return to the till. Consecutive floor
chores use the furniture route planner; service can interrupt between chores.
Ordinary idle chores wait until reopening is complete. Times and full
sequence: [world.md](world.md).

**Closing.** Goodnights are spoken from the counter, facing the room. Cleanup
visits the nook and lower tables right-to-left, the piano/artist corner, then
upper tables and window ledges left-to-right, then returns to put pastries
away. The final wall round is right curtain → hearth → left curtain → cat
corner → entrance switch → door, with no return to the counter.

Closing readers finish their last cup, then use `beginDeparture`; laptops first
pass through `closeLaptop`. Couples, dozers, borrowed books and umbrellas keep
their cleanup paths. Guests being served get their own final-cup grace after
sitting down. No guests arrive during closing or overnight.

She collects the cat after the guests leave. A perched cat descends through its
hop sequence, then walks to her (`shopWalk`). Carried, it is drawn asleep in
her arms with its saved scarf and no floor shadow; its own behaviour pauses.

**Opening.** She switches on the entrance lights, sets the cat down near its
bowls (its routines resume; it can be petted again once on its feet), fills the
bowls, then works across the left window, hearth, right window and pastry
counter, with no preliminary trip to the till.

### The first opening

`SIM.firstOpeningSteps` defines twelve saved setup steps: set the cat down in
its corner, fetch and place entrance equipment, fetch and install basic coffee
equipment, fetch and place the tiny cake stand, fetch and assemble each of two
table sets (eighteen seconds each), return behind the counter. She enters
through the open door, which swings shut behind her; the cat's cushion and
bowls already wait by the counter. Routes are obstacle-aware. What a chore
makes is in place the moment her hands finish; only the next chore waits for
her words. Customers are admitted when the final step completes, with no input
or payment. Installed seating is added once, routines use only installed
furniture, and the initial menu excludes matcha. Furnished saves skip all this.

`sim-intro.js` adds 22 short remarks to the unnamed cat ("little one"), each
said where it belongs: the cat's corner while laying it on the cushion, last
night's cleaning on the walk back to the boxes, the pastries while setting them
out. She pauses after imagining someone staying all afternoon with a book.
Finished hand actions settle into a standing pause while the words are read.

The final step has eight saved stages: return to the cat and lift it, hug it
(same carried cat, scarf kept), put it down, collect the handmade sign, gather
herself at the door, unlock, step through and place the sign, come back
inside. She takes the sign down facing the wall and turns with it; from behind
only the board ends show. After her final words she closes her eyes for a
seven-second silent breath. The door bell rings for the first time as the door
opens. She walks out over the sill with her back to the room, sets the sign
beside the step, comes back in and turns in the doorway for one more look.
Only once back at the counter does she admit the first customer.

The sign reads **NEW CAFE** in uneven paint on two scrap boards. It is not a
chosen name; see [The café's name](#the-cafés-name).

### Home

`sim-life.js` sends the same Lunafreya and cat to the sparse apartment after
closing; neither is replaced and the cat keeps any chosen scarf. Home uses
authored routes through `L.home.lane`, below the desk and bed, with a side
approach onto the bed.

**Ordinary evenings.** Arrival at the door happens once. She pauses by her
suitcase, uses her PC, reads and dozes on the bed, then returns to the desk.
The rear-facing PC pose lowers her into the chair with bent legs under the
desk, types with alternating small hand movements and rises before leaving, on
simulation time. The cat investigates the boxes and rests beside her. Game mode
loops only the indoor desk, reading and resting routine until the player
chooses **go to sleep**, with or without open evening thoughts; both join
matching positions at the loop boundary, without replaying arrival or jumping.
Quiet play finishes the routine automatically. Sleep goes straight to the
short dawn transition and café entrance.

**The first evening** (`sim-home.js`). She sets down the cat, visits kitchen,
bathroom and bed, admits her exhaustion, opens one box, assembles a coat
hanger and hangs drapes from a stepladder, then sits at the PC and the
two-choice first planner opens. Once the left window and first table are both
selected, ordinary apartment activities resume. Both modes wait for the first
**go to sleep**.

**Bedtime.** Explicit sleep follows the bathroom-door route, toothbrushing,
curtains and shared bed, with a whispered goodnight. The bathroom door opens
before each crossing and closes during brushing; the kitchen door normally
stays open. Dialogue shares the intro's reveal/pause/accessibility settings.
Once bedtime starts, **skip bed sequence** goes straight to the usual 07:30
dawn transition and schedules purchases, also from a paused or reloaded
bedtime; it clears the first-night checkpoint and saves the completed evening.
Hidden pages, pause and Settings hold the attended tour and bedtime; later
ordinary apartment idling continues in the background.

**Supper.** After first-night planning, or after settling at the PC on later
evenings, she makes bread and cheese: seven seconds preparing in the kitchen,
sixteen eating at the computer, four rinsing, with real walks through the
kitchen door and clear aisle. The plate travels with her, empties as she eats
and is put away at the sink; then she resumes reading/resting. The cat rests
nearby. Once per evening in both modes, no cost or hunger mechanic.
`life.homeDinner` saves elapsed work and completion; a reload neither repeats
supper nor advances it offline. It continues under the planner and in hidden
tabs. Explicit sleep interrupts from where she is, leaving the kitchen by its
door. Later meals and a dining/kitchen table belong to future furnishing.

**Evening moments** (`sim-evenings.js`, game mode). One moment may wait over
Lunafreya each evening: the old shop mug after her talk with Holger, Calandra's
first letter from the third evening, and `name`
([The café's name](#the-cafés-name)). Opening one holds the evening where she
is.

---

## Patrons

Generated on spawn from pools.

**Names (Danish):** a name style is picked first, with equal odds, then a name
from its pool. Feminine: Freja, Astrid, Ida, Clara, Sofie, Maja, Ellen, Alma.
Masculine: Søren, Mikkel, Emil, Anton, Johan, Viggo, Oskar, Karl. Custom
dev-harness names use a neutral `custom` style.

**Appearance rolls:** 5 skin tones, 8 hair colors, 9 top colors, 5 trouser
colors; 40% wear a scarf (knotted, hanging tail); 40% have long hair; 4 hair
styles (classic / side-part / curly / bun, uniform). Masculine name styles
roll a 30% beard, others none (15% overall). Walk speed 46–60 px/s, a 4-frame
cycle.

**Personality rolls:**

- `wantsBook` (35%): a reader. 45% of readers bring their own book (`ownBook`);
  the rest borrow one from the nook bookshelf.
- `chatty` (55%): murmurs with a table-mate.
- `murmurPitch` (125–235 Hz): their voice in the murmur synth.
- `laptop`: 16% of non-readers by day, 6% from 21:00–07:00. Needs a dining
  table; with only perches or wing chairs left the trait stays dormant.
- `pianist`: 10% of patrons who are neither readers nor laptop users; never a
  couple member or Holger. Takes the piano bench only when it and the
  world-level 300–600 s music cooldown are free; otherwise dormant.

**Order:** weighted pick: cappuccino 3, cinnamon latte 2.5, flat white 2,
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

1. **enter**: appears at the door (bell jingle, door swings, thud ~1.1 s
   later) and joins the queue, whose slots fan diagonally from the till
   (`L.orderSpot` 696, 316); the sixth bends through `L.queueBend` round the
   reserved table set, keeping all seven waiting/queue stops clear. In rain
   (`world.rain > SIM._.WIPE_RAIN`, 0.3) every arrival first does **wipeFeet**,
   ~1.3 s on the coir doormat (`L.doormat`): a soft double scuff
   (`SND.shoeWipe`) and water flecks kicked low. 75% also carry a furled
   umbrella: **shake** 1.1 s (five falling drops, soft flap), then
   **parkUmbrella** along the declared door-to-stand route into
   `world.umbrellaStand`.
2. **ordering**: at slot 0 with Lunafreya free, 2 s with the order icon in a
   speech bubble and a caption ("Freja orders a cappuccino.").
3. **waitDrink**: waits at the lowest free waiting spot (the cluster drifts
   down-left from the pass; spots free on pickup) until their cup, carrying
   their id, is at the pass.
4. **pickup**: takes the cup (clink). Borrowers (`wantsBook` without `ownBook`)
   first **browse** the bookshelf: 2.5–5.5 s at the browse spot, page-turn
   sound, `hasShelfBook = true`, a spine leaves the shelf. `bookColor` carries
   the gold, red or blue loan spine through carrying and reading; returning
   restores it. Seat choice:
   - Seats with an abandoned drink are avoided while cleaner ones exist (two
     cups would share a saucer spot).
   - Borrowers prefer nook chairs; readers prefer nook chairs / fireside
     armchairs / window perches (they read at tables too); otherwise a random
     free seat; in a full café they take it to go.
   - **Window perches:** walk to the seat's floor spot, hop onto the sill.
     Routing clears the fireside armchairs both ways; short trips may cross
     open floor. Both perches at a window share the tall table under the
     glass. The rightmost perch's floor approach is 12 px left of its sill
     position, clear of the counter plant.
   - A pianist may take the appended piano bench; the drink uses the saucer
     spot on the lid and the shared table pipeline (sipping, steam, cup return,
     abandoned-cup avoidance, bussing).
   - Eligible solo walk-ins may take a [terrace table](#terrace-visits).
5. **seated** (stay 100–260 s): eases down, the cup travelling to the table in
   hand; routines begin once settled:
   - **Sipping** (drinks only): every 9–22 s, 1.3 s. The cup, handle-less
     matcha bowl or iced glass rises (table item hides, vessel in hand), sip
     sound at the peak, soft clink down; readers lower the book. Steam while
     hot (first ~45 s), never for iced matcha. Either matcha may earn one
     first-sip caption check per visitor. Nook and fireside sitters use their
     own side tables with the same hide/lift/replace sequence; Lunafreya
     clears those from the front, below the chair footprints, via `busVia`.
   - **Reading** (readers): page-turn sound every 12–26 s; occasional caption.
   - **Laptop work** (dining tables): an open 16 px laptop beside the drink.
     Every 6–14 s, 2–3.5 s of typing with alternating forearms and sparse
     keystroke clusters; sipping pauses the hands. A very faint cool screen
     glow after dark. Before leaving, 0.6 s to close the lid and tuck it under
     the free arm.
   - **Piano playing** (active pianist): 1–3 quiet 40–90 s bursts with 8–20 s
     sit-backs. The `playing` pose reaches both forearms sideways to the keys;
     a sip pauses hands and felt-piano engine, then the same burst resumes.
     The final burst starts the room-wide cooldown; the music box yields while
     keys sound.
   - **Dozing** (one at a time): after dark, a reader in a fireside or nook
     wing chair with over a minute left may sleep over the lowered book for
     40–110 s (closed eyes, slow breathing, occasional `zzz` bubble; page and
     sip clocks pause). They wake alone or on 25% of doorbells and read on.
     Lunafreya never intervenes.
   - **Fetching a book**: a seated non-reader at a table sometimes walks to
     the bookshelf mid-stay (seat and drink stay), browses, returns with the
     book under an arm (`holding: 'book'`) and reads.
   - **Chatting** (chatty, with a seated table-mate): every 16–34 s a "…"
     bubble + murmur; the mate replies 1.2–2 s later at their own pitch.
     Window pairs share a table and can murmur too.
   - **Watching the window** (window sitters): every 20–50 s, for 3.5–8 s, the
     head turns to the glass behind the seat (showing the **back** of the
     head) while the body keeps leaning on its cushion (`gazeFacing`); a sip
     turns it back. Occasional weather- and hour-aware caption (rain on the
     glass / streetlamps / the street drifting by).
   - See also [Nora](#nora)'s watchers and
     [the sailing ship](#watching-the-sailing-ship).
6. **leaving**: 40% carry their cup back to the counter ("returns the cup —
   tak!"). A borrowed book goes back first (**returnBook**, ~1.1 s; the spine
   reappears). Exit via the door (bell again); armchair readers leave
   cup-in-hand. A reader with the cat on their lap waits while
   `SIM.dislodgeCat` hops it down, then stands one second later. A parked
   umbrella is collected last, by the route in `L.patronRoutes`; furled, it
   shares the off hand with a carried drink or closed laptop.

**Spawning:** new cafés start with at most two customers and 90–130 seconds
between first-day arrivals after Holger's mandatory greeting. Later occupancy
targets 50%, 75% and eventually 95% of installed customer seating as saved open
time grows. Regulars share the walk-in timer; waiting guests and dirty seats
reduce admission, and at most three guests await a seat. Arrivals speed up well
below target; evenings keep the same fullness. Later visits gain a
capacity/familiarity-based minimum stay; longer authored stays and closing
departures are preserved. Only established furnished cafés pre-seat the room
at boot; a modest café restores only an unfinished first greeting at the
counter. Shared budget: world.md.

### Couples

After the first day, when a normal spawn fires with room for two, 22% are a
linked pair. The second comes through the still-open door 1.2–1.8 s later
without a second bell. In rain they share the first patron's umbrella. They
stay FIFO queue neighbours and order individually, but the first pickup
atomically reserves both sides of one clean dining table, else both window
perches; without a pair of seats both take their drinks to go. At the table
they murmur every 12–26 s, with a rare heart bubble. Their stays share one
120–260 s roll with a small individual wobble; once both expire they leave
0.8 s apart and share one cup-bussing decision.

### Terrace visits

`sim-waterfront.js` extends the patron state machine. Eligible ordinary solo
walk-ins may reserve one clean terrace table at pickup; regulars, couples,
pianists, laptop users and borrowers stay indoors. The same patron and drink
travel `terraceDoor → terraceWalk → terraceSit → terraceLeave`. They sit
100–240 s, sip every 12–25 s, and turn pages if they brought a book. They hold
their terrace place and no indoor seat, and do not reduce the indoor occupancy
target.

After ten seconds of sustained rain, `terraceReturn` carries the drink back
through the entrance and reserves an indoor seat; with none free, the normal
take-away departure applies. Rain changing before the guest reaches the door
cancels the outdoor reservation. Last call sends outside guests home and
leaves empties for Lunafreya. No outdoor story beat or expiration exists.

The dev audit checks reservations, cup ownership, cleanup claims,
indoor/outdoor exclusivity and the clean-terrace-before-closing condition;
journey verification is in [art-workflow.md](art-workflow.md).

### Watching the sailing ship

During a visible ship passage, up to two ordinary settled guests may follow
`seated → toShip → watchingShip → backFromShip → seated`, each on a distinct
`L.waterfront.shipWatch` floor anchor via the normal planner. Seat and drink
stay reserved; reading resumes after. They face the glass, wave briefly and
watch for at most 18 seconds; the ship leaving view or last call ends it
early. Excluded: regulars, couples, window sitters, artists, pianists, laptop
users, knitters, sleepers, guests holding drinks and anyone with the cat on
their lap. Eligibility needs over a minute remaining and a quiet gap between
sips; each guest joins at most once per passage.

---

## The regulars

A roster kept as pure data in `js/characters-roster.js`
(`window.CAST.regulars`), read at world creation. Each row fixes a look, a
drink, habits, a usual seat, an arrival window and line pools.
`makeRegular(world, spec)` stamps a row over a plain patron; most regulars ride
an existing behaviour.

| Regular | Arrives | Drink | Usual seat | Rides | Character |
| --- | --- | --- | --- | --- | --- |
| **Holger** | ~09:00 | espresso, own book | left fireside armchair | reading | stoic; never chats |
| **Gerda** | ~10:00 | chamomile tea | window perch | window-gazing, chatty | warm, older; watches the street |
| **Nora** | ~11:00 | flat white | artist stool above the piano | painting, later sketching | deliberate; paints the café into its walls |
| **Kasper** | ~13:30 | iced matcha | dining table | laptop typing | young writer; mutters at the screen |
| **Antonia** | ~18:30 | matcha latte, own book | right fireside armchair | reading, dozing | evening reader; drifts off by the fire |
| **Marcel** | ~17:00, even days from day 4, never while painting | cappuccino | window perch | window-gazing, chat | the painter across the lake |
| **Ida** | ~15:00, every third day from day 5 | cinnamon latte, own book | dining table | reading, chat | the librarian on the corner |
| **Elody** | ~12:00, odd days from day 6 | cardamom bun | dining table | chat, sky-watching | the gardener; brings Maud |
| **Birgit** | ~09:30, every third day from day 8, never after noon | cardamom bun (the competition's, professionally) | dining table | chat | the baker two streets over; breakfast after her own morning's work |
| **Saira** | ~11:00, every third day from day 7 | hot chocolate (off the small menu: whatever is on it) | dining table | chat, tapping | choir accompanist and piano teacher; writes eight bars of her own |

**Schedule.** `world.regulars` holds one slot per id (`{ lastDay, day, hour,
force }`); `updateRegulars` brings each in once per café day within its window.
`firstDay` and `rhythm` (`{every, offset}`, on `daysCompleted`) spread the cast
across days. Of several due, the one longest without a visit comes first
(roster order breaks ties). A due regular waits for a seat only until 20:30,
an hour before closing, then skips the day and comes first next time;
`arrival.latest` sets an earlier limit (Birgit: noon). Only Antonia sits late
enough for the after-dark doze. The fresh 08:24 boot reaches Holger's window
within its first real minute; `__dev.ff()` walks a full day of arrivals,
`__dev.regular(id)` forces one in.

**Usual seats.** A row's `seat` names a `SEAT_PREFS` predicate in `sim-core.js`
(`firesideLeft`, `firesideRight`, `windowPerch`, `nook`, `diningTable`,
`artistStool`). `freeSeat` steers the regular to a free preferred seat and
marks `usualSeat`; they sit down with a `settle` line. With every preferred
seat taken, one `usualTaken` patient-look line fires and normal seating
applies. Both lines come via `specLine`, falling back to a generic template.
Arrivals do not pre-empt seating, and an absent preferred seat is never called
occupied.

**Lunafreya's memory.** A regular arriving while the reader is present makes
`noteRegularVisit` bump a persisted bond in the `MEMORY` save
(`bonds[id].visits`, `lastDay`, `known`), the only thing that accrues just by
being present ([narrative.md](narrative.md) §5). `regularArrivalLine` picks
`arrivalRain` when they come in wet; else, for a known face, sometimes the
recognition line `arrivalReturn`; else plain `arrival`. Every branch stands
alone. Bonds are free-form and created lazily, so old saves need no version
bump. `warmth` is reserved for conversations.

**Boot-seeding.** `seedRegular` seats Holger in his fireside armchair at boot,
reading, and marks his schedule done-for-today so `updateRegulars` brings no
second Holger that café day. No arrival caption, no bond bump; skipped if his
armchair is taken. The idle café instead seeds every regular whose hour has
come, each in their usual seat and part-way through the visit (see
[world.md](world.md#popularity-and-occupancy)).

**Appearance.** Holger: grey hair and beard, forest-green jumper, dark-red
scarf, 130 Hz murmur, 46 px/s. Gerda: bun of grey hair, mauve top, warm-red
scarf, a slower 40 px/s. Nora: long brown hair with a side-part fringe
(`hairStyle: 1`), sea-blue top under a paint-flecked cream smock, deliberate
42 px/s. Kasper: long brown hair, muted-blue top, brisk 52 px/s. Antonia: long
red hair, mossy-green top. Each has a fixed umbrella colour brought reliably in
rain, a fixed stay range and its own `nameStyle` (`nameStyleFor` has no name
special-case; roster names live outside the random `PATRON_NAMES` pools).

**Voices.** Each row's `lines` has four pools: `arrival`, `overheard`
(shared-table murmur), `musing` (solo: reading, window-gazing, typing) and
`backstory` (a rarer drip). `regularLine(world, p, context)` in
`sim-patrons.js` sits at the existing caption seams and, when it speaks,
replaces the generic line ("turns a page"): window-gaze, page-turn and laptop
bout → `musing`; table murmur → `overheard`. A solo musing has a 3.5% chance
(`BACKSTORY_GATE`) of a backstory fragment instead (Holger's sea years,
Gerda's Erik, Kasper's unfinished chapter, Antonia's re-read), only after
three visits and, for Holger and Gerda, their saved introduction.
`chatty: false` regulars (Holger, Kasper, Antonia) have no `overheard` pool,
their story arriving as solo musings; only Gerda's fires, and only when a
walk-in shares her window table.

Pools filter on the actual activity and installed room before choosing a line,
and recheck before and during display: a boarded view, unavailable fire,
ordinary chair, inactive laptop or painting awaiting its reveal cannot supply
the matching musing. Cat sleep distinguishes a quiet nap from real fire warmth,
and kneading names the actual bed or rug. Authoring and lifetime rules:
[ambience.md](ambience.md).

**Voice rules for the pools.** Warm, understated, initial capital, Danish
flavour welcome; narrated fragments, not quoted dialogue (reserved for opt-in
conversation beats, [narrative.md](narrative.md) §6). Each line **stands
alone**, un-plot-heavy and unurgent; continuity lives in the story arcs, which
only a taken invitation advances.

**Introductions and stories** (`js/sim-regulars.js`, game mode). Whether one is
offered is decided as the regular comes through the door, so an introduction
never opens on a first visit; it waits until chosen. Nora offers hers from her
second visit, Kasper from his third, Antonia from her second, each while
seated. Afterwards each has two flagged musings, one per remembered answer
(Nora sketching a neighbour or the corner by the door; Kasper holding up three
fingers or deciding there is no hurry; Antonia glad to be let alone or checking
the water is still on her route).

### Holger

**The mandatory first hello.** Holger is the first customer in a newly opened
café; his introduction teaches the dialogue mechanic. He stays in `ordering`
at `L.orderSpot`, Lunafreya across the counter, until the dialogue completes.
A softly blinking dots invitation waits in idle and game; opening it stops the
blinking for good. Pausing the conversation keeps him there, with no orders,
other arrivals or closing clock running. Reload restores the counter encounter
and acknowledged lines/choices. Two choices remember Lunafreya's motivation and
first hope for the café; he is a retired neighbour with a seafaring history
([story bible](story-bible.md)). Established furnished saves keep their
optional seated introduction with approach/return.

**Tending the fire.** Holger has the `tendsFire` trait (opt-in per roster
row). Seated in a fireside armchair with the hearth low
(`world.fire.wantsLog`) and no one else on it, he sets down the book, walks to
the hearth via the fire's clear column, lays a log (`addLog`) and returns to
read on, keeping his seat (`toFire → atFire → backToSeat`). He gets first
refusal over Lunafreya; his `fireUp`/`fire` pools narrate it.

**The crew's books.** From his third visit after the introduction he may offer
the crew's books (game-mode invitation, while ordering or seated). Once
promised and once a shelf exists, he next arrives with a small box under his
arm, sets it on the counter's left end as he orders, sits as usual and waits
with a steady invitation. If the handover is not opened he takes the box home
from the counter on his way out and brings it on a later visit. After the
handover Lunafreya carries the box to the shelves in a quiet moment and
shelves it like a purchased box. If she let the books stay his, on 40% of days
he leaves his own book at home and takes one of his down from the wall.

**Aksel.** A regular story may name a `companion` (Holger's `visit`: Aksel).
The companion's hook (`SIM.companions.aksel`, sim-holger.js) brings him through
the door a moment later as Holger's partner, but only if a table has two free,
clean seats; otherwise Holger comes alone and the scene waits. They ride the
ordinary pair path (order, sit together, talk, leave together); with Aksel at
the table Holger talks instead of reading, and his overheard lines about buoys
and the wind can surface. The invitation waits until both sit. After the first
visit Aksel comes on every third Holger visit.

### Gerda

**Her first window.** Gerda's arrival requires the repaired left window; both
presentations offer a saved optional introduction, in which she explains the
cold shortening her waterside visits and offers two self-knitted pillows.
Accepting unlocks the window table/seats project; "not yet" can be revisited.
Before a purchase she keeps coming for tea, in an ordinary seat with no
implied window perch.

**The fireplace remark.** The introduction includes her hope of sitting by an
opened fireplace; finishing it unlocks the fireplace's first purchase whatever
the pillow decision. Introductions completed without it get a separate
two-line invitation, saved as `gerda-hearth-hope/reply`. It never chooses or
purchases an upgrade for the player.

**The pillows.** While her booked table is assembled she waits to return. Then
her `gerdaPillows` patron state carries the pillows through the door, walks to
each left sill approach and places each during a three-second reach; closing
or reload preserves completed placements. After both she reserves a left
perch, orders tea through normal service, sits and knits. Her optional
thank-you is saved line by line and follows her into later visits. From then
on her preferred seat is a left-window perch, with the normal occupied-seat
fallback.

**The scarf** (`gerda-scarf` in `CAST.arcs`) is the reference story arc; the
loop is [narrative.md](narrative.md) §8.

- **Knitting.** While the arc is unfinished (`stage 0`), Gerda knits whenever
  seated and not sipping/gazing: crossing needles, a scarf in her lap whose
  length reads the saved `progress`, a soft wooden `SND.needle()` tick (quieter
  than the fire) and the occasional `knitLines` musing.
- **Progress.** One row per café day (24 real minutes of the café running,
  hidden tabs included) in `updateNarrative`'s quiet tick; a closed café holds
  still.
- **Invitation.** At `progress ≥ rows` a soft yarn-ball bubble sits over Gerda
  whenever she is present. It never pulses, counts down or expires.
- **Beat.** Tapping it plays a short caption run: Gerda casts off, holds the
  scarf up and loops it around the cat. A heart blooms over both,
  `cat-wore-scarf` is set for good and her bond warms. With her pillows
  installed she later keeps knitting at the window without replaying the gift
  or changing the saved arc.

Dev: `__dev.regular('gerda')`, then `__dev.age(5)` to ripen the scarf and
`__dev.arc('gerda-scarf', {ready:true})` to raise the invitation at once.

**The lap blanket.** On a later visit after the scarf is given, Gerda asks
about a lap blanket, knits it in the chosen pattern over six café days and
presents it in her own scene. Lunafreya carries it from the counter and lays it
over the chair nearest the fire (a short reach at `L.projects.blanket.work`),
or takes it home, where it goes over the foot of the bed when she first
settles there.

**Watching the painter.** Gerda's `arcMusings` are the one guarded exception to
plot-free ambient lines: while the `street-house` arc is unfinished and the
painter is actually visible in fair daylight, a window-gaze musing may notice
his rhythm, the brush line, or how far the warm colour has travelled. The pool
retires when the finishing beat is chosen. If Gerda is perched at the first
window at that moment, her optional `presenceBeat` line joins the caption run;
she never gates it.

### Nora

Nora (regular ID `lunafreya`) keeps a permanent studio above the corner piano
(`L.artist`): a tall easel, backless stool, paint table with its own serviced
saucer, and a nearby watch spot. Her flat white follows the normal order, sip,
steam, bussing and abandoned-cup rules. While `lunafreya-paintings` is active
she paints in 2–4 s bouts separated by 8–18 s rests; a sip pauses both hands
and sound. The profile pose reaches left to the canvas (or down to mix a
palette); `SND.brush()` keeps the bristle whisper below the fire. After both
paintings she uses the same stool with a small sketchbook.

**The gallery** (a multi-stage arc). The canvas deterministically reads saved
`(stage, progress)`: charcoal lines, underpaint, colour masses, then detail.
Stage 0 is the cat on the sill (with Gerda's scarf if that flag exists); after
10 café days its palette bubble waits over Nora until tapped, then the finished
work hangs above the fireplace. Stage 1 is the hearth; after 12 more café days
its chosen beat hangs the smaller study above the door. Each stage owns its
caption run and lasting flag, so reloads restore the right canvas and wall
gallery.

**Watchers.** While Nora is present and painting, one non-couple patron at a
time may leave their drink and reserved seat, walk to `L.artist.watch`, look
for 6–12 s and return (`toEasel → watchingArtist → backFromEasel`). A single
soft exchange may use Nora's `overheard` pool; watchers never stack or
interrupt service.

Dev: `__dev.regular('lunafreya')`, `__dev.arc('lunafreya-paintings',
{ready:true})`, or boot an exact screenshot state with
`?dev&arc=lunafreya-paintings&stage=1&progress=7`.

### Marcel, Ida and Elody

Data rows in `CAST.regulars` with `firstDay` and `rhythm`. Marcel's gate
(sim-marcel.js) adds the window and painting conditions. Their part in the
naming is under [The café's name](#the-cafés-name).

### Birgit

She comes for breakfast after her bakery's morning, so with no seat before noon
she skips the day (`arrival.latest`). Her tastes scene brings a paper bag, set
down on the counter as she orders (the shared parcel path); an ignored bag goes
home with her, and it is eaten when the scene is done.

### Saira

**Tapping** (trait `taps`, sim-patrons.js). Now and then, while not sipping,
she drums on the table edge with her resting hand: a bout of three to six
seconds, one soft fingertip tick per beat of an eight-step pattern. If somebody
within 170 px is seated and reading when a bout begins, she stops after a bar
or so, and a caption may notice ("notices somebody reading, and stops"). Alone,
a bout may end with one of her musings. She never drifts to the bookshelf
mid-visit; she has her music folder.

**Scenes.** Her saved scenes (hello, eight bars, the score) ride the shared
regular-story path. Piano scenes (`seat: 'piano'`) happen only on a visit when
she sits at it: at the door such a scene makes her prefer the bench if it is
free and clean, and she waits there with her hands in her lap (no bursts) until
it is played; afterwards she plays a little before she goes. Once the score is
pinned behind the counter, Lunafreya hums it
([Care and idle life](#care-and-idle-life)).

### The café's name

After Elody's `grow` scene and Birgit's recipe, one evening (home moment
`name`) Lunafreya puts the neighbours' words together: Café Flourish. The name
never comes from a timer or a forced choice. Marcel's next visit is his `sign`
scene (after `marcel-introduced`), the one after it `signboard`, which
schedules the gift project `cafeSign`: Lunafreya walks to the doorstep (the
door opens for her, with the bell), takes the old sign from beside the new one,
carries it behind the counter and kneels to slide it under the counter by her
stool. Finishing sets `cafe-named`. Afterwards nine regulars have a line that
uses the name (most as a remembered arrival; Kasper and Saira as musings),
Keira photographs the sign on her way in, her stool caption notices the old
sign underneath, and Saira's score, if it comes later, is titled Flourish.

---

## Visiting workers

### Keira and Tomas

Keira (she/her) and Tomas (he/him) are stable `CAST.visitors` identities. On a
job they are visitor actors with staff-safe routes and independent departures.

- **First table kit (Keira):** brings a trolley, hands off the kit, and exits
  before Lunafreya assembles it.
- **Window repair (Tomas):** autonomous. A new paired table delivery waits for
  him to finish and leave, spacing their first meetings. Already delivered kits
  keep their progress and may be assembled during repair.
- **Wall shelf (Keira):** a small hand-carried kit and folding steps. She
  unwraps, fits lower/middle/upper boards and packs tools in five twelve-second
  phases. Her hands meet the active wall row; she climbs for the top board,
  descends before packing or leaving at closing, and after a reload repeats the
  approach/climb before continuing saved fitting progress.
- **Mantel (Tomas):** he prepares supports at the hearth, climbs to mount the
  shelf and arrange its clock, candles and plant, then climbs down.
- **Room expansion (Tomas and his daughter):** she carries the partition
  boards out over her shoulder while he pries them off, and helps with the dust
  sheets and new floor boards. She has no hello of her own yet (`quiet`). Her
  look: brown hair up, a terracotta work top, navy trousers.

Neither dialogue nor absence prevents the practical work from finishing. A
hello stays available on the floor during a job or on a later visit, resuming
at its saved node.

**Off duty** they enter through the shared seat-aware arrival timer, order
espresso, collect their cups and sit like any customer; invitations appear
only once seated. The optional saved greetings use the attended bubbles:
Keira's has 17 lines, Tomas's 19 (content in the story bible). The original
five nodes keep their order and meaning, with new lines after; completed older
introductions never reopen. Ignored hellos return on later off-duty visits;
completed ones get a familiar arrival caption. Keira's second cup and Tomas's
cupboard report are one-time stories on a later off-duty visit, with
remembered arrival captions after. Timing: architecture.md.

### Mikkel

Mikkel's booked left-window visit is a separate craftsperson actor, not a
patron or second staff member. He carries a toolbox, follows obstacle-aware
routes, kneels by the sill, works with the reach pose, and leaves at completion
or closing. His saved repair resumes the next morning if necessary.

---

## The piano

A bought piano (after the room expansion) joins the room with its lid, bench
and lamp. Pianist patrons play it ([Patrons](#patrons)), the cat perches on it
([The cat](#the-cat)), Lunafreya plays on empty nights
([Care and idle life](#care-and-idle-life)) and Saira's piano scenes use the
bench ([Saira](#saira)). Once Saira's tune lives in the room, Lunafreya's night
playing opens with it about half the time; the generic playing follows nine
seconds later.

---

## The cat

Orange tabby, no name (it has not told anyone yet). Once Gerda's scarf arc
completes it wears a small warm-red scarf for good: a neck band `drawCat`
carries across its poses, driven by the persisted `cat-wore-scarf` flag.

**Its corner.** Against the right-window wall beside the coffee cabinet, with
care from its western approach. First arrival, the attended hug and daily
opening lower it onto the same cushion; closing collects the wandering cat
before switching off. Journeys to the corner use its declared approach through
the lane; bed-to-bowls stays local; bowl–bookshelf uses the lane approaches to
avoid the reserved table set.

**Walking.** Faces all four directions, including short vertical and mostly
vertical diagonal routes. Paw phases follow distance travelled; a lingering
perch gaze cannot override movement direction. Opening walks use the same
animation. Stretch, grooming, kneading, drinking and playful batting have
distinct moving gestures; awake faces occasionally blink.

**Places and weights:** floor choices are the fireplace rug, the window-side
spot, the big rug, the armchair side, the reading-nook rug and its own cushion
in `L.catCorner`. The cushion is strongly preferred after a meal; the fire rug
gains weight in the evening; the nook and shorter rests from 23:00–06:00. A
weighted choice can instead lead to the middle of either window sill (×2.5 in
rain, ×2 at night), the bookshelf top while the second nook chair is free, or
the piano lid (weight 0.9, ×1.5 in the evening) while bench and piano voice
are free. Safe pairs walk a straight line; pairs that would clip furniture use
the declared `catRoute` waypoints checked by the audit.

**Needs, without consequences:** `hungerT` rolls 420–720 s and `thirstT`
500–800 s. The cat walks to `L.catCorner.eatSpot` or `drinkSpot`, faces the
bowl, eats 6–10 s (0.34 food) or drinks 3–5 s (0.2 water); 80% of meals are
followed by a drink. Food and water are visible, quantized bowl art in
`world.catBowls`. At an empty bowl it sits facing Lunafreya, occasionally
meows, and retries after 60–120 s; she eventually refills.

**States:** `sleep` (purrs, occasional "zzz"), `sit`, `groom`, `stretch`,
`walk` and `loaf` are the quiet loop. The rest: `hop` (0.35–0.55 s parabolic
tween; silent up, `softThump` on the final floor landing), `eat`, `drink`,
`perch` (back view at the window), `knead`, `pounce` and `lap`. `cat.surface`
(`floor`, `sill`, `shelfTop`, `counter`, `machine`, `backShelf`, `pianoKeys`,
`pianoTop` or `lap`) keeps floor habits from firing mid-caper.

**High places:** window visits hop from the declared stand spot to the middle
of the sill, where the cat watches the rain/streetlamp or curls to sleep.
Bookshelf visits use the nook chair back as a step, then settle 60–180 s; if
that chair becomes occupied, the cat takes the declared direct escape hop. On
any high perch its head occasionally tracks the nearest walking patron for
2–4 s; `gazeFacing` turns the head without changing the pose.

**Piano claim:** from its declared stand the cat hops onto the grouped keys
(2–3 soft accidental plinks), then to the lid for a 60–180 s loaf, sit or sleep
with its tail draped over the edge. A pianist arriving later does not dislodge
it. It leaves by one direct, silent-front hop to the declared floor dismount;
only that landing gets the `softThump`, so the keys never sound twice.

**Counter caper:** only in a quiet café with no queue, order or active brew,
the cat rarely hops onto the counter's right end, pads along the slab and loafs
(sniffing waiting cups for one second, never touching). Lunafreya notices in
3–8 s when free, walks behind the counter, swishes and shoos it down. The rarer
grand ascent goes counter → espresso-machine top → cleared back-bar shelf gap;
a 30% half-way catch aborts it. On the top shelf it loafs or sits 60–180 s,
tail draped below the board.

**Small rituals:** on a rug or cushion, 30% of pre-sleep arrivals knead for
2.5–4 s and purr. In strong daylight a rare dust mote near the first window
starts a three-hop `pounce`, then a dignity-restoring groom. A reading patron
in a fireside or nook wing chair can attract a lap visit: the cat hops to a
derived lap anchor, curls and purrs while sipping and page turns continue. If
the reader releases the seat during the lap hop, the cat lands and steps down
instead of keeping a stale lap link. The door bell turns an awake floor cat's
head toward the door for about 2 s.

**Petting:** clicking within ~36 px of the cat triggers `SIM.petCat`: heart
bubble, meow or purr, caption "The cat purrs happily." Asleep on a normal
surface it sits up; lap cats stay settled; walking, hopping and pouncing are
not interrupted. Invitation bubbles ([narrative.md](narrative.md)) use the same
click handler. Any interaction must stay this gentle: optional, never nagging,
and, for story beats, waiting until chosen, never expiring.

---

## How they move

Walking, sitting and rising, kneeling, Lunafreya's machine work, seated
activities and the cat's poses are described in
[animations.md](animations.md). In short: sitting and kneeling ease over about
0.45 s and rising over 0.4 s before anyone walks; a guest sets their cup on the
table partway down and a carried book opens once seated; seated routines begin
once the body has settled. Animation timers never change arc progress or the
invitation-waits rule.

## Adding characters

- New patron *variety* (outfits, hairstyles, accessories) goes in the
  appearance pools + `SCENE.drawPerson`.
- New patron *behaviour* belongs in `updateSeated` as another timer-driven
  habit (like sipping/reading), with a quiet sound and an occasional caption.
- A second staff member or a café dog needs its own entity + drawables entry in
  `SIM.entityDrawables`; follow the cat as the template.
- Every character action should be **slow, periodic, and interruptible**:
  nothing urgent, nothing that demands watching.
