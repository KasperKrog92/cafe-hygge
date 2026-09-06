# One life, two ways to spend time with it

Planning direction recorded 6 September 2026. This is a proposed roadmap,
not a description of shipped features or authorization to build every item.
It grows from the current `idle` café. The separate `game` experiment is a
source of reusable ideas, not the implementation baseline.

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
- The preferred eventual protagonist name is **Lunafreya**. **Fleur de Lune**
  is a possible café name, still provisional. This document uses Lunafreya for
  the proposed protagonist; the shipped owner is still Nora.

The concrete stages, pacing and rules below are recommendations to prototype.
They should be revised after watching the first complete day-and-home loop.

## One save and one autonomous routine

| Surface | What the player sees and can do |
| --- | --- |
| Idle | The current saved place and ordinary life, including chosen work, deliveries and evenings at home. Planning controls and story invitations stay unobtrusive or hidden. |
| Game | The same live scene and routines, with access to conversations and an evening plan. The player chooses direction; Lunafreya carries it out. |

Switch in place without reloading, resetting the clock, duplicating money or
changing what is installed. There is no separate completed idle café. A person
who never buys anything still has a pleasant, functioning place indefinitely.

**Proposed unattended rule:** home time ends and the next morning arrives
automatically in both modes. No submitted plan means an ordinary day, with
existing work continuing. Opening the planner lets that player linger at home;
closing it resumes the routine. Merely selecting game mode never requires a
nightly click. A draft survives leaving the planner and can be used next evening;
only a confirmed purchase commits funds. Exact evening duration is a playtest
choice, not a deadline. There are no limited-time offers.

Already authorized practical work may finish while unattended. Its result
persists, with an optional quiet note in the plan book. Important conversations,
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
   down and performs opening chores. Short installations fit here.
3. **Open café:** the existing order, brewing, seating and social simulation
   continues. She works on improvements in suitable free periods.
4. **Visitors at work:** a booked contractor or delivery person arrives and
   follows their own visible route and work sequence.
5. **Closing:** finish the current safe action, put tools away and tidy up.
   Unfinished work retains its physical stage and resumes another day.
6. **Home again:** the apartment offers its own ambient routines and traces
   of the day. Planning is available, with nothing required to proceed.

Apartment life is a full ambient scene: warm light, small sounds, idle movement
and several activities. It should feel worth watching with the planner closed.

## Café progression: explicit states

These are descriptive milestones, not compulsory levels or a fixed purchase
order. The original café is a visual and behavioral reference for later richness.
The starting café must already meet its standard of warmth and believable life.

| State | Room and equipment | Life it supports |
| --- | --- | --- |
| C0 — First opening | Intact but worn room, working counter and coffee equipment, two usable tables with chairs, warm lighting, basic cups and safe clear routes. Hearth unused, bookshelf and optional furnishings absent. | Complete autonomous coffee service, reading with patrons' own books, weather and a small starting cast. No mandatory repair tutorial. |
| C1 — Settling in | First plant, small table assembled, cleaned hearth, a few personal touches. | More places to settle; watering, fire tending and improvement work become part of the day. |
| C2 — A reading place | Delivered bookshelf, then partially and eventually fully stocked shelves; an optional reading chair and lamp. | Browsing and borrowed-book reading become available as their furniture and contents are ready. Holger's familiarity can support a reading-corner story. |
| C3 — A cared-for café | Repainted walls, repaired window frames, coordinated small furnishings; the room keeps its familiar layout. | Contractor visits provide temporary daytime activity; completed work improves appearance without making the previous room feel like failure. |
| C4 — A neighborhood gathering place | Optional piano, art display and developed planting. | Music, exhibited work and deeper regular relationships, each supported by its own small sequence. |
| C5 — Room beyond the windows | Furnished terrace, outdoor planting and the equipment needed to serve it. | Existing waterfront ambience and terrace service join the developed café. The view and passing life remain visible from the beginning. |

Do not remove all charming details to create things to sell back. Weather,
sound, expressive characters and appealing light belong in C0. Every optional
seat, shelf and activity must be conditional in both rendering and simulation.
Absent furniture must never leave a patron walking toward an invisible target.

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

For the initial system, allow one new project per evening and retain unfinished
jobs in a small queue. This is a simplicity recommendation, not a daily reward
or something lost by skipping an evening. Larger scheduling can wait.

Work states: **available → purchased → scheduled → arrived → in progress →
installed**. A job may pause between safe actions and resume without losing
work. Optional story acknowledgement is separate from installation. A purchase
charges once; reload or switching mode never charges again or repeats delivery.

Serving, walking and work must coexist. Lunafreya safely puts down a tool when
needed, serves, and returns later. Let her finish short atomic actions rather
than twitch between jobs. Contractors do not require her constant supervision.
Most booked repairs target one day but carry over peacefully if necessary.
Reserve usable work areas; never trap a patron, block the door or close every
available seat. Late arrivals and work interruptions cannot deadlock closing.

## Apartment progression: explicit states

Home has its own pace; it is not automatically upgraded when the café reaches
a particular milestone. Purchases, unpacking and remembered moments add to it.

| State | Visible room | Autonomous evening life |
| --- | --- | --- |
| H0 — Just moved in | Bed, basic desk and chair, PC, reading light, suitcase, a few boxes and one book. Sparse but comfortable. | Arrive, put away coat/bag, use PC, read on bed, wind down and sleep. |
| H1 — Unpacking | Boxes gradually emptied, folded clothes, a few personal books and a mug. | Short unpacking sessions mixed with the existing evening activities. |
| H2 — Making it comfortable | Optional rug, curtains, bedside table and plant. | Arrange purchases, water plant and enjoy softer evening lighting. |
| H3 — A place to linger | Small bookcase and reading chair, more books and a personal wall picture. | Choose between desk, bed and reading corner; occasionally rearrange books. |
| H4 — A life here | Patron's note or drawing, a keepsake from a chosen story, cared-for plants and small signs of habit. | Pause by meaningful objects, read, use PC and continue ordinary life. No finished-home victory state. |

| Home improvement | How it arrives and changes the scene |
| --- | --- |
| Unpack personal belongings | Already-owned boxes; she opens, sorts and puts objects away across evenings. No purchase needed. |
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
modes. Show the balance and one-time purchase costs in the evening planner,
not as a permanent HUD. No rent drain, wages drain, debt, spoilage, missed-day
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

## Build order and evidence for moving on

1. **Keep the current café as the foundation.** Save an archive tag for the
   `game` experiment before retiring it. Consolidate on the current `idle` code;
   moving it to canonical `main` must include the Pages branch setting and
   project instructions. Branch deletion and deployment changes are separate
   work, not performed by this document. Reuse selected prose/art from the
   experiment where appropriate; do not merge its control and day-loop model.
2. **Prove one shared life with one plant.** Add the sparse home scene, automatic
   café → home → café transitions, idle/game presentation switching, one evening
   purchase, morning carry/unpack/place animation and a persistent result. Keep
   the existing café layout for this isolated prototype. A minimal savings
   balance is enough; do not build a full shop. Verify unattended cycling,
   mode switching and reload at every job stage. Nothing waits for a nightly
   button; no payment or installation repeats.
3. **Prove interruptible work.** Add a table assembly and fireplace-cleaning
   project; let normal orders interrupt and work resume. Confirm it looks
   natural through a busy day, closing, another morning and reload.
4. **Introduce the modest starting café.** Define C0 and explicit furniture
   availability using the existing scene. Verify complete service and all
   character routes at every intermediate layout before adding more upgrades.
   Introduce H1 unpacking and the first returning-patron conversation.
5. **Prove a visitor job.** Build bookshelf delivery, then a separate book
   purchase and gradual stocking. Reuse the visitor/job structure for a painter
   or window worker after the delivery loop is convincing.
6. **Grow both places and their stories.** Add reading corner, home comforts,
   relationship gifts, music, art and terrace in small complete sequences.
   Expand only after each addition feels enjoyable when left unattended.
7. **Apply the settled identity before a public progression release.** Rename
   the protagonist to Lunafreya; settle the café title. The existing artist
   regular is already called Lunafreya, so give her a distinct identity and
   preserve her paintings/arc state. Keep stable internal IDs and migrate any
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
- A fresh save eventually begins at C0/H0; changing mode never creates a fresh
  save. Before release, handle simultaneous tabs so two views cannot duplicate
  earnings or overwrite each other's job progress.
- Test long unattended runs, mid-action saves, interruptions, worker exits,
  purchases, migrations and each available furniture arrangement. Continue
  the existing audit and browser cleanup workflow. No runtime tests are needed
  for this planning-only change.

## Decisions still to settle through the prototype

- Evening length and how the planner allows lingering without a feeling of hurry.
- Prices, starting savings and how much progress a normal reading session funds.
- Which furniture belongs in the final C0 layout, and the apartment's framing.
- Whether one new project per evening feels sufficient or overly restrictive.
- Final café name and the existing artist's distinct name/identity.

The old no-economy/no-upgrades rule is superseded for this proposed direction
by the owner's explicit request for purchases and improvements. The no-pressure
rule remains. Current implementation docs still describe the shipped café;
update their detailed contracts alongside each implemented milestone.
