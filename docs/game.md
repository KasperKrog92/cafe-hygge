# Fleur de Lune — first playable restoration slice

## Implemented

`index.html` starts in a modest ruined room. Lunafreya is directly controlled
with WASD or arrows; clicking walks to a floor point. E or the contextual action
button walks to the current task and performs it. Actions have short work
animations and visible permanent results. Movement routes around the table.

The authored opening sequence is: clear fallen plaster and broken wood, sweep,
repair the window, patch the walls and restore light, place a second-hand table
and two chairs, unpack kettle/coffee/cups, turn the sign, welcome Holger, brew,
and bring him the first coffee. Supplies are already in the acquired room;
there is no shop or economy yet. Placement is authored, not a furnishing editor.

Lunafreya uses the existing character renderer with blonde hair in its large-bun
style, sage clothing and a pale work apron. Her opening voice is observant,
quietly determined and fond of imperfect things. Holger reuses the familiar
reader's visual identity. He walks in and waits without impatience.

Two short authored conversations bring the camera closer. Explicit Continue
buttons advance dialogue. Work and movement stop for the exchange; rain,
breathing and audio continue. After the first cup, Holger stays and the scene
can be enjoyed quietly. Repeat service, additional customers, an economy,
expansion and relationship progression are not implemented yet.

## Architecture and state

The game entry loads `audio.js`, `scene-core.js`, `scene-people.js`, then `game.js`.
`game.css` supplies the surrounding interface. No build or external dependency.
The original simulation and full renderer are retained through `reference.html`;
they are reuse material, not the game runtime. Do not introduce a second Nora or
an NPC Lunafreya by blindly enabling the legacy spawn loop.

`SCENE.L.restoration` owns the room bounds, task approaches, entry and seat.
The game uses a 960×600 canvas, the original 60px character ruler and sorted
furniture/person baselines. A smooth camera zoom frames the restoration room
and conversations; pointer coordinates are inverted through that transform.
The table has a blocked footprint and visible-corner routing. Future room content
must extend collision and routing rather than assuming the current room is general.

`game.js` owns the authored task sequence, movement, rendering and dialogue.
This intentionally small first slice is not a general room/economy engine. Split
those responsibilities into plain-script modules when the next feature warrants it.

The separate `fleur-de-lune-save` localStorage key stores version 1, the completed
ordered task IDs, introduction and first-service flags. The idle narrative save
and its migration ladder are untouched. Load validates an ordered prefix and
prerequisites; malformed or unsupported saves fall back to a fresh room. Future
schema changes must increment the version and migrate supported older saves.
Completed tasks persist; movement and unfinished work restart. Storage failures
leave the game playable and show a save limitation. No closed-tab catch-up,
absence penalties or expiring invitations. Hidden simulation frames cap elapsed
time because this slice contains no idle progression system.

Audio is opt-in through a real click. Existing window taps and music are reused;
there is no fireplace in this room, so fire is disabled for this runtime. Audio
settings are not saved by this slice. No new sound synthesis was introduced.

## Verification

Serve the checkout on port 8137 and open `/?dev`. `__game` exposes state,
player, layout, `act()`, `update(dt)`, `audit()` and `shot()` only in dev mode.
The audit checks furniture overlap, service prerequisites and duplicate work.
This is distinct from the much broader legacy `__dev.audit()`.

- In a disposable browser profile, complete the opening using the action button.
  Check each visible repair, arrival, both conversations and first cup.
- Use arrows and floor clicks, including paths across both sides of the table.
- Leave a conversation open while advancing time: work and save flags must wait.
- Reload during restoration and after completion; check retained progress.
- Enable sound with a real click and check console errors.
- Check desktop and narrow layouts; capture the ruined/restored room and dialogue.
- Run `node --check js/game.js` and `git diff --check`.

Legacy art fixtures require `reference.html?dev`; the art-review tool defaults to
that reference on this branch. Use the reference directly for the original
`__dev.audit()` and `__dev.shot()` while reviewing this branch.

### Repeatable opening check

Use a fresh disposable `agent-browser` session at `/?dev`, then in PowerShell:

```powershell
$gameCheck = Get-Content -Raw tools/verify-game.js
agent-browser --session YOUR_DISPOSABLE_SESSION eval $gameCheck
```

This runs the real task actions and simulation, both conversations, a 300-second
conversation wait, persistence and idle-save isolation. Reload afterward to check
completion survives. It intentionally requires an empty game save; never run it
in the player's daily browser profile. It supplements visual/input checks.

Verified 5 September 2026: eight tasks, two conversations, waiting-state safety,
completion reload, malformed-save fallback and prerequisite normalization; game
audit empty and browser errors empty. Desktop and 390px-wide layouts inspected.
The retained reference passed ten repeatable images, eight occupancy scenarios
and its full invariant audit. Audio initialization was checked, not a listening
review of the mix.
