# Animation audit — 5 September 2026

Scope: all animation-bearing renderer files, the three simulation files,
and the main clock/presentation loop. The pass keeps the deliberately small,
quiet pixel-art motion vocabulary. It does not aim for continuous skeletal
animation or change narrative pacing.

| Area reviewed | Finding / outcome |
| --- | --- |
| Human locomotion, turns, carrying | Distance-driven phases, independently lifted shoes, no waypoint snapping or lost movement budget. Held props stay steady. |
| Faces, breathing, dozing | Added brief per-character blinks; retained small head/torso offsets and gaze poses. |
| Reading and drinking | Added a timed page leaf and following hand; eased sip lift, corrected mouth/rim contact and steam origin. |
| Knitting and sketching | Needles, hands and pencil now move instead of holding a static working pose. |
| Painting, typing, piano | Retained painting/typing bouts; aligned piano fingertips with the keyboard. Brush already meets the canvas/tray. |
| Brewing and food preparation | Added Nora's working forearms, tamp, scoop and pitcher cues. Whisk hand and chasen share one action clock. |
| Wiping, polishing, restocking | Visible rubbing gestures; work timers start after travel. |
| Chalk, stretching, watering, candles, hearth | Moved chalk approach to the wall and added writing/return motion; retained established other gestures/routes. |
| Cat walking and resting | Distance-driven paws; subtler sleeping breath, moving grooming head; asymmetric poses and scarves mirror together. |
| Cat hops, perches, lap | Dedicated anticipation, tuck and landing; no airborne contact shadow. Existing routes, surface rules and patient rest states retained. |
| Cat pounce, feeding, kneading, tail/ears | Retained playful stylized motion; corrected facing for fixed asymmetric poses. |
| Door and bell | Continuous hinged leaf with attached glazing/handle; existing bell swing retained. Small appearance-keyed leaf cache. |
| Rain, street silhouettes and window activity | Existing time-driven motion and weather clipping retained. |
| Fire, candles, lighting and particles | Existing quiet layered movement retained; steam emission retains fractional time. |
| Captions, bubbles, narrative invitations | Deliberately readable and stable; no new bouncing UI or automatic payoff. |
| Hidden tab and presentation | Main real-time accumulator retained. Movement checked at 1/60 s and 0.25 s. |

## Verification

- `tools/verify-animations.js`: checks equal travel at different tick sizes,
  actual motion in eight six-frame sprite rows, gallery isolation from live
  world/save, and the live invariant audit. Returns a PNG contact sheet.
- `tools/verify-animation-journeys.js`: runs 22 scenarios in newly created real
  simulation worlds: six Nora routines, nine cat behaviors, and seven prep
  families from arrival through seating. Renders during the runs and checks
  completion plus each world's invariant audit. Cat scenarios accept normal
  alternate resting poses and the intentional interrupted high-shelf ascent.
- Both tools are evaluated with `agent-browser --session <disposable-session>
  eval (Get-Content -Raw tools/<script>.js)` after opening `?dev` and waiting
  for `!!window.__world`. Journey tests must use a disposable browser with
  audio off: real simulation creation can write that browser's narrative save.
  Detached `__dev.study()` worlds are used only by the rendering gallery.
- Final art review: ten repeatable images, eight occupancy/time scenarios,
  zero invariant problems. Warm composition: approximately 0.5 ms median,
  0.8 ms p95 on this development browser (100 samples after 20 warmups).
- Normal splash page: clicked step inside, audio initialized, a cappuccino
  order reached seating; at 20:00 the audit was clean and browser errors empty.
- Syntax checks and `git diff --check` pass.

Local review output is under `.art-review/animation-before/` and
`.art-review/animation-after/`, including `motion.png` and `journeys.json`.
Art capture canvases request a readback-oriented context; intermittent tiny
pixel differences appeared during the initial repeated PNG captures. The
final strict repeatability checks pass. The live render context is unchanged.

These checks cover the exercised states and this browser; they are not a claim
that every randomized combination, device or audio mix was tested. No
narrative save migration is required: new animation fields are transient.


### Follow-up: walking direction

The initial sine cycle lifted the backward-moving foot and did not mirror the
stride for left-facing walkers. Replaced it with a linear 12 px stance and an
eased forward swing over a 24 px cycle. The stance cancels body travel, keeping
the shoe fixed on the floor. Front/back views apply stride along the vertical
travel direction. Verification now checks rendered shoe positions against
actual body movement in all four directions, rather than only checking that
frames differ.


### Follow-up: leg attachment

Walking hips now remain fixed under the hem. Connected two-pixel strips angle
the trousers toward the moving ankles, rather than shifting the full leg
column sideways. Profile hips sit closer together to avoid a splayed stride.
The planted-foot timing and forward swing remain unchanged.


### Follow-up: side-view arms

The empty-handed profile walk now places the visible shoulder over the side
of the torso, slightly behind its centre, rather than at the forward edge.
A connected sleeve bends through the elbow and the hand counter-swings by
three pixels against the near leg. Carrying poses still support their props.
