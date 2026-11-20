# Development workflow

Work on the current café on `main`. Start with [AGENTS.md](../AGENTS.md), the
[progression roadmap](progression-roadmap.md) and the document for the behavior
being changed. [audit.md](audit.md) records the latest review and what is still
open. This file is the current workflow, not a log: evidence for a change goes
in its commit message, and history stays in git.

## Turning the accepted story direction into work

The owner largely accepted [the ensemble plan](plans/community-and-character-stories.md).
It is the long-term creative direction. Read the [story bible](story-bible.md)
for concise shipped/planned continuity and [narrative.md](narrative.md) for shared
rules; avoid rereading or duplicating the whole ensemble for an isolated change.
The [progression roadmap](progression-roadmap.md) owns current implementation
status and the next brief.

Write only the current slice's scene packets: trigger, known facts, actual
bubbles, choices, lasting effects, reload/leave behavior and ordinary life
afterward. Establish the smallest reusable contract that the slice needs.
Separate a behavior-preserving extraction from the feature that uses it and
pass the existing checks before changing behavior. Mark only implemented
results shipped, and update the roadmap before declaring the slice complete.

## Compatibility scope

Desktop browsers are the current target, including Chrome and Safari. Mobile
compatibility, responsive mobile layouts and mobile verification are deferred
until the owner explicitly requests them (6 September 2026). Automated checks
run in desktop Chrome; native Safari is checked by hand occasionally.

## One session, one reviewable change

1. Read `git status` and the relevant implementation; preserve unrelated work.
2. State the milestone's visible result and a small set of acceptance checks.
   Treat the owner's exact art/behavior description as the spec. Record any
   unresolved routine choices as assumptions in the implementation plan.
3. Capture a baseline for visual work (`node tools/art-review.js --label before`).
   For motion, film it (`__dev.film`, see [animations.md](animations.md)).
   Build the smallest complete behavior through the real simulation and
   shared renderer.
4. Run the checks affected by the change, then the full set. Inspect
   screenshots and filmstrips, not just their existence. Save-shape changes
   bump `MEMORY.VERSION` (see below).
5. Update the docs the change touches and the roadmap's actual status. Put the
   verification record (commands run, anything that failed and why) in the
   commit message. Commit and push to `main`; CI runs every check and deploys
   only if they pass. Do not wait for deployment unless the owner asks.

Avoid combining a file split, a save change, a new scene and new story content
in one change. A behavior-preserving extraction should pass the old checks
before the feature changes its behavior. It can be a separate commit in the
same session; it does not need a separate branch by default.

## Tooling

The game has no build step or runtime dependencies. Development tooling needs
**Node.js 24+** and **Google Chrome**; `tools/package.json` pins the one dev
package (`playwright-core`, which drives the installed Chrome and downloads
nothing else). Once per checkout:

```bash
npm ci --prefix tools
```

Serve the checkout (dual-stack, never cached, so tabs never run stale scripts;
the `.claude/launch.json` preview config `cafe` runs the same server):

```bash
node tools/serve.js
```

Then open <http://localhost:8137/?dev>. `file://` also works for a quick look.

## Checks

Everything CI runs, in one command (Windows PowerShell):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-project.ps1
```

It runs the Node save/audio regressions, syntax-checks every script, runs the
one-hour soak (`-SkipSoak` to skip) and then every browser check through
`node tools/run-suites.js`. `-Suite a,b` (a comma list works with `-File`)
narrows the browser checks; `-Label name` picks the output folder. The soak's
four scenarios run side by side and the browser checks use half the cores (at
most eight; `-Jobs n` / `--jobs n` to choose), so the whole run takes about a
minute and a half on the owner's machine. Its floor is `ui:entry`, which waits
some 40 s for one order served in real time. The same
browser runner works directly on any OS:

```bash
node tools/run-suites.js                                # everything
node tools/run-suites.js --suite motion,animations      # a few in-page suites
node tools/run-suites.js --suite ui:first-hello         # one UI flow
```

Each check gets a fresh browser context (its own empty save), so checks never
share state and there is no browser session to clean up. Reports, captures and
`summary.json` go to ignored `.art-review/<label>/`. The suite list is read from
the files, so a new `tools/verify-<name>.js` or `tools/ui/<name>.js` runs
automatically, locally and in CI.

**CI** (`.github/workflows/ci.yml`) runs the Node checks, the soak and every
browser check on each push and pull request. GitHub Pages deploys only from its
`deploy` job, which needs both to pass; `tools/build-site.js` publishes just the
shipped files and stamps each script/style URL with a content hash, so there
are no cache tags to bump by hand. A red CI run means the site did not change.

### In-page suites (`tools/verify-<name>.js`)

Evaluated on a `?dev` page against private worlds (`SIM.create({...})`,
`__dev.furnishedWorld`, `__dev.modestWorld`) and detached render fixtures
(`__dev.study`). Never tick an art study.

| Suite | What it establishes |
| --- | --- |
| `ambience` | Narration follows real progress; repeat suppression and caption lifetime |
| `animation-journeys` | Care, cat and seven order-preparation journeys complete with clean audits |
| `animations` | Equal travel at 1/60 s and 0.25 s, planted shoes, attached legs, visible motion |
| `arrivals` | Occupancy at 4/6/8/16 seats and popularity stages; queue and capacity bounds |
| `art` | Ten repeatable review images, occupancy fixtures, capture isolation |
| `birgit` | Her rhythm, hello, closing habits, the tastes bag and the recipe card |
| `books` | Book-box purchase, stocking phases across reloads, browsing, borrow and return |
| `bookshelf` | Wall-shelf purchase, delivery, partial-work reloads, closing mid-job |
| `c0` | Modest/furnished availability, improvement subsets, service during work |
| `cat-animations` | Cat pose gallery, four-direction walking, deterministic rendering |
| `cat-corner` | Cat home, bowl care, both room sizes, intro hug |
| `counter` | Lunafreya's slow spells: stool and book, crossword, own coffee, chin in hand |
| `dinner` | Apartment supper checkpoints, routes, once-per-evening completion |
| `expansion` | The room expansion: charge, view and floor bounds, six phases, reloads |
| `familiar-faces` | Nora/Kasper/Antonia introductions, Keira's second cup, Tomas's cupboard |
| `finishing` | Finishing the room: windows, curtains, tables, rugs, board, shelves, chair |
| `first-days` | First-day pacing, mandatory greeting, paired first purchases, window repair |
| `first-opening` | First-entry assembly, exact saves and the first ordinary sale |
| `gathering` | Ida's reading afternoon from proposal to the wide scene; never plays itself |
| `gerda` | Window gate, attended choices, table and pillow work, thank-you reloads |
| `gifts` | Keira's prints, Tomas's loaf and frame, Gerda's scarf |
| `hearth` | Fireplace unlock, bare reopening, later mantel, ladder descent at closing |
| `holger` | Conversation travel, speech, choices and persistence |
| `holger-books` | Holger's offer, promise, box, handover and library gift across reloads |
| `home` | Apartment tutorial and bedtime journeys with save round trips |
| `hours` | Empty/busy closing, late queued service, reopening, natural nights |
| `idle-arcs` | The idle café advances ambient arcs, holds beats for the tap, saves under its own key |
| `idle-boot` | The idle café boots near its occupancy target at 3/9/12/16/20 |
| `intro` | First-morning dialogue, pause/skip/reveal, door and sign continuity, finale |
| `invitations` | Accepting during real work; the room keeps living; held clocks; cancellation |
| `keepsakes` | Calandra's letter, the old mug, Gerda's blanket |
| `life` | Nights in both modes, plant stages, reloads, duplicate prevention |
| `lighting` | The cached light map stays render-only and faithful to installed furniture and each source's power |
| `motion` | No human pose pops at 12 fps in busy rooms ([animations.md](animations.md)) |
| `naming` | The naming arc to Café Flourish: scenes, sign carry, reload, later mentions |
| `neighbourhood` | Marcel's one presence, Ida's rhythm, Elody and Maud |
| `nora-routing` | Lunafreya's route pairs, blocked routes and complete care chores |
| `old-friends` | Aksel with Holger at one table, both orders of their stories, Kasper's paragraph |
| `pathing` | Sampled obstacle clearance and real walker arrival across patron routes |
| `piano` | The piano: offer, delivery, Saira's tuning and playing, four hands |
| `projects` | Orders interrupt hand work; overnight/reload/mode resumption; queued jobs |
| `reading-chair` | The reading chair: offer, delivery, unwrapping phases, reloads |
| `saira` | Her rhythm and tapping, hello, the eight bars, the score pinned or upstairs |
| `second-visits` | Second scenes for Holger, Kasper, Nora and Antonia; one scene per visit |
| `ship` | Sailing ship movement, window visits, seat reservations, closing |
| `stages` | The autoplayer plays the whole shipped story without getting stuck; clean mornings |
| `unpacking` | One box an evening through each phase; reloads; seven evenings place everything |
| `visitors` | Keira and Tomas: jobs, separate greetings, customer visits, both modes |
| `waterfront` | Terrace orders, weather returns, cleanup and closing |

Each suite's header comment lists exactly what it covers.

### UI flows (`tools/ui/<name>.js`, run as `ui:<name>`)

Page-level checks through real buttons, keyboard, reloads and viewports
(including 1440×900 and 1600×900 captures). They cover what in-page suites
cannot: the splash and audio entry, the planner, invitations and conversation
buttons, Settings, save export/import and exact progress across real reloads.
A flow is `module.exports = async t => report` using `t.open`, `t.enter`, `t.eval`,
`t.page` (Playwright), `t.reload`, `t.viewport`, `t.shot` and `t.init`; see
`tools/run-suites.js` and `tools/ui/first-hello.js`. `ui:gathering` walks the
reading afternoon through its real button, checks each bubble sits over its
speaker, reloads mid-scene and resumes it on Ida's next visit. `ui:stages`
opens `?day=3` once, bookmarks, skips to the next morning and opens a
bookmark and a new café through the stages panel.

`t.open` and `t.reload` choose the game on ordinary pages; dev URLs keep their
automatic game boot. Entry checks use `t.page.goto(t.base + '/')` to inspect
the chooser before selecting. `ui:idle` checks fresh and saved-game isolation,
temporary sound settings, two complete day/night cycles with audits, simultaneous
game/idle tabs and switching to idle while waiting for the game lock.

### Node checks

- `node tools/test-save.js`: save codec, validation, storage failures, exit
  flushes, private-world isolation and purchase contracts.
- `node tools/test-audio-settings.js`: audio preferences and routing.
- `node tools/test-soak.js [hours] [layout:seed]`: seeded ordinary days with
  real evening purchases in private worlds (seed 84 starts with a generous
  purse and buys every ordinary job, including shelves and books); fails on a stalled phase, unbounded
  population or unfinished work. CI runs the one-hour form.

When a shared rule changes, search all suites for its old expectation. Keep
tests of observable outcomes alongside state-machine checks; an empty fixture
can pass without testing the populated scene.

## Save and private-world contracts

`MEMORY.codec` exposes pure `fresh`, `validate`, `migrate`, `decode` and
`encode`. **Development phase (owner, 24 September 2026): nobody plays yet, so
saves are not migrated.** Bump `MEMORY.VERSION` whenever the saved shape
changes; any other version then opens a fresh café. The migration ladder
itself stays (tested with synthetic steps) for when real players exist.
Invalid saves open a fresh café; `MEMORY.status` exposes load/write/persistence
errors.

```js
const memory = MEMORY.createStore({ state: MEMORY.codec.fresh() });
const w = SIM.create({ memory: memory, random: SIM.seededRandom(42) });
SIM.update(w, 0.25);
SIM._.makePatron(w, 'Test');
```

Each `createStore` clones supplied state. Omitting its storage adapter means no
writes, debounce timers or visit stamps. `SIM.create({})` supplies a fresh
store, seed 1 and silent sound; no-argument `SIM.create()` is the production
café. World-first simulation/debug exports select a world's services for their
synchronous call; use `SIM.withWorld(w, fn)` for a custom synchronous sequence.
The services are a non-enumerable `world.context`, omitted by `structuredClone`,
so `__dev.study()` remains a detached render fixture.

## Dev shortcuts

- `?dev` boots past the splash; audio still needs a real click. The full
  console API is documented at the top of `js/dev.js`.
- `?idle` boots straight into the startup idle café (the unsaved ambient
  session) the same way; combine as `?dev&idle` or with `?hour=` / `?overlay`.
- With `?dev`, the gold coin adds 100 to the saved balance.
- **stages (dev)** (with `?dev`) gets to any point of the game: open any
  morning of a quick playthrough (built once per content change, a few seconds
  per ten days; each day lists what happened in it, so pick the day before
  the scene or upgrade you want to try), skip to the next morning without
  playing stories, bookmark the current café, or call a regular in. Opening
  one replaces the save; the café it replaced stays in the list. `?dev&day=n`
  does the same from the URL (1 = a new café). Console: `__dev.play`,
  `__dev.day`, `__dev.nextMorning`, `__dev.bookmark` (top of
  `js/dev-stages.js`).
- **apartment (dev)** in the control bar (or `__dev.home()`) runs the real
  closing into a waiting game-mode apartment; **go to sleep** returns.
- **skip unpacking (dev)** completes the first-morning setup immediately.
  Remove it when it is no longer needed.
