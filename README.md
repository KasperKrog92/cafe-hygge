# ☕ Café Hygge

A tiny café that putters along in the corner of your screen while you read.
No score and no fail state: a warm room you keep as Lunafreya, regulars with
small stories that wait for you, patrons coming and going, a cat by the fire,
rain on the window, and soft ASMR-ish sounds. Left alone it is pure ambience;
attended to, the café slowly grows with the improvements you choose.

Everything is generated in code: the pixel art is drawn on a canvas every frame,
and every sound — the door bell, the grinder, the espresso pull, the steam wand,
cup clinks, page turns, murmured conversation, fire crackle, rain, and a sparse
music box — is synthesized live with the Web Audio API. There are no image or
audio files, no dependencies, no build step.

**Play it live:** <https://hygge.kasper-krog.dk>

## Development direction

`main` contains the current café. GitHub Pages publishes it from CI, and only
after every check passes. The [progression roadmap](docs/progression-roadmap.md)
records what is shipped and what comes next; start with it and
[AGENTS.md](AGENTS.md). The [development workflow](docs/development.md) has the
verification commands, and the [audit](docs/audit.md) the latest review.

The former branch tips are preserved as `archive/idle-2026-09-06` and
`archive/game-2026-09-06` tags. The separate game experiment is archived reference
material; new work grows from the current café on `main`.

## Running it

Open `index.html` in any modern browser, that's it.

Or serve it (nicer for some browsers):

```bash
node tools/serve.js
```

then visit <http://localhost:8137>. Any static server works too.

Click **step inside** to start the sound (browsers require a click before audio
can play). Then leave it running next to your book.

## What happens in the café

- **Patrons** wander in (more in the daytime, night owls after dark), queue,
  order — cappuccino, cinnamon latte, chamomile tea, hot chocolate, cardamom
  bun… — wait for their drink, then find a seat. They sip, read books, chat in
  soft murmurs with table-mates, and eventually head back out. Some return
  their cup to the counter; Lunafreya clears up after the ones who don't.
- **Lunafreya**, who keeps the café, grinds, tamps, pulls shots and steams milk
  (each with its own sound), rings the little counter bell, and putters between
  orders: wiping the counter, polishing cups, tending the fire, and in the
  evening going home to her apartment.
- **Regulars and neighbours** (Holger, Gerda, Keira, Tomas and more) come back,
  remember you, and now and then have something to share. Their invitations
  wait until you tap them.
- **Improvements**: savings from quiet service buy a repaired window, tables,
  shelves or a reopened fireplace, which people then deliver and build.
- **The cat** sleeps by the fire, stretches, grooms, and pads between favorite
  spots. Click it to say hello.
- **Time passes**: a full day cycle runs in 24 minutes — morning light, dusk,
  lamplit night with stars and a moon, town windows glowing across the street.
- **Weather drifts**: rain comes and goes, streaking the window and hushing
  the room.
- Little **captions** narrate the moment: *"Freja settles in with a book."*

## Controls

Move the mouse to reveal the bar in the corner:

| Control | Effect |
| --- | --- |
| 🔊 / slider | mute (`m`) and volume |
| settings | separate sound volumes; allow rainy weather; restore sound defaults; start over |
| ⛶ | fullscreen (`f`) |

Sound settings are remembered between visits. Start over asks for confirmation,
then erases stories, relationships, savings and improvements in this browser.
It keeps sound preferences and returns to the entry screen.

## Notes

- Keep the window visible (it can be unfocused) for the smoothest animation;
  if the tab is hidden the café keeps living at a gentler tick.
- Built with plain HTML/CSS/JS: `js/audio.js` (sound synthesis),
  `js/scene-*.js` (pixel-art renderer), `js/sim-*.js` (the little lives),
  `js/main.js` (loop and controls). Development checks live in `tools/`.
- Deeper documentation lives in [`docs/`](docs/) — design ethos, architecture,
  the full character/sound/art references, and the [roadmap](docs/roadmap.md).
  Agents (and curious humans) start at [AGENTS.md](AGENTS.md).
