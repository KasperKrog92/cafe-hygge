# One life, two ways to spend time with it

Direction recorded 6 September 2026, with shipped updates through 7 September.
Shared home life, the plant/table/hearth jobs, C0, the identity swap, first
introduction and left-window repair are implemented. The build-order section
and first-day update below distinguish these from proposed later stages.
The [scalability audit](scalability-audit.md) records preparation for those stages;
the remaining ideas are not authorization to build every item.
It grows from the former `idle` café, now the canonical `main` branch. The
separate `game` experiment is archived reference material, not the implementation
baseline. The old tips are preserved in `archive/idle-2026-09-06` and
`archive/game-2026-09-06` tags.

## Direction from the owner

- Game and idle share the same café, apartment, relationships and saved progress.
  Switching modes changes the available interaction, never the world's history.
- The protagonist remains autonomous: brewing, serving, tidying, relaxing and
  doing improvement work without movement controls or individual work commands.
- After closing, follow her home. She reads, uses her PC and spends a quiet
  evening in an initially sparse room that gradually becomes lived in.
- At home, game mode lets the player plan purchases and improvements for the
  following day. She brings small equipment and supplies when she returns.
- She fits work around café life. A plant may be placed during opening chores;
  assembling a table, cleaning the fireplace or shelving books takes several
  stretches of work. Work is animated and visibly changes the room.
- Contractors handle work such as painting and window repairs. They arrive
  after opening and ordinarily finish during that day. Large furniture arrives
  with a delivery person, moving equipment and an unpacking sequence.
- Furniture and its contents can be separate purchases: deliver a bookshelf
  one day, buy books another day, then let her gradually fill it.
- The protagonist is now **Lunafreya**, with **Nora** as the artist patron. **Fleur de Lune**
  is a possible café name, still provisional. This document uses Lunafreya for
  the proposed protagonist; the identity swap shipped on 7 September 2026.

The concrete stages, pacing and rules below are recommendations to prototype.
They should be revised after watching the first complete day-and-home loop.
Further owner brainstorming from 6 September is integrated below: the street
sign, menu and counter growth, hiring help, possible shared-home stories, many
moving boxes and the cat at home. Possible relationship outcomes remain open
story ideas rather than a prescribed ending.

## One save and one autonomous routine

| Surface | What the player sees and can do |
| --- | --- |
| Idle | The current saved place and ordinary life, including chosen work, deliveries and evenings at home. Planning controls and story invitations stay unobtrusive or hidden. |
| Game | The same live scene and routines, with access to conversations and an evening plan. The player chooses direction; Lunafreya carries it out. |

Switch in place without reloading, resetting the clock, duplicating money or
changing what is installed. There is no separate completed idle café. A person
who never buys anything still has a pleasant, functioning place indefinitely.

**Evening rule (updated 6 September 2026):** idle mode automatically finishes
its 90-second apartment routine and starts the next morning. Game mode stays
at home until the player chooses **go to sleep**, whether the evening thoughts are open
or closed. After arriving once, Lunafreya and the cat relax on continuous indoor
routes without returning to the entrance. Reloading
preserves the evening. Sleep immediately advances to 07:30 and the existing
short dawn transition, with Lunafreya entering the café carrying the cat. No plan
is required. Switching to idle resumes automatic departure when the current
routine finishes. Confirmed purchases proceed the following morning; nothing
expires while the player lingers.

Already authorized practical work may finish while unattended. Its result
persists, with an optional quiet note among the evening thoughts. Important conversations,
relationship choices and ceremonial unveilings wait until invited by the player.
An installed bookshelf can become usable immediately without automatically
playing a meaningful conversation about it. This distinction deliberately
extends the current invitation-waits contract; it must be reflected in that
contract when the system is implemented.

Progress uses the existing elapsed-time simulation, including hidden tabs.
Closing the app holds life still. Reload restores completed and partial work;
it does not calculate purchases or building progress from time spent away.

## The daily loop

1. **Home, evening:** she puts down her bag, changes activity, reads or uses the
   PC. The player can review savings and choose tomorrow's improvement.
2. **Morning arrival:** she carries small purchases into the café, sets them
   down and performs opening chores. Short installations fit here. Putting the
   street sign outside is the **last step of opening**, marking the café open.
3. **Open café:** the existing order, brewing, seating and social simulation
   continues. She works on improvements in suitable free periods.
4. **Visitors at work:** a booked contractor or delivery person arrives and
   follows their own visible route and work sequence.
5. **Closing:** finish the current safe action, put tools away and tidy up.
   She carries the street sign back inside as part of the closing routine.
   Unfinished work retains its physical stage and resumes another day.
6. **Home again:** the apartment offers its own ambient routines and traces
   of the day. Planning is available, with nothing required to proceed.

Apartment life is a full ambient scene: warm light, small sounds, idle movement
and several activities. It should feel worth watching with the planner closed.
The same cat also roams the apartment, rests nearby and explores the changing
room. Café/home transitions must account for its whereabouts rather than create
a second cat. The exact travel animation remains to be designed.

The street sign is a physical prop with an indoor storage position, an outdoor
position and a carry animation. Its placement follows the opening state in both
modes; it must not block the entrance or pedestrian routes.

## Café progression: explicit states

These are descriptive milestones, not compulsory levels or a fixed purchase
order. The original café is a visual and behavioral reference for later richness.
The starting café must already meet its standard of warmth and believable life.

| State | Room and equipment | Life it supports |
| --- | --- | --- |
| C0 — First opening | A smaller room matching the tighter reference framing; boarded-over windows, small counter and coffee equipment, a tiny cake stand, warm lighting and entrance equipment. No room rugs, drapes, wall menu, matcha or mantel decoration; hearth unused. Lunafreya arrives carrying the cat, sets out the entrance and counter equipment, then visibly assembles two tables and their chairs. | Setup starts on the player's first entry, runs autonomously and saves its progress. Customers enter only after both table sets are ready. Simple coffee, chamomile tea and cardamom buns support complete service; patrons bring their own books. |
| C1 — Settling in | First plant, small table assembled, cleaned hearth, a few personal touches. | More places to settle; watering, fire tending and improvement work become part of the day. |
| C2 — A reading place | Delivered bookshelf, then partially and eventually fully stocked shelves; an optional reading chair and lamp. | Browsing and borrowed-book reading become available as their furniture and contents are ready. Holger's familiarity can support a reading-corner story. |
| C3 — A cared-for café | Repainted walls, repaired window frames, coordinated small furnishings; the room keeps its familiar layout. | Contractor visits provide temporary daytime activity; completed work improves appearance without making the previous room feel like failure. |
| C4 — A neighborhood gathering place | Optional piano, art display and developed planting. | Music, exhibited work and deeper regular relationships, each supported by its own small sequence. |
| C5 — Room beyond the windows | Furnished terrace, outdoor planting and the equipment needed to serve it. | Existing waterfront ambience and terrace service join the developed café. The view becomes visible when the boarded windows are opened. |

Do not remove all charming details to create things to sell back. Weather,
sound, expressive characters and appealing light belong in C0. Every optional
seat, shelf and activity must be conditional in both rendering and simulation.
Absent furniture must never leave a patron walking toward an invisible target.

The first room is 832×516 master pixels, with tighter right and front boundaries
and a 832×468 desktop crop. Objects retain their original pixel dimensions.
A later **room expansion upgrade** opens the full 960×600 café, adding space
at the right and front. Expansion is separate from furnishing purchases; it
does not grant decorations or equipment. Its price, construction sequence and
purchase option remain future work. Existing furnished saves keep the full room.

## Menu, counter and kitchen progression

The owner's direction is to grow from simple coffee and tea, possibly with one
food item, toward several more complex drinks, dishes, cakes and snacks. The
counter grows with that menu: more workspace, more or better equipment, a sink
where she initially washes dishes by hand, a later dishwasher, a small oven for
making more cakes and potentially a larger oven afterward.

These proposed stages run alongside C0–C5; they are not tied to a particular
decorating milestone or mandatory menu size.

| Stage | Counter and equipment | Menu and visible routine |
| --- | --- | --- |
| K0 — Simple service | Compact preparation space, basic drink equipment, hand-washing sink and a small food display if the first food item needs one. | Simple coffee and tea, perhaps one food item; she collects, washes, rinses and puts dishes away. |
| K1 — Space to prepare | Counter extension and additional or improved drink equipment. | Gradually introduce more involved drinks and a few snacks/dishes supported by the actual preparation space and equipment. |
| K2 — Small batches | Small oven, preparation surface and suitable cake display. | She prepares, bakes and transfers small batches to the stand; the cake selection can grow. |
| K3 — Help with washing | Dishwasher installed alongside the sink. | She loads, starts and unloads it; washing takes less hands-on work, leaving time for service, baking and other activity. |
| K4 — A fuller kitchen | Optional larger oven and further counter/equipment improvements. | Broader dishes, cakes and snacks, with larger batches and room for two people to work when help is hired. |

**The cake stand reflects actual sales.** Cakes, slices or individual pastries
disappear as they are bought; which unit a recipe uses must be clear in the art.
Taking a portion for an order changes the display, and replenishing it requires
a visible transfer of fresh stock. It is not a permanently full decoration.

Recommended handling: reserve each portion once when accepting its order so two
customers cannot buy the last piece. Sold-out items quietly become unavailable
until replenished; customers choose from what remains without anger or penalty.
Preparation and replenishment are autonomous in both modes. Avoid compulsory
inventory clicks, spoilage pressure and oven timers that punish an absent player.
Recipes, batch sizes, replenishment sources for the earliest food item and exact
baking routines remain to be designed. Menu availability must agree with both
installed equipment and current portions.

## Café upgrade catalogue

Costs and timings are deliberately unnumbered until the first loop feels right.
Each row specifies a visible journey, not an instant menu toggle.

| Upgrade | Prerequisite | Arrival and work | Persistent result |
| --- | --- | --- | --- |
| First potted plant | A valid shelf or sill position | Carried in a bag; unpacked and placed during morning setup. | Plant appears at its anchor; ordinary watering joins her routine. |
| Additional table and chairs | Reserved floor space and clear routes | Small kit brought in or delivered; she unpacks, lays out parts, assembles in free periods, wipes and positions it. | New seating is enabled only after the whole set is usable. |
| Prepare the fireplace | Existing safe but unused hearth | She brings cleaning supplies; kneels, brushes, gathers ash and wipes in several sessions. | Clean hearth supports the current fire and tending behavior. Structural chimney work, if ever added, belongs to a professional. |
| Bookshelf | A reserved wall/floor position | Delivery person wheels it in on a trolley, positions it, unpacks it and removes wrapping. | An installed empty bookshelf; book browsing remains unavailable. |
| First box of books | Installed bookshelf | She brings books, puts the box down and shelves a handful at a time between duties. | Shelf visibly fills; usable books enable browsing before every shelf is full. |
| More books | Shelf capacity remaining | Another box and further shelving sessions on a later day. | Fuller shelves and more variety; no requirement to fill every shelf. |
| Reading chair and lamp | Clear reading-corner position | Chair delivered and unpacked; she places the lamp and arranges the corner. | Reading seat and evening light become active together. |
| Paint the walls | Suitable work area | Painter arrives after opening, lays protection, prepares, paints sections and clears up; normally one café day. | New wall finish, with intermediate patches visible during work. |
| Repair the windows | Work area and access | Worker arrives with tools, protects the area, repairs frames and finishes; normally one café day. | Repaired frames; the exterior view remains part of the room throughout. |
| Piano | Delivery route and reserved position | Movers transport and unpack it; setup completes before it becomes usable. | Current piano activities and later musical relationship beats. |
| Art display | Suitable finished wall space and available art | She brings hanging supplies and mounts pieces during quiet moments. | Persistent artwork connected to existing artist stories. |
| Terrace furniture | Safe access and an outdoor layout | Furniture delivery followed by unpacking, positioning and plant placement. | Outdoor reservations and service enabled only for completed seats. |
| Counter extension | Clear staff workspace and a viable service layout | Sections delivered, fitted and arranged; equipment moves to its completed working position. | More preparation room and later space for a second worker. |
| Improved drink equipment | Suitable counter space | Delivered or carried in, unpacked, installed and tried out. | Additional drink preparation routines and supported menu choices. |
| Small oven | Suitable preparation and installation space | Delivered and installed; she unpacks baking supplies and prepares the first batch. | Small-batch cakes and visible replenishment of the stand. |
| Dishwasher | Sink area and installation space | Delivered and fitted; she begins loading and unloading dishes during normal service. | A new dishwashing routine that reduces hands-on washing. |
| Larger oven | Sufficient counter/kitchen space | Larger unit delivered and installed; any replaced oven is visibly removed. | Larger batches and additional supported baked dishes. |

Allow the left-window repair and extra table together on an evening; other
projects retain the one-choice evening pace, with unfinished work saved.
This is a simplicity recommendation, not a daily reward
or something lost by skipping an evening. Larger scheduling can wait.

Work states: **available → purchased → scheduled → arrived → in progress →
installed**. A job may pause between safe actions and resume without losing
work. Optional story acknowledgement is separate from installation. A purchase
charges once; reload or switching mode never charges again or repeats delivery.

Serving, walking and work coexist. Lunafreya keeps working while customers
approach; a customer at the counter or a table needing clearing prompts a safe
pause. She clears tables before starting new service, then returns to work later. Let her finish short atomic actions rather
than twitch between jobs. Contractors do not require her constant supervision.
Most booked repairs target one day but carry over peacefully if necessary.
Reserve usable work areas; never trap a patron, block the door or close every
available seat. Late arrivals and work interruptions cannot deadlock closing.

## Apartment progression: explicit states

Home has its own pace; it is not automatically upgraded when the café reaches
a particular milestone. Purchases, unpacking and remembered moments add to it.

| State | Visible room | Autonomous evening life |
| --- | --- | --- |
| H0 — Just moved in | Bed, basic desk and chair, PC, reading light, suitcase, lots of moving boxes and one accessible book. Small kitchen and bathroom in the bottom left, with basic fixtures and an open dishes box. Sparse furnishings but comfortable, with clear walking routes. | Arrive, put away coat/bag, use PC, read on bed, wind down and sleep; the cat wanders and investigates boxes. The utility rooms are scenery for now. |
| H1 — Unpacking | Moving boxes gradually opened, emptied and folded away over several days; folded clothes, personal books and a mug find their places. | Short unpacking sessions mixed with evening activities; the cat explores the changing room and remaining boxes. |
| H2 — Making it comfortable | Optional rug, curtains, bedside table and plant. | Arrange purchases, water plant and enjoy softer evening lighting. |
| H3 — A place to linger | Small bookcase and reading chair, more books and a personal wall picture. | Choose between desk, bed and reading corner; occasionally rearrange books. |
| H4 — A life here | Patron's note or drawing, a keepsake from a chosen story, cared-for plants and small signs of habit. | Pause by meaningful objects, read, use PC and continue ordinary life. No finished-home victory state. |
| Optional — Sharing the space | For a temporary guest, a made-up sleeping place and a few belongings; for a chosen long-term housemate or partner, room for both people's possessions. | Two people have their own evening routines and moments together, with the cat continuing to roam. These are story-dependent arrangements, not a required H5. |

| Home improvement | How it arrives and changes the scene |
| --- | --- |
| Unpack personal belongings | Many already-owned moving boxes; she opens, sorts and puts objects away across days/evenings, then folds away the empty boxes. The room fills as the stacks shrink. No purchase needed. |
| Plant or lamp | Carried home; unwrapped and placed during evening free time. |
| Rug and curtains | Planned purchase; delivered/carried as appropriate, then laid or hung in visible stages. |
| Bookcase and reading chair | Home delivery scheduled while she is home; unpacked before the new reading location is used. |
| Personal books and pictures | Shelved or hung gradually; some are purchases, some already-owned belongings. |
| Relationship keepsakes | Appear only after their associated chosen story moment; she can later place them at home. No automatic unseen relationship payoff. |

Home decorating uses the same job machinery as café work. It must not become
a compulsory second spending track. Neither room has cleanliness decay, rent
deadlines or friendship upkeep chores.

## Savings and relationships

**Recommended economy:** completed ordinary sales add modest savings in both
modes. Show the balance and one-time purchase costs in the evening planner.
The owner's 6 September direction also adds a temporary upper-right savings
display with a pixel-art gold coin: mouse movement reveals the current saved
balance in either mode and room; after 3.2 seconds at rest it fades over 0.6 seconds.
Sales and purchases update the amount without revealing it automatically.
It remains hidden on the entry screen. No rent drain, wages drain, debt, spoilage, missed-day
penalties or timed discounts. Exact prices, whether to abstract operating costs,
and the first-hour earning pace are still open design questions.

The starting funds should let the player choose one small improvement on the
first evening. A pleasant café that can serve customers always remains viable.
Do not make upgrades an income multiplier race; their main reward is a changed
place and new routines. Long idle sessions may build generous savings. Do not
counter that with punitive caps or inflate prices to require unattended grinding.
Stage work through deliveries, available space and chosen projects instead.

Repeated visits build familiarity. Conversations let the player participate in
that relationship and can suggest projects: Holger mentions a book exchange;
a neighbor gives a cutting; a musician asks about playing one evening. Basic
furniture need not be locked behind the correct dialogue answer. Distinctive
gifts and personal stories belong to their chosen relationship moments.

### Hiring help and possible shared lives

The owner imagines the café eventually becoming busy enough that Lunafreya
wants to hire someone. This should emerge through story and the visible growth
of her working day. After a chosen hiring conversation, two autonomous people
work in the café: sharing service, washing, preparation and other duties.
The division of work should be legible in their actions and allow both people
to use equipment and move around each other naturally.

Recommended pacing: hiring is a welcome step toward company and more room in
the day, without making the preceding solo café fail or become stressful. How
pay is represented is still open; reconcile it with the proposed no-draining-
wages economy before implementation. Staff should have their own personality
and relationships rather than exist only as faster production.

Possible longer story paths from the owner's brainstorming:

- **A colleague becomes close.** The helper might be someone she gets to know
  at the café who becomes a potential romantic interest or a new best friend.
  Neither outcome is settled, and hiring need not require romance.
- **Eventually living together.** A later chosen relationship development could
  lead to moving into her apartment together, bringing belongings and changing
  both people's home routines. It is a possible culmination, not an automatic
  reward for hiring or a compulsory ending.
- **Offering a friend somewhere to stay.** A separate side story could involve
  a patron friend who is temporarily homeless staying at her apartment. Give
  the friend their own circumstances, voice and everyday presence; the stay
  need not imply romance, employment or permanent cohabitation. Its duration
  and resolution remain open story work, with no countdown to losing shelter.

Invitations to hire, offer a stay or move in wait for the player. Once chosen,
shared daily routines can unfold autonomously in either mode. Personal turning
points still follow the invitation-waits rule. None of these possibilities
requires locking in a character, cause of homelessness or relationship ending
at the roadmap stage.

## Build order and evidence for moving on

**Save/isolation preparation completed 6 September 2026:** the pure codec,
injectable persistence and private simulation worlds address findings 1–2 in
[the pre-development audit](predevelopment-audit.md). Regression coverage and
commands are in [the development workflow](development.md).

**Opening/closing preparation completed 6 September 2026:** `js/sim-shop.js`
now owns the existing daily lifecycle through a small explicit contract. Hours,
Lunafreya routing, terrace/ship closing and save/isolation regressions pass before
and after extraction. Gameplay, timing, cat handling and appearance are unchanged.
The first apartment/plant milestone below subsequently added the minimal life and savings state.

1. **Keep the current café as the foundation — completed 6 September 2026.**
   Consolidated the `idle` code into canonical `main`, with GitHub Pages and
   project instructions following `main`. Old `idle` and `game` tips are retained
   in the archive tags above; their branches are retired. Reuse selected
   prose/art from the experiment where appropriate; do not merge its control
   and day-loop model.
2. **Prove one shared life with one plant — completed 6 September 2026.** Added the sparse home scene, automatic
   café → home → café transitions, idle/game presentation switching, one evening
   purchase, morning carry/unpack/place animation and a persistent result, retaining
   the existing café layout for this isolated prototype. The implementation
   starts with 30 kr, adds 1 kr for each completed pickup and offers one 30 kr
   plant. Idle evenings last 90 seconds; game evenings wait for **go to sleep**.
   The same Lunafreya/cat objects inhabit both rooms. Tests cover three nights in
   each mode (automatic in idle, explicit sleep in game), mode switching,
   migration, actual page reloads at every plant stage, repeated clicks, and
   browser-tab ownership handoff. No payment or installation repeats. Larger jobs, H1 box
   unpacking, street-sign work, new identities and C0 remain later milestones.
3. **Prove interruptible work — completed 6 September 2026.** Optional 60 kr
   table set and 30 kr fireplace cleaning, chosen one per evening alongside
   the plant. Lunafreya collects supplies after opening, works in three-second
   actions, pauses for orders and returns in later quiet moments. Partial jobs
   carry through closing, home, mornings, reload and either mode. A new set
   adds two seats only when fully assembled; the existing furnished café stays.
   The chosen hearth rests cold during cleaning, then resumes its usual fire.
   Schema v3 preserves v2 life/history. Busy/unattended simulations, actual
   page reloads at each work phase, purchase UI and duplicate prevention pass.
   H1 unpacking, contractors and later catalogue items remain deferred.
4. **Modest starting café — implemented locally 7 September 2026.** C0 uses
   explicit saved furniture availability and the owner's first-entry sequence
   above. Assembly is free, automatic and resumable; opening waits for completion.
   Schema v4 preserves the furnished room and all progress in existing v3 saves.
   Routes, perches, service equipment and optional routines follow what is
   installed. The existing plant, extra-table and hearth jobs work in C0.
   H1 unpacking and the first returning-patron conversation remain separate work.
5. **First visitor job — left-window repair implemented 7 September 2026.**
   The worker arrives, removes boards, repairs and cleans the left pane, then
   leaves. Partial work resumes after closing or reload. Bookshelf delivery,
   separate books and gradual stocking remain later milestones.
6. **Grow both places and their stories.** Add reading corner, home comforts,
   relationship gifts, music, art and terrace in small complete sequences.
   Extend the menu and counter through the K stages, proving visible food sales
   and replenishment before adding many recipes. Later, prove shared staff
   duties before introducing a helper's relationship arc or shared-home stories.
   Expand only after each addition feels enjoyable when left unattended.
7. **Identity swap shipped on 7 September 2026.** Lunafreya is the protagonist;
   the café title remains to be settled. The artist is now Nora; her paintings
   and arc state are preserved. Keep stable internal IDs and migrate any
   necessary changes; branding must not reset saves. Domain changes are optional.

The first review should show a real evening, a chosen plant, a morning arrival
and the placement animation in the current café. That is the test of this
direction. A large catalogue or a redesigned whole café would hide that test.

## Implementation boundaries and existing saves

- Keep the shared renderer, autonomous service, pathfinding, audio and clock.
  Add scenes and data-driven jobs to these systems instead of a second engine.
- Give each upgrade one definition: prerequisites, price, destination,
  delivery type, work phases and installed effects. Keep positions and work
  footprints in the layout contract. Art, collision, seating and activity
  availability must read the same installed state.
- Extend `MEMORY` with versioned migrations for savings, owned improvements,
  partial jobs, day/home phase and the evening plan. Both modes use that state.
  Save important transitions atomically and flush on exit. Add export/import
  before asking players to invest substantially in a growing home and café.
- Preserve current users' developed cafés, story marks and relationships by
  migrating them to equivalent owned furnishings. Starting small must be an
  explicit new-life choice, never an update that strips an existing save.
- A fresh save begins at C0/H0; changing mode never creates a fresh
  save. Before release, handle simultaneous tabs so two views cannot duplicate
  earnings or overwrite each other's job progress.
- Test long unattended runs, mid-action saves, interruptions, worker exits,
  purchases, migrations and each available furniture arrangement. Continue
  the existing audit and browser cleanup workflow. No runtime tests are needed
  for this planning-only change.

## Decisions still to settle through the prototype

The first-morning cutscene shipped on 7 September: Lunafreya talks to her cat,
hugs it, takes a silent breath and puts out a crude **NEW CAFE** sign as her
last opening action. The café has no chosen in-story name. A later conversation
with patrons should help her find it over the coming café days; that naming
arc remains future work. The sign currently stays outside after first opening;
daily retrieval/replacement can join the planned daily street-sign routine.

- Evening length and how the planner allows lingering without a feeling of hurry.
- Prices, starting savings and how much progress a normal reading session funds.
- The apartment's framing; C0's initial furniture is specified above.
- Whether one new project per evening feels sufficient or overly restrictive.
- Final café name (the owner/artist identity swap is complete).
- Recipes, food portions and replenishment, counter layouts, oven routines and
  the order of kitchen upgrades; the working-day role and pay model for a helper.
- Who might become a colleague, close friend, partner or temporary guest; the
  timing and meaning of any shared-home story. These remain possibilities.

The old no-economy/no-upgrades rule is superseded for this proposed direction
by the owner's explicit request for purchases and improvements. The no-pressure
rule remains. Current implementation docs still describe the shipped café;
update their detailed contracts alongside each implemented milestone.

## First neighbour conversation — shipped 7 September 2026

Holger enters first after a new café opens and offers an attended introduction.
Two choices establish Lunafreya's motivation and first hope; neither buys or
locks an improvement. Conversations use close framing and hold café obligations
until finished or put aside. The [story bible](story-bible.md) is the cast and
continuity reference; Holger's later encouragement and deeper stories remain
planned beats there, separate from the upgrade milestones above.


## Quiet first day and first improvements — shipped 7 September 2026

The owner’s updated order puts the left-window repair and one additional table
with two chairs first. They cost 30 and 60 coins and can both be chosen on the
first evening, in either order. Starting savings are 90 so affordability never
requires attracting a crowd; ordinary served pickups still add one coin.
Other catalogue ideas and the room expansion remain outside this slice.

First setup ends at 17:30, leaving four active service minutes until 21:30.
Holger is the first arrival and stays at the counter for a mandatory introduction
to dialogues. His invitation gently blinks until opened. Service and time wait
without penalty until completion; acknowledged replies survive reload. This
one-time attended exception works in idle and game, as the owner requested.
Later days return to ordinary hours and autonomous progression.

The new café starts with a two-customer cap, grows gradually with completed café
days and always respects usable seating. Walk-ins and regulars share one spaced
arrival budget. No first-day couples or influx of overdue regulars. The extra
table uses the existing interruptible assembly; window work belongs to the
visiting craftsperson. Both installed improvements persist without an expiring
payoff or required acknowledgement.
