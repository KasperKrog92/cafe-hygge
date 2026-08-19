# Overview — what Café Hygge is

Café Hygge is a **soft narrative game that is also a companion app**. It can sit
in the corner of a screen while its owner reads a physical book — a warm room,
small lives unfolding, soft sounds, lovely at a glance and whole if you never
touch it. And for anyone who gets invested, it slowly becomes something more: a
café whose regulars you come to know, whose small projects and friendships move
forward on their own time, and who now and then turn to you with something to
share. The Danish word *hygge* — the art of cozy contentment — is still the
entire mood spec. What changed is that the coziness now has somewhere to grow.

You keep the café as **Nora**, its barista and constant — brewing, tidying,
keeping the fire company, and, over many visits, getting to know the people who
keep coming back. When the café remembers something, it remembers it as Nora
would.

## Two ways to hold it

Café Hygge is built to be enjoyed at two depths at once, with no mode to switch:

- **As a companion.** Leave it in the corner and never interact. Nothing is
  required and nothing is lost in a way that matters — the room is complete on
  its own, exactly as it always was.
- **As a soft narrative.** Get invested and the café rewards attention: the
  regulars have habits, then histories; small projects and friendships advance
  quietly in the background as the café's own days pass; and when something is
  finally ready to happen, it waits for you to be there for it.

The whole design rests on reconciling those two — progression a companion user
never trips over, and an invested user never misses. The mechanism that makes
that possible has its own home: the **[narrative design contract](narrative.md)**.

## Design principles

1. **Interaction is optional; progression is patient.** The café runs itself and
   is whole if you never touch it. When a story beat is ready, it does *not* fire
   on its own and it does *not* expire — a gentle, ignorable invitation appears
   (a soft bubble over a character) and simply waits until you choose it, or
   never do. Nothing nags: no notifications, badges, countdowns, or unread
   counts. Absence is never punished; you cannot fall behind.
2. **Glanceable first.** A single glance should always answer "what's happening
   right now?" — a caption, a patron mid-order, steam rising, the cat
   stretching. The ambient life never depends on having caught an earlier beat.
   Longer arcs live *underneath* the glanceable layer and only ever surface as
   an invitation you can take at your own pace.
3. **Sound is the soul.** The audio layer is ASMR-adjacent: door bells, grinder
   burr, espresso hiss, cup clinks, page turns, rain, fire. Everything is mixed
   *quiet* — it must never compete with reading. Silence between sounds is part
   of the design.
4. **No pressure, ever — but things may grow.** No score to chase, no economy,
   no fail states, no meters draining, no clock you are racing. Patrons never
   get angry; nothing goes wrong; the café is a place where nothing bad happens.
   Progress is something that accrues *for* you in the background, never a demand
   made *of* you. The old bar forbade any accumulation at all; the line now sits
   between **patient progression**, which is welcome, and **pressure**, which
   never is. [narrative.md](narrative.md) draws that line precisely.
5. **Small, alive, hand-made.** Programmatic pixel art on a 960×600 master canvas
   with a warm limited palette. Imperfection (uneven flames, wobbling steam) is
   charm. Everything is generated in code — the whole café is a handful of
   readable files with zero dependencies, and it stays that way.
6. **Time really passes — now across days, too.** A full day cycles every 24
   real minutes: morning light, dusk, lamplit night with stars, drifting
   weather. And those café days accumulate: the longer the café keeps you
   company, the further along its small stories get — carried across sessions,
   never reset to zero, and holding still while the café is closed. See
   [narrative.md](narrative.md).

## What it is not

- Not a clicker with numbers going up on screen — progression is lived through
  characters and small events, never a counter you optimize.
- Not a game that punishes absence — no streaks, no decay, no "you missed it."
  Everything waits.
- Not a productivity tool — no pomodoro timers or focus stats (roadmap ideas in
  this direction should stay optional and off by default).
- Not a streaming overlay first (though it may become OBS-friendly later).

## The cast, briefly

- **Nora**, the barista — the café's constant, and the one whose eyes you keep
  it through. Brews, tidies, clears tables; slowly gets to know the regulars.
- **Patrons** — Danish-named regulars who come and go: readers, chatters,
  window-watchers, each growing a small history over many visits.
- **The cat** — the café's true owner. Sleeps by the fire. Can be petted.

Details in [characters.md](characters.md); the narrative layer they grow into is
[narrative.md](narrative.md).
