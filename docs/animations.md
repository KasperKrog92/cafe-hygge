# Animation

Every character and prop is drawn in code, every frame, from rectangles
(`px`) and pixel-stepped limbs (`limb`) in `js/scene-people.js`. There are no
sprite sheets. This keeps outfits, hair and held props consistent across every
pose and lets motion follow the simulation exactly, but it has a clear ceiling:
code can guarantee mechanics (feet that stay planted, hands that reach their
targets, no one-frame pops), while appeal and timing can only be judged by
watching. So the rules an agent can state are enforced by tests, and the look
is reviewed in motion through filmstrips.

## The systems

### Walking

- The walk phase comes from distance travelled (`walkDistance`), never from
  time, so feet stay locked to the floor at any speed or tick size (1/60 s to
  0.25 s). The stance foot moves backward exactly as far as the body moves.
- Stride follows walking speed: `S = 14 + speed × 0.2` px per full cycle (a
  40 px/s walker takes 22, a 60 px/s one 26). `p.stride` overrides it.
- The body rides one pixel higher while the swinging foot passes the planted
  one. Arms counter-swing with the same cycle.
- Four views: profile (`facing` ±1), front (`heading` 'down') and back
  (`heading` 'up'). Heading follows the dominant travel direction.

### Posture: sitting, kneeling, getting up

`SIM._.settlePosture` (sim-core.js) eases `e.low` from 0 (standing) to 1
(seated/kneeling) over 0.45 s whenever a character's pose becomes one of
`SIM._.LOW_POSES` (`sit`, `kneel`, `catCare`), and back to 0 over 0.4 s when it
stops being one. It runs once per tick for everyone after all simulation
updates. While `low` is between 0 and 1, `SCENE.drawPerson` draws a crouch: the
character's own standing art lowered onto bent legs, so every outfit, hairstyle
and held prop carries through. The crouch is drawn in the view of the pose
being entered or left (`lowPose`): kneeling from behind, sitting and the
bowl crouch in profile.

- **Walking waits**: `walker` returns early while `low > 0`, and a low pose
  with a new path becomes 'stand' so the body rises before the first step.
- **Props travel with hands**: a guest sitting at a table keeps the cup
  (`placeItem: 'cup'`); the near hand carries it down to where it will stand
  (`placeAt`, from `SCENE.tableItemAnchor`), the table item appears at
  `low 0.6` (0.9 on a window perch) and the hand comes back. A carried shelf
  book (`placeItem: 'book'`) is kept until seated, then the first page turns
  open (`pageTurn`) instead of the book popping in.
- **Window perches**: sitters ease up onto the sill and back down along
  `lowAnchor` (floor spot ↔ perch). Routes still start from the floor spot.
- A new low pose only needs its name in `LOW_POSES` and a final pose whose
  head sits about 8 px lower than standing.

### Keyed gestures

`SCENE._.keys(t, [[time, value], ...])` gives eased keyframes that hold at the
ends. Prefer it to a bare `Math.sin` for gestures: a tamp is a quick press, a
hold and a slower release, not a wobble. Sines remain right for genuinely
periodic motion (whisking, breathing, tail sway), with per-character phase so
people do not move in step.

### Lunafreya at the machine

The espresso machine stands on the rear worktop, behind her at head height on
screen, so for machine steps she faces away (`heading` 'up', set when the step
starts) and `drawStationBehind` draws her working arms *before* her torso and
head, which hide what a real back would hide:

| Step | Performance |
| --- | --- |
| `grind` | Portafilter held up under the grinder beside her; the other hand taps the switch in pulses |
| `tamp` | Elbows out, press–hold–release |
| `pull` | Reaches to the group head, turns the handle to lock it, lowers to wait out the shot (the machine shows cup and stream) |
| `steam` | Pitcher lifted to the wand in both hands and turned slowly |
| `kettle` | Kettle lifted and tipped at the machine's side |

Front-counter steps (`scoop`, `whisk`, `ice`, `fetch`) face the room and use
keyed reaches; the chasen and her whisk hand share one clock.

### Seated activities

Reading (page turns with a lifted leaf and following hand), sipping (eased
`armUp`, cup swapped between table and hand), knitting (needles and grips
follow their shafts), sketching, painting (brush meets canvas and tray),
typing (arms drawn by the table from the laptop's keyboard anchor) and piano
(fingertips on the keyboard).

### The cat

- Paws are distance-driven in all four directions; hops follow an arc with
  anticipation, tuck and landing, and no contact shadow in the air.
- Resting changes pass through a brief loaf (lying, head up) between lying and
  upright poses, and the head eases between pose heights (`catHeadEase`), so a
  curled sleeper sits up in steps: curl → loaf → sit, head rising.

## Verification

| Check | What it guarantees |
| --- | --- |
| `animations` | Equal travel at 1/60 s and 0.25 s; stance shoe fixed; legs attached at the hem; walking hand beside the torso; visible motion in each sprite row |
| `cat-animations` | Cat pose gallery, walking in four directions, deterministic mirrored/scarf rendering |
| `animation-journeys` | Real Lunafreya chores, cat behaviours and seven drink preparations complete with clean audits |
| `motion` | Renders every person alone at 12 fps in two busy furnished worlds for four simulated minutes; fails if a silhouette jumps (head >4 px or overlap <60%) while the body is not travelling. Cat pops are reported, not failed: small sprites trip the overlap metric on any 3 px shift |

Film anything you change and look at the frames either side of each pose change:

```javascript
const w = __dev.furnishedWorld({ random: SIM.seededRandom(7) });
// a guest sitting down: 2 frames before, 12 from the moment it happens
__dev.film({ world: w, target: w => w.patrons[0], pre: 2, frames: 14,
  start: (w, p, prev) => prev && prev.pose !== 'sit' && p.pose === 'sit' }).sheet
```

`__dev.film` never ticks the live world. `follow: true` keeps the crop on a
walker; `fps`, `w`, `h`, `scale` and `cols` shape the sheet.

## Adding or changing an animation

1. Decide the performance in words: approach, the contact moment, the hold,
   the release. Name what the hands touch.
2. Put timing in the simulation (dt-driven state and timers); the renderer only
   reads state. Use `keys()` for gestures and reach real anchors from `L`.
3. If the pose changes the body's height or shape, make it a low pose or give it
   its own in-between; never swap silhouettes in one frame.
4. Props move with hands: never show an item in two places, and never let it
   appear somewhere a hand has not been.
5. Film it, check the `motion` suite, and show the owner the filmstrip.

## Known limits

- Everyone shares one body template (60 px, same proportions); identity comes
  from palette, hair, accessories and stride. Signature idle fidgets per
  regular are not built yet.
- The crouch into the bowl-side `catCare` pose ends on a differently shaped
  silhouette; the head height matches, so it passes the detector, but it reads
  as a small shape change.
- In back view, `pull` and `steam` are quieter than `grind` and `tamp` because
  their hands are correctly hidden by her head.
- Arm-only pose changes (reach, stretch, hug) still switch in one frame; the
  body does not move, so they read as quick gestures rather than pops.
