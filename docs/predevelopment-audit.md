# Pre-development audit — 6 September 2026

Audited the shared café on `main` at `277af73`, before the apartment/progression
milestone. This pass covers architecture, persistence, scene/layout boundaries,
simulation and art verification, development tooling, documentation and release
workflow. It is a readiness audit with targeted reproductions and existing
regressions, not a claim of exhaustive line-by-line correctness or cross-browser
certification.

**Conclusion:** the working café is a sound foundation. Prepare save correctness
and test isolation first, then extract the existing shop lifecycle immediately
before adding home life. Retain the renderer, simulation, pathfinding, quiet
audio and zero-dependency runtime. A framework migration or general engine
rewrite would add work without addressing the observed risks.

## Measured baseline

| Check | Result |
| --- | --- |
| Production syntax | All 15 script-tag sources passed `node --check` |
| Existing browser suites | All eight passed: art, pathing, Nora routing, hours, animations, animation journeys, waterfront, ship |
| Art | 10 repeatable images; 8 occupancy/time fixtures; no live audit problems |
| Composition timing | Final run: 1.3 ms median, 4.3 ms p95 on this machine; warm composition only, excluding PNG encoding, presentation and whole-app CPU |
| Normal page | Splash, real entry click, initialized Web Audio, then one cappuccino order through seating; no audit problems or page errors |
| Service trace | `wipeFeet → enter → queueing → ordering → waitDrink → pickup → toSeat → seated`; observed grind/tamp/pull/steam stages |
| Direct file loading | `file://` boot with a live world and zero audit problems |
| Visual inspection | Reviewed full café service and night captures; no new art change required by this audit |
| Local Markdown links | No missing file targets in the tracked Markdown scan; heading anchors and external URLs were not checked |
| Cleanup | Every session created by this audit closed; the pre-existing `hygge-url-morning` session was left alone |

The final combined report and exported suite captures are under
`.art-review/audit-final/`. Normal-entry evidence is in
`.art-review/smoke-probe.json`. Save and clock reproductions are recorded in
`.art-review/save-probes.json` and `.art-review/clock-probe.json`. These are local,
ignored artifacts; the results above are the durable record. Reproduce the
browser baseline using [development.md](development.md).

Runner trials exposed a Windows launch pipeline stall, a frame filename
containing a decimal hour, a brief delay removing a closed session entry, and
PowerShell 5.1 encoding/argument handling. The runner now sends UTF-8 JavaScript
through stdin using the Windows command shim. All eight suites passed together
in the final PowerShell 7 run, and the art suite also passed under Windows
PowerShell 5.1; the updated art-review command passed there too.
These were tooling issues, not failed café assertions.

## 1. Save validation and migration boundaries — high priority

**Evidence:** `migrate()` in [memory.js](../js/memory.js) accepts any object,
including arrays, and assigns `s.version = VERSION` even when the source is a
newer version or no migration path exists. Top-level `arcs`, `bonds` and `flags`
also accept arrays. Isolated execution of the actual loader produced:

| Input | Observed result |
| --- | --- |
| Valid v1 object | Added flag survives serialization |
| v99 object | Silently rewritten as v1 |
| v0 object without a migration | Silently rewritten as v1 |
| Root `[]` | Accepted, then serializes as `[]`; named state properties disappear |
| v1 with `flags: []` | Added named flag disappears when saved |
| Invalid JSON | Correctly falls back to a fresh café |

`reconcileNarrative()` in [sim-core.js](../js/sim-core.js) also performs only
limited record validation. Its `typeof number` checks do not establish finite
integer stages; nested arrays are treated as records. Do not extend this shape
with balances and work records while treating parsing as validation.

**Preparation:** separate pure decode/validate/migrate/encode logic from the
browser storage adapter, require plain record shapes and supported finite
integer versions, and run each migration explicitly. Preserve the existing
valid v1 save and its stories. Unknown future saves must not be silently
downgraded and overwritten; preserve their raw bytes for recovery while opening
a safe playable fallback. Storage failures should remain nonfatal and observable
to dev tools. Handle a rejected persistence-request promise as well as a
synchronous exception.

**Acceptance before new progression fields:** valid save round trips; malformed
JSON/root/record arrays; unsupported older and newer versions; missing migration
step; successful field-preserving migration; finite/integer stage validation;
blocked storage; immediate save/exit; and reload of pending/completed story
marks. Tests should use isolated adapters or disposable storage, never the
owner's browser save. Do not invent a currency/job schema in this preparation.

## 2. Simulation factories share persistence — high priority for development

**Evidence:** `SIM.create()` calls `reconcileNarrative()`, which binds every
world to the same `MEMORY.state`, stamps it, schedules a write and requests
storage persistence. A disposable-browser probe created two worlds and found:

```text
first.memory === second.memory                 true
first.memory === liveWorld.memory              true
ticking second advances first's arc progress   true
```

`narrSaveT` is also module-scoped, and `SIM.dislodgeCat()` resolves the live
world through `window.__world`. Existing tests often restore `__world` and
`Math.random` but leave the shared save changed. This creates order-dependent
test state and makes future scene/reload tests unnecessarily difficult. It is
not evidence that the currently shipped single-world café is duplicating saves.

**Preparation:** make world creation accept an explicit memory/persistence
context, with today's production boot as the default. Test worlds need private
memory, controlled randomness, and no stamps, storage writes or persistence
prompts. Keep per-world timers on the world/context. Pass a world explicitly
where simulation helpers currently resolve the global one. Preserve the existing
renderer-only `__dev.study()` contract; it must never become a simulation save.

**Acceptance:** tick/create a second test world without changing the first,
its save, its storage or audio; demonstrate repeatability with a seeded random
source; retain all existing tests and production boot behavior. The new runner's
fresh saves between suites are an interim safeguard, not this refactor itself.

## 3. Extract the shop lifecycle at the apartment boundary — medium priority

[sim-characters.js](../js/sim-characters.js) is approximately 1,749 lines and
mixes service, care chores, cat behavior, narrative beats, shop opening/closing,
the main update and entity composition. The next feature chiefly changes
`shopTasks()` / `updateShop()` and the night-to-dawn transition; it does not need
the rest of the file redesigned.

**Recommendation:** move the existing shop lifecycle into a focused simulation
file, preserving the explicit update order and exposing only the needed cat,
route and chore helpers. Do this as a behavior-preserving commit immediately
before apartment work. Verify busy/empty closing, terrace cleanup, carried cat,
reopening and ready invitations against the current suite before replacing the
overnight skip with a home scene.

`main.js` currently captures one `const world` for its loop, rendering and input.
Merely assigning a different `window.__world` does not redirect the shipped loop.
The apartment feature needs one explicit active-scene boundary used consistently
by update, render, sound and input. Keep one persistent life and one clock;
do not create two independent simulations to represent idle and game modes.
Define that boundary while building the apartment, not as an abstract scene
framework before there is a second scene.

## 4. Clock documentation and missing pause coverage — medium priority

The old architecture diagram described a 0.1-second rAF-only update despite
the actual shared 0.25-second clock. Both comments and prose also said a gap
over 90 seconds was discarded completely. Executing the real `advance()` body
in an isolated boot stub confirmed that a 120-second gap advances **90 seconds**:
`Math.min(90, gap)` caps catch-up and discards only the excess.

The architecture prose/diagram are corrected in this pass. Runtime comments
still need alignment when `main.js` is next edited; no clock behavior changed.
Before implementing planner pauses, add focused clock-driver tests: ordinary
rAF time, hidden/refocus calls without double ticks, long-gap capping and
resuming from a deliberate pause without catching up the time spent planning.
The existing movement/fast-forward suites exercise `SIM.update` directly and
do not establish those driver rules.

## 5. Dynamic rooms require unified layout availability — later milestone

`SCENE.L` is a useful shared source of geometry, but `walkBoxes`, `staffBoxes`
and patron `walkCorners` in [sim-core.js](../js/sim-core.js) are constructed at
script load. The background cache in [scene-bg.js](../js/scene-bg.js) is shared
and its static drawing does not take a world. Furniture, seats and cat perches
assume the current complete café.

Hiding a bookshelf or table in a draw function would therefore leave collisions
and behavior out of step with the art. Counter extensions also affect staff
routes, interactions and seating. **Do not solve all of this before the plant
prototype.** At the modest-starting-café milestone, derive rendering, footprints,
seats and activity availability from one installed-layout state; invalidate
navigation and scene caches together. Use stable IDs for persisted furniture,
not the current table/seat array indices. Test partially installed arrangements
and cat anchors as well as complete rooms.

## 6. Documentation and workflow drift — immediate fixes applied

- Marked `NEW_CAFE_GAME_HANDOFF.md` as retired. Its still-visible instructions
  demanded a separate repository, engine and manual movement, directly opposing
  the owner's current direction. The old text remains historical reference.
- Corrected the claim that the ordinary splash page lacks a sized canvas/dev
  globals. The actual bare-page probe had both globals and a 1920×1080 presented
  canvas at this browser viewport. `?dev` remains the capture shortcut.
- Marked `MEMORY` as implemented in narrative docs, and explicitly recorded
  the save-validation gap instead of claiming the loader already enforces it.
- Added [development.md](development.md) with a focused session workflow,
  selected-suite commands, coverage limits and a next-session prompt.
- Added [verify-project.ps1](../tools/verify-project.ps1): production syntax,
  isolated suite reloads, structured reports, exported frames, page-error checks,
  one owned session and verified cleanup. Existing JavaScript suites remain the
  source of their assertions. No runtime dependency was introduced.
- Added exit-code/session-list cleanup verification to the art-review runner.
  Its previous `finally` closed the browser without checking whether it succeeded.
- Linked the audit/preparation from AGENTS.md, README and the progression roadmap.

There is no need to rewrite all docs now. Keep current behavior separate from
future proposals, and update the relevant section as each milestone ships.
Some old plan sections are explicitly historical; preserve that distinction.

## 7. Release and later interface checks

`main` is both the working baseline and Pages source. An ordinary push publishes
the site. Shipped asset URLs must change with their contents: `memory.js`,
`main.js` and `style.css` currently have no version suffix, so remember to add
one when editing them. The current audit edits only docs/development tools and
therefore requires no asset version change. A future lightweight release check
could compare changed assets against their URLs; it need not introduce a build.

Add pure save tests to CI once they exist and are deterministic. A fast Node
check can precede optional browser suites. Do not make screenshot timings into
hard CI performance thresholds based on this one machine.

The future planner should use ordinary accessible HTML controls, sensible
keyboard focus and clear labels. Existing document-wide `m`/`f` shortcuts will
need to ignore focused form fields so typing in a future UI does not toggle
mute/fullscreen. Story bubbles currently have pointer hit-testing; keyboard
access belongs with the expanded game interaction. These are feature acceptance
items, not reasons to rebuild the canvas UI today.

Cross-tab ownership, export/import and atomic purchased/partial-job saves remain
required before substantial progression investment. Add them with the first
persisted job/save work, not after a large catalogue has already shipped.

## Recommended order

1. **Now complete:** audit, measured baseline, workflow runner and doc corrections.
2. **Next preparation session:** findings 1–2, save correctness and isolated
   worlds, with regression cases proving existing saves and behavior survive.
3. **Start the apartment session:** extract opening/closing without behavior
   changes, verify it, then implement the roadmap's evening/plant loop.
4. **When needed:** dynamic furniture layouts, kitchen inventory, visitor jobs,
   two-worker reservations and relationship/home expansion, each with its own
   real use case and acceptance checks.

Do not front-load a generic entity-component system, task graph, framework,
TypeScript/build conversion, whole-engine file split, external art pipeline or
cloud services. Current modular script tags, a shared composed frame, existing
preparation-step data and autonomous routes already provide most of what the
next small feature needs.
