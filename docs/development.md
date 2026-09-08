# Development workflow

Work on the current café on `main`. Start with [AGENTS.md](../AGENTS.md), the
[progression roadmap](progression-roadmap.md) and the document for the behavior
being changed. The [pre-development audit](predevelopment-audit.md) records the
6 September baseline. The [scalability audit](scalability-audit.md) records the
7 September recheck, observed closing deadlock and next preparation priorities. Older handoffs and archived
branches are reference material, not competing specifications.

## Turning the accepted story direction into work

The owner largely accepted [the ensemble plan](plans/community-and-character-stories.md).
It is the long-term creative direction. Read the [story bible](story-bible.md)
for concise shipped/planned continuity and [narrative.md](narrative.md) for shared
rules; avoid rereading or duplicating the whole ensemble for an isolated change.
The [progression roadmap](progression-roadmap.md) owns current implementation
status. Second-day visitors are shipped;
[First books, first connection](plans/first-books.md) is the next brief.

Write only the current slice's scene packets: trigger, known facts, actual
bubbles, choices, lasting effects, reload/leave behavior and ordinary life
afterward. Establish the smallest reusable contract that the slice needs.
Separate a behavior-preserving extraction from the feature that uses it and
pass the existing checks before changing behavior. Mark only implemented
results shipped, and update the roadmap before declaring the slice complete.

## Compatibility scope

Desktop browsers are the current target, including Chrome and Safari. Mobile
compatibility, responsive mobile layouts and mobile verification are deferred
until the owner explicitly requests them (6 September 2026).

## Shared improvement preparation — 7 September 2026

The [shared contract](architecture.md#shared-improvement-contract) consolidates
the existing four improvements without adding bookshelf behavior or changing
schema v7. The new Node regression checks every ordered purchase pair against
literal prices, context restrictions and every existing numeric work checkpoint.

Verification: all 15 save/isolation groups, audio settings, 21 script syntax
checks and all 15 browser suites pass, including animations, closing with queued
service, current improvements and invariant audits. Actual browser runs preserve
74 project/C0/opening checkpoints, seven plant/home checkpoints and seven
first-day/window reloads. Planner controls, paired purchases, repeated clicks,
mode/sleep UI and two-tab ownership pass. Normal entry initializes audio and
completes the cappuccino journey in 37.5 seconds with income and a clean night
audit. Planner and completed-improvement desktop captures were inspected.

The final-code soak passes four one-hour scenarios (two seeds in each room):
14 completed café days, 240 audit samples, all purchased jobs installed and no
unattended story payoff. The earlier six-hour-per-scenario run was superseded
and stopped after the final catalogue review; no result is claimed for it.
Accelerated simulations verify continuity, not execution through OS suspension.

Reports are in ignored `.art-review/improvement-*` paths. Browser runs used
port 18737 because existing local servers returned empty responses on the usual
ports. All automated browser sessions were closed. These are desktop Chromium
results; native Safari and OS sleep/resume were not tested.

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
   `main` and finish after the push succeeds. Deployment runs automatically;
   do not wait for it or verify the live site unless the owner asks or reports
   that an update has not appeared.

Avoid combining a file split, a save migration, a new scene and new story content
in one change. A behavior-preserving extraction should pass the old checks
before the feature changes its behavior. It can be a separate commit in the
same session; it does not need a separate branch by default.

## Verification commands

The first-morning dialogue shipped on 7 September 2026. `intro` is the thirteenth
browser suite: it checks all 22 lines, eight finale stages, pause/skip/reveal,
instant text, bounds and private save restoration. `./tools/verify-intro-ui.ps1`
adds real entry/settings controls, hidden/refocus handling, eight actual browser
reloads and 1440×900/1600×900 captures. It owns and closes one disposable session.
The full runner awaits asynchronous suites before reporting their result.

With `?dev`, click the upper-right gold coin to add 100 to the current saved
balance. Repeat clicks add another 100 each; the balance persists on reload.
The coin can also be focused and activated with the keyboard. Ordinary URLs
keep the coin decorative and cannot add money.

For apartment development, click **apartment (dev)** in the ordinary control
bar after stepping inside (or call `__dev.home()` in the console). It jumps to
closing time and fast-forwards the real closing routine into the apartment,
switching to game mode so the evening waits. This advances the current save;
it is not a detached art fixture. Use **go to sleep** to return to the next
morning. The temporary shortcut hides while already at home.

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
| `art` | Ten repeatable images, twelve explicit modest/furnished occupancy/time fixtures, capture isolation, furnished composition timing and audit |
| `pathing` | Sampled obstacle clearances and real walker arrival across patron routes |
| `nora-routing` | Staff route pairs, blocked-route handling and complete care chores |
| `hours` | Empty/busy closing, late queued service with dirty indoor/terrace tables, cat perches, reopening, two natural nights and pending-story preservation |
| `animations` | Movement at different time steps, shoe/body contact and visible animation variations |
| `animation-journeys` | Real care, cat and seven order-preparation journeys with rendering |
| `waterfront` | Outdoor orders/seats, weather returns, cleanup, closing and a 50-minute simulation soak |
| `life` | Three nights per mode (idle automatic, game waits for sleep); chosen plant; stage reloads, identity and duplicate prevention |
| `projects` | Orders interrupt hand actions; overnight/reload/mode resumption, queued jobs, completed seats and two unattended hour-long runs |
| `ship` | Sailing ship movement, window visits, seat reservations, disposal and closing |
| `c0` | Modest/furnished availability, all existing plant/table/hearth subsets, real service, interruptions and installation |
| `first-opening` | First-entry assembly and checkpoint fixtures |
| `intro` | First-morning dialogue, attended controls and finale |
| `holger` | Invitations, conversation choices, resumable dialogue and ordinary moments |
| `first-days` | Admission pacing, first-day duration, mandatory greeting and paired first purchases |

**Long simulation check:** `node tools/test-soak.js` runs four seeded scenarios
for six simulated hours each, using the shipped scripts in private Node worlds.
The small and furnished cafés run ordinary days; seed 84 also makes real evening
purchases. It samples the audit, save size and narrative stages, tracks population
bounds, and fails if a shop phase stalls or purchased work never finishes.
`node tools/test-soak.js 1 furnished:84` reproduces the original closing regression
quickly; omitting the final argument runs all four scenarios. This is simulation
coverage, not a browser heap, audio, sleep or Safari test. GitHub Actions runs
the one-hour-per-scenario form, save/audio regressions and script syntax checks.
The complete browser suites and actual page-reload/UI checks still run locally.

Use one current verification record for the final code state: list the commands,
observed failures/corrections and coverage limits. The dated milestone evidence
below is historical; it does not establish that a later commit passes. When a
shared rule changes, search all suites for its old expectation. Keep tests of
observable outcomes alongside state-machine checks; an empty fixture can pass
without testing the populated scene. Prefer one implementation task writing this
checkout at a time, and re-read the worktree after an interrupted task.

**Separate normal-entry smoke test:** `./tools/verify-entry.ps1` automates the
real-time cappuccino journey and exports the report/night image. To inspect manually, open the bare URL, click *step inside*,
confirm audio initializes, follow an order from entry through pickup and seating,
inspect browser errors, and check night with `__dev.hour(20)` / `__dev.audit()`.
The bare URL already has a sized canvas and initialized globals behind its
splash. `?dev` skips the splash for captures; audio still needs a real click.
Keep an occasional `file://` boot check when changing script loading.

**Settings:** `node tools/test-audio-settings.js` checks legacy/malformed audio
preferences, independent channel gains and room-return routing. Run
`./tools/verify-settings.ps1` for real UI persistence, defaults, keyboard focus,
confirmation/cancel, failed deletion, restart/reload, retained audio preferences,
compact desktop scrolling and a clean audit. It exports settings/confirmation
screenshots and closes its disposable session. Pair it with the normal-entry
smoke test when changing audio or the main UI loop.

The `life` suite covers three nights per mode (idle automatic, game waits for sleep), migration, mode
switching, one-time purchase and restoration at every plant stage. For actual
page reloads, planner/sleep interactions and two-tab ownership handoff, run:

```powershell
./tools/verify-life-reloads.ps1
```

Its disposable browser injects `life-browser-init.js` only on its `life-test`
URL. It stops automatic frame/interval drivers and explicitly ticks the real
production world, allowing exact persisted phases to be inspected after page
reload. The regular life suite proves automatic idle cycling and game evenings that
wait for sleep separately.
Reports and the actual evening-planner screenshot go to `.art-review/life-reloads/`.
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
   hours, Lunafreya-routing, waterfront and ship suites pass before and after the
   split, alongside all nine save/isolation groups. Timing, routes, cat handling,
   appearance and save schema remain unchanged.
3. **Apartment/plant milestone — complete 6 September 2026:** one shared home
   evening, idle/game presentation, a 30 kr plant, carried/unpacked/placed during
   morning opening, schema v2 and one active browser writer. The existing café
   layout remains intact. General furniture availability remains deferred; the next two jobs are now implemented below.

The first apartment/plant slice is implemented on that extracted contract.
See [the life contract](architecture.md#shared-life-and-plant-contract).

For each later session, name the one milestone or visual result, add any exact
preferences, and ask for a rendered review and updated implementation status.
The repository should hold the continuing context; the user should not have to
paste earlier conversations.

## Save and private-world contracts

`MEMORY.codec` exposes pure `fresh`, `validate`, `migrate`, `decode` and `encode`.
The schema is v10; v1/v2 saves retain their stories, bonds, flags and apartment/plant progress. Invalid saves open a fresh café; `MEMORY.status` exposes
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


## Interruptible projects — 6 September 2026

Milestone 3 adds optional table assembly and fireplace cleaning on the existing
furnished café. The `projects` suite is included in `verify-project.ps1`; run it
alone with `-Suite projects`. The project reload/UI runner is:

```powershell
./tools/verify-project-reloads.ps1 -Label projects-reloads-final
```

It uses the same isolated `life-test` driver as the plant reload runner. It
restores real localStorage/page reloads at purchase, scheduling, arrival, every
work phase, closing, home, the following morning and installation, checking
exact partial progress/balance before resuming. It verifies the new planner
buttons, scrolling and duplicate clicks. The original life reload runner still
covers the plant and two-tab ownership handoff. No Safari execution is claimed.

The full set now contains twelve browser suites and thirteen Node save/isolation
groups. Project checks also serve a real new-seat patron, keep the original
café running while a job is pending and run two unattended hour-long soaks.
An existing lap-hop/departure race found in those runs is fixed. A route-audit
false positive when stepping out of the piano bench's clearance margin is
corrected without allowing a path through the solid bench.

Reports and inspected captures: `.art-review/projects-final/`,
`.art-review/projects-reloads-final/` and `.art-review/projects-after/`.

Final milestone evidence: all ten suites and twelve save/isolation groups pass;
28 actual project reload fixtures retain exact progress and balance. Both new
planner choices, the original plant reloads and two-tab writer handoff pass.
The normal-entry cappuccino run completed in 36.5 seconds with audio ready,
savings credited, clean browser errors and a zero-problem night audit. The art
runner verified ten repeatable images and eight occupancy fixtures. All owned
verification sessions were closed. These are desktop Chromium results.

## C0 and first-entry verification

The runner includes `c0` (all eight plant/table/hearth combinations and private
layout isolation) and `first-opening` (arrival, each setup step, partial table
assembly, first sale and day/night captures). `verify-project-reloads.ps1`
reloads their exported saves alongside project phases. `verify-entry.ps1` checks
the real splash pause and click/audio entry, advances setup, then observes a
real-time cappuccino cycle. Use `__dev.furnishedWorld()` for legacy full-room
fixtures and `__dev.modestWorld()` for a private café after its real initial
setup; neither changes production persistence.

`tools/verify-room.ps1` verifies the small-room save through a real reload,
captures the 16:9 viewport, checks the future full-room presentation switch,
and checks apartment framing. `verify-c0.js` checks every simulated actor
against the smaller floor boundaries during service and all existing jobs.

## Conversation verification

Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-holger-ui.ps1`.
It checks first arrival, both choices, a five-minute obligation hold, resumed
simulation, isolated save restoration, one-time completion, actual invitation
and choice buttons, a real browser reload and the final invariant audit.
Captures and reports are saved to `.art-review/holger-ui/`. The character and
story bible is [story-bible.md](story-bible.md).

September 7 conversation evidence: all thirteen existing browser suites and
thirteen Node save/isolation groups passed, plus the dedicated Holger suite
and actual UI/reload checks at 1440×900 and 1600×900. The Holger suite is now
included in the full runner. Art captures remain repeatable with zero audit
problems. These are Chromium desktop results, not native Safari execution.

Temporary intro shortcut: **skip unpacking (dev)** completes the remaining real setup immediately, including both tables and the outside sign, and stops at opening before Holger arrives. It is available on ordinary URLs too, remains available after skipping dialogue, and saves the completed opening. Remove this development control when it is no longer needed.

Conversation bubble checks extend the Holger suite: counter proximity, actual
approach and return, cancellation during walking, hidden-tab holds, gradual text,
distinct speaker profiles, both branches and durable replies. The UI runner
captures 16:10/16:9 choice bubbles and a seated conversation after a real reload.
Reports and inspected captures are in `.art-review/shared-bubbles-ui/`.


## First-days and mandatory greeting verification — 7 September 2026

The `first-days` suite checks five first-day seeds, a ten-minute unattended
counter hold, reload of the mandatory introduction, four active service minutes,
the two-customer cap, 90-coin paired affordability, both purchase orders, every
window hand-work checkpoint, worker departure at closing, overnight resumption,
six usable seats and left-only view/light. `holger` also checks both preserved
choice branches and release only after completion. `__dev.greetHolger(world)`
is an explicit test helper that plays the real dialogue with its first choices;
`__dev.modestWorld()` uses it to provide a private post-tutorial fixture.

`./tools/verify-first-days-ui.ps1` exercises the real invitation and conversation
buttons, verifies the blink stops after opening (and reduced motion is steady),
buys window then table across a page reload, restores all four repair steps and
the installed result, and captures 1440×900/1600×900 desktop views. It owns and
closes one disposable session. `verify-holger-ui.ps1` additionally checks actual
branch acknowledgement on counter reload. The entry smoke completes the tutorial
before observing its real-time cappuccino journey.

Schema-v7 Node regressions cover old-save migration, retained balances and
partial jobs, first-morning funds, established windows and invalid new fields.
All fifteen browser suites and fourteen Node save/isolation groups pass, plus
the real UI/reload checks. Inspected captures and reports are in
`.art-review/first-days-final/`, `.art-review/first-days-ui/` and
`.art-review/first-days-art/`. No native Safari execution is claimed by these
Chromium checks.

The normal-entry cappuccino smoke passed in 31.7 seconds with audio initialized,
pickup income and a zero-problem night audit. The first-days UI runner verified
seven actual page reloads; the dedicated Holger UI runner also preserved a chosen
reply at the counter. The final older-home-save resumption check passes in
`.art-review/first-days-resume-fixed/`. All owned browser sessions were closed.

### First home / bedtime checks

Run `tools/verify-project.ps1 -Suite home` for the saved apartment tour and
bedtime journeys, or `tools/verify-home-ui.ps1` for the actual desktop controls
and reloads. Both accept a local `-Url`; the UI runner takes the bare root URL.
`__dev.modestWorld({homeIntro:true})` keeps the first arrival pending for these
tests. Ordinary modest/furnished fixtures represent post-tutorial lives.


## Second-day visitors verification — 8 September 2026

Run `tools/verify-project.ps1 -Suite visitors` and `tools/verify-visitors-ui.ps1`.
The former plays first closing/home, both required purchases, explicit first
bedtime, second-day delivery/repair, attended and ignored greetings, assembly,
closing and the next morning in both modes. It exercises save round trips,
legacy arrived/working/installed kits, safe handoff position, closing before and
after delivery, no-purchase later hellos, six seats and zero audits.
The UI runner uses real invitation/advance buttons, reloads every acknowledged
node from the current scene data, and preserves exact table checkpoints across
actual page reloads. The expanded introductions contain 36 nodes in total.

The introduction pass also tests separated first arrivals in both modes (about
81 active café seconds apart in seed 17), partial-repair reloads, previously
delivered kits alongside repair, and completed legacy hellos staying complete.
`visitor-hellos` passes visitor, bookshelf, first-days and invitation suites,
16 Node save/isolation groups, audio checks and all 23 shipped-script syntax
checks. `visitor-hellos-ui` passes all 36 acknowledged-line page reloads and
four exact kit checkpoints; new dialogue captures were inspected at 1440×900
and 1600×900. `visitor-hellos-entry` completes a real-time cappuccino in 33.7
seconds with audio, income, night lighting and zero audit problems. All owned
browser sessions were closed. These runs use desktop Chromium.

The final full regression passed 16 suites; its terrace assertion initially
counted all visiting actors as duplicate Lunafreya drawables. Updating that
expectation to include the new visitor actors preserves the outside-owner
check. The targeted waterfront rerun is recorded separately. The first rendered
review also caught an empty-path handoff at the door; visitors now use staff
work-site routes and handoff requires actual arrival at the layout anchor.
Node save/isolation (15 groups), audio preferences and 23 script syntax checks
pass. Captures/reports are in `.art-review/visitors-final/`,
`.art-review/visitors-waterfront-final/` and `.art-review/visitors-ui/`.
These are desktop Chromium checks, not a native Safari execution.


Final presentation checks: `visitors-conversations-final` passes visitor and
Holger suites after bounding conversation approaches to the actual room floor
and adding wider side approaches around the kit. Actual visitor UI/reloads
pass at 1440×900 and 1600×900. The camera clamps both the bubble and speakers
through its zoom transition. The inspected roster sheet now includes both
visitors in five views. `visitors-after` passes ten repeatable images and twelve
occupancy scenarios. `visitors-entry` completed a real-time cappuccino in 43.0
seconds with initialized audio, pickup income and a clean night audit.
All task-owned browser sessions were confirmed closed.

## Initial wall shelves — 8 September 2026

`tools/verify-project.ps1 -Suite bookshelf` exercises the real ordinary planner,
single debit, kit arrival, five partial-work save round trips per mode, ignored
and resumed greetings, no browsing from empty boards, service, closing and next
morning. Closing before delivery, after arrival, during fitting and while on
the steps preserves the job. The latter explicitly checks a descent before
exit. v8 furnished libraries retain books and do not receive duplicate shelves.

`tools/verify-bookshelf-ui.ps1` checks an actual planner click and retained funds,
eight exact job checkpoints through real reloads, and 1440×900 / 1600×900 views.
The scenario suite also checks space for future book spines, window trim/sill,
drapes, mantel and hearth, plus installation with later fireside furniture.

Evidence: all 18 suites pass in `.art-review/wall-shelves-regression/`; the final
steps/closing refinement passes in `.art-review/wall-shelves-final/`.
16 Node save/isolation groups, audio preferences and 23 script syntax checks
pass. UI evidence is in `.art-review/wall-shelves-ui/`. Art verification in
`.art-review/wall-shelves-after/` reports ten repeatable images, twelve occupancy
scenarios and zero audits. The normal-entry cappuccino completed in 40.8 seconds
with audio initialized, income, seating and a zero-problem night audit, in
`.art-review/wall-shelves-entry/`. Exported shelf, installation and future-window
views were inspected. All owned browser sessions closed. These are desktop
Chromium checks; no native Safari execution is claimed.


## Wall-backed cat corner — 8 September 2026

`tools/verify-project.ps1 -Suite cat-corner` checks both room sizes, actual bowl
refills and food/water consumption, twelve old entrance-side ritual routes,
old initial-placement/hug checkpoints and completion without replayed progress.
It exports the full-size cat sleeping, sitting, kneading, eating/drinking,
Lunafreya pouring, the intro hug/lowering, open/closed drapes and furnished room.
Schema stays v9; current layout destinations are reconciled on restore.

Final full regression: all 19 suites, 16 Node save/isolation groups, audio
preferences and all 23 shipped-script syntax checks pass in `.art-review/cat-complete/`.
Art review in `.art-review/cat-after/` has ten repeatable images, twelve occupancy
scenarios and zero audits. Real intro controls/reloads and 1440×900 / 1600×900
captures are in `.art-review/cat-intro-ui/`; plant/life reloads and two-tab
ownership checks are in `.art-review/cat-life-reloads/`. Small-room reload,
expanded and home framing checks pass in `.art-review/cat-room/`.

Verification exposed obsolete fixture assumptions: the pathing check followed
the removed floor plant's array index; closing assumed the cat still lived left
of the left window; a post-soak seat test could reserve already occupied seats.
Those checks now follow the new cat home and test installed seats in a cleared
restored save. Older UI runners now play the shipped bedtime sequence and
mandatory Holger introduction before asserting morning/home framing. These
updates change tests, not those gameplay contracts. Browser sessions are closed
by each runner. These are Chromium desktop checks, not native Safari execution.

The final normal-entry cappuccino completed in 33.8 seconds with audio ready,
pickup income, seating and a zero-problem night audit (`.art-review/cat-entry/`).
The installed-seat fixture cleanup is confirmed in `.art-review/cat-project-confirm/`.
Final exported corner/intro images in `.art-review/cat-complete/` were inspected;
all task-owned browser sessions were confirmed closed before commit.


## Invitations and an active background - 8 September 2026

`tools/verify-project.ps1 -Suite invitations` checks acceptance during an actual
order, completion through the pass, five chore journeys, an atomic project
hand action, duplicate clicks and cancellation while queued. A two-minute
hidden conversation verifies pickup, counter arrival, departure, speaker
reservation and held service/day clocks; service resumes and the audit passes.
The suite is included in the full runner and exports waiting/talking frames.

`tools/verify-holger-ui.ps1` also clicks a seated invitation during real brewing,
checks the queued phase and eventual approach, captures background queueing,
and dismisses via Escape. Its existing choice, actual reload and desktop
1440x900 / 1600x900 checks remain. Seeded Holger can now introduce himself
without an earlier recorded arrival; completion creates the relationship once.

All 21 simulation suites pass across `invitations-regression` and the targeted
`invitations-final` rerun. The first-days assertion now measures service time
through the day clock, since ambient time continues during conversation.
Visitor checks reserve the speaking worker while other work can complete.
16 Node save/isolation groups, audio settings and 23 script syntax checks pass.
Actual UI/reload captures are in `.art-review/invitations-ui/`. These are desktop
Chromium results; native Safari was not run. Every runner closes its session.

The normal-entry cappuccino completed in 32 seconds with audio ready, pickup
income, seating and a zero-problem night audit (invitations-entry). All owned
browser sessions were confirmed closed before commit.


## Gerda’s warm window — 8 September 2026

`tools/verify-project.ps1 -Suite gerda` exercises both presentation modes,
pre-repair exclusion, optional introductions, every hello cursor and chosen
reply, repeated “not yet”, ordinary planner debit and next sleep, four exact
table checkpoints, both pillow placements and closing between them, normal
tea/seating, thank-you reloads and one-time completion. It performs 41 private
save round trips and exports day/night, empty perches, carried gifts, assembly
and conversation frames. `tools/verify-gerda-ui.ps1` uses actual invitation,
choice, planner and sleep buttons; reloads the selected reply, purchase, four
assembly phases, first pillow and thank-you cursor; and captures 1440×900 and
1600×900 views.

All 22 browser suites pass across `gerda-regression` and the targeted
`gerda-final`/`gerda-shipping` reruns. The old queued-project assertion now
checks the two purchased jobs, not every catalogue item; furnished fixtures
include the established window-table record. Seventeen Node save/isolation
groups, audio settings and all 25 shipped-script syntax checks pass. v10
migration tests retain v9 shelf checkpoints, Gerda bonds and the cat’s scarf;
legacy seating is preserved without inventing new conversation acknowledgements.

Actual UI/reload evidence is in `gerda-ui`; art repeatability in `gerda-after`
passes ten images, twelve occupancy scenarios and zero audits. The normal
entry cappuccino smoke passed in 33.1 seconds with audio initialized, pickup
income, seating and a zero-problem night audit (`gerda-entry`). The exported
room, pillow, assembly and dialogue images were inspected. All owned browser
sessions were confirmed closed. These are desktop Chromium checks; native
Safari was not run.
