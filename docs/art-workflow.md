# Art review workflow

The first-morning cutscene is covered by `verify-intro.js` (including a hug,
silent-breath and porch contact sheet) and `tools/verify-intro-ui.ps1` (actual
desktop canvas at 16:10 and 16:9, controls and real reloads). The September 7
captures live in `.art-review/intro-final/` and `.art-review/intro-ui/`.

Start with the running café, then make comparisons repeatable. The shipping
renderer is the reference: every scene capture goes through `SCENE.composeFrame`.
Keep the pixel language, CH=60 and the owner's explicit framing instructions.

## One-command comparison

Serve the repository on port 8137 (`python -m http.server 8137 --bind 127.0.0.1`).
Use an existing server if it already serves this checkout. On Windows, launch
background servers with `Start-Process ... -WindowStyle Hidden`. Open
`http://localhost:8137/?dev`; the capture tool uses the equivalent IPv4 loopback
address. `?dev` matters: the ordinary page has an audio start gate.

With the optional **agent-browser CLI** installed, run from the repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/art-review.ps1 -Label before
# Make one coherent visual change; inspect its region and the complete room.
powershell -NoProfile -ExecutionPolicy Bypass -File tools/art-review.ps1 -Label materials
# Once the final changes are ready:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/art-review.ps1 -Label after -Verify
```

`-ExecutionPolicy Bypass` applies only to that script process, for machines whose
default PowerShell policy blocks local scripts; it changes no saved policy.
The café itself still has no dependencies or build step. The tooling is optional.

For simulation regressions across the whole project, use
`tools/verify-project.ps1`; see [development.md](development.md) for its eight
suites and targeted commands. Art captures and the normal-entry smoke test
remain distinct checks.

Each command opens a **fresh, disposable browser session**, waits for the actual
dev globals, captures, then closes it in `finally`. Do not pass the name of the
owner's everyday café session. Results are local, ignored files:

| File in `.art-review/<label>/` | Review purpose |
| --- | --- |
| `day.png`, `night.png` | Same seven sitters, poses, rain and animation time at noon / 20:00 |
| `empty.png` | Furniture silhouette, top planes and cushions without sitters |
| `fireside.png`, `nook.png` | Both chair directions, lap occlusion, lamps and rug integration at ×3 |
| `bookshelf.png`, `counter.png`, `artist.png`, `piano.png` | Material detail and depth at ×3 |
| `people.png` | Lunafreya and five regulars, both profiles, front, back and reading, at exact ×2 |
| `audit.json` | Live plus day/night fixture invariant failures (expect `[]`) |
| `verification.json` with `-Verify` | Repeatability, side effects, eight occupancy scenarios, frame timing |

Read the PNGs with an image viewer/tool; creation alone is not visual review.
Inspect the room at its native 960×600 size before enlarging crops. A detail that
only works enlarged is not a reason to keep it. Show an actual rendered result
to the owner when finishing, with a short account of the changes and validation.

## Browser session lifecycle

On 6 September 2026, severe laptop slowdown coincided with many Chrome for
Testing processes. The closing/opening development task contained ten named
sessions with launch commands and no matching close commands. Accumulated test
browsers were the likely cause; peak resource usage was not available after
the restart. Hidden café tabs continue simulating, so finishing a CLI command
does not mean its browser has stopped doing work.

Keep at most one project-owned automated browser session running at a time.
Reuse it for related checks. If fresh state is needed, close it before launching
the next session. `tools/art-review.ps1` already closes its disposable session
in `finally`; use the same pattern for ad hoc lifecycle, animation, smoke and
live-site checks. Run this whole block together from the repository root:

```powershell
$testSession = 'hygge-check-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
try {
    agent-browser --session $testSession open 'http://127.0.0.1:8137/?dev'
    if ($LASTEXITCODE -ne 0) { throw 'Browser launch failed.' }
    agent-browser --session $testSession wait --fn '!!window.__world'
    if ($LASTEXITCODE -ne 0) { throw 'Dev harness did not become ready.' }
    $testCode = Get-Content -Raw tools/verify-hours.js -ErrorAction Stop
    agent-browser --session $testSession eval $testCode
    if ($LASTEXITCODE -ne 0) { throw 'Lifecycle verification failed.' }
    # Run related checks and export needed window.hoursFrames PNGs here.
} finally {
    agent-browser --session $testSession close
    if ($LASTEXITCODE -ne 0) { Write-Warning "Cleanup failed for $testSession; inspect before retrying." }
}
agent-browser session list
```

Use the actual local server port and substitute the relevant verification
script. Save required screenshots/results before closing the browser. PowerShell
does not reliably turn a native CLI's nonzero exit code into an exception, so
check `$LASTEXITCODE` after each browser command.

Confirm the task's session is absent from `agent-browser session list` before
reporting completion. A forced termination can bypass `finally`: after a timeout,
interruption or resumed task, inspect the session list and close the known owned
session with `agent-browser --session <name> close` before launching a replacement.
If cleanup fails or the laptop slows down, stop launching tests and investigate
the remaining owned session. Do not use `close --all` or kill all Chrome processes;
other tasks and the owner's browser must remain under their own control.

## Targeted console loop

```javascript
__dev.shot('nora')                         // actual live state
var study = __dev.study({hour: 12});       // detached, repeatable rendering fixture
__dev.shot('fireside', {world: study});
__dev.shot('nook', {world: __dev.study({seats: []})});
__world.seats.map((s, i) => ({i, x:s.x, y:s.y, facing:s.facing}));
__dev.shot('window0', {world: __dev.study({seats: [12, 13]})});
__dev.poses();                            // PNG roster turnarounds
__dev.audit();                            // actual sim invariants
```

`study` clones the current world, then fixes render inputs, removes transient
activity and binds chosen readers to real seats. It neither calls `SIM.create`
nor ticks the sim: those paths can write saves, change narrative progress and
consume randomness. `structuredClone` handles circular partner/lap links.
**A study is for rendering only**: never install it as `__world`, save it or
pass it to `SIM.update`. It intentionally omits simulation timers and routines.
`seats` takes up to seven unique indices; derive them from the actual seat list
when layout changes. No options means the standard comparison arrangement.

## Review order

1. Check `git status`, the relevant AGENTS instructions and the existing audit.
   Read the relevant renderer, its `L` anchors and art.md. For this project,
   a visual pass rarely needs changes to simulation or saves.
2. Capture **before**. State the visible weakness in concrete terms: missing
   top plane, hard square upholstery, unreadable material, floating object.
3. Fix silhouette and projection first; then top/front/side tones and contact
   shadows; then sparse material texture; finally local lighting. Reuse
   `shade()` and deterministic `h2()`. Keep static detail in the background cache.
4. Capture the changed region, both mirrored orientations and empty/occupied
   furniture. Inspect full day/night scenes after each coherent batch.
   Reduce details that compete with faces, books, windows or quiet floor space.
5. Finish with `-Verify`, syntax checks and the normal-page smoke test: click
   **step inside**, observe an order through service and seating, inspect browser
   errors, then `__dev.hour(20)` and `__dev.audit()`. Fixtures cannot replace this.
6. Update art.md, world.md / characters.md as appropriate, and this workflow
   when a new iteration lesson changes the process. Follow AGENTS.md's Git policy.

## Audit findings and iterations — 5 September 2026

The renderer/layout/dev-harness audit found the existing architecture suitable:
plain script tags, shared frame composition, cached static background, a
dt-driven simulation, and a separate narrative save. The baseline invariant
sweep returned zero problems. A renderer rewrite or new art dependency was
unnecessary for the observed weaknesses.

| Finding | Action used in this pass |
| --- | --- |
| Live screenshots drift with visitors, poses and weather | Detached fixed occupancy, day/night and empty scenes |
| Art was judged through ad hoc crops | Six saved region crops plus the real roster's turnarounds |
| Reload sometimes served stale script content | Fresh unique browser session per capture, explicit readiness condition; version changed shipping renderer URLs |
| Occupied chairs hid cushion/projection mistakes | Empty-scene capture, both mirrored sitters, shared existing baselines |
| Flat furniture and rectangular vegetation | Rounded upholstery, visible crown/lid planes, cloth folds, shaped leaves and terracotta rims |
| Broad floor/rug fields lacked material cues | Stable plank tone variation and sparse rug border stitches; softened the first overly bright motif pass |
| Light did not locate lamps/windows on the floor | Incident light below sorted furniture so its contact shadows remain visible |
| Turnaround labels collided with tall hair | Larger cells sized for the tallest bun; captions below sprites |
| Bookshelf detail crop cut off its top plant | Extended that named region above the crown; crop envelopes include attached props |

Verification checks ten repeatable PNGs while forbidding random draws, unchanged
live time/save/audio settings, and eight seat-group/time combinations covering
every seat. The live cappuccino smoke run completed in about 39 seconds through
grind, tamp, pull, steam, pickup and seating; the invariant audit remained clean
and browser errors were empty. This validates the exercised path, not every
possible behavior or browser. Sound initialization was checked; this was not
an audio-mix listening review.

Warm `composeFrame` measured approximately 0.5 ms median / 1.2 ms p95 on the
development browser in the final verification run. The report measures 100
frames after 20 warmups, excluding PNG encoding, the live sim and the presentation
pass. Use it as a local check, not a cross-device benchmark or a fixed CI budget.

The older ergonomics plan remains a backlog for an isolated **all-prop** gallery
and a selected-sprite ruler overlay. The delivered loop deliberately reviews
furniture in the room and characters in turnarounds; no live `fill()` command is
needed for art comparison. Add those remaining tools only when a concrete edit
would benefit from them.


## Animation review

For Lunafreya routing, run `tools/verify-nora-routing.js` through the same disposable
browser recipe. It walks all 625 ordered pairs of 25 work anchors, including
obsolete intermediate waypoints, checking sampled body clearance against solid
furniture. It also completes watering, candles, hearth care, chalk, piano,
nook bussing and bowl refills, and checks unreachable/replacement destinations.
`window.noraFrames` contains the rendered nook approach for export. Pair this
with `tools/verify-hours.js` and the normal-page order cycle; the live audit now
checks Lunafreya's actual remaining planned path as well as the authored templates.

For the daily shop lifecycle, run `tools/verify-hours.js` through
`agent-browser --session <disposable-session> eval` on a fresh `?dev` page.
Use the [browser session lifecycle](#browser-session-lifecycle) recipe so the
session closes after capture, including when verification fails.
It exercises empty/busy evenings, laptop/book/umbrella departures, cat perches,
opening admissions, pending-story preservation and two consecutive natural nights.
It checks invariants during the journeys, not just after reopening, and leaves
PNG captures in `window.hoursFrames` for inspection/export. The normal
`art-review.ps1 -Verify` still checks the ten repeatable scenes and eight
occupancy combinations. Use `__dev.hour(21.5)` to start closing on the next tick.

See [animations.md](animations.md) for the September 2026 full motion inventory,
scenario coverage and the two reusable animation verification scripts. Static
room shots cannot prove a motion change: inspect the six-frame contact sheet
as well, and run actual simulation journeys separately from detached art worlds.


## Waterfront verification

Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-waterfront.ps1 -Regression`
with the local server running. Its single disposable session executes real
coffee orders through two terrace visits, distinct reservations, guest departures,
Lunafreya's two cleanup trips, rain before/after seating, and closing/reopening with
a pending painter invitation. It also checks elapsed-time boat movement,
clock-jump continuity, disposal and shared sun/light geometry, then simulates
50 minutes of normal arrivals and weather. The optional regression flag adds
the existing Lunafreya-routing and shop-hours checks in that same browser.

Snapshots and JSON reports are exported to `.art-review/waterfront-motion/`
before the session closes in `finally`. Inspect `terrace-day.png`,
`nora-clears.png`, and the fixed morning/late-afternoon/night views. Repeatable
`art-review.ps1 -Verify` remains required for the room and empty furniture.
Outdoor fixtures are detached, deterministic and contain no ambient entities
unless explicitly placed on the fixture. Never tick a study.

The full layout audit is intentionally sampled once per simulated minute in
the long soak: rerunning the entire path-planning audit every few seconds can
exceed the browser command timeout. Behavior/state assertions still execute on
every 0.25-second simulation step in the targeted scenarios.


September 2026 waterfront result: all targeted journeys and the 50-minute soak
passed (55 sampled full audits). The existing routing regression passed 729
ordered routes / 142,739 samples; shop-hours checks passed all four setups and
two consecutive natural nights. A real-time normal-page smoke completed the
cappuccino sequence through terrace seating with audio initialized and no
browser errors. Art verification passed ten repeatable images and eight
occupancy scenarios; local warm composition measured 1.2 ms median / 2.0 ms p95.
These timings cover composition only, not simulation, PNG export or device-wide
performance. Every task-owned verification session was closed afterward.


For sailing-ship behavior, run `tools/verify-ship.ps1` with the local server
running. It verifies real orders, window round trips, retained seats, pedestrian
waves, reverse travel, disposal, weather/daylight scheduling and closing,
exporting ship captures to `.art-review/ship-motion/` before browser cleanup.

For C0, the art-review script completes the live first-opening sequence before
making detached day/night fixtures. Arrival and partial assembly captures come
from `verify-first-opening.js`; those fixtures exercise the actual simulation.
The 7 September local pass is in `.art-review/first-opening-final/` and
`.art-review/first-opening-art-final/`: boarded windows, compact equipment,
bare hearth, two table sets and no optional room furnishings. Art audits found
zero problems. All twelve browser suites passed (the animation fixture rerun
is in `first-opening-animation-final`), alongside 75 real setup/project reloads,
seven home/plant reloads, two-tab takeover and a real-time cappuccino order.

The compact-room pass is in `.art-review/compact-after/`; `viewport-small.png`
shows the actual 16:9 canvas and `viewport-expanded.png` verifies the future
full-room presentation with the same furnishings. Default `__dev.shot()` now
exports the active room extent; explicit regions still use master coordinates.

## First apartment evening verification

The 8 September apartment lighting pass is captured in `apartment-home-before`
and `apartment-home-after` (home tour, open/closed curtains and bedtime).
Inspect `unpacked-evening.png` and `bedtime-3.png` at native 960×600: localized
lamps and monitor remain readable against a dark room; the utility walls block
their spill and the curtain closes off the projected moonlight. The home suite
passed both modes and 34 tour/bedtime save round trips. `apartment-light-after`
passes café repeatability (ten images, twelve occupancy scenarios) and zero
audits. Lighting uses a cached illumination map over the current draw list,
so moving people receive light without being baked into a static room image.
The normal-entry smoke in `apartment-light-entry` also passed audio startup,
a real-time cappuccino cycle, night lighting and the audit. All task-owned
browser sessions were closed after capture.

`verify-home.js` exercises both presentation modes, both purchase orders,
attendance holds, twelve tour and five bedtime save round trips per mode,
first-evening waiting, next-morning scheduling and the final café audit.
`tools/verify-home-ui.ps1` checks real reloads, required planner clicks,
dialogue controls and desktop 16:10/16:9 captures. The contact sheet and
individual frames are exported by `verify-project.ps1 -Suite home`.

The 7 September home pass passed all sixteen browser suites across the full
regression and targeted final reruns, plus the Node save/audio regressions.
The home suite exercised 34 tour/bedtime reloads, both purchase orders and a
bedside departure. Desktop UI checks covered the required planner and actual
reloads, including an entry-overlay hold. A normal-entry cappuccino smoke
completed grind/tamp/pull/steam, pickup and seating with a clean night audit.
Rendered results are in `.art-review/home-motion-final/` and
`.art-review/home-ui/`; café art repeatability passed ten images and twelve
occupancy scenarios in `.art-review/home-art-final/`. All task-owned browser
sessions were closed after verification.


## Second-day visitor review — 8 September 2026

`visitors-before` and `visitors-after` cover repeatable room art; the roster
sheet includes Keira and Tomas in both profiles, front, back and reading.
`visitors-ui` holds inspected 16:10/16:9 dialogue captures and actual reload
results. `visitors-conversations-final` contains in-world trolley, overlapping
jobs, introductions and installed/next-morning views. Inspection caught an
empty-path delivery at the door and an out-of-room conversation approach;
handoff now requires the real work anchor, and conversation targets respect
the current floor bounds. The focus camera retains speaker feet during zoom.
All art audits are empty; ten images and twelve occupancy scenarios repeat.

## Initial wall-shelf review — 8 September 2026

The rejected floor bookcase exposed a gap in review: current route clearance
did not protect the window's later view. Apply the future-use placement check
in art.md before choosing coordinates. The owner's replacement is three short
wall-mounted boards left of the hearth, not a moved or reduced floor bookcase.

`wall-shelves-before` / `wall-shelves-after` cover unchanged room composition
and repeatability. `wall-shelves-final` contains empty boards, hand-carried kit,
installation on folding steps, descent at closing, and open-window/closed-drape
comparisons with later fireside furnishings. `wall-shelves-ui` adds actual
16:10/16:9 views and saved job reloads. Inspect both the small gap at native
scale and Keira's hand/board contact; the future books' envelope must also stay
clear of window trim and masonry. The new shelves have no permanent floor box.


## Gerda’s warm window review — 8 September 2026

`gerda-before` / `gerda-after` cover repeatable room art (ten images, twelve
occupancy scenarios, zero audits). The `gerda-shipping` scenario captures
Lunafreya’s four table phases, Gerda carrying two pillows, one saved pillow,
the completed occupied window, night lighting and enlarged empty perches.
The two rust-red pillows have sparse cable-knit marks and stay inside the
existing sill/frame envelope; only the left window gains a table and seats.
`gerda-ui` contains inspected actual 16:10/16:9 offer, planner and thank-you
views plus real page reloads. Every runner closes its owned browser session.

## Sparse fireplace and later mantel review — 8 September 2026

`hearth-before` / `hearth-after` cover repeatable room art: ten images,
twelve occupancy scenarios and zero audits. The initial fireplace has three
nailed boards over an empty opening, with no shelf, corbels or decorations.
The first purchase removes those boards and enables the fire while keeping the
upper masonry bare. The later mantel purchase adds the shelf, clock, candles
and plant at the existing fireplace position; it does not add the legacy wall
picture elsewhere in the room.

The `hearth-regression` scenario exports each construction phase and finished
state. `hearth-ui` adds inspected actual 16:10/16:9 boarded, dialogue, planner,
work and completed views, including seven real work-phase reloads. Check Tomas’s
reach from the ladder, his descent before departure, and the rested fire during
his visit. Gerda’s fireplace follow-up remains readable with both characters
framed. All task-owned browser sessions were confirmed closed.
