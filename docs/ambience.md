# Ambience that belongs to this café

The bottom-left narrator notices real events in the current café or apartment.
It never describes a purchase as finished, supplies missing props, assumes an
unseen conversation, or fills a quiet moment just because a timer elapsed.
This applies equally to game and idle mode, including established furnished saves.

## When a line can appear

1. **Something happens.** An existing simulation event offers a caption, usually
   behind its existing probability gate. There is no periodic filler generator.
2. **Its facts are true.** Required furniture must be usable according to
   `SCENE.hasFurniture`; views use the repaired window and its curtains. Fire
   warmth additionally requires a burning hearth with no reopening/mantel work.
   Character observations use that actual actor, activity and saved history.
3. **It is still recent.** At most two ambient observations wait, for at most
   eight simulation seconds each. Invalid entries are removed before admission
   and display. The narrator may remain silent when nothing eligible survives.
4. **It still belongs on screen.** Conditions also recheck during the normal
   4.4-second display. Held activities disappear when their state changes;
   departed actors, room changes and a new café day invalidate their old lines.
5. **It leaves breathing room.** Starts remain at least six seconds apart.
   A displayed line cannot repeat for sixty seconds; queued duplicates are
   rejected. The recent history is bounded to 24 entries and stays private to
   this running world. Nothing is added to the persistent save.

All bottom-left text starts with a capital letter, including after opening
quotation marks. The pipeline enforces this for ambience and chosen caption
runs. Keep the prose warm, understated and in the present tense.

Conversations suppress ambient offers. Chosen story runs retain their separate,
uncapped priority queue and are never discarded by the ambience expiry rule.
Ambient expiry never expires an invitation, consumes a choice, or advances an arc.

## Authoring a caption

`SIM._.caption(world, line, options)` accepts a string for a self-contained
recent event, or a descriptor for any conditional claim:

```js
caption(world, {
  text: 'The cat curls up in the warmth of the fire.',
  requires: ['fire']
}, {actor: world.cat, holdState: true});
```

- `requires`: an array of installed furniture IDs or shared facts in
  `SIM._.captionFacts`: `fire`, `view`, `daylight`, `night`, `rain`, `dry`,
  `painter`, `candles`, `empty`, `reading`, `laptop`, `painting`, `armchair`,
  `cup`, `windowSeat`. Actor facts require `actor`. `windowSeat` checks that
  actor's particular window, so a repaired left window cannot expose the right.
- `actor`: the actual patron, cat or Lunafreya. Patron events use the local
  patron wrapper; seated observations retain the seated state automatically.
- `holdState`: keep the actor's current state until the observation disappears.
  Use for a sustained rest or activity, not a completed brief hand action.
- `flags`, `minVisits`: saved evidence needed by a line. Passive backstory
  fragments wait for at least three visits; Holger and Gerda also require their
  acknowledged introduction. No new backstory or remembered answer is invented.
- `when(world, actor)`: extra live evidence, such as the same ship remaining
  visible, an actual passer standing at an open pane, or ongoing knitting.
- `place`: defaults to `cafe`; apartment events explicitly use `home`.
- `key`, `cooldown`, `maxAge`: optional shared repeat identity and timing
  overrides. Ordinary captions use the defaults above.

`SIM._.pickCaption(world, pool, {actor})` filters before choosing. Roster pools
can mix strings and descriptors. Rejected or expired lines never block a later
eligible event. Conditions are explicit metadata, not guesses from words in
the caption. Match special wording to its rules at the same call site.

Describe arrivals as arrivals, before the order and walk to a seat. Describe
an occupied usual seat only if that seat exists and the patron has visited
before. First visits never claim an established usual seat. Reading, laptop and painting
musings require those activities; painting musings stop while a finished work
waits for its attended reveal. Empty wall shelves do not supply books. A cup
must really be a drink, and text must not assume the regular's full-menu order
when the current café supplies something else.

Weather narration follows actual rain transitions, not the next rolled target.
Rain and distant bells can be heard with boarded windows; visual street, ship
and painter observations need a view. Clock jumps do not replay dawn/dusk
observations. Piano text begins when playing actually starts. A cat may rest
beside a cold hearth, but warmth requires fire, and kneading requires a bed or
an installed rug. These rules extend to temporary work as well as progression.

## Verification

Run `tools/verify-project.ps1 -Suite ambience`. The suite checks both modes,
every fireplace phase, mantel work, exact window access, empty shelves, legacy
books, character activities/history, queue timing, capitalization, transitions
and story priority. It drives real cat settling events and exports boarded and
working-hearth caption frames, then runs two ten-minute private simulations.
It is also included in the complete project verification runner.
