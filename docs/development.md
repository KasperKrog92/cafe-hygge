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
./tools/verify-project.ps1 -Suite hours,nora-routing -Label lifecycle
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
| `ship` | Sailing ship movement, window visits, seat reservations, disposal and closing |

**Separate normal-entry smoke test:** open the bare URL, click *step inside*,
confirm audio initializes, follow an order from entry through pickup and seating,
inspect browser errors, and check night with `__dev.hour(20)` / `__dev.audit()`.
The bare URL already has a sized canvas and initialized globals behind its
splash. `?dev` skips the splash for captures; audio still needs a real click.
Keep an occasional `file://` boot check when changing script loading.

The regression runner does not claim to cover browser restarts, saved jobs,
cross-tab conflicts, a future planner or apartment. Add their tests as the
corresponding systems arrive. `SIM.create({})` creates a private simulated café;
`SIM.create()` retains production boot behavior. The suites use private worlds,
while page reloads also isolate dev controls and audio settings.

## Preparation before the first apartment feature

1. **Save correctness and isolation — complete 6 September 2026:** pure codec,
   explicit migration ladder, injectable storage and private simulation contexts.
   `node tools/test-save.js` covers malformed/unsupported saves, migration gaps,
   round trips, storage/persist failures, exit flushes, story reloads, seeded
   repeatability and isolation of memory, IDs, timers and audio. This also runs
   in GitHub Actions. No schema expansion or gameplay feature was added.
2. **Opening/closing boundary:** immediately before home work, move the current
   shop lifecycle into a focused simulation file with a small explicit contract.
   Keep timing, routes, cat handling and appearance unchanged. Verify hours,
   routing and outdoor closing before adding the home transition.
3. **Then milestone 2:** build the apartment/plant loop from the roadmap. Define
   its persisted phase and scene routing with a real use case. Delay general
   furniture availability, staff scheduling and a large job catalogue.

A useful next-session prompt:

> Read AGENTS.md, docs/development.md and docs/progression-roadmap.md. Extract
> the current opening/closing lifecycle into a focused simulation file, keeping
> gameplay and appearance unchanged. Verify hours, routing and outdoor closing,
> update the docs, commit and publish. Do not add apartment features yet.

For each later session, name the one milestone or visual result, add any exact
preferences, and ask for a rendered review and updated implementation status.
The repository should hold the continuing context; the user should not have to
paste earlier conversations.

## Save and private-world contracts

`MEMORY.codec` exposes pure `fresh`, `validate`, `migrate`, `decode` and `encode`.
The schema remains v1. Invalid saves open a fresh café; `MEMORY.status` exposes
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
