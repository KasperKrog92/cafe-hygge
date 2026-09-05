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
