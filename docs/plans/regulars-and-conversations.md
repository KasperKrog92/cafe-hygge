# Plan: regulars & conversations — a roster with habits, then voices

Executes the roadmap's new **Regulars & conversations** section: a narrative
layer that starts with a roster of established regulars (fixed looks, habits,
usual seats and orders) and grows toward legible overheard talk and — later,
opt-in — conversations the reader can choose to have with Nora.

**Design bar check:** the whole arc is governed by one test — *if the reader
ignores it forever, is the café still complete and is nothing lost?* The
answer must stay yes at every phase. The passive layers (a familiar face at
her usual chair, a fragment of overheard talk) are richer captions and richer
scheduling, no new UI. The one interactive step (focusing a table) and the
Nora-conversation step (its own plan) inherit the cat-petting bar: optional,
ignorable, no badge, no count, no timer, nothing that accumulates. See
overview.md principle 1 and characters.md.

**Shape:** groundwork plus three near-term phases that each ship something
lovely on their own, then three later phases sketched here but split into
their own plans when their turn comes. Every phase ends the standard way —
smoke test, `?dev` + `__dev.audit()` → 0 problems, and characters.md /
world.md updated in the same change. No new geometry: regulars reuse existing
seats, routes, drinks, and behaviors, so the audit's footprint/journey checks
are untouched.

**Progress:**

- ✅ **Phase 0 — groundwork** (commit `3b6cd2b`): `js/characters-roster.js`
  ships `window.CAST`, the `regularId`/`spec` patron fields, `__dev.regular(id)`,
  and the roster constant-checks in the audit.
- ✅ **Phase 1 — the roster** (commit `1738049`): `makeRegular(world, spec)`,
  `world.regulars` + `updateRegulars`, the `SEAT_PREFS` table, per-spec stay and
  `nameStyle`. Roster grew to four: Holger, Gerda, Kasper, Freya. (The plan's
  placeholder names Villads/Liv became Kasper/Freya in the build.)
- ✅ **Phase 2 — legible overheard lines**: `regularLine(world, p, context)` in
  `sim-patrons.js`, wired at the window-gaze, page-turn, laptop-bout, and
  table-murmur seams; `overheard`/`musing`/`backstory` pools filled for all four;
  backstory drips as a rarer tier under musing; audit now checks the pools are
  arrays and that a chatty regular has an overheard pool.
- ✅ **Foundations — the soft-narrative keystone** (roadmap → *New foundations*):
  `js/memory.js` (`MEMORY`, versioned `cafe-hygge-save` + migration ladder +
  graceful fresh-café fallback), idle progression in `sim-core.js` (built
  real-day, since moved to café days — `updateNarrative`), the invitation + trigger loop (`SIM.beatAt`, the yarn-ball
  bubble, `captionRun` beat track), and **Gerda's scarf** as the reference arc
  (`CAST.arcs`, knitting behaviour + lap visual + `SND.needle()`, the cat wears
  the scarf for good). Audit grew the narrative invariants; harness grew
  `__dev.arc/age/memory/reset`. Built ahead of Phase 3 because the passive
  continuity phase depends on cross-visit memory.
- ✅ **Phase 3 — habits & continuity**: per-regular `settle` / `usualTaken`
  lines (via `specLine`, generic fallback), weather- and recognition-aware
  openers (`regularArrivalLine`), a persisted bond visit-count in the save
  (`noteRegularVisit` → `bonds[id]`, no version bump — bonds are free-form), and
  boot-seeding Holger into his fireside armchair (`seedRegular`, schedule marked
  done-for-today). **Recurring pairs deferred** (see the Phase 3 note below): the
  current roster has no two regulars sharing a table, so `withId` is left for
  when an overlapping regular or a seat-sharing rework arrives.
- ⏭️ **Phase 4 — focus a table**: the click handler now runs a general hit-test
  (`SIM.beatAt`) before petting the cat — the seam a table-focus would extend.
- Phases 5–6 remain sketches, to be split into their own plans when their turn
  comes; the arc/beat/invitation loop they need now exists.

---

## Current state (what we build on)

- **Holger already proves the "fixed character" pattern.** `makeRegular(world)`
  (`js/sim-core.js:657`) calls `makePatron('Holger')` then overrides colors,
  drink, and traits; `updateRegular(world)` (`js/sim-core.js:670`) schedules one
  visit per café day from `world.regular = { lastDay, day, hour, force }`. The
  patron object already carries `isRegular`, `usualSeat`, `regularSeatNoted`
  (`js/sim-core.js:231`) — most of them barely used. Holger is row one of a
  roster that currently has one row.
- **Conversations already happen — wordlessly.** In `updateSeated`
  (`js/sim-patrons.js:580`) a `chatty` patron with a seated table-mate emits a
  "…" bubble + `SND.murmur(p.murmurPitch)`, the mate replies, and 15% of the
  time a *generic* caption fires: "Soft murmurs drift from the table …"
  (`js/sim-patrons.js:592`). The beat is fully animated and sounded; it just has
  no content.
- **One text surface, ready for overheard fragments.** `caption(world, text)`
  (`js/sim-core.js:270`) queues a line; `drawCaption` (`js/scene-fx.js:157`)
  shows one warm bitmap line at a time, rate-limited (6 s gap, 4.4 s shown,
  queue cap 2). "Listening in" is, mechanically, letting a caption occasionally
  carry a character's words instead of narrating around them.
- **Seat, stay, and seat-moment already special-case the regular.** `freeSeat`
  returns Holger's usual chair by flag, not index (`s.armchair && s.facing === 1`,
  `js/sim-patrons.js:35`), with the "chair is taken" patient-look line; stay is
  `p.isRegular ? rnd(280, 420) : …` (`js/sim-patrons.js:343`). All three are the
  exact seams a roster generalizes.
- **Names are pooled and gender-coherent.** `PATRON_NAMES` (`js/sim-core.js:14`)
  + `nameStyleFor` (`js/sim-core.js:40`, which special-cases `'Holger'`). Regular
  names must live *outside* the pools so a random patron never shares one.
- **Reusable behaviors that need no new code:** reading, window-gazing (weather-
  and hour-aware gaze captions), laptop typing, dozing after dark, and the piano.
  Each new regular is chosen to ride one of these.
- **Dev harness:** `__dev.regular()` (`js/dev.js:142`) sets `world.regular.force`
  to force Holger next tick.

---

## Phase 0 — groundwork: the roster as data ✅ DONE (commit `3b6cd2b`)

The bible will grow (more regulars, line pools, backstories), so it earns its
own file rather than swelling `sim-core.js`.

1. **New data file `js/characters-roster.js`**, exposing `window.CAST =
   { regulars: [ … ] }`. Pure data, zero dependencies. Load order becomes
   `… scene-fx → characters-roster → sim-core → …` (sim-core reads `CAST` at
   world creation). Update index.html's script tags and the AGENTS.md
   architecture table + load-order line in the same change.
2. **Roster entry shape** (one object per regular):

   ```js
   {
     id: 'holger',                 // stable key; used for schedule + line lookup
     name: 'Holger',
     nameStyle: 'masculine',       // drives beard/appearance coherence
     colors: { skin, hair, top, pants, scarf, longHair, hairStyle, beard },
     drink: 'espresso',            // must match a DRINKS name
     traits: { wantsBook: true, ownBook: true, chatty: false,
               laptop: false, pianist: false },
     murmurPitch: 130, speed: 46,
     umbrella: '#3d4a5c',          // fixed umbrella color, or null
     arrival: { from: 9, to: 9 + 2/3 },   // in-world hour window
     stay: [280, 420],             // seconds
     seat: 'firesideLeft',         // preference key → predicate (Phase 1)
     lines: { arrival: [], overheard: [], musing: [], backstory: [] }
   }
   ```

3. **Patron field:** add `regularId: null` in `makePatron`
   (`js/sim-core.js:191`) beside `isRegular`; regulars set it so schedule,
   line lookup, and continuity can find their spec. Also stash `p.spec` on the
   patron for direct pool access.
4. **Dev harness:** `__dev.regular(id)` forces a named regular's next arrival
   (defaults to `'holger'` for back-compat). Document it in AGENTS.md's harness
   list.
5. **Audit additions (`js/dev.js` audit):** a cheap constant-check pass over
   `CAST.regulars` — every `drink` resolves in `DRINKS`, every `seat` key has a
   predicate, no `name` collides with `PATRON_NAMES`, ids are unique. No new
   geometry checks (regulars reuse existing seats/routes).

---

## Phase 1 — the roster ✅ DONE (commit `1738049`)

Generalize Holger's one-off into a table, then add three regulars spread across
the day, each riding a behavior that already exists so this phase is mostly data.

### The refactor (`js/sim-core.js`, `js/sim-patrons.js`)

- **`makeRegular(world, spec)`** replaces the hardcoded Holger builder: start
  from `makePatron(spec.name)`, then apply `spec.nameStyle`, `spec.colors`,
  `DRINKS.find(d => d.name === spec.drink)`, `spec.traits`, `murmurPitch`,
  `speed`, `regularId`, and — in rain — `spec.umbrella`. Holger's current values
  become his roster row; behavior is byte-for-byte the same for him.
- **Schedule:** replace the single `world.regular` with `world.regulars`, a map
  `{ [id]: { lastDay: -1, day: 0, hour, force: false } }` built from `CAST` in
  `SIM.create`. `updateRegular` → `updateRegulars`, iterating `CAST.regulars`:
  roll a fresh `hour` in the spec's window each new `dayIndex`; skip if that
  regular is already present (`p.regularId === spec.id`); otherwise the same
  due/`spawnCap`/enqueue path Holger uses today. `__dev.regular(id)` sets
  `world.regulars[id].force`.
- **Seat preference:** turn the inline `s.armchair && s.facing === 1` at
  `js/sim-patrons.js:36` into a small `SEAT_PREFS` table of predicates keyed by
  `spec.seat` (`firesideLeft`, `firesideRight`, `windowPerch`, `nook`,
  `diningTable`). `freeSeat` uses `spec.seat` for regulars; the "usual chair is
  taken" patient-look line and `usualSeat`/`regularSeatNoted` flags generalize
  unchanged (Phase 3 leans on them).
- **Stay:** `js/sim-patrons.js:343` reads `spec.stay` for regulars instead of the
  literal `rnd(280, 420)`.
- **Name coherence:** drop the `'Holger'` special case in `nameStyleFor` — each
  spec now carries its own `nameStyle`.

### The starting roster

All four appearances use existing palette swatches (art.md / the `SKINS`,
`HAIRS`, `TOPS`, `PANTS` arrays); all drinks exist; all names are outside
`PATRON_NAMES`.

| Regular | When | Drink | Seat | Rides | Character |
| --- | --- | --- | --- | --- | --- |
| **Holger** *(exists)* | ~09:00 | espresso, own book | left fireside | reading | stoic; weather & ferries; never chats |
| **Gerda** | ~10:00 | chamomile | window perch | window-gaze, chatty | warm, older; watches the street; misses someone |
| **Villads** | ~13:30 | cinnamon latte | dining table | laptop typing | young writer; mutters at the screen; stuck on one chapter |
| **Liv** | ~18:30 | hot chocolate | fireside/nook | reading, dozing | evening reader; drifts off by the fire |

Deliberate contrasts: morning vs. dusk (Holger and Liv rarely overlap; only Liv
sits late enough to doze), silent vs. chatty (Holger's story arrives as solo
musings, Gerda's as overheard talk), and one of each existing behavior so no new
behavior code is required. Fixed colors, arrival windows, and stays go in the
roster; exact hex chosen against `?dev&overlay` for legibility.

**Boot note:** on a fresh 08:24 boot the clock reaches each window within ~0.5–10
real minutes (1 in-world hour = 60 s), so `__dev.ff()` walks a full day of
arrivals quickly. Boot-seeding a regular into a starting seat is deferred to
Phase 3 (it needs its schedule marked done-for-today to avoid a double arrival).

### Docs

characters.md gains a "The regulars" section (the table + per-regular habits,
Holger's existing section folded in); world.md notes the per-regular schedule.

---

## Phase 2 — legible overheard lines (passive "listen in") ✅ DONE

The always-on layer. Where a caption already fires around a regular, sometimes
let it carry the regular's own words — kept in the established narrator voice
(narrated fragments, not subtitle quotes; quoted dialogue arrives with the
opt-in focus step, Phase 4).

- **One helper** in `js/sim-patrons.js`: `regularLine(world, p, context)` —
  gated, pulls from `p.spec.lines[context]`, routes through `caption`. Returns
  whether it fired so callers can fall back to the generic line.
- **Wire it at the existing caption seams**, guarded by `p.regularId`:
  - *chat* (`js/sim-patrons.js:592`) → `context: 'overheard'` (Gerda, and any
    chatty regular with a mate). A touch more likely than the generic 0.15,
    still sparse. Non-regulars and mate-less regulars keep the wordless murmur.
  - *window gaze* → `context: 'musing'` (Gerda watching the street).
  - *reading page-turn / sip* → `context: 'musing'` (Holger, Liv, Villads at the
    keyboard).
- **Backstory drips start here, as a rarity tier**, not a later phase: each
  spec's `lines.backstory` pool is surfaced at a much lower gate than `musing`,
  so a fragment of someone's history slips out only across many visits ("Gerda
  says mornings like this were Erik's favourite."). Phase 6 deepens *continuity*,
  but the drip mechanism ships now.
- **Voice rules (write into characters.md):** lowercase-cozy, warm, Danish
  flavor; every line stands alone — none may depend on having read a previous
  one (the glanceability principle); nothing plot-heavy or urgent. Holger, being
  `chatty: false`, has no `overheard` pool by design — his narrative is solo.

### Docs

characters.md (voice rules + the `lines` schema), world.md (the new caption
family). No sound changes (murmur stays the audible layer).

### As built

- `regularLine(world, p, context)` lives above `updateSeated` in
  `sim-patrons.js`, with module-level `LINE_GATE = { overheard: 0.22, musing:
  0.18 }` and `BACKSTORY_GATE = 0.035`. It short-circuits to `false` for
  non-regulars (no `spec`), so each seam calls it unconditionally as
  `!regularLine(...) && Math.random() < <generic gate>` — the bespoke line
  suppresses the generic one rather than doubling it.
- Four seams wired: window-gaze and reading page-turn and laptop bout →
  `musing`; the table murmur → `overheard`. The "sip" seam named in the sketch
  was folded into the reading beat — no separate sip caption exists.
- Backstory surfaces **only** under the `musing` context (not `overheard`), so a
  history fragment always arrives as a solo beat, never as table chatter.
- Only Gerda carries an `overheard` pool (she's the sole `chatty` regular);
  Holger, Kasper, and Freya are `chatty: false` and have empty `overheard`. The
  audit now flags a chatty regular that lacks overheard lines, and checks every
  pool is an array (the seams read them with `pick()`).

---

## Phase 3 — habits & continuity (still passive) ✅ DONE

Make regulars feel *known*.

- **Activate the dormant flags:** `usualSeat` / `regularSeatNoted` already gate
  Holger's chair moment; generalize the once-per-visit "settles into the usual
  seat" line per regular, and let a taken usual seat produce one patient-look
  line (from the spec) before the normal fallback.
- **Day-aware openers:** arrival lines that know the weather and whether it's a
  return ("Gerda shakes off the rain, same as yesterday"). A tiny per-regular
  `visits` counter on the schedule state feeds "back again" flavor.
- **Recurring pairs:** an optional `withId` hint so two regulars whose windows
  overlap tend to share a table and murmur — reusing the couple-free chat path,
  not the couple *spawn* path.
- **Boot-seeding a regular** (deferred from Phase 1): seed one familiar face at
  boot with its schedule marked done-for-today, so the café opens with someone
  you recognise.

### Docs

characters.md (continuity notes), world.md (openers).

### As built

- **Per-regular seat lines.** `specLine(spec, key, fallback)` in `sim-core.js`
  (exposed on `SIM._`) returns a line from the named pool or a generic default.
  `freeSeat`'s patient-look now reads `usualTaken`; the `toSeat` settle line
  reads `settle`. Each roster row grew both pools; a row without them keeps the
  old templated wording. The `usualSeat` / `regularSeatNoted` flags already
  existed from Phase 1 — Phase 3 only made their captions per-character.
- **Continuity is Nora's memory, persisted.** Rather than the plan's sketch of a
  session-only counter on the schedule slot, the visit-count lives in the
  `MEMORY` save (`noteRegularVisit` → `bonds[id] = { known, warmth, visits,
  lastDay }`), so a returning reader's café already knows its regulars — matching
  [narrative.md](../narrative.md) §5 (bonds are Nora's memory) and the roadmap's
  note that Phase 3 is "unblocked by MEMORY". Bonds are free-form and created
  lazily, so this needed **no `MEMORY.VERSION` bump** (an old save simply grows
  the field). `regularArrivalLine` picks the opener: `arrivalRain` when wet, else
  a 60%-gated `arrivalReturn` for a known face, else `arrival`. `warmth` is left
  unused for the conversation phase.
- **Boot-seed.** `seedRegular(world, spec)` mirrors `seedPatron` but builds via
  `makeRegular`, clears any rain umbrella, finds a free preferred seat via the
  spec's `SEAT_PREFS` predicate, and marks `world.regulars[id].lastDay =
  dayIndex` so the day's real arrival is suppressed. Called for Holger after the
  `reconcileNarrative` bind; one generic boot seed (old seat 4) was dropped so
  the boot population stays four. No arrival caption and no bond bump — a seeded
  face is ambience, and recognition should accrue on arrivals the reader sees.
- **Recurring pairs — deferred, on purpose.** The four current regulars each
  have a distinct usual seat (fireside-left, window perch, dining, fireside-
  right), so none would ever share a table for the couple-free chat path to fire
  on. Implementing `withId` now would mean either adding a fifth regular whose
  window overlaps another's *and* shares its seat, or reworking seat assignment
  so a regular prefers a table-mate's table over their own usual spot — both
  bigger than this phase and at odds with the just-shipped "usual seat" flavor.
  Left as a clean follow-up for when such a regular exists. The existing
  `updateSeated` chat path already murmurs between any two seated table-mates, so
  the runtime is ready; only the seating bias is missing.
- **Audit.** The roster constant-check now also flags any optional Phase 3 pool
  (`arrivalRain`, `arrivalReturn`, `settle`, `usualTaken`) that is present but
  not an array. No new geometry (regulars still reuse existing seats/routes).

---

## Later phases — own plans when their turn comes

Sketched here so the arc is legible; each gets its own `docs/plans/` doc, built
only after the passive layers above feel right.

- **Phase 4 — focus a table (gentle opt-in).** The first *new* interaction,
  built on the single click handler that today only pets the cat
  (`js/main.js:145`). Clicking a chatting table softly focuses it: the next few
  captions become that table's actual back-and-forth (here quoted dialogue is
  right — it's a deliberate lean-in), then it fades back to ambience. Nothing is
  missed by never clicking. Needs: a hit-test on seated groups, a short focused-
  caption queue, and a soft focus cue that isn't a marker.
- **Phase 5 — conversations with Nora (opt-in, chapter-break friendly).** When
  Nora has something to say, a *soft, ignorable* indication appears — no badge,
  no count, no timer. If the reader looks up (say, at the end of a chapter) they
  may pick a short exchange or just keep reading; the invitation drifts away
  unanswered at no cost, and nothing is lost by never engaging. **Open design
  question, to resolve in that plan:** how the indication reads as inviting-not-
  nagging, and how a short branch is authored and presented without a text-input
  burden. This is the riskiest step against the design bar and deserves its own
  document.
- **Phase 6 — backstory depth & continuity.** With drips already flowing
  (Phase 2), this is about *arc*: fragments that build across a café day/week,
  callbacks between regulars, and slow reveals that reward long reading sessions
  — still never required, still glanceable.

---

## Verification (every phase)

1. Smoke test: load, step inside, watch one order cycle, console clean; then
   `__dev.hour(20)` for the evening look (Liv's doze window, lamp glow).
2. Forced runs: `__dev.regular('holger')`, `__dev.regular('gerda')`,
   `__dev.regular('villads')`, `__dev.regular('liv')`, each with `__dev.ff()` to
   watch a full visit — arrival line, walk to the usual seat, the ridden
   behavior, and (Phase 2+) an overheard/musing line appearing.
3. `?dev&overlay` screenshot to confirm each regular's fixed appearance reads at
   size and takes the intended seat.
4. `__dev.audit()` → 0 problems, including the new roster constant-checks.
5. Soak: `__dev.ff(1800)` across a full day with rain toggled — every regular
   arrives once, takes and releases its seat, and no schedule double-fires (never
   two Holgers), no stranded state.
