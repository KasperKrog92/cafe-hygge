# Fleur de Lune — restoration and coffee & company

## The playable game

`index.html` opens in a neglected room. Move Lunafreya with WASD, arrows, or
floor clicks. E and the contextual action button walk to the task and perform
it. The opening restores plaster, floorboards, window, walls and light, then
places a second-hand table and two chairs, unpacks the kettle and coffee,
opens the door and serves Holger. Every repair visibly persists.

### The first evening: slow restoration

The first four jobs contain **250 seconds of active work**, plus careful movement
between patches and three player-paced reflections. Clearing takes 54 seconds,
sweeping 64, the window 66 and the walls 66. Each has four authored phases:
kneeling and sorting, lifting into a sack, slow broom passes and a dustpan,
loosening the window brace, soaking/wiping/rinsing/polishing, then scraping,
patching and washing the walls. A two-step stool brings the upper glass within
reach. Strokes take 5.6 seconds with contact, travel, lift, return and settling;
work uses its own elapsed clock, while breathing and rain remain ambient.

Dust, rubble and window grime clear progressively. The opening takes place in
evening light: a small moon emerges through the dirty glass and casts light and
motes onto the boards. The first cup leads into the brighter neighborhood scene.
A folded shopping list with a window sketch stays on the sill, a pale worn patch
remains in the floor, and the wall repair preserves a seam of older green paint.

Three reflections interrupt the work at exact boundaries. Lunafreya recognizes
her habit of hiding plans in the sketch, admits uncertainty over the worn boards,
and remembers late kitchen windows while looking at the moon. They do not assign
her a bereavement or explain who owned the café. Continue advances each line;
the last button resumes the interrupted job. The camera follows her and work,
movement and progress wait indefinitely. Their notes appear in the later notebook.

**Rest your hands** pauses any of these four jobs; **Continue the work** resumes
at the same point. There are no repeated clicks, timed inputs or completion
percentages. Completed jobs retain the existing save milestones. As before,
reloading restarts an unfinished job (including an unfinished reflection);
the in-session rest button preserves its exact progress.

Lunafreya is the playable owner: blonde hair in a large bun, sage clothing,
pale work apron, and her own observant, sometimes stubborn voice. Holger is
the first guest. The original Nora and NPC Lunafreya are not spawned here.

After the first cup, **Coffee & company** continues the game:

- **Player-paced mornings.** “Tidy up & begin another morning” washes the cups
  and begins the next visit. One guest visits per morning. Nobody gets impatient,
  leaves unattended, or demands that the player end the visit.
- **Returning people.** Holger returns on morning two. Astrid, a neighbor two
  doors down, introduces herself on morning three. They alternate afterward.
  Holger sometimes asks for tea instead of his usual coffee; Astrid orders tea.
- **Hands-on service.** Welcome the guest, approach the kettle, choose coffee
  or tea, wait through the short pour/steep animation, and carry the cup over.
  The order is visible in the chooser and footer. A mistaken drink can be remade
  freely. Each delivery leaves **6 coins after supplies**. There is no stock
  accounting, debt, price-setting or failure state.
- **A room taking shape.** The notebook offers a brass reading lamp (6 coins),
  a shared bookshelf (12) and a terracotta rug (12). Lunafreya walks over and
  fits each improvement. Payment occurs on completion, once. These are optional
  authored placements, not a furniture editor or expansion system.
- **Invitations and traces.** After service, a guest may offer a conversation.
  The invitation button and dots above them wait for an explicit interaction.
  Holger discusses leaving room on a shelf. Astrid offers a pelargonium cutting;
  the player chooses the windowsill or table, and that placement persists.
  Once a shelf exists, Holger brings the first shared book. Astrid later notices
  that Lunafreya has not sat down. Four one-time stories leave notebook entries,
  a plant and a book. At most one story completes each morning, leaving room
  for the visit itself. Skipped invitations return on that person's later visits.
- **Permission to linger.** Lunafreya can sit in the second chair, sip her own
  cup, and stand or walk away whenever ready. Holger reads, turns pages and
  drinks; Astrid sips tea. Story conversations seat Lunafreya opposite the guest
  and leave her seated afterward. No further progression is demanded.

The two opening conversations remain intact. Later conversations use Continue
and, for the cutting, two explicit choices. The camera moves closer and all
work, movement and progress stop. Rain, breathing, cup gestures and quiet audio
continue. Notebook and recipe browsing also pause progress. The notebook records
Lunafreya's memories without relationship meters or collectible counters.

The current slice has two guests, one room, two drinks, three purchasable
improvements and four neighborhood stories. After those stories, service and
lingering remain available with recurring short greetings. Multiple simultaneous
customers, helpers, other rooms, gardening and broader relationships remain
future directions, not implemented features.

## Runtime and state

Plain scripts load in this order:

| File | Responsibility |
| --- | --- |
| `audio.js` | Reused quiet synthesis and ambient sound |
| `scene-core.js` | Shared palette and drawing helpers |
| `scene-people.js` | Shared character animation and poses |
| `game-content.js` / `FLEUR` | Restoration tasks, guests, visits, stories and improvements as data |
| `game-memory.js` / `FLEUR_MEMORY` | Save validation, migration and storage |
| `game-restoration.js` / `FLEUR_WORK` | Work phases, grounded work poses, tools and environmental traces |
| `game.js` | Movement, service state machine, interactions, camera, room renderer and UI |

There is no build step, framework or runtime dependency. `file://` still works.
`reference.html` retains the earlier simulation without loading the game scripts.
Its save and its `__dev` harness are independent.

`SCENE.L.restoration` owns room bounds, table footprint, both seats, task
approaches, entry and new prop anchors. Both Lunafreya and guests route around
the table using visible-corner paths. Keyboard steps check the traversed segment.
Floor-click targets clamp to room bounds. The wall shelf, sill lamp and plant
add no floor obstacles; the rug is passable. Future floor furniture must extend
the collision model. The camera renders on the original 960×600 canvas with
60px standing characters. Pointer input inverts the same camera transform.
Chairs, table and people share baseline sorting.

### Save version 2

The separate `fleur-de-lune-save` contains the ordered `done` restoration IDs,
`introduced` and first-cup `served` flags, plus `day`, visit `stage` (`arriving`,
`ordered`, `brewed`, `served`), `coins`, `cups`, completed `upgrades` and
`stories`, the cutting's `plant` placement, and `lastStoryDay` for story pacing.

Version 1 migrates every valid opening milestone. A completed first cup starts
with 6 coins and one cup served; reloading cannot award the payment repeatedly.
Version 2 retains orders and brewed cups across reloads. Guest positions restart
at the entry and walk to the seat. Movement, unfinished work and incomplete
dialogue restart; completed deliveries, purchases and story choices persist.
An unfinished purchase never deducts money. Work commits only at completion.

Malformed or unsupported saves fall back to a fresh room; valid ordered prefixes
and prerequisites are preserved. Invalid numbers are normalized. Storage failures
leave the game playable and display a persistent save limitation. There is no
closed-tab catch-up, absence penalty or expiring invitation. Animation uses
elapsed time capped at 0.25 seconds per browser frame. No idle-save keys change.

### Sound and access

Sound requires a real Enable sound click. The shared rain and music remain;
there is no fireplace. Existing `doorBell`, `kettlePour`, `cupDown` and
`chairScrape` provide arrival, service and sitting feedback. Those sounds are
unchanged, and this runtime does not write audio settings. `workStroke(kind)`
adds a quiet contact sound once per active cleaning stroke: dry grit, broom
friction or damp cloth, at 0.012–0.016 peak. Rest, movement between patches and
reflections trigger no work sounds.

Native modal dialogs provide keyboard focus management for the notebook and
recipes; Escape closes them. Story dialogue focuses Continue and contains Tab
navigation within its active controls. Movement keys are ignored while a modal
or conversation is open. UI text changes only when its value changes, keeping
the live status region from being rewritten every animation frame. Desktop and
narrow layouts preserve full action-button access.

## Verification

Serve the checkout on port 8137 and use a **disposable** browser at `/?dev`.
`__game` exposes state, player, patron, layout, `act()`, `update(dt)`, `inspect()`,
`audit()` and `shot()`. The audit checks player/guest overlap with the table,
restoration and service prerequisites, funds and conversation/work exclusion.
`inspect()` reports active work, dialogue, modal, arrival, rest and invitation.
It also reports `workElapsed`, `workPhase`, `workPaused` and `reflection`.

```powershell
node --check js/game.js
node --check js/game-content.js
node --check js/game-restoration.js
node --check js/game-memory.js
node tools/verify-game-memory.js
git diff --check

agent-browser --session fleur-check open http://127.0.0.1:8137/?dev
$opening = Get-Content -Raw tools/verify-game.js
agent-browser --session fleur-check eval $opening
$neighborhood = Get-Content -Raw tools/verify-neighborhood.js
agent-browser --session fleur-check eval $neighborhood
agent-browser --session fleur-check reload
agent-browser --session fleur-check eval '__game.audit()'
agent-browser --session fleur-check errors
agent-browser --session fleur-check close
```

The opening check requires a fresh save. The neighborhood check requires its
completed opening and then exercises eight mornings, all improvements, all four
stories, the table choice, incorrect-drink recovery, repeat payments, rest,
long waits in modals/conversation and idle-save isolation. It audits both walkers
on every simulated step. The Node check covers v1 migrations at each milestone,
v2 carried-cup state, malformed saves, unavailable storage and invitations
returning on later mornings. Neither script uses the owner's profile.

Also play through real clicks and keyboard input. Inspect restored/ruined rooms,
both plant placements, dialogue, notebook and recipe selection at desktop and
390px width. Reload during an order, with a brewed cup, and after delivery;
verify no loss or extra payment. Enable sound with a real click and inspect
browser errors. Accelerated checks supplement these input and visual checks.

Legacy art-review fixtures target `reference.html?dev`. Use `__game.shot()` and
actual game screenshots for this chapter; legacy fixtures do not cover it.

Verified 5 September 2026: the opening and eight-morning walkthrough pass with
empty game audits and browser errors. All four neighborhood stories, three
improvements, both plant placements, rest, wrong-drink recovery and waits were
exercised. Browser reloads retained a migrated v1 opening, an order, a carried
cup and its single payment. Desktop and 390×844 layouts, conversation choices,
notebook and mouse/keyboard movement were inspected. Audio initialization passed
through a real click; the sound mix was not reviewed by listening.

The expanded opening check additionally covers all three reflections, exact
resume boundaries, 300 seconds waiting at each reflection, and a 60-second
hand-rest pause in each cleanup job. Run `tools/review-opening.js` with browser
eval for a detached 24-frame PNG contact sheet (returned as a data URL).
Inspect it alongside actual room screenshots; it leaves the live save alone.
