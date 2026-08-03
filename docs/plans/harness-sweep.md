# Harness sweep — spend the new dev tooling on bug hunting

**Status: planned, unblocked.** Written 2026-08-03, right after the dev
harness landed. The agent workflow pass (harness + file splits + doc
slimming; plan doc retired to git history) is fully executed, so any fixes
here edit small files.

## Why

The harness's very first `__dev.audit()` run caught a shipped bug (the
drink-waiting line marched behind the bookshelf). That suggests more latent
bugs, and the harness now makes hunting them cheap: this plan spends that
capability once, deliberately, and hardens the audit with what it finds.
Nothing here is user-visible except bug fixes; the cozy bar is untouched.

## 1. Soak test (bug hunt)

`__dev.ff` through **3+ in-world days** in ~30-in-world-minute chunks,
varying weather (`__world.rainTarget`) and start hours. After each chunk,
assert on `__world` (a throwaway console script is fine):

- every patron `x/y` finite and inside content-safe bounds; no state
  occupied longer than ~5 in-world minutes (stuck-state detector)
- seat consistency: `seat.taken` ⇔ exactly one patron holds that seat
- queue sane: indices contiguous from 0, matching each `queueIdx`
- no orphans: table items and `counterCups` whose `owner` id has left
  (except deliberate `owner: null` leftovers awaiting Nora)
- patron count ≤ spawn cap; captions still flowing; console clean

Any anomaly: reduce to a minimal repro (`spawn`/`hour`/`ff`), fix it, and —
if the class of bug is general — add a matching rule to `__dev.audit()`.

## 2. Pathing correctness (audit hardening)

`audit()` checks path *endpoints* today. Extend it to check the *journey*:
for each walk target, derive the L-shaped route (via `SIM._.makePath` on a
scratch object) and flag any segment that crosses an occluder box or a
table/chair footprint mid-route — characters hidden or walking "through"
furniture, mechanized. Needs a small `L.footprints` (or per-table derived
boxes) alongside `L.occluders`; declare once, share with the overlay.

Explicit non-goal: do **not** "optimize" paths. Lane-based L-walking is a
design choice (see AGENTS.md); this is about correctness only.

## 3. Cheap extras while in there

- **Day-cycle art review:** same-frame screenshots at hours 6.5 / 12 /
  18.5 / 20.5 / 23 via `?dev&hour=`; eyeball lighting, lamp states, glows.
- **Crowding check:** spawn to cap, `ff`, screenshot — queue and wait
  cluster stay readable, nobody overlaps furniture or each other badly.
- **Borrow-loop regression:** `spawn({wantsBook: true, ownBook: false})` +
  `ff`, assert the full browse → borrow → nook → return state sequence and
  that the shelf's loan-gap count tracks `hasShelfBook` patrons.

## Acceptance

- Soak of 3+ in-world days completes with zero anomalies, or every found
  anomaly is fixed with its repro noted in the commit message.
- Extended `audit()`: 0 problems on a clean boot; a deliberately planted
  target whose route crosses a table is flagged.
- Every new invariant that proved useful lives in `audit()` permanently;
  docs (characters.md / world.md) updated in the same change as any fix.
