# CLAUDE.md

Read **[AGENTS.md](AGENTS.md)**: it is the primary agent guide for this
project (architecture, invariants, conventions, docs index). Everything there
applies to Claude Code sessions in this repo.

Quick anchors:

- Design bar: a **soft narrative game that is also a companion app**. Cozy,
  glanceable, gently alive: patient progression, never pressure. Story beats
  wait for the reader (opt-in, never expire); nothing nags or punishes absence.
  You keep the café as **Lunafreya**; **Nora** is the artist regular. Save/code
  IDs were not swapped: `nora` (`world.barista`, `noraDo`, `nora-routing`) is
  Lunafreya, and the regular ID `lunafreya` is Nora. See `docs/narrative.md`.
- No build step and no runtime dependencies. Serve with `node tools/serve.js`
  (preview config `cafe`) and open `http://localhost:8137/?dev`.
- Verify with `tools/verify-project.ps1` (or `node tools/run-suites.js`); CI
  runs the same checks and deploys only when they pass.
- Depth = baseline y sort; layout lives in `SCENE.L` (master 960×600 coords);
  the barista stands at y=286 to stay visible above the counter.
- Motion is reviewed in motion: film it with `__dev.film` and keep the `motion`
  suite at zero pops (`docs/animations.md`).
- Keep sounds quiet (0.02–0.08 gain) and captions rate-limited.
- Update `docs/` in the same change when behavior, art, sound, or characters change.
