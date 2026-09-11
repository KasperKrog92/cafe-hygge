# First books, first connection

Implementation brief, revised 8 September 2026. **Pass 1 shipped with three small
wall-mounted shelves in the patch left of the hearth, per owner direction.
Passes 2 and 3 remain planned.** It follows the
[shipped second-day visitors](../progression-roadmap.md#second-day-visitors--shipped-8-september-2026). The owner largely accepted
the [ensemble direction](community-and-character-stories.md). This brief makes
its first release concrete; it does not authorize the whole release at once.
The [progression roadmap](../progression-roadmap.md)
is the single current next-task/status reference.

## The eventual player experience

After her first table delivery, Keira returns when Lunafreya plans the first shelves.
She carries a small kit and folding steps, unpacks it and fixes three short
boards to the wall left of the hearth. They remain empty. Books are acquired separately and shelved between
ordinary duties. Holger later offers a small collection in a conversation that
remembers Lunafreya's opening answer. While looking through it, she mentions
her former bookshop/café work. A guest eventually borrows something from the
shelf. The practical improvement now carries a shared memory.

Keep three reviewable passes. Each should work through the real day/home loop
and preserve existing saves before the following pass begins.

## Pass 1 — Keira installs three little wall shelves

The initial purchase is **three little wall shelves, 40 coins**. Each board is
18 master pixels wide, from x320 to x338, with shelf surfaces at y172,195,218.
Keira works at (328,252). Five 12-second phases unwrap the kit, fit the lower,
middle and upper boards, then pack the tools. Folding steps support the upper
reach. Boards appear as each fitting completes; a partial kit persists safely.
The full bookcase is a possible later upgrade, outside this pass.

The [future-use check](../art.md#placement-and-future-room-use) covers the
window trim/sill/drapes, future book height, mantel/corbel, hearth and fireside
access. There is no permanent floor footprint. Only the visible unfinished kit
reserves floor space, released when packed; installed boards remain on the wall.

**Visible result:** the optional ordinary-evening purchase causes Keira to
bring and install the little shelves during a later open café. She packs the
wrapping and tools and leaves. The empty shelves persist across days and reloads.

The delivery person is a woman named **Keira** (she/her), per the owner's revised
direction. Give her a consistent appearance/identity so
later deliveries and off-duty visits can be the same person. Reuse her identity
and introduction from the second-day visitor milestone. A completed greeting
gets a returning line; an unfinished one remains available without holding
delivery. Never replay her first meeting or replace it with a new introduction.

Required behavior:

- Extend the existing improvement catalogue and ordinary planner. The required
  first-home window/table selection remains exactly as shipped.
- Define shelf ownership separately from usable book contents. In a new modest
  café, no guest may browse an empty or uninstalled shelf. An established
  furnished save retains its existing shelf, books and browsing.
- Reuse the shared renderer and layout geometry. Author the C0 placement and
  arrival/work/exit routes against its existing floor bounds. Do not assume the
  full-room furnishing is automatically safe in the smaller room or make room
  expansion a hidden prerequisite.
- Reserve the delivery's working area and affected route for the actual job;
  release reservations at completion or safe closing suspension. Ordinary
  customers and staff need viable paths while she works. Avoid global service
  holds, invisible blockers or a worker who cannot leave.
- Save purchase, installed state and necessary job progress exactly once. Reload
  restores a valid phase without duplicate shelves, charges, Keira actors or
  wrapping. Closing can leave a safe partial job that resumes on a later day.
- Work proceeds in both presentations. Use the production elapsed-time update
  and ordinary lifecycle; personal story invitations are not part of this job.

Use the existing warm wood and bracket palette. No large carcass, oversized
trolley load or decorative books belongs to this initial shelf purchase.

The catalogue is in `js/improvements.js`, shared anchors in `js/scene-core.js`,
wall boards in `js/scene-bg.js`, the kit in `js/scene-home.js`, and Keira's
saved job in `js/sim-visitors.js` with versioned state in `js/memory.js`.
Inspect current callers before choosing extraction boundaries. Preserve
historical validators and numeric checkpoint meanings when adding the new
state. Schema v9 adds `projects.bookshelf` without changing the old projects.
Established furnished saves retain their original library and usable books.

Pass 1 is done when the actual planner → kit delivery → installed-empty-shelves path
works, a full ordinary service/closing/home/reopening cycle finishes with the
new job, interruption/reload checkpoints preserve it, established furnished
saves keep working, and `__dev.audit()` reports zero problems. Review desktop
captures of delivery and the finished empty shelf. Follow the existing art
workflow and disposable-browser cleanup rules.

Deferred from this pass: book purchases and gifts, authored dialogue, home
keepsake placement, reading-chair/lamp purchases, other character renames,
generic visitor calendars and romance. Their absence must not block delivery.

## Pass 2 — purchased books become usable

Add a separate book-box purchase after the shelf is installed. Lunafreya carries
or receives the box and shelves a handful at a time between service duties.
The visible fill, saved quantity and browsing capability agree. Browsing can
start before the whole box is shelved, once usable books exist.

Define capacity and pending/installed contents once. Later gift books must use
the same small stocking operation rather than duplicate service interruption,
capacity or renderer logic. This is a local contract for books, not a universal
inventory system. Purchased books remain available without talking to Holger.

Verify interruption at the counter, closing/resumption, reload during stocking,
an empty/partial/full shelf, and a real guest choosing a book and reaching a
seat. Keep existing furnished saves equivalent to their current usable collection.
Review the visible empty-to-partial-to-stocked change as well as saved state.

## Pass 3 — the people and the first disclosure

Author Holger's scene packet and the relevant return callbacks before
implementing their consequences:

| Scene | Trigger and content | Lasting result |
| --- | --- | --- |
| Keira's return | Reuse the second-day introduction's actual saved state; a familiar greeting after completion, or the existing pending hello otherwise. | Continuity of the same delivery woman; no repeated introduction or new relationship commitment |
| Holger's first books | His introduction is complete. A continuation recalls the actual books/neighbors answer, offers a modest collection and lets Lunafreya mention her old bookshop/café work. The gift handover waits until the player attends. | A unique accepted gift, book source/stocking work and evidence that Holger heard this particular fact |

Write the exact bubbles and any meaningful choice, with named scene/node IDs,
before wiring effects. Keep the disclosure to her former work. The withdrawn
promotion, Calandra, romance and more personal history belong to later moments.
Holger can offer books before a shelf exists, with the promise saved; handover
and stocking need coherent conditions. A full shelf uses an appropriate line
and safely retained collection/bookplate, without deleting purchased books.

Stable-node preparation shipped separately on 11 September. Reuse
`SIM.beginSavedMoment` for stable scene prefixes, authored node IDs and saved
acknowledgements; choice flags and scene-specific completion callbacks retain
their existing roles. Holger's old positional flags migrate in v14. The old
UI/reload checks passed before extraction. Do not design a universal dialogue
editor or move every existing arc to a new engine merely for consistency.

The scene packet for any new conversation records: what triggers it; who knows
what at entry; the literal dialogue and choices; each remembered result; safe
leave/reload behavior; and the person's ordinary behavior afterward. Only
write the packets needed by this release.

Verify both opening answers, promise before/after a shelf purchase, purchased
books before/after the gift, a full shelf, a reload after choice and gift
acceptance, an ignored invitation across days, and Keira leaving work without
losing her pending hello. No gift, charge or disclosure effect repeats.
Finish with a natural guest borrowing a book from the resulting shelf and
service progressing into home and the next morning.

## Updating the project as each pass ships

Record actual runtime changes and test evidence in the matching architecture,
character/world/art and development docs. Update the roadmap's pass status
and the story bible only for what is now implemented or revealed. Keep script
cache tags current. Do not copy the entire ensemble plan into runtime comments
or expand unrelated character biographies in the same implementation task.

The [scalability audit](../scalability-audit.md) remains the preparation guide:
browser verification automation and save export/import precede substantial
public play. The full ensemble does not need to exist before a human reading
session can tell us whether this first story-connected improvement feels warm.
