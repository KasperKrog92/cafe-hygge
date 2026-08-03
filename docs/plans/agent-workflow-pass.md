# Agent workflow pass — make the next hundred changes cheap

**Status: phases 1–2 executed 2026-08-03; phase 3 planned.**
Written 2026-08-03, immediately after the reading-nook session, from notes on
where that session's effort actually went. The owner expects many more changes of that shape ("add a cozy thing +
its behavior"); this pass optimizes the *cost of change*, not the app.

## Why (measured friction from a real session)

The reading nook (bookshelf + borrowing behavior + nook furniture) was a
typical request. Where the budget went:

1. **Reading the two big files dominates.** `js/scene.js` is now 1,349 lines
   — past what an agent can pull in one read, so every visual change starts
   with two full reads; `js/sim.js` (929) is one more. Any given change needs
   ~10–20% of that text.
2. **Geometry was the hardest thinking, with zero tool support.** Placing
   nine objects meant hand-arithmetic against `SCENE.L` for: overscan bounds,
   baseline/occlusion order, neighbor overlaps (lamp head vs. chair back),
   and walk-path collisions. The one real design hazard (walk targets inside
   the bookshelf's x-span make walkers vanish behind it) was caught only by
   deliberate re-derivation — nothing in the project would have flagged it.
3. **Behavior verification is manual and slow.** The smoke test needs a
   click (audio overlay); clock jumps are raw console pokes; forcing a
   scenario ("a patron who borrows a book") meant re-implementing the
   IIFE-private `makePath` by hand in the console; rare behaviors otherwise
   mean waiting in real time. Screenshots at browser scale can't resolve
   2 px details (the loan-gap spines went visually unverified).
4. **Docs mirror coordinates.** art.md's layout map re-lists numbers whose
   source of truth is `SCENE.L`, so every layout change is a two-place edit
   and a drift risk.

None of this says the project is set up badly — AGENTS.md + docs/ carried the
session with zero wrong turns on conventions. This pass is about cost.

## Phase 1 — dev harness (`js/dev.js` + `?dev`)

A new plain script, loaded between sim.js and main.js, exposing
`window.__dev`. Inert unless the URL has `?dev` or the console calls it —
invisible to the reader-owner, zero user-facing change.

1. **`?dev` boots straight into the scene** (overlay dismissed, audio left
   uninitialized until a real click). Screenshots then need zero
   interaction. Riding along: the roadmap's `?hour=` param falls out for
   free (`?dev&hour=20`).
2. **Time control:** `__dev.hour(h)` (clock jump, one call instead of the
   `__world.t` incantation) and `__dev.ff(seconds)` — fast-forward by
   ticking `SIM.update`/0.25 s steps with audio skipped, same as the
   hidden-tab path. Watching a full order cycle drops from minutes to a
   call.
3. **Scenario forcing:** `__dev.spawn({wantsBook, ownBook, drink, chatty})`
   returns a real patron with chosen traits; `__dev.send(name, x, y)` paths
   any entity through the real `makePath`. Requires sim.js to expose a tiny
   internals bundle (`SIM._ = { makePath, freeSeat, caption }`) — three
   references, debug-contract only.
4. **Layout overlay:** `__dev.overlay()` draws, after captions: the 16:9
   crop and content-safe bounds, the walking lane, every `SCENE.L` anchor as
   a labeled crosshair, seat dots (free/taken), bus/browse spots, and
   declared occluder boxes. Placement questions become "screenshot with
   overlay on" instead of mental arithmetic.
5. **`__dev.audit()` — invariant sweep** printing violations, so regressions
   are a console call instead of re-derivation:
   - every `L` anchor, seat, and walk target inside content-safe bounds
     (x 12–948, y 36–576); all coordinates integers
   - no walk target (seat, queue/wait/bus/browse spot) x-inside a declared
     occluder span with y beyond its baseline — the bookshelf lesson,
     mechanized
   - seats reference existing tables; nook seats point at `small` tables
   - the hard-won constants hold: barista home y 286, lane 368
6. **Declare occluders once:** `L.occluders = [shelf, counter]`-style list
   in `scene-core.js` so the overlay and the audit share one truth with the art.

AGENTS.md's smoke test gains one line: open with `?dev`, run
`__dev.audit()`, expect 0 problems.

## Phase 2 — split the big files at their seams

**Executed 2026-08-03.** `drawTinyPlant` joined the core helper contract because
both the background and furniture use it; otherwise this was a pure code move.

Same globals, same IIFE style, more `<script>` tags — file:// and the
zero-dependency promise untouched. Target: no scene renderer file over ~500
lines, so a visual change reads one small contract file plus one sibling.

`js/scene.js` (1,444 at execution time) became, in load order:

| File | Contents | ~lines |
| --- | --- | --- |
| `js/scene-core.js` | creates `window.SCENE`; `L`, palette/DAYKEYS, px/ell/shade/h2/lerp helpers, shared tiny plant, chalk font | 221 |
| `js/scene-bg.js` | static background cache + the dynamic wall layer (window, door, fireplace, menu, shelves, machine, hanging lamps) | 434 |
| `js/scene-furniture.js` | `furnitureDrawables` + furniture helpers (tables, chairs, bookshelf, lamps, counter, plants) | 358 |
| `js/scene-people.js` | `drawPerson`, `drawCat`, bubbles, icons | 335 |
| `js/scene-fx.js` | lighting, particles, caption rendering | 143 |

`sim.js` (1,013 at execution time) stays whole in this phase. It is now beyond
the **~900-line** forward split rule, so its next structural pass should split
at the section comments (world/patrons/barista+cat) in a dedicated change,
never mixed into a feature change.

Mechanics: pure move, no rewrites; verify with a before/after screenshot at
the same `__dev.hour` + clean console + one full order cycle; update
index.html script order, architecture.md's file table, and AGENTS.md.

## Phase 3 — one source of truth for coordinates in docs

1. **art.md layout map slims down.** Keep the room's *shape* and the
   reasoning-heavy facts (overscan strips, lane, occluder spans, baseline
   rules); drop exact anchor numbers that merely mirror `L`. House rule
   going forward: a coordinate appears in docs only when the sentence is
   about *why* it has that value (e.g. "the barista stands at y=286
   because…"). Everything else says "see `SCENE.L.<key>`".
2. **AGENTS.md gains change playbooks** — the nook session discovered these
   by reading everything; write them down as recipes:
   - *Add furniture*: `L` entry → drawable(s) with baseline → occluder? →
     lighting glow? → art.md checklist → `__dev.audit()`.
   - *Add patron behavior*: state or `updateSeated` timer → caption
     (probability-gated) → quiet sound → characters.md.
   - *Add a sound / a caption*: file + gain bar + doc row.
   Each playbook names the exact files/functions so a session can start
   with two targeted reads instead of seven.

## Sequencing

- Phase 1 is standalone and highest-value; do it first (or alone).
- Phase 2 lands before the next large visual pass, in its own commit(s).
- Phase 3 rides with whichever phase touches those docs; playbooks want the
  harness to exist so they can reference `__dev`.
- House rule holds throughout: docs update in the same commit as behavior.

## Non-goals

No build step, no modules, no TypeScript, no test framework, no external
libraries. Nothing user-visible changes: the harness ships inert, the split
is byte-identical rendering. The cozy bar (overview.md) is untouched — this
pass is for the agent, not the café.

## Acceptance

- `?dev` shows the café with no click; `__dev.audit()` reports 0 problems on
  a clean boot and correctly flags a deliberately-broken seat placed under
  the bookshelf.
- `__dev.spawn({wantsBook: true, ownBook: false})` produces a browse →
  borrow → nook → return-book loop watchable in under 30 s via `__dev.ff`.
- After the split: no scene renderer file over ~500 lines, same-frame screenshots match,
  console clean, one order cycle plays through.
- art.md contains no coordinate that isn't attached to a *why*.
