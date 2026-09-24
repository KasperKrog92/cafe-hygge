# Audit: workflow, scalability and animation

24 September 2026, at `b9fef12`, followed the same day by fixes for most
findings. This replaces the 6 September pre-development audit and the
7 September scalability audit (both in git history). It is a sampled review
with measurements, not a certification of every browser or behaviour.

## Verdict

The café's foundation (plain scripts, one composition path, a dt-driven
simulation, private test worlds) still fits the planned game; nothing points to
an engine rewrite. The costs were elsewhere: deployment was not gated on tests,
the docs were turning into changelogs, each feature touched ~27–31 files through
character-specific branches in shared code, and the animation had a realism
ceiling that the tests could not see (every sit-down and stand-up snapped in one
frame). Performance was never the constraint.

## Findings and what changed

| Finding (24 Sep) | Evidence | Status |
| --- | --- | --- |
| Deploy not gated on tests | Pages built from `main` in parallel with CI; 2 failing commits (8 Sep) deployed | **Fixed**: Pages deploys only from CI's `deploy` job after all checks pass |
| Browser checks local-only; 18 UI scripts wired to nothing | CI ran only save/audio/syntax/soak | **Fixed**: `tools/run-suites.js` runs 27 in-page suites and 17 UI flows (`tools/ui/`) in CI, each in a fresh browser context; the complete local run (with Node checks and soak) takes ~4 minutes |
| Local runner fragile | Default `127.0.0.1` could not reach the IPv6-only preview server; `-File` with comma lists failed; soak not run locally; agent-browser sessions needed manual cleanup | **Fixed**: dual-stack no-store `tools/serve.js`; one Node runner; `verify-project.ps1` wraps it and runs the soak |
| Manual `?v=` cache tags | `index.html` touched by 52 of 60 commits | **Fixed**: `tools/build-site.js` stamps content hashes at deploy |
| Docs growing as dated logs | `docs/**` +46% in 4 days (55k → 81k words); 65% of development.md was pass logs; art-pass reading path ~38–49k tokens | **Fixed**: development.md 5.9k → 1.5k words, art-workflow.md 2.9k → 0.8k; evidence now goes in commit messages |
| Owner name contradiction | CLAUDE.md "as Nora" vs AGENTS.md "as Lunafreya"; README "a barista named Nora"; code ID `nora` = Lunafreya | **Fixed**, with a Names-and-IDs section in AGENTS.md |
| Retired handoff at repo root with 275 uncommitted lines | 10.7k words beside AGENTS.md | **Archived** to `docs/archive/` with its edits |
| Save migrations per feature | v1 → v14 in 6 days; per-version hard-coded validation | **Fixed for development**: v15, no migrations; older saves open a fresh café (owner direction) |
| Named special cases in shared loops | Per-id `canBuy` branches; Holger/Gerda/visitor code in drawing, tap, HTML buttons and main.js | **Fixed**: data-driven improvement fields and generated planner; `SIM.addInvitation` and `SIM.gateRegular` registries |
| One flag, three meanings | `full-counter` in 28 checks across 11 files: menu, "started modest" (first days, Holger's hello) and lamps; menu list and first-day test duplicated | **Fixed**: `SCENE.fullCounter`, `startedModest`, `pendantsLit`; one menu, one first-day test |
| 580-line `drawPerson` | one function for every pose | **Fixed**: per-pose functions via `personFrame`; proved pixel-identical over 60,288 frames |
| Duplicate random names | 3× "Ida" at once in one room | **Fixed** |
| Sit/stand snapped in one frame | 35 transitions in 10 simulated minutes, head jump median 9 px (max 22), body teleports up to 31 px, cup teleports, book pops in: ~3.5 pops/min | **Fixed**: posture easing, cup carried to the table, book opens, sill hop; `motion` suite: 0 human pops |
| Station work indistinguishable | grind/tamp/pull/steam the same pose, hands at chest, never reaching the machine | **Fixed**: keyed, distinct gestures drawn behind her back |
| Gestures as constant sine wobbles | 39 `Math.sin` oscillators, no keyframes | **Improved**: `SCENE._.keys` for gestures; sines kept for truly periodic motion |
| Everyone walks alike | one stride for all | **Improved**: stride follows speed; passing lift |
| Cat pose swaps | sleep ↔ sit ↔ groom in one frame | **Improved**: brief loaf in-between and eased head |
| Tests blind to motion quality | suites checked planted feet and "frames differ" only | **Fixed**: `motion` suite and `__dev.film` filmstrips |

## Measurements at the audit

| Measure | Value |
| --- | --- |
| Runtime JS | 25 scripts, 14.8k lines; `drawPerson` 562 lines, `updatePatron` 437, `updateBarista` 420 |
| Composition, 15 guests (preview browser) | ~4,400 fillRect calls per frame; 2.5 ms median, 5.7 ms p95. People cost ~55–80 rects each |
| Largest draw-call share | The outside view, ~45% of rects, repainted for each open window every frame |
| Per-feature cost | JS per feature flat (~100–250 lines); files touched rose from 15–19 to 26–31; tests + docs now 53–76% of added lines |
| Shared objects | `SIM._` 106 members; patrons carry ~100 fields each; no JSDoc |

## Still open

1. **Before real players:** turn migrations back on (bump `VERSION` with a
   step and tests for every shape change) and consider keeping the previous
   good save. Browser storage is not a backup; export/import exists.
2. **Big functions and objects.** `updatePatron` and `updateBarista` are each
   400+ lines and `drawStandingArms` 250 (held props drawn separately per view);
   every patron carries every activity's timers. Split by state when next
   touched, behaviour-preserving (hash the renders as the `drawPerson` split did).
3. **A hired helper** needs claimable work (one owner per order/station) and
   safe interruption; do not copy the single-barista state machine.
4. **Cache the outside view** if frame cost ever matters (it does not today).
5. **Animation limits** listed in [animations.md](animations.md#known-limits):
   one shared body template, no per-regular idle fidgets yet, a small shape
   change into the bowl crouch, quieter back-view gestures.
6. **Dialogue read flags** grow with authored lines (one per line read); bounded
   by content, not play time. Revisit only if packets become very large.
7. **Native Safari, OS sleep/resume and long real-time sessions** are checked by
   hand, not in CI.
