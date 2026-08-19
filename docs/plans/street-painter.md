# Plan: the street painter — a facade repainted beyond the glass

A painter appears across the street and repaints a house front over about a
week of café days (a café day is 24 real minutes of the café running). The
reader watches through the café windows exactly the way the owner once watched
a real painter from a real café: glance up from the book, and it is simply
*further along*. When it is done, the freshly painted house stays that way for
good — the world quietly remembers.

This is the purest, cheapest expression of the soft-narrative pattern: almost
entirely background art keyed to a persisted arc, no new character state
machine, no new furniture, and (deliberately) no sound — the work happens
behind glass.

**Design bar check:** if the reader never notices, the café is whole; nothing
ever asks to be noticed. Progress accrues idly across café days
([narrative.md](../narrative.md) §3), the finish waits forever as a soft
invitation (§1), and the lasting change is a warmer house across the street —
warmth added, nothing gated. No badge, no pointer, no sound.

**Progress:**

- ✅ **Phase 0 — shared groundwork** is built (with the owner's pivot from real
  calendar days to **café days** for all arc pacing — a larger change than the
  calendar-fix originally written here): `updateNarrative`/`advanceArcs` in
  `sim-core.js` (the one growth path, dt-driven), café-owned `anchor` arcs
  (reconcile, `anchoredInvites`, `SIM.beatAt`), the generalized `stages` clamp
  with `rows` as number-or-array, `__dev.age(days)` repointed at the live
  growth path, and the audit's anchored/stage/rows invariants. No save-shape
  change was needed (progress became fractional; `lastSeen` stays as a visit
  stamp).

**Shape:** one groundwork phase (shared with the easel-artist plan) and two
build phases, each shipping something lovely on its own. Every phase ends the
standard way: smoke test, `?dev` + `__dev.audit()` → 0 problems, docs updated
in the same change.

---

## Current state (what we build on)

- **The town is a flat silhouette.** `drawWindow(g, world, w, alt)`
  (`js/scene-bg.js`) draws each window's stretch of town as `#2b3242` blocks
  with lit `#f5c66a` windows after dark. There is no facade *color* out there —
  so "repainted" must read as a **value/hue shift within silhouette style**
  (a warm dark such as a muted ochre-red), not literal daylight color. The
  strongest progress signal is therefore the *painter figure* (ladder, raised
  arm) plus a slowly growing band of the warmer tone.
- **Street figures already exist.** Passers-by (`updatePassersby`,
  `spawnPasser` in `js/sim-core.js`; drawn by `drawPassersby` in
  `js/scene-bg.js`, clipped inside the glass, feet at `PASSER_GY = 186`) prove
  the "life beyond the glass" pattern, including the pause mechanic
  (`pauseT`/`pauseX`). The painter is *not* a passer (he stands all day at one
  house) but reuses their silhouette drawing vocabulary and swatch.
- **Arcs, idle progression, invitations, flags all exist.** `CAST.arcs`
  (`js/characters-roster.js`), `reconcileNarrative` (`js/sim-core.js`),
  `SIM.beatAt` + the bubble renderer, `MEMORY` flags with lasting re-apply on
  boot (the `cat-wore-scarf` precedent).
- **Gerda watches the street.** Her `musing` pool fires at the window-gaze
  seam — the natural narrator for a painter across the road.

## Design decisions

- **Which window:** window 1 (the non-`alt` view, by the door) — window 2's
  stretch already has the church tower as its landmark; this gives the first
  window its own. Final say via a `?dev` screenshot of both.
- **Pacing:** `rows: 7` — a week of café days, just under three hours of open
  café. Long enough to span several reading sessions, short enough to finish
  inside one book.
- **What you see is what is saved.** The facade band and the painter's ladder
  position are pure functions of the arc's saved `progress` — no live drift.
- **The painter is weather-honest but progress is not weather-gated.**
  Progress accrues with running café time (the §3 contract — one steady drip,
  weather or not). The painter *figure* only appears in decent daylight with
  little rain (`world.daylight > 0.45 && world.rain < 0.3`, tune by eye); on
  wet days and at night the ladder leans against the house alone, and the wall
  still shows exactly `progress` worth of paint. (The fiction: he got ahead
  while you weren't looking. The contract: the save never lies.)
- **Silent.** The work is behind glass. No new sound.
- **The finish beat is anchored to the window, not a person.** This arc has no
  in-café owner, which needs a small, honest extension of the arc machinery
  (Phase 0) rather than fudging it onto Gerda — her presence must not gate
  the payoff.

---

## Phase 0 — shared groundwork ✅ (also unblocks the easel-artist plan)

Built — see **Progress** above. As landed:

1. **Café-day progression** (the owner's pivot; supersedes the calendar-day
   fix this plan originally proposed). `advanceArcs(world, days)` in
   `sim-core.js` is the one growth path; `updateNarrative(world, dt)` feeds it
   `dt / DAY_SECONDS` from `SIM.update` (hidden tabs tick too), `__dev.age`
   feeds it whole days. Saves quantize to the café hour plus every readied
   beat. `reconcileNarrative` no longer adds time — it rebinds, clamps, raises
   owed invitations, and re-applies lasting marks. Contract text updated in
   narrative.md §3.
2. **Café-owned, scene-anchored arcs.** Definitions may carry `anchor: {x, y}`
   instead of `owner` (the bubble's top edge sits at the anchor; exactly one
   of the two per arc — audited, anchor kept inside the content box).
   `anchoredInvites` renders them; `SIM.beatAt` hit-tests a forgiving box
   around the drawn bubble; `playBeat` tolerates an ownerless arc (no heart
   bubble, no bond bump).
3. **Generalized stages.** `stages` (default 1) on the definition; `rows` is
   one number or one entry per stage; a played beat steps `stage` and resets
   `progress` for the next stage; reconcile and the audit clamp/check against
   both.

## Phase 1 — the painter at work (glanceable, ships alone)

The whole idle loop, visible day by day — before any beat exists.

1. **Arc definition** in `CAST.arcs`:
   `{ id: 'street-house', anchor: {…window 1 glass…}, rows: 7, stages: 1,
   glyph: 'brush', flag: 'street-house-painted', beat: […] }` (beat lands in
   Phase 2; a definition with an unplayable beat is fine — nothing can raise
   it until `rows`).
2. **The house.** In `drawWindow` (`js/scene-bg.js`), give one mid-size house
   in window 1's stretch a named facade rect. Draw state from the arc record
   (`world.memory.arcs['street-house']`):
   - unpainted: today's `#2b3242`, plus — once the arc exists — a faint
     weathered patchiness so "before" is legible;
   - in progress: the warm tone (candidate swatch: a muted brick
     `#4a3038`-family dark chosen against art.md's palette; pick by
     screenshot) filling **top-down** — painters paint top-down, and it reads
     as work, not flooding — proportional to `progress / rows`;
   - done (flag set): the whole facade warm, one extra lit window at night
     (the house feels lived-in again). Applied on every boot from the flag,
     like the cat's scarf.
3. **The painter figure.** A small dedicated draw in the window pass (beside
   `drawPassersby`, same `PASSER` swatch and clipping): ladder against the
   facade at the current paint line, figure on it, slow two-frame arm stroke.
   Present only while the arc is unfinished *and* `daylight`/`rain` allow
   (thresholds above); otherwise just the leaning ladder. Nothing here is
   interactive; it is scenery, drawn from saved state — no sim entity needed
   (nothing to tick in hidden tabs beyond what `drawWindow` already reads).
4. **Words, sparse.** Two seams, both existing:
   - Gerda's `musing` pool (window-gaze seam) gains 2–3 lines about the
     painter, fired only while the arc is unfinished (a `when` guard like the
     knit-lines precedent): e.g. *"gerda watches the painter across the road
     find his rhythm."* — lowercase-cozy, standing alone.
   - The generic window-watcher caption pool gains one weather-aware variant
     ("someone follows the painter's brush across the road").
5. **Dev & audit:** `__dev.arc('street-house')` inspect/nudge already works;
   add the facade/painter to `__dev.shot('window0')` verification. Audit
   checks the anchored-arc invariants from Phase 0.

Verify: `?dev` boot fresh → weathered facade; `__dev.age(3)` → three days of
paint at once (no reload needed — the tick is live); `__dev.hour(20)` →
painter gone, ladder legible, night town intact; storm on → figure absent.
Docs: world.md (the street), art.md (the window stretch), characters.md
(Gerda's pool).

## Phase 2 — the finish waits (the beat)

1. **Invitation.** At `progress ≥ rows`, `pendingBeat: 'finished'` (the
   existing reconcile path). The brush-glyph bubble renders at the window
   anchor — small, soft, never pulsing — via the Phase 0 anchored-invitation
   support. It waits forever.
2. **The beat** (a caption run, the scarf precedent): tapping plays 3–4
   lines — the painter steps back the width of the street and looks for a long
   moment; the ladder comes down; the last line lands the feeling the owner
   described (watching someone else's patient work while you did yours).
   If Gerda happens to be perched at that window, one bonus line of hers joins
   the run (presence colors the moment; it never gates it —
   [narrative.md](../narrative.md) §6 spirit).
3. **After:** `flags['street-house-painted'] = true`, arc `done`. The facade
   stays warm on every future boot; ladder and figure never return; Gerda's
   painter musings retire with the arc (their `when` guard). Weeks later the
   house is just… the nice one across the street.
4. **Audit:** beat cannot fire without the invitation (existing invariant now
   covering anchored arcs); the flag re-applies on boot.

Verify: `__dev.arc('street-house', {ready:true})` → bubble at the glass → tap
→ run plays → reload → warm facade, no bubble, no painter. Full smoke test.
Docs: narrative.md (status note: second arc live, first anchored arc),
world.md, roadmap.md (graduate the idea).

---

## Open questions for the owner

- The finished facade's swatch — muted brick red, warm ochre, or soft green?
  (Screenshot candidates against both day and night palettes before choosing.)
- Should the painter ever return? A once-a-season one-day touch-up visit is a
  cheap warmth callback — or the arc simply rests forever. Default: rests.
