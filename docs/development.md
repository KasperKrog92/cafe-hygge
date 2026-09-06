# Development workflow

Work on the current café on `main`. Start with [AGENTS.md](../AGENTS.md), the
[progression roadmap](progression-roadmap.md) and the document for the behavior
being changed. The [pre-development audit](predevelopment-audit.md) records the
6 September baseline and the remaining preparation. Older handoffs and archived
branches are reference material, not competing specifications.

## Compatibility scope

Desktop browsers are the current target, including Chrome and Safari. Mobile
compatibility, responsive mobile layouts and mobile verification are deferred
until the owner explicitly requests them (6 September 2026).

## One session, one reviewable change

1. Read `git status` and the relevant implementation; preserve unrelated work.
2. State the milestone's visible result and a small set of acceptance checks.
   Treat the owner's exact art/behavior description as the spec. Record any
   unresolved routine choices as assumptions in the implementation plan.
3. Capture a baseline for visual work with the existing art workflow. Build the
   smallest complete behavior through the real simulation and shared renderer.
4. Run the checks affected by the change. Inspect screenshots, not just their
   existence. New save behavior also needs reload/migration checks; a passing
   in-memory simulation alone is insufficient.
5. Update implementation docs and the roadmap's actual status. Commit, push to
   `main` and verify deployment as required by AGENTS.md. A push publishes.

Avoid combining a file split, a save migration, a new scene and new story content
in one change. A behavior-preserving extraction should pass the old checks
before the feature changes its behavior. It can be a separate commit in the
same session; it does not need a separate branch by default.

## Verification commands

The game has no build/runtime dependencies. These optional development tools
use **Node.js**, **Python** (or another static server), **PowerShell** and
**agent-browser** on PATH. No package installation or framework is needed in
this repository. Check availability with `node --version`, `python --version`
and `agent-browser --version`.

Serve this checkout, reusing a matching existing server if available:

```powershell
python -m http.server 8137 --bind 127.0.0.1
```

From another terminal, run the complete existing browser regression set:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-project.ps1
```

The runner first runs `node tools/test-save.js`, then validates syntax for the actual production script-tag list and
checks that the server HTML matches the checkout. It uses one disposable
browser session, resets its save and reloads between suites, exports reports
and generated captures, checks page errors and confirms cleanup. Results go
to ignored `.art-review/project-check/`; a failed assertion or infrastructure
failure returns a failing command. Infrastructure errors are saved in
`runner-error.txt`. A fresh label avoids mixing artifacts from different runs.

It never borrows another task's session. A session may disappear briefly after
the browser closes, so cleanup permits a bounded teardown interval. On a forced
termination, inspect and close the known owned session before retrying; follow
the full [browser lifecycle rules](art-workflow.md#browser-session-lifecycle).

Run relevant suites only from a PowerShell prompt:

```powershell
./tools/verify-project.ps1 -Suite hours,nora-routing,waterfront,ship -Label lifecycle
./tools/verify-project.ps1 -Suite pathing,waterfront -Label layout
./tools/verify-project.ps1 -Suite animations,animation-journeys -Label motion
./tools/verify-project.ps1 -Suite ship -Label ship
```

Use the established comparison tool for visual passes:

```powershell
./tools/art-review.ps1 -Label before
# Edit and inspect the actual result.
./tools/art-review.ps1 -Label after -Verify
```

| Suite | What it establishes |
| --- | --- |
| `art` | Ten repeatable images, eight occupancy/time fixtures, capture isolation, frame composition timing and audit |
| `pathing` | Sampled obstacle clearances and real walker arrival across patron routes |
| `nora-routing` | Staff route pairs, blocked-route handling and complete care chores |
| `hours` | Empty/busy closing, cat perches, reopening, two natural nights and pending-story preservation |
| `animations` | Movement at different time steps, shoe/body contact and visible animation variations |
| `animation-journeys` | Real care, cat and seven order-preparation journeys with rendering |
| `waterfront` | Outdoor orders/seats, weather returns, cleanup, closing and a 50-minute simulation soak |
| `life` | Three unattended nights per mode; chosen plant; stage reloads, identity and duplicate prevention |
| `ship` | Sailing ship movement, window visits, seat reservations, disposal and closing |

**Separate normal-entry smoke test:** `./tools/verify-entry.ps1` automates the
real-time cappuccino journey and exports the report/night image. To inspect manually, open the bare URL, click *step inside*,
confirm audio initializes, follow an order from entry through pickup and seating,
inspect browser errors, and check night with `__dev.hour(20)` / `__dev.audit()`.
The bare URL already has a sized canvas and initialized globals behind its
splash. `?dev` skips the splash for captures; audio still needs a real click.
Keep an occasional `file://` boot check when changing script loading.

The `life` suite covers three unattended nights per mode, migration, mode
switching, one-time purchase and restoration at every plant stage. For actual
page reloads, planner interactions and two-tab ownership handoff, run:

```powershell
./tools/verify-life-reloads.ps1
```

Its disposable browser injects `life-browser-init.js` only on its `life-test`
URL. It stops automatic frame/interval drivers and explicitly ticks the real
production world, allowing exact persisted phases to be inspected after page
reload. The regular life suite proves unattended dt-driven cycling separately.
Reports and the actual notebook screenshot go to `.art-review/life-reloads/`.
This does not claim a Safari execution or full browser-process restart test. `SIM.create({})` creates a private simulated café;
`SIM.create()` retains production boot behavior. The suites use private worlds,
while page reloads also isolate dev controls and audio settings.

## Preparation before the first apartment feature

1. **Save correctness and isolation — complete 6 September 2026:** pure codec,
   explicit migration ladder, injectable storage and private simulation contexts.
   `node tools/test-save.js` covers malformed/unsupported saves, migration gaps,
   round trips, storage/persist failures, exit flushes, story reloads, seeded
   repeatability and isolation of memory, IDs, timers and audio. This also runs
   in GitHub Actions. No schema expansion or gameplay feature was added.
2. **Opening/closing boundary — complete 6 September 2026:** extracted to
   `js/sim-shop.js`, with four supplied character helpers and three world-bound
   methods ([contract](architecture.md#shop-lifecycle-contract)). The existing
   hours, Nora-routing, waterfront and ship suites pass before and after the
   split, alongside all nine save/isolation groups. Timing, routes, cat handling,
   appearance and save schema remain unchanged.
3. **Apartment/plant milestone — complete 6 September 2026:** one shared home
   evening, idle/game presentation, a 30 kr plant, carried/unpacked/placed during
   morning opening, schema v2 and one active browser writer. The existing café
   layout remains intact. General furniture availability and later jobs wait.

The first apartment/plant slice is implemented on that extracted contract.
See [the life contract](architecture.md#shared-life-and-plant-contract).

For each later session, name the one milestone or visual result, add any exact
preferences, and ask for a rendered review and updated implementation status.
The repository should hold the continuing context; the user should not have to
paste earlier conversations.

## Save and private-world contracts

`MEMORY.codec` exposes pure `fresh`, `validate`, `migrate`, `decode` and `encode`.
The schema is v2; v1 saves migrate with their stories, bonds and flags intact. Invalid saves open a fresh café; `MEMORY.status` exposes
load/write/persistence errors. Unsupported development saves may be replaced,
per the owner's 6 September direction; recovery copies are not implemented.

```js
const memory = MEMORY.createStore({ state: MEMORY.codec.fresh() });
const w = SIM.create({ memory: memory, random: SIM.seededRandom(42) });
SIM.update(w, 0.25);
SIM._.makePatron(w, 'Test');
```

Each `createStore` clones supplied state. Omitting its storage adapter means no
writes, debounce timers or visit stamps. Optional `storage`, `now`, `schedule`,
`cancel` and `persist` dependencies allow storage/error/exit tests without the
owner's save. A supplied store belongs to its world; sharing it is explicit.
`SIM.create({})` supplies a fresh store, seed 1 and a private silent piano state.
Optional `sound` injects another sound bus. No-argument `SIM.create()` keeps the
browser's `MEMORY`, clock, randomness and `SND` for production.

World-first simulation/debug exports select these services for their synchronous
call and restore the prior scope in `finally`. Use `SIM.withWorld(w, fn)` for a
synchronous custom debug sequence of helpers without a world argument; never
pass an async callback. The services are non-enumerable `world.context`, omitted
by `structuredClone` so `__dev.study()` remains a detached render fixture.
The audit validates the supplied world's memory. Never tick an art study.


## Apartment/plant verification — 6 September 2026

Eleven Node save/isolation groups and all nine browser suites pass. The life
suite exercises three natural nights in each presentation, every plant stage,
mode identity/time invariants and an additional evening after installation.
The reload runner restores actual localStorage/page loads at home and every
job stage; it also verifies keyboard dismissal, repeat-click protection and
a waiting tab's blocked writes followed by ownership takeover. The normal
entry run observed wipe-feet → entry → ordering → wait → pickup → seating,
including grind/tamp/pull/steam, in 41.7 seconds with exactly 1 kr earned.
Audio initialization, night lighting and the invariant audit passed. Captures
and reports are in `.art-review/apartment-final/`, `.art-review/life-reloads-final/`
and `.art-review/entry-smoke/`. These are desktop Chromium results, not a claim
of native Safari execution. The plain-file boot is checked separately.
