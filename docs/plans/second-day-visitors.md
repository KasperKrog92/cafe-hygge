# Second-day visitors: Keira and Tomas

Next implementation brief, 7 September 2026. **Planned, not shipped.** The
owner wants the first table delivery and left-window repair to introduce these
two recurring characters on the second café day. This precedes
[First books, first connection](first-books.md), where Keira can return as a
familiar face. Current status lives in [the progression roadmap](../progression-roadmap.md).

## Current implementation and intended change

The first evening already books the window repair and table set together for
90 coins. The current table definition uses `delivery: 'carry'`; Lunafreya
handles the kit and assembly. A separate unnamed worker repairs the window.
Keira's table delivery and both personal introductions are not implemented.

Change the table's arrival to **Keira delivering the kit**, then preserve
Lunafreya's existing interruptible assembly and the existing table/chair count.
Give the window worker the recurring identity **Tomas**. Preserve the required
first-evening choices, prices and bedtime, completed purchases and installed work.

## Player experience

On the second open café day, Keira brings the table kit with a trolley and
places it in a safe work area. Tomas arrives for the left window. Their arrivals
can be staggered for clear routes and a readable scene; they need not enter
together or trigger consecutive conversations.

Each offers a brief, optional hello. Their work gives the conversation a
natural subject: where the kit should go, the unfamiliar room, or the view the
repaired window will reveal. Keira and Tomas can acknowledge that they already
know one another through work if both are present. This is an optional detail,
never a prerequisite that requires both actors to be caught together.

These are friendly introductions, not major backstory disclosures. Keira is a
woman (she/her), easy company, good with practical details; Tomas is a man
(he/him), precise and dry. Give both consistent appearances and stable identities
for later jobs and off-duty visits. Use the story bible and accepted ensemble
direction for their fuller voices.

## Dialogue and attendance

Write the two short scene packets before wiring effects: literal speaker
bubbles, trigger, known facts, stable nodes, completion flag and ordinary life
afterward. Most lines need no choice. A useful reply can establish an ordinary
preference, but neither introduction needs a new gift, romance or biography gate.

Use existing speaker-attached bubbles and attended conversation behavior.
When the player chooses to talk, approach safely, preserve interrupted duties
and resume them afterward. These introductions are **optional in both modes**;
they never inherit Holger's mandatory first-customer hold. Use ordinary
game-mode invitation visibility and preserve pending scenes in idle.

Work must finish and actors must leave even if a conversation is ignored.
An uncompleted hello waits for a later off-duty visit without another purchase.
Save each acknowledged node and selected reply; leave/reload restores the
appropriate continuation and completion occurs once. Previously completed
greetings receive returning-visitor lines on later jobs, including the bookshelf.

If generalizing Holger's conversation code is necessary, first make a minimal
behavior-preserving extraction with stable node IDs and an explicit mapping
from his positional flags. Verify the old first introduction before adding
the new scenes. Avoid building a universal story editor or future romance engine.

## Work and save boundaries

- Delivery arrival and kit handoff happen once. Keira's departure releases the
  route/work reservation and enables the existing assembly path at the right
  stage; dialogue completion is not that gate.
- Customers, Keira, Tomas and Lunafreya must retain safe routes in C0 while
  window work and table assembly overlap. Reserve actual work areas, not the
  whole café. Closing preserves safe partial work and lets visitors exit.
- Preserve the original table and window prices and their first-night pairing.
  Neither job charges again or resets because its actor acquired a name.
- Migrate saves according to real project progress. Delivered or partly assembled
  kits do not get delivered again. Installed tables/windows stay installed.
  Existing cafés can meet the characters in later ordinary visits without
  replaying construction or pretending the introduction already happened.
- Keep one actor per recurring identity. An off-duty visit must not duplicate
  the same person who is currently delivering or repairing.

## Acceptance and scope

Verify a fresh first evening → second-day delivery/repair → assembly/service →
closing/home/reopening path, including both ignored and attended introductions.
Exercise the two simultaneous jobs, closing with unfinished work, actual reloads
around handoff and dialogue, completed and partial legacy saves, both modes,
and later greetings without a new booking. No duplicate kit, actor, charge,
completion or lost invitation; existing Holger tutorial choices/hold still work.

Use the art workflow for the new person/delivery art, inspect desktop captures
of the jobs and conversation bubbles, run appropriate regressions and
`__dev.audit()` → zero problems. Follow disposable-browser cleanup. Update
shipped status and script cache tags, commit and push under normal project rules.

This slice does not include bookshelf purchases, book stocking, Holger's gift,
other roster renames, romance, a generic calendar or household routines. Once
it lands, continue with the shelf brief using these established visitor identities.
