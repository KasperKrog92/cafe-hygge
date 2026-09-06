# Art review workflow

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

Each command opens a **fresh, disposable browser session**, waits for the actual
dev globals, captures, then closes it in `finally`. Do not pass the name of the
owner's everyday café session. Results are local, ignored files:

| File in `.art-review/<label>/` | Review purpose |
| --- | --- |
| `day.png`, `night.png` | Same seven sitters, poses, rain and animation time at noon / 20:00 |
| `empty.png` | Furniture silhouette, top planes and cushions without sitters |
| `fireside.png`, `nook.png` | Both chair directions, lap occlusion, lamps and rug integration at ×3 |
| `bookshelf.png`, `counter.png`, `artist.png`, `piano.png` | Material detail and depth at ×3 |
| `people.png` | Nora and five regulars, both profiles, front, back and reading, at exact ×2 |
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

For Nora routing, run `tools/verify-nora-routing.js` through the same disposable
browser recipe. It walks all 625 ordered pairs of 25 work anchors, including
obsolete intermediate waypoints, checking sampled body clearance against solid
furniture. It also completes watering, candles, hearth care, chalk, piano,
nook bussing and bowl refills, and checks unreachable/replacement destinations.
`window.noraFrames` contains the rendered nook approach for export. Pair this
with `tools/verify-hours.js` and the normal-page order cycle; the live audit now
checks Nora's actual remaining planned path as well as the authored templates.

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
