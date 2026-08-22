# Narrative — the design contract for the story layer

Café Hygge is becoming a **soft narrative game that is also a companion app**
([overview.md](overview.md)). This doc is the north star for that layer: the one
principle that makes it work, the standard shape every story arc takes, the
persistence and idle model underneath it, and the invariants that keep the whole
thing hygge. Read it before adding any arc, beat, memory, or conversation.

> **Status.** A design contract, written ahead of the build — now partly built.
> The **foundations are live**: `MEMORY` (`js/memory.js`), café-day
> progression (`updateNarrative` in `js/sim-core.js`), the invitation +
> trigger loop (`SIM.beatAt` + owner and scene-anchored bubbles), **Gerda's
> scarf — the reference arc (§8)**, and **the street painter — the first
> café-owned anchored arc**, plus **Lunafreya's gallery — the first multi-stage
> owned arc (§9)**. The painter's facade advances across seven café
> days, its brush invitation waits in the window, and the finished warm house
> persists after the chosen beat. `CAST.arcs` carries arc
> definitions; the audit guards the save shape and the arc invariants (§7.3).
> The passive roster layers (regulars, overheard lines) also exist; the
> conversation phases (roadmap §4–5) are still ahead. Where this
> doc still names a shape that does not exist yet, it is *proposed* — match it
> when you build, or update this doc if you diverge.

---

## 1. The one principle: the invitation waits

Idle progression and "never miss out" look like opposites. A companion user who
glances over twice a day must never feel they missed a story; an invested user
who checks in daily must feel their attention is rewarded. The single idea that
reconciles them:

> **Arcs advance on their own; their payoffs never fire on their own.**
> Progress accrues quietly in the background — across café days, while the
> café runs, whether or not anyone is watching it. But when an arc reaches a
> *beat* (a moment meant to be seen), it does not play automatically and it
> does not expire. It raises a soft, ignorable **invitation** and then waits —
> indefinitely — until the player chooses to take it.

So Gerda knits a little more with each café day that passes, nobody needing to
watch (idle progression), but the scarf-goes-on-the-cat *moment* sits as a gentle bubble
over her, patient, until the reader taps it (never missed). The background is
autonomous; the foreground is consented-to. Every narrative feature in this
project is an application of that one rule.

**What this forbids, permanently:**

- Beats that fire while unattended and are then gone. If it matters, it waits.
- Invitations that expire, decay, or are penalized for being ignored.
- Any badge, count, timer, or streak that turns waiting into pressure.
- A story state you can *lose* by being absent. Absence pauses the café —
  background and foreground alike; nothing ever slides back or expires.

**What this permits, newly:**

- State that accumulates across sessions (a scarf's length, who Nora knows).
- Beats that build on earlier beats — *provided* every beat was reached through
  an invitation the player accepted, so there is no such thing as "you needed to
  have seen the last one." You only ever advance by choosing to.

## 2. The shape of every arc

Every story — a knitting project, a friendship, a backstory reveal — is the same
small loop. Build new content by filling this shape in data, not by inventing new
control flow:

```
arc  →  progresses (idle, real-time)  →  reaches a ready beat
     →  raises an invitation (soft bubble, waits forever)
     →  player taps it  →  the beat plays (a scene / caption run / short exchange)
     →  arc advances to its next stage  →  … or completes and rests
```

- **Arc** — a named, persisted bit of story with a `stage` and whatever progress
  it needs (`{ id, stage, progress, pendingBeat }`). Owned by a character or the
  café. Lives in the save (§4).
- **Progress** — advanced by the narrative tick (§3): a steady drip measured in
  café days while the café runs, never by ad-hoc frame logic. Progress with no
  one watching it is still the point — the café quietly lives — and a closed
  café simply holds still, so there is never anything to catch up on.
- **Ready beat** — when progress crosses a threshold, the arc sets
  `pendingBeat` and stops advancing until the beat is consumed. It never plays
  itself.
- **Invitation** — a `pendingBeat` renders as a soft cue on its owner (a bubble
  with a tiny glyph: a ball of yarn, a "…", a heart). It is drawn like existing
  speech bubbles, obeys the same night-legibility rules, and is the *only* new
  always-on UI the narrative layer adds. It never pulses urgently, never stacks
  a counter, never appears off-screen-pointered.
- **Trigger** — the existing canvas click handler ([main.js](../js/main.js),
  today only `SIM.petCat`) grows a general "did the click land on an
  invitation?" check. A tap consumes `pendingBeat` and plays the beat.
- **Beat** — plays through the surfaces that already exist: a run of captions,
  a bit of character animation, a sound, and — for conversations — a short
  exchange (§6). When it ends, the arc sets its next `stage` and the cycle
  resumes, or the arc marks itself `done` and simply becomes part of the café's
  history.

One narrator, one click handler, one bubble system, one caption pipeline — the
whole loop reuses primitives the café already has. That is deliberate: the story
layer is mostly **data and state**, almost no new runtime muscle (§7).

## 3. Time and progression

The café has two clocks; arcs ride the second.

| Clock | Unit | Drives |
| --- | --- | --- |
| `world.t` | real seconds since boot | the frame sim (movement, sipping, brew) |
| `world.hour` / `dayIndex` | 24-min in-world day | light, weather, spawn rate, daily regular arrivals — **and arc progression** |

**Arcs ride the café's own day.** An arc's `progress` is measured in **café
days** — 24 real minutes of the café running — and accrues continuously in
`updateNarrative` (`js/sim-core.js`), a dt-driven part of `SIM.update`. A
hidden tab still progresses (the 250 ms hidden-tab interval keeps the sim
ticking), so leaving the café open beside a book — its whole design posture —
is exactly what advances the stories. Gerda's five-row scarf is about two
hours of open café.

**A closed café holds still.** Nothing accrues while the app is closed, and
nothing is missed: absence pauses the background entirely (§1 permits holding —
what it forbids is sliding back or expiring). A reader returns to the café
exactly as they left it, plus any invitation that came ready still waiting.
Boot (`reconcileNarrative`) adds no elapsed time; it only rebinds the save,
clamps drift against the current definitions, and re-applies lasting marks.

**Progress is what you see.** The visible state (the scarf's length, a
canvas's stage) reads the same saved `progress` the invitation logic does, so
what you see, hear, and can tap always agree. Saves are quantized to the café
hour (~once a real minute) plus every readied beat, so localStorage stays
quiet; at worst a hard close drops a sliver of a row, never a beat.

`Date` / `Date.now()` are available in the app (the ban on them is a *Workflow
scripting* constraint, not an app one). Real time still stamps `lastSeen` and
dates bond continuity (`bonds[id].lastDay`); arc pacing does not read the
calendar.

## 4. Persistence — the `MEMORY` global

Today only audio settings persist (`cafe-hygge-audio`, via `SND.save()`). The
narrative layer needs the café to *remember*, so it gets one new global that
mirrors that proven pattern exactly.

**Proposed:** `js/memory.js` → `window.MEMORY`, loaded early (before `sim-core`
so world creation can read it), inert-friendly like the rest:

```
MEMORY.state          // the parsed save object (or a fresh default)
MEMORY.load()         // read cafe-hygge-save from localStorage, migrate, default
MEMORY.save()         // debounced write back (JSON.stringify), same try/catch guard as SND
MEMORY.reset()        // wipe to a fresh café (also a __dev call)
```

Save shape (a small JSON blob — text state is kilobytes, never a size concern):

```json
{
  "version": 1,
  "lastSeen": 1730000000000,
  "arcs": { "gerda-scarf": { "stage": 2, "progress": 14, "pendingBeat": null } },
  "bonds": { "gerda": { "known": true, "warmth": 3 } },
  "flags": { "cat-wore-scarf": true }
}
```

Non-negotiables for the save:

- **Versioned, with forward migration.** `version` gates a migration ladder in
  `MEMORY.load()`: an old save is upgraded field-by-field to the current shape,
  never dropped. A returning player must never be bricked or silently reset by a
  code update. This is the single most important discipline in the whole layer —
  growing state is safe only if old state keeps loading.
- **Reconcile on boot, don't trust blindly.** The save can drift from a fresh
  world (an arc naming a regular you renamed, a stage past the last one defined).
  `MEMORY.load()` clamps and drops unknown ids rather than throwing, the same way
  the audit tolerates a live world. A corrupt/absent save falls back to a fresh
  café — the app must always open.
- **localStorage's limits are acknowledged, not fought.** It is per-browser,
  per-origin, cleared when the user clears site data, and — on Safari/iOS —
  purged after ~7 days without a visit. That is fine for a companion app; a lost
  save means a fresh café, never an error. The durability plan (request
  `navigator.storage.persist()`, graceful fresh-café fallback on any bad/missing
  save, an install hint, and an export/import "copy your café") lives in
  [roadmap.md](roadmap.md) → *Save durability*. **Cross-device cloud sync is not
  pursued** — the owner does not want it and it is the one thing that would break
  the offline / `file://` / zero-services promise; the local durability above is
  the deliberate ceiling.

## 5. You are Nora

The reader inhabits **Nora's** point of view — not a floating cursor, but the
person behind the counter. This is a design lens, not a mechanic, and it settles
a lot of small questions:

- **Memory is Nora's memory.** The café "knows" a regular because *Nora* has
  come to know them. `bonds` is what Nora remembers about a person, and it only
  deepens by her (the reader) being present and choosing the small exchanges.
- **Conversations are with Nora.** When a beat is a talk, the other side is a
  patron and Nora's side is the reader's — chosen, never scripted at them.
- **Getting to know the café is the arc.** The long game is not a plot to
  finish; it is a room full of people who become familiar. Beats should feel
  like *recognition* accruing — Gerda greeting Nora by name, Holger leaving his
  book a day early "for the counter" — more than like chapters completing.

## 6. Conversations, and the shape of "branching"

Conversations are beats (§2) whose content is a short exchange. Branching is
welcome — with one hard reframe that keeps it hygge:

> **Choices add; they never gate.** A branch is a way to *color* a moment (which
> warm thing Nora says), not a fork where one path locks away content on the
> others. There is no wrong answer, no missed line you can only get by having
> chosen differently, no path that ends the friendship. Every branch lands
> somewhere kind.

This preserves "reading straight through misses nothing": a companion user never
opens a conversation and loses nothing; an invested user makes choices that
flavor the café's memory of them (`bonds.warmth`, a remembered preference)
without ever being graded. Keep exchanges short (a few beats), lowercase-cozy,
and — as today — the only quoted dialogue in the app; ambient captions stay
narrated ([characters.md](characters.md) voice rules still hold).

## 7. Can the plain-JS / no-build stack carry this? Yes.

The zero-dependency, script-tag, `file://`-openable model is **not** a limiter
for this kind of growth, because everything above is *data and state*, not new
runtime capability:

- **Persistence** is `localStorage` + `JSON` — already proven by `SND.save()`.
- **Idle progression** is one dt-driven accumulator in the sim tick — a few lines.
- **Invitations** reuse the bubble renderer and the one click handler.
- **Beats / conversations** are the existing caption pipeline plus data.
- **Arcs, bonds, dialogue** are pure-data tables, exactly like
  [characters-roster.js](../js/characters-roster.js) is today.

Where the model *does* ask for discipline as the layer grows — plan for these
from the start rather than hitting them later:

1. **Save-schema migration is mandatory, not optional** (§4). Untyped JS plus a
   growing save is only safe if every version bump ships a migration and the
   audit checks the loaded shape.
2. **Content stays data, and stays script-loadable.** Author arcs and dialogue
   as `window.*` data files (`<script>` tags), never as JSON fetched at runtime
   — `fetch` fails under `file://`, and preserving double-click-to-run is a core
   promise ([architecture.md](architecture.md)). Data-as-script keeps content
   separable from logic *and* keeps the no-server promise.
3. **`__dev.audit()` grows into the story's safety net.** It already guards
   geometry and live-world consistency; it must grow narrative invariants — no
   arc references a missing regular, no `stage` exceeds its arc's definition, the
   loaded save matches `version`, no beat can fire without an invitation. As the
   state machine multiplies, this harness is what keeps an untyped, test-runner-
   less codebase honest. Lean on it hard.
4. **One caution, named honestly.** The stack scales to a lot of *content*
   (hundreds of lines, dozens of arcs) with no trouble. The thing it will *not*
   give you for free is authoring ergonomics — no types, no test build, no hot
   content pipeline. The mitigations above (data files, a fat audit, versioned
   saves) are the trade for keeping the no-build promise, and for a hobby-scale
   café they are a good trade. If the project ever outgrows them, the exit is a
   real build step — but nothing here forces that day, and this layer does not
   bring it closer.

Bottom line: plain JS/HTML with no build can carry idle progression, persistent
memory, opt-in beats, and branching-that-colors all the way. The load-bearing
work is *design discipline* (the invitation rule, versioned saves, content-as-
data, a growing audit), not new technology.

## 8. Worked example — Gerda's scarf

The reference implementation of the whole loop, end to end:

1. **Arc** `gerda-scarf` starts at `{ stage: 0, progress: 0 }` in the save.
2. **Progress:** `updateNarrative` drips café days into `progress` while the
   café runs — about two hours of open café for the five rows, exactly the
   roadmap's original "slowly growing scarf". Her knitting animation and
   needle-click sound read the same `progress` so the scarf you *see* is the
   scarf that's saved.
3. **Ready beat:** at `progress ≥ N`, the arc sets `pendingBeat: 'finished'` and
   stops growing.
4. **Invitation:** a soft yarn-ball bubble sits over Gerda whenever she is
   present and the beat is pending. It waits across sessions — never expires.
5. **Trigger:** the reader taps it. The beat plays: Gerda holds the scarf up,
   crosses to the cat, and loops it on; a caption run and a heart bubble carry
   the moment; the cat wears it around the café afterward.
6. **After:** the arc sets `flags['cat-wore-scarf'] = true` and `stage: 1` (maybe
   she starts mittens next winter). The scarf-on-cat becomes a permanent, quiet
   part of the room — remembered, never re-prompted.

A companion user who never taps the bubble loses nothing; the café is still
lovely. An invested user gets a small, earned, unmissable moment, exactly when
they chose to be there for it. That is the entire design, in one scarf.

## 9. Multi-stage example — Lunafreya's gallery

`lunafreya-paintings` proves that the same loop can repeat without becoming a
quest log. It carries `stages: 2`, `rows: [10, 12]`, and per-stage `beat` and
`flag` arrays. `arcBeat(def, stage)` and `arcFlag(def, stage)` select the active
caption run and lasting mark; the save shape stays the ordinary
`{stage, progress, pendingBeat}`.

During stage 0 the easel deterministically paints the cat on the sill from
saved progress. Its ready palette bubble waits for Lunafreya; the chosen beat
sets `lunafreya-cat-painting`, advances to stage 1, clears progress, and the
finished canvas appears above the fireplace. Stage 1 repeats with the hearth;
its chosen beat sets `lunafreya-hearth-painting`, advances to the done stage,
and hangs the study above the door. On reload, the two flags restore the wall
gallery and the completed stage leaves a quiet primed easel where Lunafreya
sketches. Neither unveiling can occur without the reader, neither invitation
expires, and completed art only adds to the room.
