# First books, first connection

Implementation brief, 7 September 2026. **Status: ready for the next development
task; no runtime behavior in this brief has shipped.** The owner largely accepted
the [ensemble direction](community-and-character-stories.md). This brief makes
its first release concrete; it does not authorize the whole release at once.
The [progression roadmap](../progression-roadmap.md#current-next-milestone--first-books-first-connection)
is the single current next-task/status reference.

## The eventual player experience

Lunafreya plans a bookshelf. Keira wheels it in, unpacks it and leaves a visibly
empty piece of furniture. Books are acquired separately and shelved between
ordinary duties. Holger later offers a small collection in a conversation that
remembers Lunafreya's opening answer. While looking through it, she mentions
her former bookshop/café work. A guest eventually borrows something from the
shelf. The practical improvement now carries a shared memory.

Keep three reviewable passes. Each should work through the real day/home loop
and preserve existing saves before the following pass begins.

## Pass 1 — next task: Keira delivers the empty bookshelf

**Visible result:** an optional bookshelf purchase in an ordinary home planner
causes Keira to arrive with a trolley during a later open café. She places and
unpacks the shelf, removes the wrapping and leaves. The installed shelf is
empty and persists across days and reloads.

The delivery person is a woman named **Keira** (she/her), per the owner's revised
direction. Give her a consistent appearance/identity so
later deliveries and off-duty visits can be the same person. A quiet arrival
caption can name her. Her personal introduction is authored in pass 3; delivery
must never wait for that conversation.

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

At implementation start, inspect the scene and record a reasonable shelf price,
footprint and work durations in this brief. These are routine design choices
to demonstrate in a capture, not already settled numbers in the accepted story.
Use the existing shelf art where it fits, adapting its visible contents and
framing rather than inventing an unrelated furniture style.

Start from `js/improvements.js`, the availability/layout helpers in
`js/scene-core.js`, the shelf drawing in `js/scene-furniture.js`, the existing
window worker in the life simulation, and versioned state in `js/memory.js`.
Inspect current callers before choosing extraction boundaries. Preserve
historical validators and numeric checkpoint meanings when adding the new
state; the current baseline is schema v8.

Pass 1 is done when the actual planner → delivery → installed-empty-shelf path
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

Author two small scene packets before implementing their consequences:

| Scene | Trigger and content | Lasting result |
| --- | --- | --- |
| Keira's hello | Her first delivery has happened; a waiting optional conversation gives her and Lunafreya a proper introduction. If ignored during work, it returns on an off-duty visit without another purchase. | Remembered introduction and eligibility for future ordinary visits; no free upgrade or romance commitment |
| Holger's first books | His introduction is complete. A continuation recalls the actual books/neighbors answer, offers a modest collection and lets Lunafreya mention her old bookshop/café work. The gift handover waits until the player attends. | A unique accepted gift, book source/stocking work and evidence that Holger heard this particular fact |

Write the exact bubbles and any meaningful choice, with named scene/node IDs,
before wiring effects. Keep the disclosure to her former work. The withdrawn
promotion, Calandra, romance and more personal history belong to later moments.
Holger can offer books before a shelf exists, with the promise saved; handover
and stocking need coherent conditions. A full shelf uses an appropriate line
and safely retained collection/bookplate, without deleting purchased books.

Before adding these scenes, inspect the current Holger-specific executor. Make
the minimum reusable conversation boundary needed for stable nodes, choices,
completion and one-time effects. If extracting or migrating its positional
cursor, make that a behavior-preserving commit and pass its old UI/reload checks
before adding new content. Do not design a universal dialogue editor or move
every existing arc to a new engine merely for consistency.

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
