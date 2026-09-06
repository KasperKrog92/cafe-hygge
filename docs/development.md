# Development workflow

Work on the current café on `main`. Start with [AGENTS.md](../AGENTS.md), the
[progression roadmap](progression-roadmap.md) and the document for the behavior
being changed. The [pre-development audit](predevelopment-audit.md) records the
6 September baseline and the remaining preparation. Older handoffs and archived
branches are reference material, not competing specifications.

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

The runner validates syntax for the actual production script-tag list and
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
corresponding systems arrive. Today's `SIM.create()` worlds share `MEMORY.state`;
resetting between suites limits contamination but does not fix that API.

## Preparation before the first apartment feature

1. **Save correctness and isolation:** validate save shapes/versions, test
   migrations, separate serialization from browser persistence and let tests
   create worlds with private memory and no storage side effects. Keep valid
   existing saves and current café behavior. Implement the acceptance cases in
   findings 1–2 of the audit before adding money or partial-job records.
2. **Opening/closing boundary:** immediately before home work, move the current
   shop lifecycle into a focused simulation file with a small explicit contract.
   Keep timing, routes, cat handling and appearance unchanged. Verify hours,
   routing and outdoor closing before adding the home transition.
3. **Then milestone 2:** build the apartment/plant loop from the roadmap. Define
   its persisted phase and scene routing with a real use case. Delay general
   furniture availability, staff scheduling and a large job catalogue.

A useful next-session prompt:

> Read AGENTS.md, docs/development.md and docs/predevelopment-audit.md. Complete
> the save-correctness and isolated-world preparation in audit findings 1–2,
> with meaningful regression tests. Preserve valid existing saves and gameplay;
> do not add the apartment, currency or upgrades yet. Update the docs, verify
> the affected behavior, and commit and publish under the project workflow.

For each later session, name the one milestone or visual result, add any exact
preferences, and ask for a rendered review and updated implementation status.
The repository should hold the continuing context; the user should not have to
paste earlier conversations.
