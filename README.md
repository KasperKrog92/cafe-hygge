# Fleur de Lune

A restoration and community game growing from Café Hygge. Play as **Lunafreya**,
a blonde-bun café owner who sees possibility in a neglected little room.

The first playable slice takes you from fallen plaster and dusty floorboards to
a repaired window, warm light, a second-hand table and the very first coffee for
Holger. Two intimate conversations introduce the people behind the place.

## Play locally

Open `index.html`, or run `python -m http.server 8137` and visit
[localhost:8137](http://localhost:8137). No build step or dependencies.

- Move with WASD or arrow keys; click the floor to walk.
- Press E or the action button to approach and complete the next restoration.
- Choose Continue to advance conversations. You can linger without penalty.
- Enable sound for quiet synthesized rain and music.

Progress saves in this browser under a separate Fleur de Lune key. This slice
ends after the first cup; expanded service, additional rooms and deeper
relationships are future work, not existing features.

## Branches and documentation

Development belongs on `game`. Do not modify `idle`. The existing public
[Café Hygge](https://hygge.kasper-krog.dk) is the companion café deployment,
not a hosted preview of this game. `reference.html` retains that café in this
checkout for studying and reusing its animation, simulation and atmosphere.

- [Direction](docs/overview.md)
- [Story and lore inspiration](docs/story-and-lore.md)
- [Implemented slice, architecture, saves and testing](docs/game.md)
- [Next slices](docs/roadmap.md)
- [Agent guidance](AGENTS.md)

All art remains programmatic, using the original character renderer and quiet
Web Audio synthesis. Open `/?dev` to expose the small `__game` test harness;
the reference café's larger `__dev` harness lives at `/reference.html?dev`.
