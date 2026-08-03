# Plan: native high-resolution rendering

**Goal:** Café Hygge should look *great* on the owner's actual displays —
fullscreen or large-window at **1920×1080 (16:9)** and **1920×1200 (16:10)** —
instead of being a 480×270 buffer stretched ×4.

**Status:** **fully executed.** Phases 0, 1, 3 and 4 landed 2026-08-02, the
[proportion pass](visual-proportion-pass.md) the same day, and Phase 2 (the
detail art pass) landed 2026-08-03. See *Execution notes* at the bottom for
what shipped and where it deviates from this plan.
**Pairs with:** [visual-proportion-pass.md](visual-proportion-pass.md) — read
the *Sequencing the two plans* section at the bottom before starting either.

---

## 1. Where we are

- Internal canvas: 480×270 (16:9), CSS-scaled to the viewport with
  `image-rendering: pixelated`.
- At 1920×1080 that is a clean ×4 integer scale — crisp but *chunky*: every
  art pixel is a 4×4 block. Faces are 1 eye-pixel; the charm is real but the
  detail ceiling is low.
- At 1920×1200 the canvas letterboxes (60 px black top/bottom) because the art
  is 16:9 only.
- CSS does the scaling, so odd window sizes produce non-integer scales →
  uneven pixel sizes (shimmer during animation).

## 2. Options considered

| Option | What | Verdict |
| --- | --- | --- |
| A. Keep 480×270, polish scaling only | Integer-snap + letterbox everywhere | Cheapest, but zero added detail — doesn't meet "look great" |
| B. **960×600 native master, 16:9 crop** (recommended) | Redraw art at 2× linear detail on a 16:10 master canvas; show 960×540 crop on 16:9 | Exact ×2 integer at both 1920×1080 and 1920×1200; both ratios first-class; art detail doubles |
| C. 640×360 native (×3 at 1080p) | Milder detail bump | Awkward middle: most sprites still too coarse for faces/hands, yet all migration cost is paid |
| D. Full hi-res repaint (non-pixel art) | Vector/painterly | Rejected — loses the hand-made pixel identity (overview.md) |

**Recommendation: Option B.**

- **Master scene: 960×600 (16:10).** Designed once, complete at this size.
- **16:9 presentation: 960×540 viewport** cropped from the master — the top
  ~36 px (upper wall/ceiling strip) and bottom ~24 px (front floor edge) are
  designed as *croppable overscan*: nothing essential (characters, captions,
  furniture, controls anchor) may live there.
- 1920×1080 → crop × 2. 1920×1200 → full master × 2. Both **integer**.
- One art pass, no letterboxing on either target display.

## 3. Work plan (phased, each phase shippable)

### Phase 0 — pipeline prep (no visual change)

1. Introduce `SCENE.W/H` as the single dimension source (kill literal
   480/270s across files; sim + main already read `SCENE.L`, extend that habit).
2. **Static-background cache:** render the wall/floor/furniture-independent
   background into an offscreen canvas, invalidated when the lighting bucket
   changes (e.g., every in-world ~5 min) — at 4.4× the pixels we want the
   per-frame cost of ~200 fillRects gone. Dynamic elements (window sky, rain,
   fire, machine, door) stay immediate-mode.
3. Viewport/scaling manager in main.js (see §4) — replaces pure-CSS scaling.

### Phase 1 — mechanical ×2 (still looks identical)

- Multiply every coordinate and size in `SCENE.L` and every draw call by 2
  (scripted find/verify pass, not hand-edits: the numbers are literals; use a
  temporary `ctx.scale(2,2)` scaffold to A/B against baked-×2 output and catch
  stragglers).
- Ship gate: screenshot-diff vs. the old build at 1080p — must be
  pixel-identical. This proves the pipeline before any art changes.

### Phase 2 — the detail pass (the actual payoff), region by region

Order chosen so the most-looked-at things improve first:

1. **Characters** — at 2× a standing patron has ~44 px to work with (more
   after the proportion pass): two-pixel eyes, actual hands, hair *styles*
   (not helmets), clothing folds, scarf knots, apron strings, 4-frame walk
   instead of 2, subtle idle sway. The cat gets ears that move and a real tail
   curve.
2. **Hero props** — espresso machine (gauges, portafilter detail, drip tray
   grill), pastry case contents, fireplace (brick coursing, log texture,
   3-layer flames), tables/chairs (wood grain, cup shadows).
3. **Architecture textures** — floorboard grain + knots, wainscot panel
   bevels, brick mortar, window frame depth, menu chalk handwriting.
4. **Atmosphere** — particle sizes/counts retuned (steam gets 2–3 px curls),
   lighting glow radii ×2, rain streaks thinner (1 px at 960 = finer rain),
   vignette re-tuned.
5. **Typography** — captions at a 14–16 px pixel-look font on the 960 canvas;
   the 3×5 chalk font gets a 6×10 successor with real letterforms ("CAFÉ
   HYGGE" deserves it).

### Phase 3 — 16:10 extension content

- Extend the master to full 960×600: taller upper wall (longer lamp cords, a
  picture rail, maybe fairy-light string later), one extra floorboard row at
  the bottom front.
- Verify the 16:9 crop rules: captions, control-bar anchor, door, counter,
  all tables fully inside the 960×540 safe area.

### Phase 4 — presentation & QA

- Fullscreen + windowed soak at both targets; DPR matrix (§4); night/day;
  8-patron crowd; performance check (target: <2 ms/frame draw time on the
  owner's machine, headroom via the Phase 0 cache).

## 4. Scaling & sharpness details (the part that usually gets botched)

- **Integer scaling, always:** JS computes
  `scale = max(1, floor(min(vw_dev / VIEW_W, vh_dev / VIEW_H)))` in **device
  pixels** (CSS px × `devicePixelRatio`), sizes the canvas CSS box to
  `scale × VIEW_W / dpr`, centers it, letterboxes the remainder in the page
  background color. Never fractional-stretch.
- **Why device pixels matter:** the owner is on Windows — at 125% display
  scaling a "1920×1080" screen is 1536×864 CSS px, and naïve CSS sizing gives
  ×1.6 → shimmering pseudo-pixels. Computing in device pixels yields a clean
  ×2 there too.
- **Aspect selection:** viewport aspect ≥ ~16:9.5 → use the 960×540 crop;
  taller → use the full 960×600 master (blit with a source-rect offset; the
  sim/layout is untouched — presentation-only).
- Keep `image-rendering: pixelated` as belt-and-braces; with integer device
  scaling it's simply lossless.
- `resize`/`fullscreenchange`/`devicePixelRatio` listeners re-run the fit.

## 5. Invariants to carry through

- Zero dependencies, no build step, plain script tags (file:// must work).
- `SCENE.L` stays the single source of truth; sim logic never learns about
  crops or scale — it lives in master-canvas coordinates.
- Depth = baseline-y sort, unchanged.
- Nora's visible-above-the-counter rule re-derives after Phase 1/proportion
  changes (document the new y in AGENTS.md when it lands).
- Docs to update on completion: art.md (new resolution + palette additions),
  architecture.md (render cache, viewport manager), AGENTS.md invariants.

## 6. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Detail pass drifts into "HD remaster" that loses the cozy chunk | Style rule: minimum feature size 2 px at 960; keep big heads / chibi silhouettes; A/B every region against the old build at viewing distance |
| Coordinate migration typos (offset-by-half-slab bugs) | Phase 1 pixel-identical screenshot gate before any art edits |
| Perf regression at 4.4× pixels | Phase 0 background cache first; particles budgeted; measure each phase |
| 16:10 content feels like filler | Overscan zones get *texture*, never *content*; if it looks empty, that's correct — it's ceiling and floor |

## Sequencing the two plans

Do **Phase 0 + 1 of this plan first** (pipeline + mechanical ×2, zero art
risk), then execute the **[proportion pass](visual-proportion-pass.md)** on the
960 canvas (geometry changes while sprites are still simple), and only then do
**Phase 2's detail pass** — so every sprite is redrawn exactly once, at its
final size and proportion.

## Execution notes (2026-08-02)

- **Transform:** every coordinate migrated as **x′ = 2x, y′ = 2y + 36** in one
  pass — the ×2 and the 16:10 shift together, so `SCENE.L` and all draw code
  are in final master coordinates (16:9 crop = rows 36–576). Speeds,
  velocities, radii and thresholds doubled; durations/probabilities untouched.
- **The Phase 1 gate** ran as an A/B harness (temporary `_verify/` folder,
  deleted after): the pre-migration scene.js rendered through
  `translate(0,36); scale(2,2)` was pixel-diffed against the baked output
  across 11 tests (scene day/night/brew, furniture, people matrix, cat
  states, bubbles, lighting, particles, caption). All pixel-exact; the flame
  region was masked (its `Math.round` on a time-varying height legitimately
  differs by ±1 px from the scaled original) and eyeballed instead. One real
  bug found and fixed by the gate: the `glow()` radial-gradient inner radius.
- **Static background cache** (Phase 0.2) turned out fully static — day/night
  tint lives in the lighting pass — so it renders **once**, not per lighting
  bucket. `SCENE.invalidateBG()` exists for future state-dependent statics.
  Wall picture frame moved to the dynamic layer (it overlaps the window frame
  edge and must paint after it). Measured draw+present: ~0.11 ms/frame.
- **§4 deviation (owner request):** strict integer-or-letterbox was replaced
  by **cover-fit**. The view rect flexes inside overscan budgets (visible
  height 540–600, width 936–960 via `SCENE.VIEW_MIN_W`) so any window aspect
  ~1.56–1.78 fills edge-to-edge with no black borders; fractional scales
  present via sharp-bilinear (nearest ×⌈s⌉ then smooth downscale), exact
  integer scales (both fullscreen targets → ×2, incl. Windows 125%/150%
  display scaling, verified) stay pure pixelated. Ultrawide/portrait get a
  minimal one-axis letterbox.
- Phase 3 content: picture rail + full-length lamp cords in the top strip;
  floorboards extend through the bottom strip (loops run to `H`).
- Phase 4: night/day jump, order cycle, cat relocation, click mapping, DPR
  matrix and perf all verified in-browser; console clean.

## Execution notes — Phase 2 detail pass (2026-08-03)

Executed in the plan's region order, on the post-proportion-pass geometry:

1. **Characters** — brows + 3×4 eyes, mouths, blush, optional beards (15%),
   actual hands on arms/cups/plates/books/cloths, four hair styles (classic /
   side-part / curly / bun) with a `shade()` shine, clothing folds + hems +
   trouser creases, scarf knots with hanging tails, apron straps/pocket/bow
   (Nora, side-part), **4-frame walk** (stride/pass at 8 fps with arm swing)
   and a 1 px idle breathe. Cat: twitching two-part ears with pink inner,
   segmented curved tails per pose (pale tip), stripes, muzzle, groom paw.
2. **Hero props** — machine: gauge + needle (rises when brewing), portafilter
   handles, drip-tray grill, warming tray with spare cups, edge shading,
   crema on the pull stream; pastry case: croissant/cinnamon-swirl/danish +
   tart/glazed-bun/layer-slice on doilies, glass shine; fireplace: true
   staggered brick coursing with hash-varied tints on mortar, mantel corbels,
   log bark + end-grain rings, hearth joints, and **3-layer flames**
   (broad `#b5481c` back layer, mid tongues, bright core) over a bed of
   pulsing coals; tables/chairs: tabletop grain + knot, pedestal highlight,
   chair-back slats, stool cross-braces, seat grain, cup/plate contact
   shadows, armchair seams + piping.
3. **Architecture** — floorboard grain streaks + knots and wainscot panel
   bevels (deterministic `h2` hash; static cache renders once), plaster
   mottling, window recess shadow + frame bevels + deep sill with front
   face, counter slab/plank grain.
4. **Atmosphere** — steam particles grow into 2–3 px curls (head + trailing
   comma + wisp), sparks gained a fading trail, rain thinned to 1 px streaks
   with mixed lengths/speeds and occasional kinks, vignette re-tuned (softer
   mid-stop, deepens ~0.12 after dark).
5. **Typography** — the 3×5 chalk font replaced by a **6×10 chalk hand**
   (2 px strokes, per-glyph jitter; menu now reads KAFFE / KAKAO / BOLLER
   under the title); captions render as cached 1-bit bitmap text (10 px
   thresholded, blitted ×2) instead of raw 19 px `fillText` — same size,
   pixel-look. Deviation from the plan's "14–16 px": the ×2-of-10px form
   factor keeps the proportion pass's 19–20 px caption size.

Verified in-browser: clean console through boot, a fast-forwarded full day,
an injected brew cycle (grind→tamp→pull→steam), day/dusk/night lighting,
walk cycles and cat states at 8× magnification. Docs updated in the same
change: art.md (style rules, palette, People, Typography), characters.md,
architecture.md.
