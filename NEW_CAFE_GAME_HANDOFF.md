# Project Hearthcup — greenfield café game handoff

> Working title only. This document is a self-contained product, technical, and
> production handoff for an LLM starting a new project inspired by Café Hygge.
> It was prepared on 2026-08-23. Read the whole file before creating code.

## 1. Instruction to the receiving LLM

Start a **new repository** for this game. Do not turn the existing Café Hygge
browser companion into this game, and do not assume its zero-dependency browser
architecture should survive. You may read the Café Hygge repository for tone,
art vocabulary, ambient behavior, audio ideas, and its "invitation waits"
narrative rule. Treat it as design research, not a codebase to port.

Unless the owner overrides a decision below, use the recommendations in this
handoff as the working specification. Record meaningful changes to these
decisions in `docs/decisions/` rather than silently drifting away from them.

The immediate goal is not to build a whole life sim. It is to prove, with a
small playable greybox, that these three activities feel good together:

1. moving through a café as a customized owner-barista;
2. serving one guest without time pressure; and
3. spending the proceeds to place one object that makes the room feel more like
   yours.

## 2. Executive recommendation

Build a greenfield 2D game in **Godot 4.7.2 stable**, using the standard build
and **typed GDScript**. Target Windows desktop first, with Steam-friendly
Windows/Linux exports later. Use Godot's Compatibility renderer unless a tested
visual feature requires another renderer.

Use hand-authored **2D pixel art in a three-quarter top-down view**, made in
**Aseprite** (recommended) or Pixelorama (free/open-source alternative). Work at
a 640×360 logical resolution, use 32 px floor tiles with a 16 px furniture
placement grid, and begin with 32×48 character sprites. Keep the initial café
small enough to understand in one screen.

Use LLM assistance for architecture, implementation, tests, content validation,
writing drafts, production tooling, and documentation. Do **not** make runtime
LLM calls part of the game. Player-facing dialogue and romance must be authored,
reviewed, deterministic, saveable, localizable, and playable offline.

The recommended game is a **cozy café management and relationship game**, not a
reflex cooking game and not a punishing business simulator. It may have money,
ingredients, upgrades, and choices, but no debt spiral, customer anger, romance
penalties, or missable story events.

## 3. Product thesis

### One-sentence pitch

Create a young café owner, shape the bare little room into a place that feels
like home, develop a personal menu and daily rhythm, and slowly become important
to the regulars who choose to return—including, if you want, someone you fall
in love with.

### Player fantasy

"This is my place. I remember who sits by the window, I know how they take their
coffee, and every chair, recipe, and ritual in this room has a story."

### Emotional arc

The café begins viable but sparse: second-hand counter, basic brewer, two tables,
small menu, uncertain owner. It becomes warmer because the player pays attention,
makes choices, and spends what they earn. The end state is not a maximally
efficient factory. It is a room full of recognizable people and evidence of a
life built there.

## 4. What to inherit from Café Hygge

Carry these ideas forward:

- Cozy, legible pixel art with warm pools of light and small autonomous motion.
- Sound as part of the room: rain, fire, grinder, steam, ceramic, pages, door.
- Regulars with habits, favorite seats, projects, and lives beyond the player.
- The **invitation-waits rule**: background conditions may become ready on their
  own, but meaningful story payoffs never play unseen, never expire, and never
  punish absence.
- Quiet writing; emotionally specific rather than loud or gag-driven.
- A world that remains pleasant during idle moments.
- Versioned saves, migration discipline, deterministic developer controls, and
  visual verification as first-class production tools.

Deliberately leave these constraints behind:

- The browser, plain-JavaScript, no-build, and `file://` requirements.
- The requirement that interaction be completely optional.
- The ban on money, upgrades, menu progression, or explicit accumulation.
- The fixed protagonist Nora. The new owner is player-created.
- Programmatic code-drawn final art. The new game needs an asset pipeline.
- The assumption that the café must run indefinitely without player direction.

The old code may inspire algorithms and content. Do not copy it mechanically.

## 5. Working assumptions

These defaults let development begin without blocking on a large design survey:

- Solo/small-team production with heavy LLM assistance.
- Premium single-player game; no ads, energy system, microtransactions, or
  always-online dependency.
- Desktop first: keyboard/mouse, with controller support before public demo.
- A playable character who walks around the café and interacts with people and
  stations. This is not a detached management cursor.
- One café is the heart of the game. A tiny adjoining street can come later;
  do not begin with a whole town.
- One save profile in the prototype; three profiles plus autosaves are a later
  product target.
- Relationships and romance are authored. No generative NPC dialogue at runtime.
- The owner wants a gentle game, but not an entirely frictionless screensaver.
  Resource choices and gradual earning are welcome; punishment and urgency are
  not.

If any of these assumptions is wrong, change it explicitly before expanding the
prototype.

## 6. Design pillars

### 6.1 Build a place, not a production line

Decorating is a central verb. New furniture should alter the look and lived
behavior of the room, not merely increase a percentage. A reading lamp may make
a regular choose that corner. A shared table may invite pairs. A pastry case
visibly fills with the day's selection.

### 6.2 Service is a rhythm, not a test

Orders create structure and satisfying audiovisual sequences, but customers do
not have visible patience bars. A mistake can become a harmless correction or a
small human moment, never a relationship-damaging failure. Better gear reduces
repetition and expands expression; it should not be required to beat a timer.

### 6.3 Familiarity is progression

People first appear as customers, then become familiar, then confide, collaborate,
and possibly fall in love. Mechanical rewards should often be embodied: a
regular brings a plant, teaches a recipe, pins a postcard to the wall, or starts
leaving a book behind.

### 6.4 The player character has a past, not a build

Character history and traits create dialogue color, starting keepsakes, and a
few alternate approaches. They are not min-max stats and must not permanently
lock the player out of warmth, competence, or romance.

### 6.5 Meaningful moments wait

An event may become available after a number of visits, a furniture placement,
or a relationship threshold. Once ready, it waits for the player to choose an
appropriate conversation or close-of-day scene. Calendar dates and absence do
not destroy it.

## 7. Non-goals

Do not design these into the first release:

- Reflex minigames for every drink.
- A large explorable town, farming, combat, or survival meters.
- Staff scheduling, payroll, rent deadlines, loans, or bankruptcy.
- Online multiplayer, user-generated content sharing, or cloud accounts.
- Runtime procedural dialogue powered by an external model.
- Hundreds of ingredients or realistic food-service simulation.
- Fully modular portrait generation for every possible player appearance.
- Mobile and console certification during the prototype.
- Seasons before the vertical slice is fun.

## 8. Core loop

Use a day as a readable sequence of phases, not a real-time deadline.

### Morning: make a plan

- Choose a small menu from known recipes.
- Restock simple ingredient categories.
- Rearrange furniture or place one new purchase.
- Pick an optional "mood" for the day only if it is diegetic—for example quiet
  reading, rainy comfort, or pastry morning. Do not turn this into a buff stack.

### Open café: serve and notice

- A modest roster of guests arrives in authored or seeded order.
- Patrons settle and wait without anger or visible countdowns.
- The player greets, takes orders, uses stations, delivers items, clears tables,
  and chooses when to talk.
- Drink preparation uses short contextual sequences: select recipe, walk to the
  correct stations, watch/hear the satisfying preparation, deliver. Avoid
  repetitive precision inputs.
- Regulars can carry small ambient behaviors and one optional story invitation.
- The player may close early without losing a unique event. Unserved anonymous
  traffic simply does not become revenue; no scolding recap.

### Close: see what changed

- Show a warm, compact ledger: sales, ingredient cost, and what the café can now
  afford. Never grade the day with stars or red failure labels.
- Play at most one chosen relationship/story beat.
- Let the player buy a recipe, piece of gear, or furnishing when affordable.
- Autosave after resolution.

### Long loop

Serve → earn → personalize/expand → attract new habits and people → deepen
relationships → unlock recipes and room possibilities → make the café more
distinctly yours.

## 9. Major systems

### 9.1 Character creation

Prototype only what can survive into production:

- name;
- pronouns;
- 4–6 skin tones;
- a small set of hair shapes and colors;
- 3 starter outfits/aprons;
- one background card;
- two personality traits.

Suggested background cards:

- **former librarian** — starts with a small book exchange and a tea recipe;
- **baker's family** — starts with one pastry and a worn recipe card;
- **office escapee** — starts with a reliable grinder and an old desk lamp;
- **returned local** — begins with one regular recognizing the family name;
- **travelling cook** — starts with a spice drink and a postcard wall piece.

Suggested traits: gentle, curious, practical, bold, playful, reserved. Traits
tag additional dialogue options or phrasing; they do not remove baseline kind
choices. Backgrounds grant one modest starting variation, not a balance class.

For sprites, use layered components and palette swaps. For dialogue portraits,
use a simpler assembled bust or a neutral expressive player silhouette at first.
Do not commit to hand-drawing every expression across every customization
combination until an art-cost spike proves it affordable.

### 9.2 Building and decorating

- 32 px structural tile grid; 16 px furniture placement grid.
- Furniture has footprint, facing, collision, interaction anchors, comfort tags,
  and a painter-sorting baseline.
- Placement preview must show valid/invalid cells clearly without visual noise.
- Allow move, rotate, store, and undo. Never destroy an item accidentally.
- Start with one room and fixed walls. Room expansion is a later milestone.
- Favor behavior-bearing objects over filler: lamps, bookshelves, plants,
  cushions, record player, community board, pastry case.
- Style tags can influence visitor preferences and ambient actions, but avoid a
  single optimal "coziness score." Several coherent styles should work.

### 9.3 Menu, recipes, and ingredients

Keep the initial model legible:

- Ingredient categories: coffee, milk, tea, cocoa, flour/pastry, spice/seasonal.
- Recipes are data: inputs, station sequence, sale price, cost, animation/sound
  cues, tags, and unlock conditions.
- The daily menu has limited slots. Choosing it expresses the café's identity
  and keeps service readable.
- Running out makes the item gently unavailable; it does not create angry
  customers or a failed day.
- New recipes come from experimentation, suppliers, and relationships. A recipe
  learned from a person should retain that provenance in its description.

Do not build a free-form combinatorial cooking system first. It multiplies UI,
balancing, animation, and test cost before the core loop is proven.

### 9.4 Gear and upgrades

Gear should unlock breadth, reduce busywork, or create sensory delight:

- kettle → tea and cocoa;
- steam wand → milk drinks;
- display case → pastries and visible morning stock;
- better grinder → queue a grind while doing another task;
- second preparation surface → make two-item orders less repetitive;
- record player → player-selected room music and new patron behavior.

Avoid flat speed percentages as the dominant upgrade language. If numbers are
used internally, communicate the upgrade through changed action and animation.

### 9.5 Economy

The game needs an economy because building up the café is part of the fantasy.
Use a **soft economy**:

- revenue minus ingredients becomes spendable funds;
- funds never go below zero;
- there is no rent, debt interest, or game over in the initial design;
- no purchased item is permanently consumed by placement;
- essential starter supplies are always obtainable;
- an unprofitable menu slows a purchase but does not damage the café;
- price changes, if later added, should be bounded and framed as menu curation,
  not extraction.

Economy balance must be simulated outside the scene tree and covered by tests.
The first upgrade should be reachable in 1–2 short in-game days; the player must
feel the room changing immediately.

### 9.6 Customers and relationships

Separate anonymous visitors from authored regulars.

- Anonymous visitors make the room feel alive and support the economy.
- Regulars have fixed visual identity, arrival preferences, favorite orders,
  favorite seats/tags, conversation pools, relationship state, and story arcs.
- Remembering a favorite can create a warm optional gesture, never a quiz the
  player fails.
- Internal relationship values may be numeric, but the primary player-facing
  feedback should be behavior, journal notes, new greetings, and changed scenes.
- Content unlock conditions may combine visits, witnessed beats, room tags,
  served recipes, and explicit player choices.
- Once a beat becomes ready, it waits. It does not expire at season end or
  because another character advanced.

### 9.7 Romance

Romance should feel like a deeper form of familiarity, not a separate gift
optimization game.

- Every romanceable character is also complete as a platonic route.
- Flirting is opt-in and clearly worded.
- No jealousy system, affection decay, or punishment for exploring early
  chemistry.
- An explicit commitment conversation creates route exclusivity only when the
  player knowingly chooses it.
- Rejection is kind and does not remove the character from the café.
- Romantic events should grow from shared habits and personal arcs, not generic
  heart thresholds alone.
- Define all characters as adults and decide the age-rating/content boundary in
  writing before romance production.

For the vertical slice, include one romanceable regular with two early chemistry
beats and a complete platonic version. Do not attempt a full romance ending yet.

### 9.8 Time and story scheduling

Use a day index and phases, but avoid a continuously draining clock in the first
prototype. A visit roster provides pacing. The player can finish the available
service and choose to close.

Narrative events use explicit states such as `locked`, `progressing`, `ready`,
`playing`, and `complete`. Background progress can make an event `ready`; only
the player's interaction makes it `playing`. Ready events persist in the save.

If seasons are added later, seasonal dressing and new availability may rotate,
but unique character payoffs must queue and wait rather than disappear.

### 9.9 Save model

- Version the save schema from day one.
- Use migrations for every shape change; never silently discard a valid old save.
- Autosave only at safe transaction boundaries: start/end day, completed
  purchase, completed story beat, and settings change.
- Write atomically through a temporary file and keep the previous good save as
  backup.
- Store stable content IDs, not Node paths or display names.
- Persist RNG state/seed where it affects the day's roster.
- Add export/import of a human-portable save before public early access.
- Test corrupt, missing, older-version, and unknown-content cases.

## 10. Scope ladder

### Milestone 0 — feel prototype (2–4 weeks of focused work)

- One 12×8-tile café room, counter, two tables, door.
- One customizable placeholder player.
- One generic patron and one regular.
- One drink, one station sequence, one delivery.
- One currency transaction.
- One purchasable chair or lamp and working placement mode.
- One short optional conversation.
- Save/load for layout, funds, avatar, and relationship flag.
- Developer panel and headless checks.

This is successful when a new player can complete one compact loop without an
explanation and says that buying/placing the first object feels meaningful.

### Milestone 1 — vertical slice (roughly 3–6 months, depending on art capacity)

- 3 regulars; 1 romanceable.
- 8–10 recipes across 4 station types.
- 20–25 furnishings, including behavior-bearing pieces.
- 2 visual day moods and rain.
- 5–7 story beats, all obeying the waiting rule.
- Character creator with the constrained production set above.
- Complete first-week progression and a meaningful room transformation.
- Keyboard/mouse and controller.
- Settings, save profiles, content validation, automated tests, and packaged
  Windows build.

The slice should be suitable for private playtests and a short public demo. Do
not promise a release schedule from LLM coding speed; art, writing, tuning, and
playtesting will dominate.

### Plausible 1.0 content ceiling for a small team

- 8–10 authored regulars.
- 3 romance routes, all with complete friendship routes.
- 25–35 recipes.
- 60–80 furnishings across several compatible style families.
- One expandable café plus a very small exterior strip, not a whole town.
- Approximately 8–12 hours for a first relationship-rich playthrough, with
  continued decorating afterward.

Treat this as a ceiling to validate, not a commitment.

## 11. Engine choice

### Recommendation: Godot 4.7.2 + typed GDScript

Why it fits this project and LLM-heavy development:

- Dedicated 2D engine, pixel-coordinate workflow, TileMapLayer, animation,
  navigation, UI, audio, input mapping, and cross-platform export in one tool.
- GDScript is compact and gradually typed. Types improve static detection,
  completion, and readability for both humans and coding agents.
- `.gd`, `.tscn`, `.tres`, `.godot`, and JSON-based content workflows are
  inspectable from the filesystem. The engine has a useful headless/CLI mode for
  imports, scripts, tests, runs, and exports.
- MIT-licensed with no engine fee or royalty. The game can remain proprietary.
- Low operational complexity is valuable for a project whose limiting factors
  are content and art rather than engine performance.

Use the standard GDScript build, not Godot .NET, unless a concrete library need
appears. C# is a good language, but adding the .NET toolchain does not currently
buy enough for this 2D game to offset the extra setup and export surface.

### Alternatives considered

| Option | Strength | Why it is not the default |
| --- | --- | --- |
| Unity 6 | Large ecosystem, mature 2D/console pipeline, C#, official AI/MCP options | More packages/editor surface and more generated metadata for an agent to manage; paid Pro tier above the current revenue/funding threshold; unnecessary scale for this game |
| GameMaker | Fast 2D iteration, proven commercial games, approachable GML | Commercial license required to sell; more editor-centric workflow and a narrower architecture/testing ecosystem than the chosen Godot setup |
| Defold | Lightweight, Lua, excellent cross-platform exports including consoles, no royalties | Smaller ecosystem and more manual game/tool architecture; a strong runner-up if tiny web/mobile builds or direct console export become the primary constraint |
| Construct 3 | Very quick no-code prototypes and browser workflow | Event sheets are harder for coding agents to review and refactor as a growing textual system; subscription cost; less suitable for a content-heavy long-lived codebase |
| Phaser/custom web stack | Maximum continuity with Café Hygge and excellent browser automation | Requires building or selecting more editor, content, save, packaging, and asset-pipeline infrastructure; best only if web is the primary product, not merely a demo target |

Reconsider Godot only if one of these becomes a firm requirement:

- first-party console production from the beginning;
- a web-first product with instant-link distribution as the central business;
- a team already deeply expert in another engine;
- a critical commercial asset/plugin available only elsewhere.

Godot console releases are possible through approved third parties, but the
Godot Foundation does not provide official console export templates. Do not plan
console scope until there is budget and platform approval.

## 12. Graphics direction and pipeline

### Camera and composition

Use a **three-quarter top-down café interior** on a rectangular grid. It gives
the player readable walking, furniture placement, visible tabletops, and enough
face/body language for relationships. Keep the first café to one composed screen
at normal zoom. This preserves Café Hygge's glanceability even though the new
game is interactive.

Avoid a strict isometric diamond grid. It looks attractive but increases asset
directions, placement complexity, occlusion problems, and LLM-generated geometry
errors without materially helping the core fantasy.

### Technical art target

- Logical viewport: 640×360 (16:9), nearest-neighbor integer scaling where
  possible. It scales exactly 3× to 1920×1080.
- Floor/wall tile: 32×32.
- Furniture placement increment: 16 px.
- Standing character: initial 32×48 canvas; revisit only after the art spike.
- Character movement: four directions, 4-frame walk initially; reuse animation
  timing and item overlays.
- Dialogue portrait: 96×96 or 128×128 for authored regulars.
- Palette: one warm shared base palette plus controlled material ramps. Night
  lighting should tint a stable base rather than require duplicate assets.
- Import: lossless, filtering off, mipmaps off for pixel assets.
- Sort world sprites by a declared floor baseline, not sprite center.

### Asset strategy

Use **Aseprite** as the main recommendation because it supports layers, frame
tags, tilesets, sprite-sheet export, a CLI, and Lua automation. Its source files
are binary, so store source and exports deliberately. Pixelorama is the
free/open-source fallback and supports animation, tilemap layers, palettes, and
sprite-sheet export.

Repository layout should keep art sources outside Godot's import root:

```text
art-source/aseprite/
audio-source/
game/assets/sprites/
game/assets/audio/
tools/export_art.ps1
```

Commit both source art and deterministic runtime exports. Add a script that
rebuilds sprite sheets from source when Aseprite CLI is available. Do not require
that tool merely to run the game.

Use image generation for mood exploration, material ideas, color keys, and
composition references. Do not accept generated sheets as final just because
they look pixelated. Repeated characters, exact frame dimensions, transparent
edges, topology, and animation continuity need human cleanup. Keep provenance
and license notes for every external or generated asset.

### Character customization cost control

Build the player from aligned layers:

```text
shadow
hair_back
body/skin
outfit
held_item
hair_front
accessory
```

All parts share frame counts, origins, and directional tags. Palette swaps
cover colors; shape variants are separate sprites. Test every combination with
an automated contact sheet. Do not use the same combinatorial approach for all
NPCs—authored regulars should have bespoke silhouettes and portraits.

### Required art spike before production

Produce and review these at final intended scale:

1. one morning café screenshot with player, regular, counter, two tables;
2. the same room at warm rainy evening;
3. one build-mode screenshot with a placement ghost;
4. one conversation layout with portrait and choices;
5. one player walk cycle with two skin tones, two hairstyles, and two outfits.

Lock perspective, outline treatment, palette discipline, UI scale, and character
proportions only after these are seen together. Do not manufacture a large asset
catalog before this review.

## 13. Audio direction

Start with real recordings or properly licensed libraries for room tone, rain,
ceramic, grinder, steam, door, footsteps, and fabric. Synthesis can supplement
small UI/tonal cues. Keep buses for ambience, weather, appliances, foley, music,
and UI. Apply conservative gain staging; the room should remain comfortable for
long sessions.

Music should be sparse and optional. Let appliance rhythm and environmental
sound carry much of the café. Every looping sound needs seamless loop points and
a test for duplicate instances after scene changes.

Store asset source, author, URL, license, edit notes, and in-game use in
`docs/asset-register.csv` from the first imported external file.

## 14. Technical architecture

### Principles

- Separate testable domain rules from Nodes and scene presentation.
- Prefer composition, signals, and small services over a deep inheritance tree.
- Use stable string IDs in data; resolve them through a validated content DB.
- Keep scenes shallow. Let the editor own complex `.tscn` layout; let scripts
  and content data own behavior.
- Avoid a giant all-knowing GameManager autoload.
- Deterministic simulation seeds make bugs and playtests reproducible.
- No system is complete without its debug controls and save migration path.

### Suggested repository layout

```text
AGENTS.md
README.md
VERSIONS.md
docs/
  vision.md
  product-scope.md
  art-bible.md
  narrative-bible.md
  technical-architecture.md
  asset-register.csv
  decisions/
art-source/
audio-source/
game/
  project.godot
  addons/
  assets/
  content/
    characters/
    dialogue/
    furniture/
    recipes/
  src/
    autoload/
    domain/
    cafe/
    characters/
    narrative/
    ui/
    dev/
  scenes/
  test/
tools/
  run.ps1
  check.ps1
  test.ps1
  export_art.ps1
```

### Autoloads

Keep this list small:

- `AppState` — current profile, phase, and high-level state transition API.
- `ContentDB` — loads and validates recipes, furniture, characters, and IDs.
- `SaveService` — schema, migrations, atomic IO, profiles, backup.
- `AudioService` — buses, persistent settings, scene-safe playback.
- `EventBus` — only cross-cutting domain/presentation events; do not use it to
  hide ordinary local dependencies.

Scene routing may live in the root app scene rather than another autoload.

### Domain modules

Write these as typed, mostly scene-independent classes:

- `DayPlan` / `DayRoster`
- `Order` / `RecipeResolver`
- `InventoryLedger`
- `EconomySimulator`
- `RelationshipState`
- `NarrativeScheduler`
- `CafeLayout` / placement validator
- `SaveData` serializers and migrations

This lets an LLM run fast headless tests without driving the whole café scene.

### Content format

Use versioned JSON for catalogs because it is diffable, scriptable, and easy for
an LLM to extend. Validate it at boot in development and in a dedicated CLI
check. Do not let arbitrary JSON directly mutate game state.

Example recipe shape:

```json
{
  "id": "drink.cinnamon_latte",
  "name_key": "recipe.cinnamon_latte.name",
  "ingredients": {"coffee": 1, "milk": 1, "spice": 1},
  "steps": ["grind", "pull", "steam", "finish"],
  "required_gear": ["gear.espresso_basic", "gear.steam_wand"],
  "cost": 4,
  "price": 11,
  "tags": ["warm", "milky", "spiced"],
  "unlock": {"flag": "recipe.cinnamon_latte.learned"}
}
```

Example regular state in a save:

```json
{
  "character_id": "regular.ida",
  "visits": 7,
  "trust": 3,
  "chemistry": 1,
  "known_preferences": ["drink.filter_coffee", "seat.window"],
  "completed_beats": ["ida.intro", "ida.rain_book"],
  "pending_beats": ["ida.borrowed_umbrella"],
  "route": "uncommitted"
}
```

The numbers are implementation detail. UI should translate them into human
observations.

### Dialogue system

Do not build a sprawling custom graph editor first. Run a one-day spike with
Nathan Hoad's text-based Dialogue Manager because its script-like files,
conditions, mutations, and translation export fit an LLM-assisted workflow.

For Godot 4.7.2, pin an exact compatible release in `VERSIONS.md` rather than
tracking `main`. As of this handoff, Dialogue Manager v3.10.5 explicitly targets
Godot 4.7; Dialogue Manager v4 is newly released and should be adopted only
after its migration/stability tradeoff is evaluated. If the spike reveals that
the addon makes saveable event state or testing awkward, retain its text syntax
ideas and implement only the minimal deterministic runtime needed.

All dialogue conditions and mutations must call a small, documented narrative
API. Dialogue files must not reach into arbitrary scene nodes.

## 15. LLM-first development workflow

The goal is not to make the engine write the game automatically. The goal is to
make every change easy for an agent to understand, run, inspect, and prove.

### Repository contract

Create an `AGENTS.md` in the new repo containing:

- product pillars and forbidden pressure mechanics;
- exact engine/addon versions;
- authoritative run, test, check, and screenshot commands;
- save migration rules;
- content schema locations;
- art scale, placement grid, and import rules;
- required docs to update by change type;
- visual verification requirements;
- instruction to preserve owner art/layout directions exactly.

Keep `README.md` for a human newcomer and `AGENTS.md` for implementation rules.

### Pin the environment

`VERSIONS.md` should record Godot, each addon, Aseprite/Pixelorama, and platform
tool versions. Do not upgrade the engine and addons in the same feature change.
Create a dedicated upgrade branch and rerun imports, tests, save fixtures, and
visual baselines.

### One-command checks

Provide PowerShell wrappers that locate a configured Godot executable and make
these workflows unsurprising:

```powershell
./tools/run.ps1
./tools/check.ps1
./tools/test.ps1
```

`check.ps1` should import resources headlessly, parse scripts, validate all
content IDs/references, validate dialogue, and fail with a nonzero exit code.
`test.ps1` should run unit/integration tests and produce concise output.

Godot officially supports `--headless`, `--script`, `--check-only`, import, run,
and export workflows. Use those capabilities so an agent does not depend on
manual editor clicks for every verification.

### Tests

Pin **GUT 9.7.1** (or the current reviewed 9.7.x patch) for Godot 4.7 and run it
from the CLI. Test at least:

- recipe affordability and ingredient deduction;
- no-negative-funds invariant;
- order lifecycle and duplicate completion prevention;
- furniture footprint/door/station access validation;
- relationship thresholds and explicit romance commitment;
- ready narrative beats never auto-consume or expire;
- save round-trip, migrations, corrupt backup recovery, and unknown IDs;
- deterministic day roster from seed;
- all content references resolve;
- all avatar layer combinations share expected frame geometry.

Do not chase raw coverage percentage. Cover state transitions and irreversible
data first.

### Developer harness

Build a dev panel available only in debug builds, conceptually similar to Café
Hygge's `__dev` harness. It should support:

- set day/phase/weather;
- set funds and inventory;
- spawn a chosen regular/order;
- force a narrative beat to ready;
- set relationship route/state;
- place/remove a furniture item;
- save/load/reset a named fixture;
- freeze or speed simulation;
- set deterministic RNG seed;
- capture whole-screen and named-region screenshots;
- run live layout/content invariants.

Every feature request should include the debug control needed to reach its state
without replaying hours.

### Visual review

Automated logic tests cannot judge coziness, occlusion, animation readability,
or UI scale. For each visual change, capture at least one 640×360 screenshot at
native logical resolution and one integer-scaled view. For lighting changes,
capture morning and rainy evening. For furniture, show placement preview and a
character walking behind/in front of it.

### LLM writing workflow

- Keep a narrative bible with voice, facts, boundaries, and relationship state.
- Ask an LLM for variants and continuity checks, not unchecked final prose.
- Every line must have a stable ID and speaker.
- Run scripts that flag missing IDs, unreachable cues, unknown conditions,
  duplicate choices, and overly long UI lines.
- Human-review all romance, sensitive backstory, and player identity text.
- Store content provenance if generated material is retained.

### Codex-specific note

Official OpenAI documentation describes Codex as able to understand codebases,
build/test features, and create browser-based game prototypes. This project
should expose command-line checks and visual capture so those strengths apply to
Godot too. Do not make a particular hosted model or subscription part of the
game's runtime architecture.

## 16. First implementation mission

The receiving LLM should begin with this sequence unless the owner redirects it.

### Step A — create the greenfield repo and contracts

1. Create the new repository outside `cafe-hygge`.
2. Add `README.md`, `AGENTS.md`, `VERSIONS.md`, and the initial docs listed in
   the proposed structure.
3. Pin Godot 4.7.2 standard and GUT 9.7.1.
4. Add `.gitignore` for `.godot/`, exported builds, temp files, and local editor
   settings. Decide Git LFS rules for large audio/source-art files before they
   arrive.
5. Add working `run.ps1`, `check.ps1`, and `test.ps1`.

### Step B — executable greybox

1. Make a 640×360 main scene with nearest-neighbor scaling.
2. Greybox a one-screen 12×8-tile café, door, counter, station, and two tables.
3. Add a player capsule/sprite with 4-direction movement and interaction prompt.
4. Add one patron lifecycle: enter → sit → order → wait → receive → leave.
5. Add one coffee recipe with a two-station preparation sequence.
6. Add funds and an end-of-day purchase of one lamp.
7. Add placement preview, validity, rotate, confirm, cancel, and undo.
8. Save and restore player appearance, funds, lamp placement, and one regular
   conversation flag.
9. Add debug actions and screenshots for every state above.

### Step C — prove the architecture

Before adding a second drink or character, demonstrate:

- content check passes from one command;
- headless tests pass;
- the scene runs without parser/runtime errors;
- a save survives round-trip and one synthetic version migration;
- a forced story invitation remains pending across save/load;
- a screenshot shows correct sprite/furniture baseline sorting;
- the owner has seen and approved the camera/perspective greybox.

### Milestone 0 acceptance test

A fresh player can create a simple owner, open the café, greet a regular, make
and deliver coffee, close, buy a lamp, place it, save, reload, and see both the
lamp and the regular's changed greeting. No timer, anger, or fail state appears.

## 17. Decisions to ask the owner before the art spike

These are important, but none must block the first greybox:

1. **Primary platform:** Windows/Steam as assumed, or web-first?
2. **Control feel:** walk the owner directly as assumed, or manage from an
   overview/point-and-click view?
3. **Visual perspective:** three-quarter top-down as recommended, or the more
   side-on dollhouse composition of Café Hygge?
4. **Art participation/budget:** will the owner draw, hire an artist, curate
   assets, or rely mostly on generated concepts plus cleanup?
5. **Romance tone:** sweet/low-heat, mature but non-explicit, or another target;
   and which age rating is desired?
6. **Cultural setting:** explicitly Danish/contemporary, fictional Nordic town,
   or a less geographically fixed cozy setting?
7. **Session length:** 10–20 minute days as assumed, or longer freeform shifts?
8. **Launch ambition:** polished hobby release, commercial Steam title, or a
   prototype used to find collaborators/funding?

Record answers in `docs/decisions/0001-product-baseline.md`.

## 18. Main risks and mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Content scope explodes | Every regular multiplies writing, portraits, events, schedules, and testing | Vertical slice with 3 regulars; use a content budget before adding anyone |
| Character customization explodes art | Four directions × actions × outfits × hair quickly becomes hundreds of frames | Layered paper-doll sprites, palette swaps, shared timings, automated contact sheets, limited launch set |
| Service becomes repetitive | Walking station sequences can feel like chores without time pressure | Short recipes, strong sound/animation, batch gear, variable patron moments, playtest after one drink before adding ten |
| Decorating becomes stat optimization | A single coziness number undermines personal expression | Use qualitative tags and behavior changes; support multiple viable style families |
| Romance becomes transactional | Gift/heart grinding conflicts with familiarity fantasy | Gate on shared beats and choices; hide raw numbers; keep complete friendship routes |
| LLM output creates inconsistent architecture | Agents can rapidly add parallel patterns and undocumented state | Small domain APIs, typed code, pinned versions, one-command checks, decision records, strict save/content schemas |
| LLM-authored dialogue loses voice | Volume is easy; emotional coherence is hard | Narrative bible, stable facts, scene outlines, human review, continuity validators |
| Engine/editor changes break agent work | Scene files and imports can be sensitive to version changes | Pin Godot/addons, keep `.godot/` untracked, isolate upgrades, use CLI import/check |
| Save changes erase long playtests | Relationship games accumulate valuable state | Version from day one, migrations, backup, fixture saves, export/import |
| Final art lacks consistency | Image generation and asset packs can create style collage | Approve an art spike and palette first; generated work is reference until cleaned and conformed |

## 19. Research basis and current tool facts

These sources were checked while preparing this handoff. Re-check prices and
versions before committing money or upgrading.

- [Godot home and current release](https://godotengine.org/) — current stable
  listed as 4.7.2 on 2026-08-23; dedicated 2D engine and desktop/mobile/web
  exports.
- [Godot license](https://godotengine.org/license/) — MIT license; commercial
  games may use their own license, with engine notice requirements.
- [Godot command-line tutorial](https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html)
  — headless runs, scripts, import, checks, and exports.
- [Typed GDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html)
  — static error detection, completion, documentation, and typed declarations.
- [Godot export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html)
  — Windows, macOS, Linux, web, Android, and iOS project exports.
- [Godot console support](https://godotengine.org/consoles/) — console shipping
  uses approved third-party providers rather than official Foundation templates.
- [Aseprite CLI](https://www.aseprite.org/docs/cli/) and
  [Aseprite licensing FAQ](https://www.aseprite.org/faq) — batch sprite-sheet,
  tileset and JSON export; commercial artwork is allowed.
- [Pixelorama](https://pixelorama.org/) — open-source alternative with animation,
  pixel tools, tilemaps, and sprite-sheet export.
- [Dialogue Manager releases](https://github.com/nathanhoad/godot_dialogue_manager/releases)
  and [repository](https://github.com/nathanhoad/godot_dialogue_manager) — typed
  current compatibility and MIT license.
- [GUT releases](https://github.com/bitwes/Gut/releases) — 9.7.x adds Godot 4.7
  compatibility and provides GDScript unit testing with CLI support.
- [Unity pricing](https://unity.com/products) — free Personal tier under the
  published eligibility threshold; paid Pro above it; current platform/AI/MCP
  inclusions.
- [GameMaker licensing](https://gamemaker.io/en/help/articles/how-to-upgrade-your-gamemaker-licence)
  — free non-commercial use, one-time Professional commercial license, separate
  Enterprise console subscription as of 2026-08-04.
- [Defold overview](https://defold.com/about/) and
  [license](https://defold.com/license/) — Lua-based cross-platform engine with
  commercial use and no royalties, under the Defold License.
- [Construct pricing](https://www.construct.net/en/make-games/buy-construct) —
  subscription pricing and no royalties.
- [Official OpenAI/Codex use cases](https://learn.chatgpt.com/use-cases) — Codex
  workflows for codebase understanding, building/testing features, and game/web
  prototyping.

## 20. Copyable kickoff prompt

Use this with the first LLM in the new repository:

```text
Read NEW_CAFE_GAME_HANDOFF.md in full and treat it as the working product and
technical specification. This is a greenfield Godot game, not a port of Café
Hygge. First, summarize any conflicts between the handoff and the repository as
it exists. Then implement Step A of "First implementation mission": create the
repo contracts, pin versions, scaffold the Godot 4.7.2 standard project, and
make run/check/test PowerShell commands work. Do not begin large art production
or expand scope. Use typed GDScript, preserve a 640×360 pixel-art target, and
show concrete verification output. If Café Hygge is available, read only its
overview/narrative/art guidance for tone; do not copy its architecture.
```

---

The best first deliverable is a tiny playable loop with a warm lamp at the end,
not a large design database. The project earns the right to grow when that loop
already feels personal.
