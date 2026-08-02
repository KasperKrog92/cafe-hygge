# ☕ Café Hygge

A tiny idle café that putters along in the corner of your screen while you read.
No goals, no score — just a warm room, a barista named Nora, patrons coming and
going, a cat by the fire, rain on the window, and soft ASMR-ish sounds.

Everything is generated in code: the pixel art is drawn on a canvas every frame,
and every sound — the door bell, the grinder, the espresso pull, the steam wand,
cup clinks, page turns, murmured conversation, fire crackle, rain, and a sparse
music box — is synthesized live with the Web Audio API. There are no image or
audio files, no dependencies, no build step.

## Running it

Open `index.html` in any modern browser — that's it.

Or serve it (nicer for some browsers):

```bash
python -m http.server 8137
```

then visit <http://localhost:8137>.

Click **step inside** to start the sound (browsers require a click before audio
can play). Then leave it running next to your book.

## What happens in the café

- **Patrons** wander in (more in the daytime, night owls after dark), queue,
  order — cappuccino, cinnamon latte, chamomile tea, hot chocolate, cardamom
  bun… — wait for their drink, then find a seat. They sip, read books, chat in
  soft murmurs with table-mates, and eventually head back out. Some return
  their cup to the counter; Nora clears up after the ones who don't.
- **Nora the barista** grinds, tamps, pulls shots, and steams milk (each with
  its own sound), rings the little counter bell, and putters between orders —
  wiping the counter, polishing cups, tidying the pastry case.
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
| 🌧️ | let the rain come, or keep the skies clear |
| 🔥 | fire crackle sound on/off |
| 🎵 | music box on/off |
| ⛶ | fullscreen (`f`) |

Settings are remembered between visits.

## Notes

- Keep the window visible (it can be unfocused) for the smoothest animation;
  if the tab is hidden the café keeps living at a gentler tick.
- Built with plain HTML/CSS/JS: `js/audio.js` (sound synthesis),
  `js/scene.js` (pixel-art renderer), `js/sim.js` (the little lives),
  `js/main.js` (loop and controls).
- Deeper documentation lives in [`docs/`](docs/) — design ethos, architecture,
  the full character/sound/art references, and the [roadmap](docs/roadmap.md).
  Agents (and curious humans) start at [AGENTS.md](AGENTS.md).
