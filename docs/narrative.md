# Narrative — the design contract for the story layer

> **Shared life (6 September 2026):** chosen plants, table assembly and hearth cleaning finish their practical
> work autonomously in either mode. This is not a personal story payoff.
> Story invitations remain saved until chosen in game mode; idle hides their
> controls without consuming them. Both modes share the same progress and home.
>
> **Owner-directed tutorial exception (7 September 2026):** the new café’s first
> Holger introduction is mandatory in both modes. He waits at the counter;
> service, arrivals and café time wait until it is complete. Its invitation
> blinks softly until opened, never expires, and restores on reload. Later
> story arcs retain their ordinary optional invitation contract.


The automatic closing/opening ritual is distinct from closing the app.
Stories accrue only the actual `dt` spent running, including Lunafreya's chores and home evenings;
the wall-clock skip from night to morning adds no progress. Ready invitations
remain in the save when their owners go home, and return with them on their
next visit. Neither the fade nor a new shop day plays or expires a payoff.

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
> café-owned anchored arc**, plus **Nora's gallery — the first multi-stage
> owned arc (§9)**. The painter's facade advances across seven café
> days, its brush invitation waits in the window, and the finished warm house
> persists after the chosen beat. `CAST.arcs` carries arc
> definitions; the audit guards the save shape and the arc invariants (§7.3).
> The passive roster layers and attended Holger introduction also exist.
> The owner largely accepted the [community story direction](plans/community-and-character-stories.md)
> on 7 September 2026; its larger cast, consequential choices and shared scenes
> remain future implementation. Where this
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

- State that accumulates across sessions (a scarf's length, who Lunafreya knows).
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
hidden tab still progresses at full real-time pace (main.js's `advance` ticks
the real elapsed time in chunks, so browser timer throttling can't slow the
café), so leaving the café open beside a book — its whole design posture —
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

Audio settings persist separately as `cafe-hygge-audio` via `SND.save()`.

The owner's explicit **Settings → start over** action is the exception to
preserving progress. A second confirmation explains that stories, relationships,
savings and improvements in this browser will be erased permanently. Cancel
keeps the café; confirming resets it and returns to the entry screen. Sound
preferences remain. If storage deletion fails, the current café is retained.
The implemented narrative memory persists as `cafe-hygge-save` via `MEMORY`.
The save codec validates plain records, supported integer versions and finite
arc fields before binding them to a world. Findings 1–2 of the
[pre-development audit](predevelopment-audit.md) are now addressed.

**Implemented:** `js/memory.js` → `window.MEMORY`, loaded early (before `sim-core`
so world creation can read it), inert-friendly like the rest:

```
MEMORY.state          // the parsed save object (or a fresh default)
MEMORY.load()         // read cafe-hygge-save from localStorage, migrate, default
MEMORY.save()         // validated, debounced write; saveNow flushes on exit
MEMORY.reset()        // wipe to a fresh café (also a __dev call)
```

Save shape (a small JSON blob — text state is kilobytes, never a size concern):

```json
{
  "version": 3,
  "lastSeen": 1730000000000,
  "arcs": { "gerda-scarf": { "stage": 2, "progress": 14, "pendingBeat": null } },
  "bonds": { "gerda": { "known": true, "warmth": 3 } },
  "flags": { "cat-wore-scarf": true },
  "life": { "mode": "idle", "savings": 30, "hour": 8.4, "homeTime": 0,
    "plant": { "stage": "available", "time": 0 },
    "projects": { "table": { "stage": "available", "step": 0, "time": 0 },
      "fireplace": { "stage": "available", "step": 0, "time": 0 } },
    "plannedTonight": false, "checkpoint": null }
}
```

Non-negotiables for the save:

- **Versioned, with forward migration.** `version` gates a migration ladder in
  `MEMORY.load()`: an old save is upgraded field-by-field to the current shape,
  through every explicitly supplied step. Unsupported or malformed saves open
  a fresh café. Existing development saves may reset per owner direction; no
  recovery-copy system is required yet. Future schema changes must supply
  migrations and tests for the versions they support.
- **Reconcile on boot, don't trust blindly.** The save can drift from a fresh
  world (an arc naming a regular you renamed, a stage past the last one defined).
  The pure codec validates records; `reconcileNarrative(world)` clamps stages
  and progress against definitions, skipping unknown definitions. It adds no
  elapsed progress. Storage errors, including rejected persistence promises,
  are nonfatal and visible through `MEMORY.status`. A corrupt/absent save falls
  back to a fresh café — the app must always open.
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

## 5. You are Lunafreya

The reader inhabits **Lunafreya's** point of view — not a floating cursor, but the
person behind the counter. This is a design lens, not a mechanic, and it settles
a lot of small questions:

- **Memory is Lunafreya's memory.** The café "knows" a regular because *Lunafreya* has
  come to know them. `bonds` is what Lunafreya remembers about a person, and it only
  deepens by her (the reader) being present and choosing the small exchanges.
- **Conversations are with Lunafreya.** She has authored dialogue and a consistent
  history. The reader chooses meaningful preferences, boundaries and decisions;
  most of her ordinary replies need no choice menu.
- **Getting to know the café is the arc.** The long game is not a plot to
  finish; it is a room full of people who become familiar. Beats should feel
  like *recognition* accruing — Gerda greeting Lunafreya by name, Holger leaving his
  book a day early "for the counter" — more than like chapters completing.

## 6. Conversations, and the shape of "branching"

Conversations are attended beats. The community plan's accepted direction
extends the earlier dialogue-color-only rule:

> **Choices can change the future; they are never graded and absence never
> chooses for the player.** A preference may determine a gift, a shared activity
> or later words. A clear mutual decision may establish a relationship or home
> arrangement. One save need not contain every mutually exclusive variant.

Core friendships and ordinary equipment remain available without a correct
answer. Essential understanding of Lunafreya must have alternate openings when
an optional purchase or relationship is not pursued. Privacy and "not yet"
answers deserve natural continuations; an explicit friendship boundary stops
repeated romantic prompting. Major commitments must be named, never inferred
from one friendly or flirtatious answer.

Fixed biography, the player's interpretation and what a particular character
knows are different facts. Read the saved answer before writing a callback;
do not reveal a private conversation through an uninformed character. Persist
selected replies and apply lasting effects once, including across reload.

An attended gift handover or first sharing waits indefinitely. After acceptance,
already authorized carrying, shelving or placement is ordinary practical work
that may finish autonomously. Purchased alternatives keep the café functional
when a personal invitation is ignored. A worker finishes and leaves independently
of a pending conversation, which can follow them into a later off-duty visit.

Keep ordinary exchanges short, with rare longer invited scenes. Lunafreya has
authored lines and choices only where they matter. Ambient captions stay narrated
and sparse. These are design rules for new content; the wider gift, relationship
and knowledge systems are not claimed to be implemented by this document update.

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

## 9. Multi-stage example — Nora's gallery

`lunafreya-paintings` proves that the same loop can repeat without becoming a
quest log. It carries `stages: 2`, `rows: [10, 12]`, and per-stage `beat` and
`flag` arrays. `arcBeat(def, stage)` and `arcFlag(def, stage)` select the active
caption run and lasting mark; the save shape stays the ordinary
`{stage, progress, pendingBeat}`.

During stage 0 the easel deterministically paints the cat on the sill from
saved progress. Its ready palette bubble waits for Nora; the chosen beat
sets `lunafreya-cat-painting`, advances to stage 1, clears progress, and the
finished canvas appears above the fireplace. Stage 1 repeats with the hearth;
its chosen beat sets `lunafreya-hearth-painting`, advances to the done stage,
and hangs the study above the door. On reload, the two flags restore the wall
gallery and the completed stage leaves a quiet primed easel where Nora
sketches. Neither unveiling can occur without the reader, neither invitation
expires, and completed art only adds to the room.

Version 4 also preserves furnished v3 rooms while adding a resumable first
opening to fresh saves. Furniture ownership and free setup progress live in
`life`; migration keeps story arcs, bonds, flags and existing projects intact.
Setup completion opens the café; narrative payoffs still wait for player input.

Version 6 adds `life.intro`: completed-line cursor, finale stage/time, skipped
and complete flags, and the sign's stored/carried/outside location. Version-5
cafés that have opened migrate past the intro without changing their histories.
Partially assembled saves join the remaining setup; earlier work never replays.
Reload restarts the current unfinished sentence and restores physical work.

The first-morning conversation auto-advances while attended, with full-line
reveal/next, pause and skip controls. Its clock holds when hidden so an unseen
line cannot disappear. This is an explicit one-time exception to the ordinary
background progression rule; established café arcs keep their invitation-waits
contract. Naming the café is left for a future conversation arc.

## Attended character moments — 7 September 2026

The [character and story bible](story-bible.md) records established cast facts,
shipped beats, saved choices and future directions. Holger is the first real
arrival in a fresh café. A quiet invitation offers his introduction while he
is ordering or seated, in either presentation; ignoring it leaves normal life
running. His introduction has two remembered choices and no purchase effects.

`SIM.beginMoment` holds simulation obligations and absolute timers while
advancing ambient character animation and particles. The camera eases closer;
ordinary controls and speech icons recede. Each line waits for input, including
while hidden or in Settings. `SIM.leaveMoment` releases the hold immediately.
Holger's cursor uses the existing boolean `flags` map; every acknowledged line
and chosen answer saves, with completion and bond warmth awarded once. This
adds story data, not a schema field, so the v6 codec requires no migration.
Reload restores a waiting invitation and the last unacknowledged line/reply.

Existing Gerda/Nora/street-house payoffs now use this same attended moment
container. Their pending arc remains pending until the final line is accepted;
leaving or reloading restarts that short moment without awarding it. Their
lasting effects and existing save IDs remain unchanged. This supersedes the
older caption-run-only interaction described above.

## Character bubbles and voices — 7 September 2026

Conversations are invited through an icon bubble above the other character.
Holger's introduction uses a dots bubble in both presentations; existing arc
icons keep their game-mode visibility. A transparent, keyboard-accessible hit
button follows Holger's rendered bubble; there is no separate invitation bar.

On invitation, the moment first holds guest obligations. If the characters are
already within speaking distance (including ordering at the counter), dialogue
begins there. Otherwise Lunafreya takes a real obstacle-planned route to a table
service position or a clear nearby standing point. Dialogue waits for arrival.
When finished or put aside she walks back to the interrupted task's position,
then resumes its original state and path. Cancelling during approach also returns
her safely. The moment's approach/talk/return phases are transient: reload leaves
the durable invitation and acknowledged choices ready for another meeting.

The cream dialogue bubble follows the speaker through the camera zoom. Text
reveals gradually with punctuation pauses and quiet character-specific syllables.
Reveal completes the current sentence; continue acknowledges it. Both reply
options appear together inside Lunafreya's bubble and become selectable when
the prompt is revealed. The selected answer is spoken before the other person's
response. A reload after selection retains the answer and resumes the response.
Hidden tabs and Settings hold speaking and walking, and stop the current voice.
Instant text retains its existing silent behavior. Escape puts a moment aside.
Existing third-person arc narration reveals gradually but has no character voice.


Putting the mandatory first hello aside returns to the waiting counter encounter,
with a steady invitation once opened. It does not release the café clock or
serve Holger early. Completing it releases normal service; no later conversation
inherits this tutorial requirement. The booked window repair, like table work,
is a practical improvement that may finish autonomously in either mode.

## First home tutorial exception (7 September 2026)

Owner direction makes the first apartment tour and its first planner attended
in both modes. After unpacking a coat hanger and drapes, the player selects
both the left-window repair and first table; no other project is offered.
Neither the choices nor the following explicit bedtime expires. This one-time
exception does not make later story arcs or purchases mandatory. The saved
v8 home cursor resumes the tour/bedtime after reload, and established v7 homes
skip the tutorial without changing savings, purchases or story choices.
