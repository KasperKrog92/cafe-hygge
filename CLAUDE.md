# CLAUDE.md

Read **[AGENTS.md](AGENTS.md)** — it is the primary agent guide for this
project (architecture, invariants, conventions, docs index). Everything there
applies to Claude Code sessions in this repo.

Quick anchors:

- Design bar: a **soft narrative game that is also a companion app**. Cozy,
  glanceable, gently alive — patient progression, never pressure. Story beats
  wait for the reader (opt-in, never expire); nothing nags or punishes absence.
  You keep the café as Nora. See `docs/narrative.md`.
- No build step / no dependencies; open `index.html` or `python -m http.server 8137`.
- Depth = baseline y sort; layout lives in `SCENE.L` (master 960×600 coords);
  the barista stands at y=286 to stay visible above the counter.
- Keep sounds quiet (0.02–0.08 gain) and captions rate-limited.
- Update `docs/` in the same change when behavior, art, sound, or characters change.
