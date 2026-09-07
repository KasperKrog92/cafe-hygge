# Café Hygge: scalability and workflow audit

7 September 2026. Baseline: `717c50c`, before the corrections in this audit.
This assesses the owner's current progression roadmap and desktop scope. It is
a sampled technical review with executable checks, not a promise of a bug-free
game or a certification of every browser and future feature.

## Verdict

**The planned café is achievable on this foundation. Continue with it.**
One café, an apartment, authored improvements, contractors, a richer menu and
patient character stories fit a small browser simulation. There is no evidence
that Canvas, JavaScript, static hosting or using LLMs to develop the game imposes
an approaching hard limit at that scale.

The main risk is the growing number of rules that must agree: what is installed,
who owns a task, whether service may interrupt it, what closing waits for, and
what a saved checkpoint means after an update. More content is manageable;
continually adding exceptions to these rules will become expensive. The right
response is small extractions and stronger verification at the next relevant
milestones. A wholesale engine/framework rewrite is not justified by this audit.

This is already more than a visual prototype. It has an explicit lifecycle,
versioned save migrations, private seeded test worlds, shared geometry, one
rendering composition path and actual reload tests. Those are useful foundations
for continuing beyond what a single conversation can remember.

## Evidence and immediate corrections

Reviewed the current runtime and roadmap, 30 recent commits in detail, the
earlier preparation audit, local verification tools, GitHub's verification
workflow and recent task histories. The histories included “Develop Holger
dialogue arc”, “Build interruptible home projects”, “Tune arrivals and first
upgrades”, “Fix save correctness and isolation”, and “Investigate Chrome process
overload”. Task reports were treated as historical claims and checked against
the current implementation.

### A real closing deadlock — fixed

The longer furnished-room simulation exposed this sequence:

1. A table is dirty and customers are still waiting at the counter at 21:30.
2. Customers wait for clearing before placing their orders.
3. Lunafreya's normal clearing rule only runs while the shop is `open`.
4. The closing ritual waits for the queue to finish before beginning.

The café therefore remains in `closing`, with an idle barista, a queue and dirty
crockery. Seed 84 reproduced it on the first evening; seed 42 reached it after
ten completed days. The existing audit still reported zero problems: each
individual state was valid, but the combined system could not make progress.

[sim-characters.js](../js/sim-characters.js) now retains clearing priority during
closing while queued customers or orders remain. The ordinary closing circuit
still takes over once service is finished. The fix adds no timeout, teleport,
cancelled customer or lost project progress. [verify-hours.js](../tools/verify-hours.js)
now explicitly exercises late queued service with both indoor and terrace
crockery through service, home and reopening.

### Two verification gaps — fixed

- The initial full browser run passed 14 of 15 suites. `c0` still measured the
  interruption deadline from joining the queue, contrary to the latest intended
  behavior of waiting until the customer reaches the counter. Its observation
  now matches that requirement and still checks safe, prompt interruption.
- The art suite derived its seats from a fresh production world. C0 now starts
  empty, so it silently tested only two empty time-of-day fixtures. It now uses
  explicit modest and furnished private worlds: 12 occupancy/time fixtures and
  44 occupied-seat placements across the two times. Its performance sample now
  composes the furnished scene. The earlier empty-scene timing was misleading.

[test-soak.js](../tools/test-soak.js) makes the longer check repeatable without a
browser or runtime dependencies. It measures progress as well as valid state:
ordinary days, bounded populations, held narrative payoffs, actual evening
purchases, installation and save size. It emits a diagnostic state on a stall.
GitHub Actions now includes a shorter four-scenario soak and script syntax
checks alongside the existing save/audio tests. Actual browser coverage remains
a separate requirement.

### Verification record

The following local checks use disposable saves and private worlds:

| Check | Evidence |
| --- | --- |
| Save/isolation | 14 Node regression groups pass |
| Audio settings | Existing Node checks pass |
| Shipped script syntax | 20 scripts pass |
| Final complete browser run | All 15 suites pass after the closing fix, with no page errors and confirmed session cleanup |
| Long soak after the fix | Four six-hour scenarios pass: 24 simulated hours, 80 completed café days and 1,440 audit samples |
| Short CI form | All four one-hour scenarios pass after leaving time for purchases to finish |
| Corrected focused suites | `art`, `c0`, `hours` and `projects` pass |
| Normal entry | Real click initializes audio; cappuccino reaches seating in about 37 seconds; earnings and night audit pass |
| Life UI/reloads | Seven saved plant/home phases, planner/mode/sleep interactions and real two-tab ownership takeover pass |
| First-day UI/reloads | Mandatory Holger invitation, actual dialogue buttons, both purchases, seven reloads and 1440×900/1600×900 captures pass |
| Project reloads | 74 current first-opening, table, hearth and C0 checkpoint fixtures pass |
| Clock-driver probe | Actual `main.js` frame callback: 1 s → 1 s; repeated timestamp → 0; 60 s → 60; 120 s and 600 s → 90 s, always in steps of at most 0.25 s |
| Furnished composition | Corrected warm samples around 0.9–1.4 ms median and 5.2–5.9 ms p95; final complete run: 1.0 / 5.9 ms |

The two modest runs completed 21 days each; the two furnished runs completed
19 each. All purchased improvements finished, no story payoff advanced without
attendance, and the largest sampled save was 2,700 UTF-8 bytes. Patron peaks
were 4/6 in the modest runs and 7 in both furnished runs; particle peaks were
18–24. These are bounded-population observations, not proof that browser memory
or audio nodes never leak. Tooling: Node 24.16.0 and agent-browser 0.35.1.

Reports and captures are in ignored `.art-review/sanity-*`
directories. The longer simulation uses four worlds, two seeds per room type;
seed 84 also purchases available improvements through the actual evening APIs.
The short CI form stops buying halfway through its run so a last-minute purchase
cannot be mistaken for a stalled job. The remaining time must complete its work.
Both room fixtures begin after the attended first introduction. This measures
simulation time, not a day-long real browser or audio session. The UI tests
exercise the attended introduction separately.

Composition timing excludes browser presentation, DOM updates, GPU completion,
audio, PNG encoding and sustained battery use. A 60 Hz display has about 16.7 ms
per frame, so these measurements support headroom on this machine; they do not
establish a guaranteed frame rate on every laptop. No native Safari execution,
OS sleep/resume test or browser heap-retention investigation was performed.

## What scale means for this game

At the baseline, the 20 shipped JavaScript files total 631,664 bytes and 13,171
lines, including the dev harness. Compressing each locally with gzip totals
about 185 kB; that is a size estimate, not a measured production download.
The existing seven-patron admission cap bounds the main character simulation.
History is saved as compact records, rather than an accumulating event replay.

More players each run their own local café. They do not add simulation work to
the owner's laptop or require a server to run every character. Hosting traffic
is a separate capacity question. GitHub Pages currently documents a 1 GB site
limit and a soft 100 GB/month bandwidth limit; large real-audio assets or a
large audience could eventually justify changing static hosting without
replacing the game engine. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

| Planned growth | Assessment and preparation |
| --- | --- |
| Bookshelf, books, reading corner, home comforts | Fits. Establish one improvement definition and separate installed furniture from usable contents before adding many variants. |
| More regulars and story arcs | Fits if the simultaneous crowd remains bounded. Establish stable conversation/node IDs, prerequisites and resumable choices before producing many branching conversations. |
| Painting, delivery and contractor visits | Fits. The window worker proves one independent work actor; the next delivery should introduce explicit reservations and release of work areas. |
| Room expansion | Fits the rendering approach. Requires an authored full-room layout, coordinated navigation/cache changes and tests with ongoing work and existing seats. |
| Cakes, stock, ovens and dishwashing | Meaningful new simulation work. Prove one recipe with reserve-once portions and one replenishment cycle before broadening the menu. |
| Hired helper | The largest architectural boundary in the written roadmap. Work must become claimable by either worker, with safe interruption and one owner per order/station. A second copy of the current barista logic would be fragile. |
| Shared-home relationships | Feasible, but combines authored story conditions, persistent choices and two autonomous evening routines. Build after dialogue and work ownership are explicit. |
| Real recorded audio | Fits the existing buses. Use bounded loading, reuse decoded buffers and retain synthesis fallback. Profile decoded memory and sustained playback before loading a large library. |

Do not interpret “fits” as “already implemented”. Each row still needs art,
behavior, save treatment and verification. Hundreds of stored story beats are
a different challenge from hundreds of simultaneous characters. The former is
mainly content organization; the latter would exceed the current crowd/layout
design and needs a new performance assessment.

## Preparation, in useful order

### 1. Keep integration tests able to contradict the implementation

The closing bug was an interaction between individually plausible rules.
Static bounds checks and tests of one feature cannot prove the whole day will
finish. Keep the new late-queue cases and seeded soaks. Add one natural complete
day/home/next-morning case for new shared routines, including a pending story
invitation and in-progress work when applicable.

CI previously ran only save and audio tests. This audit adds syntax and simulated
days, but it still does not run the browser suites or real UI/reloads. Move those
into reproducible CI as the next verification improvement. Keep Chromium and
WebKit coverage distinct; WebKit automation is useful, with occasional native
Safari checks for audio, storage and background behavior. Record exact tool
versions or pin development tooling for reproducibility. The shipped game can
remain dependency-free while development uses pinned tools.

Publishing from `main` currently happens independently of these checks. Before
public player saves matter, gate deployment on successful verification. Direct
commits to `main` can remain the owner's workflow; a PR process is not required
to make deployment wait for tests. Do not treat a prior task's green report as
evidence for the current commit.

### 2. Make the next improvement establish a reusable contract

At the audit baseline, [sim-life.js](../js/sim-life.js) had a small `PROJECTS` catalogue, but
prices/phases, save validation, geometry, installed effects and planner buttons
still had separate knowledge of individual projects. The plant also had its
own path. This is reasonable for a few prototypes and a growing maintenance
cost for a large catalogue.

With the bookshelf milestone, centralize ID, prerequisites, price, work-phase
IDs and installed capabilities. Keep bespoke animation/render functions where
needed. Derive planner availability and validation from explicit contracts,
while preserving historical schema migrations independently of today's content.
The acceptance test is that another comparable improvement needs its data,
art and any unique behavior without repeatedly editing the general lifecycle.
Do not build a universal editor or convert every existing feature first.

Availability already has a shared foundation in `SCENE.hasFurniture`,
`activeGeometry` and `layoutKey`; the old audit's load-time-only-layout warning
is partly resolved. Remaining cases include a shelf without books, work-site
reservations and replacing service equipment. A “full counter” boolean currently
also controls menu, familiar-café arrivals, boot behavior and some cat perches.
Separate those capabilities before staged counter upgrades give that one flag
several incompatible meanings.

Keep layout coverage affordable: representative early/full rooms, each new
availability gate, and combinations that share a route or work area. Testing
every possible subset grows exponentially and should not become a requirement
for an unrestricted future catalogue. Use prerequisites to define valid layouts
and test those contracts, including one partial installation and one removal
or replacement when the feature supports them.

### 3. Stabilize saved meaning before large story and routine edits

Holger's introduction currently records positional line flags such as
`holger-introduction-line-6`. Job progress uses numeric steps, and lifecycle
checkpoints include task positions and routes. Those are workable for the current
fixed sequence; inserting/reordering earlier content can change what an old
cursor means even when the JSON remains valid.

Use stable node/phase IDs and explicit migration rules as these systems grow.
Keep dialogue conditions, choice consequences and completion separate from its
visual presentation. Ensure the existing Lunafreya background choices and
ready invitations survive edits. Do not rename internal IDs merely to match a
character's display name: the preserved artist ID is intentional compatibility.

The biggest production files are `sim-characters.js` (1,654 baseline lines) and
`sim-core.js` (1,499). Their size alone is not a failure, but their responsibilities
matter. Extract service/task ownership before hiring help and extract general
conversation execution before adding many stories. Follow the successful earlier
shop-lifecycle extraction: preserve behavior and pass the old suite before
adding the next feature. Small JSDoc contracts and readable multi-line state
transitions will help agents more immediately than a compulsory TypeScript or
module migration.

### 4. Protect a player's growing save before inviting long-term play

The codec, migrations, immediate important writes, storage-error status and
Web Locks ownership are good foundations. Tests confirm actual reloads and a
two-tab handoff. Ordinary transient guests are deliberately reconstructed;
persistent projects, history and choices are the continuity contract.

There is still no export/import or recoverable previous-good save, and write
errors are primarily visible to developers. Add a quiet save export/import flow,
preserve recoverable valid bytes on a future migration failure, and make failure
to save discoverable. Test malformed imports and blocked storage. This is a
release preparation task, not a reason to block development under the owner's
current permission to replace unsupported development saves.

Browser-local storage is not a backup or cross-device synchronization. WebKit
documents best-effort eviction and heuristic grants of persistent storage; the
existing `persist()` request is useful but cannot guarantee recovery after data
deletion or a device change. Moving to IndexedDB alone would not solve that.
[WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)

### 5. Define the browser's unattended promise precisely

The shared elapsed-time driver is substantially better than assuming that a
background interval fires on schedule. This audit confirmed the 90-second cap
in the actual callback. The old comment saying a long gap is “dropped” is
imprecise: the first 90 seconds are advanced and the excess is discarded.

A frozen or discarded browser page cannot continue executing ordinary timers.
Audio may help with some throttling conditions but is not an operating-system
guarantee. Current behavior should be described as progressing while the browser
allows execution and holding through longer suspensions, preserving waiting
payoffs. That fits the no-pressure design. Do not promise continuous progression
through a sleeping laptop or closed browser under this implementation.
[Chrome page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)

Retain the cap until the owner deliberately chooses a different product rule.
Test muted/unmuted background runs, discard/reload, sleep/resume and no duplicate
catch-up on desktop Chrome and native Safari before release. These operational
tests establish something accelerated `SIM.update` tests cannot.

## What recent development suggests about the workflow

The history shows productive, bounded visual refinements and completed vertical
features. The earlier save isolation fix and lifecycle extraction were followed
by successful apartment and project work. The abandoned-browser incident also
led to real `try/finally` cleanup and session checks, which this audit verified.
These are evidence of a workflow that can improve after a problem.

Some major changes touch many systems: the first-opening commit changed 42
files, including 15 runtime scripts; the first-day update changed 30 files,
including 12 runtime scripts. Some of that is expected cross-cutting feature
work and documentation. It still makes final integration checks necessary,
especially when a task is interrupted and resumed or receives new requirements.

The sampled art and dialogue follow-ups mostly show normal iteration about how
something should look and feel. They are not evidence that the engine is failing.
Continue giving exact visible directions and reviewing rendered results. For
shared behavior, state the trigger and outcome: “a customer reaches the counter
while she is assembling a table” is a better test anchor than a function name.

The docs contain roughly 52,000 words across `docs/**/*.md`. Useful context is
already larger than should be reread for every change. Older roadmap headers
still claimed implemented features were unbuilt; this audit corrects those
headers and points the entry docs here. Keep one current status/next-milestone
reference, use links for specialist contracts and preserve history in Git.
Rewrite superseded rules where they live instead of continually appending
exceptions. New tasks should need the repository's relevant docs, not a replay
of the owner's past chats.

Use one implementation task writing this checkout at a time. Read-only reviews
can be independent. At completion, record the observable result, tests actually
run against the final changes, screenshots where useful and any unverified
boundary. Avoid adding many undocumented dev shortcuts or rerunning every visual
suite for a trivial isolated sprite adjustment.

## Practical next step

Shared improvement preparation is complete on 7 September 2026: the four
existing choices now use [one contract](architecture.md#shared-improvement-contract)
for definitions, purchase eligibility, current save limits and installed effects.
Schema v7, historical migrations and bespoke work routines are preserved.
Continue with the bookshelf as the next named milestone, then separate books;
empty-shelf availability and delivery reservations still need implementation. Follow that
with verification automation and save export/import before substantial public
play. Defer helper scheduling until the menu/task work actually reaches that
boundary, but do not build the helper by copying the single-worker state machine.

The subsequently accepted [community direction](plans/community-and-character-stories.md)
gives this milestone Keira's delivery and Holger's books. Follow the current
pass status in [the progression roadmap](progression-roadmap.md) and the bounded
[First books brief](plans/first-books.md); the audit's measurements above remain
historical evidence, not verification of those future features.

The remaining unknown is mainly how much authored content and animation the
owner wants to produce, and how pleasant its pacing feels over ordinary reading
sessions. Automated checks can establish continuity and correctness; a few full
human reading sessions must establish whether the expanding game still feels
quiet and worth returning to.
