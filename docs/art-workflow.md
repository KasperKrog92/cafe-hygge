# Art review workflow

Start with the running café, then make comparisons repeatable. The shipping
renderer is the reference: every scene capture goes through `SCENE.composeFrame`.
Keep the pixel language, CH=60 and the owner's explicit framing instructions.
For motion (anything that moves or changes pose), also read
[animations.md](animations.md): a still cannot show a snap.

## One-command comparison

With the dev tools installed (`npm ci --prefix tools`, see
[development.md](development.md#tooling)), run from the repository root:

```bash
node tools/art-review.js --label before
# Make one coherent visual change; inspect its region and the complete room.
node tools/art-review.js --label materials
# Once the final changes are ready:
node tools/art-review.js --label after --verify
```

It serves the checkout itself, uses a fresh browser context, waits for the dev
globals, captures and exits; nothing is left running. Results are local,
ignored files:

| File in `.art-review/<label>/` | Review purpose |
| --- | --- |
| `day.png`, `night.png` | Same sitters, poses, rain and animation time at noon / 20:00 |
| `empty.png` | Furniture silhouette, top planes and cushions without sitters |
| `fireside.png`, `nook.png` | Both chair directions, lap occlusion, lamps and rug integration at ×3 |
| `bookshelf.png`, `counter.png`, `artist.png`, `piano.png` | Material detail and depth at ×3 |
| `people.png` | Lunafreya, the regulars and visitors: both profiles, front, back and reading, at exact ×2 |
| `audit.json` | Live plus day/night fixture invariant failures (expect `[]`) |
| `verification.json` with `--verify` | Repeatability, side effects, occupancy scenarios, frame timing |

Read the PNGs with an image viewer or tool; creation alone is not visual review.
Inspect the room at its native 960×600 size before enlarging crops. A detail
that only works enlarged is not a reason to keep it. Show an actual rendered
result to the owner when finishing, with a short account of the changes and
validation.

## Targeted console loop

```javascript
__dev.shot('nora')                         // actual live state
var study = __dev.study({hour: 12});       // detached, repeatable rendering fixture
__dev.shot('fireside', {world: study});
__dev.shot('nook', {world: __dev.study({seats: []})});
__world.seats.map((s, i) => ({i, x:s.x, y:s.y, facing:s.facing}));
__dev.shot('window0', {world: __dev.study({seats: [12, 13]})});
__dev.poses();                            // PNG roster turnarounds
__dev.film({world: __dev.furnishedWorld({random: SIM.seededRandom(7)}),
  target: w => w.barista});               // motion filmstrip (animations.md)
__dev.audit();                            // actual sim invariants
```

`study` clones the current world, then fixes render inputs, removes transient
activity and binds chosen readers to real seats. It neither calls `SIM.create`
nor ticks the sim: those paths can write saves, change narrative progress and
consume randomness. **A study is for rendering only**: never install it as
`__world`, save it or pass it to `SIM.update`. `seats` takes up to seven unique
indices; derive them from the actual seat list when layout changes.

If the in-app preview pane is not visibly displayed, the browser pauses its
animation frames and screenshots of it fail; `__dev.shot()` and `__dev.film()`
render headlessly regardless.

## Review order

1. Check `git status`, the relevant AGENTS instructions and art.md, including
   [placement and future room use](art.md#placement-and-future-room-use): a
   passing route audit does not make a boarded window or a future view free
   space. Read the relevant renderer and its `L` anchors. A visual pass rarely
   needs changes to simulation or saves.
2. Capture **before**. State the visible weakness in concrete terms: missing
   top plane, hard square upholstery, unreadable material, floating object.
3. Fix silhouette and projection first; then top/front/side tones and contact
   shadows; then sparse material texture; finally local lighting. Reuse
   `shade()` and deterministic `h2()`. Keep static detail in the background cache.
4. Capture the changed region, both mirrored orientations and empty/occupied
   furniture. Inspect full day/night scenes after each coherent batch.
   Reduce details that compete with faces, books, windows or quiet floor space.
   For anything that moves, film it and check the frames around each change.
5. Finish with `--verify` and the full checks (`tools/verify-project.ps1`),
   which include the real entry flow: the splash click, audio start, an order
   through service and seating, and a clean night audit.
6. Update art.md, world.md / characters.md / animations.md as appropriate, and
   this workflow when a new lesson changes the process.

## Lessons that shaped this workflow

- Live screenshots drift with visitors, poses and weather: compare detached,
  fixed-occupancy day/night/empty fixtures instead.
- Occupied chairs hide cushion and projection mistakes: always look at the
  empty scene and both mirrored sitters.
- Stale scripts once made a reload show old art; the dev server now sends
  `no-store` and every check uses a fresh browser context.
- Crop envelopes must include attached props (the bookshelf crop once cut off
  its plant).
- A rejected floor bookcase showed that route clearance does not protect a
  window's later view; the placement rule in art.md exists because of it.
- Static art review passed while every sit-down snapped in one frame; motion
  now has its own check (`motion`) and filmstrips (animations.md).
