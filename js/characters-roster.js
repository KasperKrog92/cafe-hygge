/* Café Hygge — the regulars roster and story arcs, as pure data.

   `window.CAST.regulars` is the bible for established regulars: each entry
   fixes a face, a drink, a set of habits, a usual seat, and the pools of lines
   they might overhear or muse aloud. `window.CAST.arcs` is the companion bible
   for the soft-narrative layer: named story arcs owned by a regular, each with
   a café-day progress threshold, an invitation glyph, a beat (the caption run
   the reader taps to play), and the lasting flag it sets. Pure data, zero
   dependencies — loaded before sim-core so the sim, the MEMORY reconcile, and
   the dev audit can all read it. Arc *definitions* live here; arc *state*
   (stage/progress/pendingBeat) lives in the MEMORY save (docs/narrative.md §4).

   Entry shape (see docs/plans/regulars-and-conversations.md):
     id         stable key — schedule + line lookup + continuity
     name       must live OUTSIDE PATRON_NAMES so no random patron shares it
     nameStyle  'masculine' | 'feminine' — drives beard/appearance coherence
     colors     the fixed look (skin, hair, top, pants, scarf, longHair,
                hairStyle, beard) — swatches from docs/art.md
     drink      must match a DRINKS name in sim-core.js
     traits     wantsBook, ownBook, chatty, laptop, pianist
     murmurPitch, speed
     umbrella   fixed umbrella color for the rain, or null
     arrival    { from, to } in-world hour window
     stay       [min, max] seconds
     seat       preference key → a SEAT_PREFS predicate in sim-core.js
     lines      line pools — arrival fires once on entry; overheard rides a
                shared-table murmur; musing rides a solo beat (reading, gazing,
                typing); backstory is a rarer tier under musing (Phase 2). The
                optional continuity pools (Phase 3) refine the openers and seat
                moments: arrivalRain (a wet arrival), arrivalReturn (a familiar
                face Nora already knows, from the persisted bonds count), settle
                (once, taking the usual seat), and usualTaken (the usual seat is
                occupied). Each falls back to a generic line when absent. See
                regularLine()/specLine() in sim-patrons.js / sim-core.js. A
                chatty:false regular carries no overheard pool.

   Row one is Holger, carrying the exact values his hardcoded builder used, so
   his behavior is unchanged. Phase 1 added the rest of the roster and wired the
   sim to read these rows; Phase 2 gave the roster its voice — the overheard,
   musing, and backstory pools below now surface at the existing caption seams.

   Each regular is chosen to ride a behavior that already exists — reading,
   window-gazing, laptop typing, dozing — so the roster is almost pure data:
     Holger   ~09:00  espresso        left fireside   reading (never chats)
     Gerda    ~10:00  chamomile tea   window perch    window-gaze, chatty
     Kasper   ~13:30  iced matcha     dining table    laptop typing
     Freya    ~18:30  matcha latte    right fireside  reading, dozes by the fire
   Deliberate contrasts: morning vs. dusk (only Liv sits late enough to doze),
   silent vs. chatty, and one of each behavior so no new behavior code exists. */
(function () {
  'use strict';

  window.CAST = {
    regulars: [
      {
        id: 'holger',
        name: 'Holger',
        nameStyle: 'masculine',
        colors: {
          skin: '#d99c6b', hair: '#d9d2c0', top: '#4a7a5a', pants: '#4a3222',
          scarf: '#a94f3f', longHair: false, hairStyle: 1, beard: true
        },
        drink: 'espresso',
        // tendsFire: an old habit — he keeps the hearth he sits by fed, getting
        // up to lay a log when it burns low (sim-patrons updateSeated)
        traits: { wantsBook: true, ownBook: true, chatty: false, laptop: false, pianist: false, tendsFire: true },
        murmurPitch: 130, speed: 46,
        umbrella: '#3d4a5c',
        arrival: { from: 9, to: 9 + 2 / 3 },
        stay: [280, 420],
        seat: 'firesideLeft',
        lines: {
          arrival: ['Holger steps in, as steady as the clock.'],
          arrivalRain: ['Holger comes in out of the wet, hat dripping, unhurried as ever.'],
          arrivalReturn: ['Holger takes his corner as though he never left it.'],
          settle: ['Holger lowers himself into the usual armchair and opens his book.'],
          usualTaken: ['His chair is taken; Holger waits by the fire, patient as the tide.'],
          // fireUp: rising to tend the hearth; fire: the log going on. Solo, in
          // his register — a sailor keeping his fire the way he kept a stove.
          fireUp: [
            'Holger marks his page and rises to see to the fire.',
            'Holger notices the fire sinking and gets up, unhurried.'
          ],
          fire: [
            'Holger sets a log on the fire with a sailor\'s care; it catches and climbs.',
            'Holger banks the fire up again, the way he once kept a stove at sea.'
          ],
          // chatty: false — his story is solo, so no overheard pool by design
          overheard: [],
          musing: [
            'Holger reads the same paragraph twice, in no hurry to move on.',
            'Holger checks the weather through the window, weighing the ferries.',
            'Holger lets the espresso go cold, lost in the page.',
            'Holger nods to himself at something in the book.'
          ],
          backstory: [
            'Holger sailed the Kattegat for thirty years; he still reads the sky out of habit.',
            'Holger mentions a harbour town he hasn\'t seen in years, then lets it drift.'
          ]
        }
      },
      {
        id: 'gerda',
        name: 'Gerda',
        nameStyle: 'feminine',
        colors: {
          skin: '#f0c49a', hair: '#d9d2c0', top: '#8a6a9a', pants: '#5a5a5a',
          scarf: '#a94f3f', longHair: false, hairStyle: 3, beard: false
        },
        drink: 'chamomile tea',
        traits: { wantsBook: false, ownBook: false, chatty: true, laptop: false, pianist: false },
        murmurPitch: 205, speed: 40,
        umbrella: '#a94f3f',
        arrival: { from: 10, to: 10 + 1 / 2 },
        stay: [240, 360],
        seat: 'windowPerch',
        lines: {
          arrival: ['Gerda comes in with the morning and takes her window seat.'],
          arrivalRain: ['Gerda shakes the rain from her scarf and makes for the warm window.'],
          arrivalReturn: ['Gerda gives Nora a small wave — an old, easy habit.'],
          settle: ['Gerda settles onto the window sill, right where she likes it.'],
          usualTaken: ['Her window seat is taken; Gerda finds another and watches the street anyway.'],
          overheard: [
            'Gerda drifts into a story about the coldest winter she remembers.',
            'Gerda tells someone about the garden she used to keep.',
            'Something at the next chair makes Gerda laugh, warm and unhurried.'
          ],
          musing: [
            'Gerda watches a cyclist wobble past and smiles to herself.',
            'Gerda follows a couple down the street until they turn the corner.',
            'Gerda hums something old under her breath.',
            'Gerda warms her hands on the tea and watches the light change.'
          ],
          backstory: [
            'Gerda says mornings like this were Erik\'s favourite.',
            'Gerda talks about Erik in the present tense, then gently corrects herself.'
          ]
        }
      },
      {
        id: 'kasper',
        name: 'Kasper',
        nameStyle: 'masculine',
        colors: {
          skin: '#d99c6b', hair: '#8a5a2a', top: '#5a7a8a', pants: '#2c3038',
          scarf: null, longHair: true, hairStyle: 1, beard: false
        },
        drink: 'iced matcha',
        traits: { wantsBook: false, ownBook: false, chatty: false, laptop: true, pianist: false },
        murmurPitch: 150, speed: 52,
        umbrella: '#4a7a5a',
        arrival: { from: 13 + 1 / 2, to: 14 },
        stay: [300, 460],
        seat: 'diningTable',
        lines: {
          arrival: ['Kasper drops into a chair with his laptop and a sigh.'],
          arrivalRain: ['Kasper hurries in from the rain, shielding the laptop bag.'],
          arrivalReturn: ['Kasper is back — same chapter, same chair, same sigh.'],
          settle: ['Kasper claims the usual table and opens the laptop.'],
          usualTaken: ['His table is taken; Kasper hovers a beat, then settles for another.'],
          overheard: [],
          musing: [
            'Kasper types a sentence, reads it back, and deletes it.',
            'Kasper stares at the same chapter he stared at yesterday.',
            'Kasper mutters at the screen and reaches for the matcha.',
            'Kasper writes three good lines and looks cautiously pleased.'
          ],
          backstory: [
            'Kasper has been on chapter seven since spring; he doesn\'t mention it anymore.',
            'Kasper says the book is nearly done, the way he\'s said it all year.'
          ]
        }
      },
      {
        id: 'freya',
        name: 'Freya',
        nameStyle: 'feminine',
        colors: {
          skin: '#b57a4a', hair: '#8f4a35', top: '#6b7a55', pants: '#3d4a5c',
          scarf: null, longHair: true, hairStyle: 1, beard: false
        },
        drink: 'matcha latte',
        traits: { wantsBook: true, ownBook: true, chatty: false, laptop: false, pianist: false },
        murmurPitch: 185, speed: 46,
        umbrella: '#3d4a5c',
        arrival: { from: 18 + 1 / 2, to: 19 },
        stay: [280, 420],
        seat: 'firesideRight',
        lines: {
          arrival: ['Freya slips in as the lamps come on, her book already in hand.'],
          arrivalRain: ['Freya ducks in from the rain, hugging her book dry.'],
          arrivalReturn: ['Freya returns to the fire, picking up just where she left off.'],
          settle: ['Freya sinks into the fireside chair, book already open.'],
          usualTaken: ['Her fireside chair is taken; Freya takes the near one in stride.'],
          overheard: [],
          musing: [
            'Freya turns a page and sinks a little deeper into the armchair.',
            'Freya reads until the words go soft and warm.',
            'Freya loses her place, finds it, loses it again.',
            'Freya lets the fire do the talking for a while.'
          ],
          backstory: [
            'Freya has read this one before; she comes back for the ending anyway.',
            'Freya says the fire here is better than the one at home.'
          ]
        }
      }
    ],

    /* Story arcs — the soft-narrative layer's content (docs/narrative.md §2, §8).
       Each arc advances quietly on the café's own clock (updateNarrative in
       sim-core — one row per 24-minute café day while the café runs; a closed
       café holds still), then waits: when progress reaches `rows` it raises a
       soft, never-expiring invitation (a `glyph` bubble over its `owner`, or
       at its fixed `anchor`), and only when the reader taps it does the `beat`
       caption run play and the arc step onward — setting `flag` for good.
       Nothing here fires on its own.

       Entry shape:
         id          stable key; the MEMORY save stores state under it
         owner       a CAST.regulars id; the arc rides that regular's visits
         anchor      {x, y} instead of an owner: a café-owned arc pins its
                     invitation to a fixed spot (the bubble's top edge sits at
                     the anchor). Exactly one of owner/anchor per arc.
         stages      how many beats the arc holds (default 1); a played beat
                     steps stage forward, stage === stages means done
         knits       marks a knitting arc (drives the seated needle behaviour)
         rows        café days of progress before a beat is ready (patient) —
                     one number, or an array with one entry per stage
         scarfColor  the wool's swatch (a docs/art.md hex)
         glyph       the invitation bubble icon (drawIcon in scene-people.js)
         flag        the lasting mark set when the beat plays
         knitLines   musing-register fragments surfaced while she knits
         beat        the caption run the tap plays — the only quoted-length
                     narration reserved for a chosen moment; each line stands
                     alone (glanceability holds even here)

       Row one is Gerda's scarf — the reference arc that proves the whole loop
       end to end (knits by her window across café days → a yarn-ball bubble
       waits → tap loops the finished scarf onto the cat, who wears it for
       good). It also realises the roadmap's "a knitter… a slowly growing
       scarf", now with a payoff that waits for you. */
    arcs: [
      {
        id: 'gerda-scarf',
        owner: 'gerda',
        knits: true,
        rows: 5,
        scarfColor: '#a94f3f',
        glyph: 'yarn',
        flag: 'cat-wore-scarf',
        knitLines: [
          'Gerda\'s needles click along, a scarf growing row by row.',
          'Gerda measures the knitting against her arm and keeps going.',
          'Gerda counts stitches under her breath, unhurried.',
          'Gerda holds the wool to the light and chooses the next row.'
        ],
        beat: [
          'Gerda casts off the last row and shakes the scarf loose.',
          'she holds it up, then loops it gently around the cat, who allows it.',
          'the cat wears Gerda\'s scarf now — a small warmth that stays.'
        ]
      }
    ]
  };
})();
