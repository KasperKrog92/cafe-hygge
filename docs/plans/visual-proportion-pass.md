# Plan: visual composition & proportion pass

**Goal:** make the café read as one coherent room. Today the *architecture*
(door, window, fireplace, counter, menu board) is drawn at roughly one scale
and the *life layer* (characters, tables, stools, cat) at roughly half that
scale — the owner's observation is correct, and it's measurable (§1). This
plan unifies the scales, then fixes the composition issues that the rescale
exposes.

**Status:** planned, not started. The resolution plan's Phases 0/1/3/4 have
landed: the live code is now on the 960×600 master, migrated as
**x′ = 2x, y′ = 2y + 36** — so a value quoted below at 480-scale corresponds
to `2·x` / `2·y + 36` in today's code, and new target sizes double.
**Pairs with:** [native-resolution.md](native-resolution.md) — see its
*Sequencing* note: geometry changes here happen after the mechanical ×2, before
the sprite detail pass. All numbers below are quoted at the **current 480×270
scale** for auditability against today's code; double them on the 960 canvas.

---

## 1. The audit (measured from the code)

Ruler: **CH = one standing character height = 22 px** (≈1.72 m real). So at
current scale 1 px ≈ 8 cm.

| Element | Current px | In CH | Real-world would be | Implied size today | Verdict |
| --- | --- | --- | --- | --- | --- |
| Door | 82 h × 36 w | 3.7 | 1.2 CH (2.1 m) | a 6.5 m door | **Way too big** |
| Window | 64 h | 2.9 | ~0.8–1.2 CH | 5.1 m of glass | **Way too big** |
| Fireplace breast | 82 h | 3.7 | ~1.5–2 CH | 6.5 m chimney | **Too big** |
| Firebox opening | 40 h | 1.8 | ~0.5 CH | walk-in fireplace | **Too big** |
| Counter (slab+front) | 44 h | 2.0 | 0.55–0.65 CH (~1 m) | chest-high wall | **Too big** — it hides Nora |
| Menu board | 44 h × 72 w | 2.0 | ~1 CH | billboard | Too big |
| Espresso machine | 26 h | 1.2 | ~0.4 CH | fridge-sized | Too big (but see §3 hero-prop note) |
| Floor lamp | 46 h | 2.1 | ~0.95 CH | 3.7 m lamp | Too big |
| Coat stand | 44 h | 2.0 | ~1.05 CH | 3.5 m | Too big |
| Table top | Ø34, top at ~13 h | Ø1.5, h 0.6 | Ø~0.4 CH real, but chibi wants ~1.0 | — | Diameter OK-ish, **too low/flat**, pedestal weedy |
| Stool | ~10 h | 0.45 | 0.26 CH | — | Slightly tall, spindly |
| Armchair | ~32 h | 1.45 | ~0.75 CH | — | Close; slightly big is cozy-correct |
| Cat (body length) | ~12 | 0.55 | ~0.26 CH | a big cat | Fine (chibi) |
| Mug in hand | 4 | 0.18 | 0.06 CH | a bucket | **Keep** — oversized mugs are deliberate charm |

**Diagnosis:** characters aren't "too small" in isolation — the architecture is
drawn ~2× too large relative to them. But *only* shrinking architecture would
leave characters at 22 px, which is also below the detail floor we want after
the resolution plan. So the fix is **meet in the middle**: characters grow
~1.35×, architecture shrinks ~35–40%, furniture grows slightly and gets
proper height.

## 2. The target ruleset ("the café ruler")

A stylized-but-consistent metric, kept slightly architecture-generous because
chibi proportions forgive big rooms better than big doors:

| Element | Target in CH | New px (CH = 30) | Today |
| --- | --- | --- | --- |
| **Character (standing)** | 1.00 | **30** (head ~9 — keeps chibi) | 22 |
| Door | 1.7 | 51 h × 26 w | 82 × 36 |
| Window (height) | 1.35 | 40 (sill ~0.9 CH above floor line) | 64 |
| Fireplace breast | 2.0 | 60 (firebox 0.8 CH = 24) | 82 / 40 |
| Counter total | 0.70 | 21 (front ~14, slab ~7) | 44 |
| Menu board | 1.2 × 0.75 | ~54 w × 34 h | 72 × 44 |
| Espresso machine | 0.65 | 20 | 26 |
| Floor lamp | 1.15 | 34 | 46 |
| Coat stand | 1.1 | 33 | 44 |
| Table | Ø 1.05, top at 0.52 | Ø32, top height 16, sturdier pedestal | Ø34, 13 |
| Stool / chair | seat at 0.30 | 9 (+ add simple chair backs, see §4) | 10 |
| Armchair | 1.15 | ~35 | 32 |
| Cat | 0.45 length | 13–14 | 12 |
| Mugs/plates | keep oversized | +1 px with bigger hands | — |

Numbers are **starting points, tuned visually** — the acceptance test is a
screenshot, not this table. Tolerance ±15% per element; the *ratios between
neighbors* are what must hold.

**Knock-on effects to re-derive (not forget):**

- Wall line moves **up** from y 110 to ≈ 96–100: smaller architecture needs
  less wall, and the reclaimed rows become floor — more stage for the (now
  bigger) cast. Re-check all wall-mounted art tops.
- **Nora's y**: with a 21 px counter whose slab sits higher on a raised wall
  line, re-derive the barista baseline so she reads hip-up above the counter
  (same method as the y=122 fix; record the new value in AGENTS.md).
- Seat positions, stool offsets (±22 → ±26 for 30 px sitters), queue slot
  fan spacing, lane y, `drawPerson` sit-pose offsets, bubble anchor heights,
  cat spot coordinates, particle emit points, click-target radius for petting.
- Speech bubbles and caption font: +20% to match the bigger cast.

## 3. Composition analysis & fixes (beyond scale)

Issues visible today, and what the rescale enables:

1. **Vertical balance.** Wall zone is 41% of the frame; the room reads
   "tall walls, tiny people." After the wall line moves up: ~35% wall / 65%
   floor — the life layer dominates, as it should.
2. **The empty river.** The walking lane (y 166) is a visible bare stripe
   between counter zone and tables. Fix: keep the *functional* lane but break
   the visual line — stagger tables 1 & 2 a few px toward it, extend the big
   rug's edge under it, let the cat's window spot sit at its margin.
3. **Dead bottom-right corner** (below the plants, right of table 4): add one
   small floor prop cluster — magazine basket or a third plant + stack of
   firewood; must not create a fake seat.
4. **Right-side mass.** The 160 px counter block outweighs everything; at 0.7
   CH height it stops dominating, and shortening it slightly (~150) lets a
   little wall breathe between menu board and shelves.
5. **Hero-prop readability exception.** The espresso machine and pastry case
   are the counter's storytelling props; they stay one notch *above* strict
   scale (0.65 CH machine vs. 0.55 realistic) so brewing stays legible. This
   exception is deliberate and documented — don't "fix" it later.
6. **Grounding shadows.** Characters have contact shadows; furniture doesn't
   — part of why sizes feel unmoored. Add soft 1–2 px ellipse shadows under
   tables, stools, armchair, coat stand, plants, counter base. Cheap, large
   realism gain.
7. **Door swing.** The current shrinking-width door reads as a sliding door
   at larger sizes. Replace with a 2-frame hinged swing (closed / ajar-dark +
   edge highlight), bell jiggle unchanged.
8. **Occlusion audit after rescale:** taller tables must still overlap
   sitters' knees, not their faces; armchair front arm vs. 30 px sitter;
   window-adjacent table 1 vs. sill height.

## 4. Furniture upgrades that ride along

Only items that fix proportion/readability (pure decoration waits for the
detail pass):

- **Chair backs** on the far-side seat of each table (stool stays on the near
  side) — seated patrons stop looking like they float, and tables gain
  vertical presence.
- Sturdier table pedestals + visible feet.
- Counter gets a low **footrail** shadow line — anchors it at its new height.

## 5. Execution & verification

1. **Grey-box first.** Add a temporary debug overlay (`?greybox=1`) that
   draws the *proposed* bounding boxes from the target table over the live
   scene — iterate the ruleset numbers against screenshots before touching
   any sprite. (Delete the flag when done.)
2. Apply geometry to `SCENE.L` + sprite skeletons, region by region, in this
   order: characters → counter/Nora → tables/seating → door/window →
   fireplace/menu/shelves → props. Screenshot checkpoint per region at day
   *and* night (lighting hides/reveals different sins).
3. Re-derive the knock-on list (§2) as each region lands; run one full order
   cycle + a busing trip + a cat relocation after every region.
4. **Crowd test:** 7 patrons, Nora out clearing, cat mid-walk, rain on, at
   dusk — the density/overlap stress case.
5. **Acceptance criteria:**
   - A patron standing in the doorway reaches ~60% of the door's height.
   - Nora at the counter reads hip-up; patrons across it read shoulder-up.
   - A seated patron's head tops the table by roughly a head-and-a-half.
   - Nothing in the frame is more than ~2× taller than a person except the
     window+wall and fireplace breast as a whole.
   - Squint test at 1080p fullscreen: the eye lands on people and fire first,
     architecture second.
   - No occlusion glitches through a full day-cycle soak.

## 6. Docs to update when this lands

- art.md — new layout map, ruler table replaces ad-hoc sizes, shadow rule.
- AGENTS.md — new Nora baseline invariant, new wall-line/lane values.
- characters.md — sprite size references.
- This file — mark executed, note final tuned numbers vs. the proposals.
