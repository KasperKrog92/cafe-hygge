# Roadmap

Unordered ideas, roughly grouped, each judged against the one bar that
matters: *does it make the café cozier or more glanceable?* (overview.md).
Nothing here is committed; the owner picks what sounds lovely next.

> **Graduated & executed:** the native high resolution, the
> proportion/composition passes, the agent workflow pass (dev harness,
> file splits, doc slimming — future changes cost less), and the harness
> sweep (a multi-day soak-test bug hunt plus the journey/footprint rules now
> in `__dev.audit()`), and cat life (corner + bowl care, high perches,
> counter/shelf capers, laps, kneading, and dust motes), Nora's care rituals
> (watering, chalkboard doodles, dusk candles, quiet stretches), patron life
> (umbrellas, laptops, Holger, couples, night dozing), and the synthesized
> sound pass (chair and coin foley, town time, thunderstorms, and the night
> music layer) were specced here, executed, and their plan docs
> retired (git history has them).

## 🎨 Art consistency

- **Give the bookshelf and the piano their top planes.** The scene's 3/4
  top-down projection (now written down in art.md, *Style rules*) asks
  every free-standing piece for a visible, lighter top surface — the
  counter slab and table tops have one; the bookshelf
  piano does not, they are seen only from the side. Make sure there is
  rough consistency between how big other furniture is when fixing this
  issue.

## 🎧 Real sound clips (owner-requested — design ready)

The owner would like to eventually supply actual recordings (espresso
machines, rain, café room tone…). Plan for when clips arrive:

1. **Layout:** `assets/sounds/` with a `manifest.js` (plain script, keeps the
   no-build promise) mapping sound ids to files:
   `window.SOUND_MANIFEST = { espresso: ['espresso-1.ogg', 'espresso-2.ogg'], … }`
   Multiple takes per id → random pick per play, ±few cents playbackRate
   jitter so repeats never sound identical.
2. **Loader in audio.js:** after `SND.init()`, `fetch` + `decodeAudioData`
   each file lazily; store buffers per id.
3. **Hybrid playback:** every `SND.*` function checks for a loaded buffer
   first, else falls back to the current synthesis — the café must sound whole
   even with zero/partial assets, and file:// (where fetch may fail) keeps
   working via the synth path.
4. **Same buses and gain discipline:** samples route through the existing
   sfx/amb/fire/music buses and the delay send; normalize clips beforehand,
   then trim per-id gain in the manifest (`{file, gain}` entries).
5. **Loops with variation:** long beds (storm rain, room tone, fire) as
   loopable files with gentle crossfade on loop points; keep intensity driven
   by `world.rain` / toggles. (Normal rain is discrete window taps, not a
   bed — see sounds.md.)
6. Document each replacement in sounds.md (recipe column becomes "sample:
   filename + credit/license").

## 🔊 Further synthesized sound ideas

- The street heard through the open door: while the door stands open, the
  outside (rain taps, storm wash) lifts a touch, then ducks back as it
  swings shut.
- A spoon stirred twice around a fresh cup — two or three tiny porcelain
  tinks just after a drink lands on the table.
- The espresso machine sighing off pressure — a soft "pff" every few idle
  minutes, nobody near it.
- One creaky floorboard near the door that only sounds sometimes.
- Radiator ticks on cold evenings — gentle metal pings as the heat comes
  up (pairs with seasons, below).
- Book foley at the shelf: fingertip ticks along the spines while
  browsing, a soft cover thump on take and return.

## 🐈 More life

- A café dog that visits occasionally and naps by the door. The cat has
  opinions (one caption, no drama).
- A knitter by the fire on rainy evenings — needle clicks quieter than the
  crackles, a slowly growing scarf. (Now elevated into **Gerda's scarf arc** —
  the growing scarf becomes a real, persisted, real-day arc with a waiting
  payoff; see the narrative foundations below and [narrative.md](narrative.md) §8.)
- Someone writing postcards at a window table: pen scratches, a pause to
  look out, one careful stamp.
- A patron who greets the cat on the way in — one crouch, one pat, and on
  to the queue.

## 🌍 More world

- **Seasons**: snow falling past the window, frost corners on the glass,
  autumn leaves, summer evening light running later. Could follow the real
  date.
- Holiday touches (subtle): a string of lights in December, a pumpkin on the
  mantel in October.
- Passers-by outside the window: silhouettes with umbrellas.
- A real "closing hour" mood at 02:00: Nora stacks chairs, lights low, only
  the fire and the cat — never actually closed, just quieter.

## 💬 Regulars & conversations (owner's direction)

The café is growing a **narrative layer**: a roster of established regulars
with fixed looks, habits, and — over many visits — backstories and small
projects that advance in the background, plus optional conversations the reader
can choose to have or simply overhear. The full design of this layer now lives
in **[narrative.md](narrative.md)**; this section is its roadmap.

**Guiding rule (see narrative.md §1):** progression is *patient*. Arcs advance
on their own, across real days — but a payoff never fires unattended and never
expires. It raises a soft, ignorable invitation (a bubble over a character) and
waits until the reader chooses it, or never does. The café is complete if the
reader never touches it, and nothing is ever lost by being away. This is the
same hygge bar as petting the cat — optional, never nagging — now extended to
things that grow.

Rough order (each slice ships something lovely on its own):

> **Status:** slices 1–3 are built — the roster (Phase 1), passive overheard
> lines (Phase 2), and now habits & continuity (Phase 3: per-regular seat lines,
> weather- and recognition-aware openers backed by persisted `bonds`, and a
> boot-seeded familiar face). *Recurring pairs* within slice 3 are deferred — no
> two current regulars share a table for the chat path to fire on. Slices 4–6
> remain. Execution is tracked in
> [plans/regulars-and-conversations.md](plans/regulars-and-conversations.md).

1. **A roster of regulars.** Generalize Holger's one-off `makeRegular` into a
   data-driven `REGULARS` table (fixed appearance, drink, arrival window, seat
   preference, and a small pool of lines). Add a few more regulars spread
   across the day, each reusing behavior that already exists (reading,
   window-gazing, laptop, piano). Doc: characters.md.
2. **Legible overheard lines ("listen in", passive).** Where table murmurs
   emit a generic caption today, occasionally surface a real in-character line
   through the existing caption gate — sparse, rate-limited, each line standing
   alone so nothing needs catching up. No new UI.
3. **Habits & continuity.** Wire the dormant `usualSeat` / `regularSeatNoted`
   flags; let regulars react to their spot, the weather, the day. Recurring
   pairs who tend to sit together.
4. **Focus a table (gentle opt-in).** Clicking a chatting table softly focuses
   it so the next few captions are that table's actual exchange, then it fades
   back to ambience — a lean-in, not a minigame. Built on the single click
   handler that today only pets the cat (main.js).
5. **Conversations with Nora (opt-in, chapter-break friendly).** When a patron
   has something to say to Nora, a *soft, ignorable* invitation appears — no
   badge, no count, no timer. If the reader looks up (say, at the end of a
   chapter) they may choose a short exchange or just keep reading; the invitation
   *waits* rather than drifting away — it never expires and nothing is lost by
   never engaging (the invitation-waits rule, [narrative.md](narrative.md) §1).
   Branching is welcome as choices that *color* the moment, never gate content
   (§6). Open design question: how the invitation reads as inviting-not-nagging.
6. **Backstories, in drips.** A per-regular backstory surfaced as rare solo
   captions over many visits — a slow reveal assembled just by being present,
   rewarding the long reading sessions the app is built around.

**New foundations the soft-narrative vision needs** (keystone for everything
above the passive layers — see [narrative.md](narrative.md)). ✅ **All built** —
the keystone is in; the remaining phases 3–6 above now build on it:

- ✅ **Persistent memory (`MEMORY`).** `js/memory.js` mirrors `SND.save()`: a
  versioned `cafe-hygge-save` JSON blob (arcs, bonds, flags, `lastSeen`), a
  migration ladder so a growing save never bricks a returning reader, and a
  boot reconcile that tolerates drift. The single unlock behind cross-visit
  continuity and every arc.
- ✅ **Idle / real-day progression.** `reconcileNarrative` (in
  [sim-core.js](../js/sim-core.js)) advances each arc by `elapsedDays` from
  `Date` in one deterministic boot step, with any beats that came ready simply
  waiting.
- ✅ **The invitation + trigger loop.** A `pendingBeat` yarn-ball bubble (reusing
  the bubble renderer) and `SIM.beatAt`, a general hit-test the single canvas
  click handler ([main.js](../js/main.js)) now runs before petting the cat.
- ✅ **Gerda's scarf — the reference arc.** The first end-to-end build of the
  arc → progress → ready beat → invitation → trigger loop
  ([narrative.md](narrative.md) §8): knits across real days, waits as a soft
  yarn-ball bubble, and on tap loops the scarf onto the cat for good. Also
  realizes the roadmap's earlier "a knitter by the fire… a slowly growing
  scarf" idea, now with a payoff that waits for you.
- ✅ **`__dev.audit()` grows narrative invariants.** No arc names a missing
  regular, no `stage` exceeds its definition, the loaded save matches
  `version`, no beat fires without an invitation.

### Save durability — making the memory as sturdy as no-build allows

`localStorage` is durable on the browser a reader actually uses day to day — it
survives tab closes, browser quits, and reboots indefinitely. It is lost only in
nameable cases: clearing site data, private/incognito windows, a different
browser or device, disk-pressure eviction, and — the one that bites an idle app
— Safari/iOS purging script storage after **~7 days** without a visit. A save
is never a high-stakes thing to lose here (companion mode is whole at day zero),
but the invested reader's familiarity is worth protecting. The plan, all of it
staying zero-dependency and offline:

- **Request persistent storage.** Call `navigator.storage.persist()` on boot —
  exempts the origin from disk-pressure eviction (Firefox prompts, Chrome often
  grants silently). Cheap and strictly better; does not beat Safari's cap.
- **Graceful fallback is a hard rule.** A missing, unparseable, or
  wrong-`version` save always opens a **fresh café** — never an error, never a
  "save not found" screen. Data loss degrades to day zero, which is still a
  complete experience. (This is a `MEMORY.load()` guarantee; the audit checks it.)
- **Encourage install / Add to Home Screen.** Installed-web-app storage is
  treated far more durably and is the best mitigation for Safari's 7-day purge.
  Worth a gentle, dismissible hint at most — never a nag.
- **Export / import a save ("copy your café").** A tiny JSON download and
  re-import: manual insurance the reader controls, and the hand-carry path to a
  new browser or machine. Pure data, no backend, no build.
- **Known limitation, stated honestly.** On Apple platforms a reader away for
  over a week may return to a fresh café. That is an accepted trade for staying
  backend-free, softened by install + export and by loss being low-stakes.
- **Cross-device cloud sync: not pursued.** The owner does not want it, and it
  is the one option that would break the offline / `file://` / no-server
  promise. Out of scope — the durability above is the ceiling, on purpose.

## 🚫 Explicitly out (the line moved — here's where it is now)

The vision has grown: Café Hygge is now a **soft narrative game that is also a
companion app** ([overview.md](overview.md), [narrative.md](narrative.md)). The
old bar forbade *all* accumulation; the new line sits between **patient
progression** (welcome) and **pressure** (never).

**Now welcome** — because it waits for you and punishes nothing: persistent
memory across sessions, story arcs that advance in the background over real
days, opt-in beats that sit as a soft invitation until the reader chooses them,
and branching conversations whose choices *color* a moment. All governed by the
one rule in [narrative.md](narrative.md): *arcs advance on their own; their
payoffs never fire on their own, and never expire.*

**Still out, permanently:** scores, currencies, upgrades, and any timer,
streak, decay, unread count, badge, or notification that *demands* the reader's
attention, penalizes absence, or makes reading straight through feel like
missing out. A beat you can lose by being away is out; a beat that waits is in.
Nothing may ever slide backward while you're gone. External chat/stream
integrations stay out for now.
