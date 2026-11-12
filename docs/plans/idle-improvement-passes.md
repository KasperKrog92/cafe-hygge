# Idle improvement passes

The owner's direction (12 November 2026): the saved game is on hold; sessions
focus on the **startup idle café**. No game parts belong in it (no planner,
economy, purchases, home, tutorials or conversations), but ambient progression
belongs there — shipped the same day as pass 1 (the ambient arcs now advance,
wait as tappable beats and persist under `cafe-hygge-idle`). Pass 2 (the idle
café boots into a lived-in room for its hour) shipped the same day too; its
rules live in world.md's occupancy section.

These are the remaining passes from the 12 November audit, in recommended
order. Each is a session-sized brief: build it on the idle café first
(`?idle`, `?dev&idle`), keep the saved game working untouched, and finish with
the full checks and the matching doc update. Nothing here is committed scope;
the owner picks what sounds lovely next and may reorder freely.

## Pass 3 — ASMR foley (synthesized, quiet)

**Scope:** the roadmap's "further synthesized sound ideas", plus two new ones,
all on the existing buses at the 0.02–0.08 discipline, each triggered from
dt-driven sim code:

- the street heard through the open door (outside layer lifts while the door
  stands open, ducks as it shuts);
- a spoon stirred twice on a fresh cup (two-three porcelain tinks just after a
  drink lands);
- the espresso machine sighing off pressure (a soft "pff" every few idle
  minutes, nobody near it);
- one creaky floorboard near the door that only sounds sometimes;
- radiator ticks on cold evenings (pairs with the seasons pass);
- book foley at the shelf (fingertip ticks along spines, soft cover thump);
- a saucer settle under `cupDown`;
- a quiet dish-rinse at the sink during her washing-up.

**Checks:** every sound documented in sounds.md's catalog with its recipe and
gain; listen at 50 % volume next to an open book; the audio regression suite
still passes. Probability-gate everything repeatable.

**Effort:** small-medium; each sound is independent, so this pass can ship in
slices.

## Pass 4 — Graphics texture and daylight

Night already carries the room; midday is the weak mood.

**Scope, in order of payoff:**

1. **Rugs:** the big red rug reads as a flat ellipse — give both rugs a woven
   border and a sparse pattern consistent with the pixel ruler (art.md).
2. **Window beams:** strengthen morning/afternoon incident light
   (`SCENE.windowLight`) and add a few drifting dust motes inside the beams
   (reuse the `mote` particle, daylight-gated).
3. **Rain on glass:** droplets that occasionally run down the pane in heavy
   rain, beneath the existing streaks; storm keeps its wash.
4. **Midday flatness:** a gentle warm bounce on the floor below the windows at
   high daylight so noon has somewhere to look.

**Checks:** art-workflow before/after captures at 9, 12, 17.5 (rain), 22; the
`motion` suite at zero pops; lighting notes in art.md/world.md updated.

**Effort:** medium; each item is separable.

## Pass 5 — Realism rhythm (the day has a shape)

**Scope:** arrivals currently track the occupancy target with no time-of-day
shape (measured in pass 2: the idle room holds about fifteen of sixteen seats
around the clock, 03:00 included, and the boot seed matches that). Add a gentle hourly curve on the arrival budget (a morning swell, a
lunch peak, an afternoon lull, settled evening readers) that never starves the
room below a cozy floor and never queues pressure. Then one or two of the
roadmap's small lives: the visiting dog by the door (the cat has opinions, one
caption), the postcard writer at a window table, a patron who greets the cat
on the way in.

**Checks:** a two-day `?idle` soak shows the curve in guest counts without
empty-room troughs; captions stay sparse; `__dev.audit()` 0; characters.md and
world.md updated.

**Effort:** medium.

## Pass 6 — Seasons (larger, highest companion payoff)

**Scope:** real-date seasons, visible mostly through the glass: snow falling
past the windows and resting on the far roofs, frost corners on the panes,
autumn leaves drifting, later summer dusks (shift `DAYKEYS` interpolation by
season), December string lights, an October pumpkin on the mantel. Weather
rolls stay the same system; seasons bias them (more rain in autumn, snow
instead of rain below a winter threshold). Radiator ticks from pass 3 pair
with winter.

**Decisions for the owner before building:** does the idle café follow the
real calendar date, and should the saved game follow it too?

**Effort:** large; plan as its own brief with slices (winter first).

## Open decisions noted during pass 1

- **Sound preferences in idle** are still session-only (owner's original
  direction). Persisting them under the idle key would be a few lines once
  wanted.
- **An idle reset** ("start the idle café over") has no UI; `localStorage.
  removeItem('cafe-hygge-idle')` is the manual path. Could join Settings later.
- **A `MEMORY.VERSION` bump also resets the idle save** (same codec, same
  fresh-fallback). Fine during development; worth remembering once real
  players exist.
- With `?dev&idle`, the **stages (dev)** button still targets the game save;
  it is read-only there (`MEMORY.readOnly`), but hiding it in ambient sessions
  would be tidier.
