# First opening: Lunafreya and the cat

Proposal for owner review, 7 September 2026. Dialogue is not implemented.
The identity swap is implemented: Lunafreya owns the café, Nora paints.

## Presentation

Keep the ordinary café framing and let Lunafreya carry, unpack and assemble
throughout. Use one warm cream speech bubble with a small tail above her:
she is talking aloud to the cat. Reserve dotted thought bubbles for private
thoughts later. Introduce her name subtly on the first bubble only.

Each bubble holds one short sentence or two brief clauses, at most three
lines. Pre-wrap the complete sentence and reserve its size before revealing
text, so words never jump between lines. Position above her body, ignoring
walk bob; keep it inside the current desktop crop and out of the control bar.
Keep the room visible, without letterboxing, a portrait panel or camera cuts.

Start around 28 characters/second, with small comma pauses and longer sentence
pauses. Hold the completed sentence long enough to read, then leave quiet
space before the next remark. Auto-advance by default; Space/click reveals
the full current sentence, then advances it. Offer a quiet pause/continue
control and skip-intro control. Skip dismisses dialogue while existing setup
work continues; it does not install furniture or bypass the saved work.
Keyboard handling must ignore focused controls. Offer instant text and
independent dialogue volume in settings; expose complete lines accessibly,
without announcing each newly revealed character.

## Voice and pacing

A low-volume, warm, wordless speaking sound accompanies the text reveal.
Use a dedicated short syllable synth inspired by the existing murmur, with
gentle pitch/length variation and vowel-like filtering. Trigger a syllable
roughly every 2–4 letters; silence at punctuation, whitespace and after reveal.
Avoid overlapping long murmur calls or a beep for every letter. Route through
the existing compressor with independent dialogue gain. Stop immediately on
pause, skip, full-line reveal or hidden tab; never play catch-up syllables.
The first-entry click already provides the audio unlock.

Aim for a few minutes including quiet work, not constant talking. Attach
remarks to actual setup milestones instead of timestamps. She can keep moving
and working within each beat, then linger naturally if its dialogue needs
more time. A cat glance, grooming pause or one occasional meow can answer her.
Avoid choreographing a cat response to every sentence.

## Draft beats (split across individual bubbles)

1. Carrying the cat inside: “Here we go, [cat name]. Your new second home.”
   “I'm glad you didn't see it yesterday while I was cleaning.”
   “I found a spoon behind the skirting board. Just the one. No explanation.”
2. Setting the cat down: “Your things go here. I thought you might like the
   warm corner.” / “Of course, you'll pick somewhere else.”
3. Unpacking the machine: “Coffee, tea, something sweet. I can manage that.”
   “I keep thinking I ought to have a longer menu.” / “Let's start with coffee.”
4. Setting out the cake stand: “These are for customers.”
   “I'm saying that to both of us.”
5. Assembling a table: “I used to sit in places like this and imagine having
   one.” / “Never imagined quite so many screws.”
6. The second table: “Two little tables. Someone could sit here with a book.”
   “Stay all afternoon, if they wanted.” / “I'd like that.”
7. Ready to open: “All right. I think we're ready.”
   “You don't have to look impressed. Just try not to sleep in the doorway.”

The cat has no established name in the current implementation. Resolve the
placeholder before shipping. Lunafreya should sound affectionate, slightly
nervous and prone to small tangents; the quieter admissions matter more than
the jokes. Final copy and timings need review in motion and by listening.

## Implementation slice

Add a small data-driven dialogue sequence and controller using the existing
first-opening stages in sim-life.js. Keep dialogue separate from the ambient
caption queue, and suppress incidental captions while a line is visible.
Draw through the shared SCENE.composeFrame path so headless captures match
the shipped view. Wire input/settings in main.js and voice in audio.js.

Persist beat/line completion using a versioned MEMORY migration. On reload,
restart the current unfinished sentence while restoring existing assembly
progress; never replay completed lines or give items twice. Established saves
start with this intro complete. On a hidden tab, hold the attended intro and
its work at the current beat; the ordinary café clock remains unchanged
outside this one-time sequence. Explicitly skipping permits unattended setup.
This exception requires updating the first-opening and clock documentation.

Verify fresh entry, mid-line and mid-work reloads, skip/pause/reveal, mute and
instant text, hidden/refocus, both desktop crops, bubble bounds at all work
anchors, and the first real customer order. Run save regressions, first-opening
and life suites, art captures and the invariant audit. Listen to the voice mix
at normal ambient volume. Keep the existing browser cleanup workflow.
