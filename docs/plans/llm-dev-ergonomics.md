# Plan: LLM dev ergonomics — let an agent *see* its work in one call

Tooling to make the visual-iteration loop fast for AI agents (and humans) working
on this project. Motivated by a session where a two-line chair redraw sprawled
across many turns — most of the cost was **not being able to look at the sprite
cheaply**, plus a couple of avoidable process mistakes.

**Design bar check:** none of this ships to the reader-owner. Every item is
gated behind `?dev` / the `__dev` console object (`js/dev.js`, already inert
unless invoked), adds zero bytes to the cozy path, and must leave
`__dev.audit()` at 0 problems. Dev ergonomics never earn a place on screen.

## Diagnosis — what actually made the loop slow

Honest post-mortem of the session, separated into process vs. tooling so we fix
the right things:

**Process (fixed already, in docs — see below):**

1. **Substituted interpretation for instruction.** The owner gave explicit art
   direction (a *side-view* chair: backrest the only vertical, armrest
   protruding horizontally, hiding the sitter's lower body). The agent kept
   re-deriving a *front-view* reading and building that instead. Cost: three
   redesign passes. → AGENTS.md now has a **Working with the owner** section:
   explicit direction is a spec; build it verbatim, offer alternatives after.
2. **Didn't lead with the harness.** `?dev` (documented in AGENTS.md) boots
   straight into the café, globals ready, screenshot-ready. The agent instead
   loaded the bare URL, hand-clicked "step inside," and later lost that state on
   reload. → AGENTS.md Running & testing now opens with "load `?dev`, not the
   bare URL."
3. **Over-explained.** Spent turns on diagrams and option menus for a request
   that wanted action. → "Show, don't explain" added to Working with the owner.
4. **Skipped `__dev.audit()`** until the end. It takes one call and returns `[]`.

**Tooling (this plan):**

5. **`computer screenshot` fails when the preview pane isn't visibly displayed**
   ("not compositing frames"). There was no supported headless way to capture a
   frame, so the agent hand-rolled: offscreen `SCENE.drawScene` + drawable
   sort + `toDataURL` → base64 → `Write` file → `base64 -d` → `Read` png. That
   pipeline is long, fragile (it broke on a state-losing reload), and rebuilt
   from scratch every time. **This is the #1 fix.**
6. **No named regions.** Crop coordinates (`rx/ry/rw/rh`) were guessed by hand
   for the fireside pair, several times.
7. **No deterministic occupancy.** Inspecting a *seated* sprite depended on a
   patron happening to be in the chair.
8. **Sprites are authored blind** — pixel offsets from `A.x/A.y` with `m()`
   mirroring, no isolated visual reference while editing.

## Phases

Each phase lands in `js/dev.js` (the harness), stays inert for the reader-owner,
and ends the standard way: `__dev.audit()` → 0, AGENTS.md dev-harness list and
this plan updated in the same change.

### Phase 1 — `__dev.shot(target?, opts?)` · headless render-to-image  ⭐ build first

The core fix. Render the live world to a fresh offscreen 960×600 canvas exactly
as `main.js` `render()` does — `SCENE.drawScene(g, world)`, then
`SCENE.furnitureDrawables(world)` concat `SIM.entityDrawables(world).draws`
sorted by baseline `y` and drawn, then `SCENE.drawParticles` / `drawLighting` —
independent of the rAF loop, tab visibility, or whether the preview pane is
displayed. Return a PNG data URL (and log its length).

```
__dev.shot()                       // whole 960×600 scene → data URL
__dev.shot('fireside')             // cropped to a named region (Phase 2)
__dev.shot('nora')                 // cropped around a named entity
__dev.shot({x,y,w,h, scale:4})     // arbitrary crop, integer upscale
```

- Factor the render list out of `main.js` `render()` into something both it and
  `__dev.shot` call, so the shot can never drift from what actually ships.
- `scale` defaults to an integer that keeps the crop readable (nearest-neighbor,
  `imageSmoothingEnabled=false` — pixel art).
- **Acceptance:** returns a valid `data:image/png` string with the tab hidden
  and the preview pane closed; `__dev.audit()` still 0; nothing runs without
  `?dev`/`__dev`.
- **Follow-on (optional):** a dev-only "download last shot" button so a human
  can eyeball it too. Agents can pass the data URL straight into their own
  image-inspection path, so this is convenience, not core.

### Phase 2 — named scene regions

A small region map of master-coord boxes so `__dev.shot(name)` and the layout
overlay share one source of truth: `fireside`, `nook`, `counter`, `window0`,
`window1`, `door`, `hearth`, `bookshelf`, `piano`. Derive what's derivable from
`SCENE.L` (fireside from `L.armchairs`, nook from `L.library.chairs`) rather than
hardcoding. Put it in `L.regions` if the overlay wants it too; otherwise keep it
local to `dev.js`.

- **Acceptance:** every region name resolves to an in-bounds box; `__dev.shot`
  accepts any of them.

### Phase 3 — deterministic occupancy for art review

`__dev.seat(seatSel, traits?)` — drop a patron straight into a chosen seat
(`'armchair0'`, `'armchair1'`, `'nook0'`, `'nook1'`, a window, a table side),
skipping the walk, so any seated sprite can be inspected on demand. Plus
`__dev.fill()` to seat one reader in every reading seat for a fully-occupied
screenshot. Reuses the existing seat list and spawn traits.

- **Acceptance:** `__dev.seat('armchair0'); __dev.shot('fireside')` shows an
  occupied chair on the first call, deterministically; audit still 0.

### Phase 4 — sprite gallery `?dev&gallery`

A boot mode that renders every furniture piece and character (empty **and**
occupied variants) in isolation on a neutral background, tiled into a grid, so a
single `__dev.shot()` reviews the whole sprite set. Reuses `furnitureDrawables`
and `drawPerson`/`drawCat`. Catches occlusion/baseline regressions across the
set at a glance and gives art changes a one-shot before/after.

- **Acceptance:** the gallery renders all current pieces without touching live
  `world` state; leaving the mode restores the normal café.

### Phase 5 — an authoring reference for blind sprite work

Lower priority, higher leverage over time. Either (a) a `?dev&grid` ruler
overlay that draws the CH ruler and A.x/A.y axes over a selected piece while
editing, or (b) a short "how these offsets map to pixels" cheat-sheet in
art.md next to the furniture checklist. Turns "guess the offset, reload, squint"
into "read the number."

## Build order

**Phase 1 + Phase 2 first** — together they turn "show me the chair" from a
~six-step hand-rolled pipeline into `__dev.shot('fireside')`. Phases 3–5 are
independent niceties; pick them up when a task needs them.
