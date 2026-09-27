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
     traits     wantsBook, ownBook, chatty, laptop, pianist, artist
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
                face Lunafreya already knows, from the persisted bonds count), settle
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
     Nora~11:00  flat white      artist stool    painting / sketching
     Antonia  ~18:30  matcha latte    right fireside  reading, dozes by the fire (id 'freya')
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
        // Retired seafarer and neighbour; encouragement offered without pressure.
        // tendsFire: an old habit — he keeps the hearth he sits by fed, getting
        // up to lay a log when it burns low (sim-patrons updateSeated)
        traits: { wantsBook: true, ownBook: true, chatty: false, laptop: false, pianist: false, tendsFire: true },
        murmurPitch: 130, speed: 46,
        umbrella: '#3d4a5c',
        arrival: { from: 9, to: 9 + 2 / 3 },
        stay: [280, 420],
        seat: 'firesideLeft',
        lines: {
          arrival: ['Holger steps inside, unhurried.'],
          arrivalRain: ['Holger comes in out of the wet, hat dripping, unhurried as ever.'],
          arrivalReturn: ['Holger is back, his book tucked under one arm.'],
          settle: ['Holger lowers himself into the usual armchair and opens his book.'],
          usualTaken: ['His chair is taken; Holger looks for another, patient as the tide.'],
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
            {text:'Holger reads the same paragraph twice, in no hurry to move on.', requires:['reading']},
            {text:'Holger checks the weather through the window.', requires:['view']},
            {text:'Holger leaves his cup untouched for a moment, lost in the page.', requires:['reading','cup']},
            {text:'Holger nods to himself at something in the book.', requires:['reading']}
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
        seat: 'leftWindowPerch',
        lines: {
          arrival: ['Gerda steps inside and looks around the café.'],
          arrivalRain: ['Gerda comes in from the rain, her scarf dark with droplets.'],
          arrivalReturn: ['Gerda gives Lunafreya a small wave from the door.'],
          settle: ['Gerda settles onto the window sill, right where she likes it.'],
          usualTaken: ['Her window seat is taken; Gerda looks for another place to settle.'],
          overheard: [
            'Gerda drifts into a story about the coldest winter she remembers.',
            'Gerda tells someone about the garden she used to keep.',
            'Something at the next chair makes Gerda laugh, warm and unhurried.'
          ],
          musing: [
            {text:'Gerda watches the light on the water for a while.', requires:['view','daylight']},
            {text:'Gerda looks out through the clear glass.', requires:['view']},
            'Gerda hums something old under her breath.',
            {text:'Gerda rests her hands beside her tea and watches the light change.', requires:['cup']}
          ],
          arcMusings: [
            {
              arc: 'street-house', fairDaylight: true,
              lines: [
                'Gerda watches the painter across the road find his rhythm.',
                'Gerda follows the brush down the weathered wall.',
                'Gerda looks up again; the warm colour has crept a little lower.'
              ]
            }
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
          arrival: ['Kasper steps inside with his laptop bag and a quiet sigh.'],
          arrivalRain: ['Kasper hurries in from the rain, shielding the laptop bag.'],
          arrivalReturn: ['Kasper is back, his laptop bag over his shoulder.'],
          settle: ['Kasper claims the usual table and opens the laptop.'],
          usualTaken: ['His table is taken; Kasper looks around for another.'],
          overheard: [],
          musing: [
            {text:'Kasper types a sentence, reads it back, and deletes it.', requires:['laptop']},
            {text:'Kasper lingers over a paragraph on the screen.', requires:['laptop']},
            {text:'Kasper glances from the screen to his cup.', requires:['laptop','cup']},
            {text:'Kasper writes a few lines and looks cautiously pleased.', requires:['laptop']},
            {text:'Kasper catches Lunafreya\'s eye and holds up three fingers: three good lines.', requires:['laptop'], flags:['kasper-good-lines']},
            {text:'Kasper stretches, looks at the clock, and decides there is no hurry.', requires:['laptop'], flags:['kasper-table']}
          ],
          backstory: [
            'Kasper has been on chapter seven since spring; he doesn\'t mention it anymore.',
            'Kasper says the book is nearly done, the way he\'s said it all year.'
          ]
        }
      },
      {
        id: 'lunafreya',
        name: 'Nora',
        nameStyle: 'feminine',
        colors: {
          skin: '#e8b48a', hair: '#4a2f1c', top: '#5a7a8a', pants: '#3d4a5c',
          scarf: null, longHair: true, hairStyle: 1, beard: false,
          smock: '#d8c9ad'
        },
        drink: 'flat white',
        traits: { wantsBook: false, ownBook: false, chatty: true, laptop: false, pianist: false, artist: true },
        murmurPitch: 214, speed: 42,
        umbrella: '#c9a04a',
        arrival: { from: 11, to: 11 + 2 / 3 },
        stay: [380, 520],
        seat: 'artistStool',
        lines: {
          arrival: ['Nora arrives with a paint-smudged satchel.'],
          arrivalRain: ['Nora comes in under a golden umbrella, keeping her brushes dry.'],
          arrivalReturn: ['Nora is back, a strand of hair caught in her satchel strap.'],
          settle: ['Nora settles at the easel and looks over her work.'],
          usualTaken: ['Her stool is occupied; Nora looks for a nearby table.'],
          overheard: [
            {text:'Nora points out a colour hidden in the firelight.', requires:['fire']},
            'Nora says the quiet parts are what make a room worth painting.',
            {text:'Nora listens for a moment, then smiles.', requires:['studio']}
          ],
          musing: [
            {text:'Nora pauses over the canvas and lets the room settle first.', requires:['painting']},
            {text:'Nora studies the shadow in the corner of the canvas.', requires:['painting']},
            'Nora leans back and takes in the room.',
            'A strand of Nora\'s hair slips loose; she tucks it back with a clean knuckle.',
            // Her introduction's remembered answer: what a painting should keep.
            {text:'Nora sketches someone at the next table, quickly, before they move.', flags:['lunafreya-remember-people']},
            {text:'Nora sketches the corner by the door, as if keeping it for later.', flags:['lunafreya-remember-start']}
          ],
          backstory: [
            'Nora paints cafés because every chair remembers a different kind of waiting.',
            'Nora once painted grand rooms; she says small rooms tell the truth more gently.'
          ]
        }
      },
      {
        id: 'freya',
        name: 'Antonia',
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
          arrival: ['Antonia slips inside, her book already in hand.'],
          arrivalRain: ['Antonia ducks in from the rain, hugging her book dry.'],
          arrivalReturn: ['Antonia returns with a bookmark peeking out of her book.'],
          settle: ['Antonia sinks into the fireside chair, book already open.'],
          usualTaken: ['Her fireside chair is taken; Antonia looks for another seat.'],
          overheard: [],
          musing: [
            {text:'Antonia turns a page and sinks a little deeper into the armchair.', requires:['reading','armchair']},
            {text:'Antonia reads until the words go soft and warm.', requires:['reading']},
            {text:'Antonia loses her place, finds it, loses it again.', requires:['reading']},
            {text:'Antonia lets the fire do the talking for a while.', requires:['fire']},
            {text:'Antonia turns a page, glad to be let alone.', requires:['reading'], flags:['freya-quiet']},
            {text:'Antonia glances at the water, as if checking it is still on her route.', requires:['view'], flags:['freya-route']}
          ],
          backstory: [
            'Antonia has read this one before; she comes back for the ending anyway.',
            {text:'Antonia says the fire here is better than the one at home.', requires:['fire']}
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
         flag        the lasting mark set when the beat plays; a multi-stage
                     arc may carry one flag per stage
         knitLines   musing-register fragments surfaced while she knits
         beat        the caption run the tap plays — a multi-stage arc carries
                     one caption array per stage — the only quoted-length
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
      },
      {
        id: 'lunafreya-paintings',
        owner: 'lunafreya',
        paints: true,
        stages: 2,
        rows: [10, 12],
        glyph: 'palette',
        flag: ['lunafreya-cat-painting', 'lunafreya-hearth-painting'],
        paintLines: [
          'Nora lays in another quiet patch of colour.',
          'The brush whispers over the canvas.',
          'Nora mixes the light again, a shade warmer this time.'
        ],
        beat: [
          [
            'Nora sets down her brush and carries the first canvas into the firelight.',
            'The cat on the sill looks back from the paint — scarf, whiskers, and all the patience of the window.',
            'Together you hang it above the fireplace, where it keeps watching the room.'
          ],
          [
            'Nora turns the second canvas around: the hearth, caught between ember and flame.',
            'She finds the small place above the door, a warm goodbye for everyone stepping out.',
            'The easel rests now; Nora keeps a sketchbook there for whatever the café becomes next.'
          ]
        ]
      },
      {
        id: 'street-house',
        anchor: { x: 186, y: 76 },
        rows: 7,
        stages: 1,
        glyph: 'brush',
        flag: 'street-house-painted',
        presenceBeat: {
          owner: 'gerda', window: 0,
          lines: ['Gerda is at the glass too; she gives the finished colour a quiet nod.']
        },
        beat: [
          'Across the water, the painter steps back onto the quay and looks for a long moment.',
          'He folds the ladder down; the old facade holds its new warmth.',
          'For a while, you have both kept company with someone else\'s patient work.'
        ]
      }
    ]
  };
  CAST.gerdaWindow={
    hello:[
      {id:'name',speaker:'Gerda',text:"Hello. I'm Gerda. I was passing, and your window made me stop."},
      {id:'welcome',speaker:'Lunafreya',text:"I'm Lunafreya. Come in. It's warmer on this side."},
      {id:'water',speaker:'Gerda',text:"I love sitting by the water. Watching the ships go by, with something on my needles."},
      {id:'cold',speaker:'Gerda',text:"But the cold gets into my body now. Even on a bright day, I can't sit outside for very long."},
      {id:'shorter',speaker:'Gerda',text:"I keep telling myself one more boat. Then my hands tell me it's time to go home."},
      {id:'glass',speaker:'Gerda',text:"When I saw this café's big, clear window, I wondered if I could sit in here. Keep the water, lose the wind."},
      {id:'hearth',speaker:'Gerda',text:"And I'm looking forward to that fireplace being opened. A little fire on a cold afternoon would be lovely."},
      {id:'hearth-reply',speaker:'Lunafreya',text:"I'd like that too. First I'll get those boards off and make it ready for a fire. The shelf and little things can come later."},
      {id:'room',speaker:'Lunafreya',text:"I'd like that. That deep sill could be a lovely place to sit."},
      {id:'table',speaker:'Lunafreya',text:"It needs a little table for your tea. And something softer than bare wood."},
      {id:'pillows',speaker:'Gerda',text:"I have two pillows at home. Knitted the covers myself. Rust red, with little cables like ropes."},
      {id:'gift',speaker:'Gerda',text:"I'd like to give them to the café, if you'd like them. One for me, perhaps, and one for whoever sits beside me."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Gerda',text:'A warm place by the water...',choices:[
        {text:"I'd love that. I'll make room for a little window table.",flag:'gerda-hello-yes',reply:"Then the pillows are yours. Whenever you're ready, I'll bring them and settle them in myself."},
        {text:"That's very kind. Could I settle in a little more first?",flag:'gerda-hello-later',reply:"Of course. Wool keeps perfectly well. I'll still come in for tea, if I may."}
      ]},
      {id:'stay',speaker:'Lunafreya',text:"You're welcome here, Gerda. Come and keep warm whenever you like."}
    ],
    hearth:[
      {id:'hope',speaker:'Gerda',text:"I've been looking at that fireplace, Lunafreya. I'm looking forward to it being opened. A little fire on a cold afternoon would be lovely."},
      {id:'reply',speaker:'Lunafreya',text:"I'd like that too. First I'll get those boards off and make it ready for a fire. The shelf and little things can come later."}
    ],
    offer:[
      {id:'remember',speaker:'Lunafreya',text:"Gerda, I've been thinking about your knitted pillows."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Gerda',text:'That place by the window...',choices:[
        {text:"I'd like to make that window seat now, if your offer still stands.",flag:'gerda-offer-yes',reply:"It does. I'll bring both pillows when your little table is ready."},
        {text:"I haven't quite found the moment yet. Thank you for offering.",flag:'gerda-offer-later',reply:"There's no hurry, dear. I'm quite happy with my tea here."}
      ]}
    ],
    thanks:[
      {id:'fit',speaker:'Gerda',text:"There. The cables face the room. You should see the nice side when you come in."},
      {id:'hands',speaker:'Lunafreya',text:"They make it look as though this corner has been waiting for you."},
      {id:'thank',speaker:'Gerda',text:"Thank you, Lunafreya. For the table. For taking a little passing wish seriously."},
      {id:'water',speaker:'Gerda',text:"I can see the ships from here. And the little ripples they leave behind."},
      {id:'warm',speaker:'Gerda',text:"My hands are still warm. I haven't once wondered how soon I'll have to leave."},
      {id:'small',speaker:'Gerda',text:"When you start coming home earlier, you don't notice at first how much smaller your days have become."},
      {id:'space',speaker:'Gerda',text:"This gives me a bit of mine back. A new cozy knitting place, with the water in it."},
      {id:'company',speaker:'Lunafreya',text:"And a second pillow. You thought of company before I'd even thought of the table."},
      {id:'needles',speaker:'Gerda',text:"Well. I can count stitches and listen at the same time. Usually."},
      {id:'welcome',speaker:'Lunafreya',text:"I'll remember the usually. Make yourself at home, Gerda."},
      {id:'home',speaker:'Gerda',text:"I think I already have."}
    ]
  };
  CAST.voices={Lunafreya:{pitch:205,filter:720,pace:1},Holger:{pitch:155,filter:620,pace:1.12},
    Gerda:{pitch:190,filter:670,pace:1.08},Nora:{pitch:220,filter:800,pace:.95},
    Kasper:{pitch:180,filter:690,pace:1.02},Antonia:{pitch:200,filter:650,pace:1.05},
    Keira:{pitch:215,filter:760,pace:.98},Tomas:{pitch:165,filter:640,pace:1.08}};
  CAST.holgerIntroduction = [
    {id:'sign',speaker:'Holger', text:"Good morning. I hoped that sign meant what I thought it meant."},
    {id:'opening',speaker:'Lunafreya', text:"It does. A café. As of about a minute ago."},
    {id:'neighbour',speaker:'Holger', text:"Then my timing has improved since retirement. I'm Holger. I live two doors along."},
    {id:'luna-name',speaker:'Lunafreya', text:"Lunafreya. It's lovely to meet you. You're my first customer."},
    {id:'espresso',speaker:'Holger', text:"Well, that's a responsibility. One espresso, please. And no hurry on my account."},
    {id:'why-cafe',speaker:'Holger', text:"What brought you to this little place? If you don't mind my asking."},
    {id:'beginning',speaker:'Lunafreya', text:'I think…', choices:[
      {text:"I've wanted a place where people can feel at home.", flag:'luna-beginning-belonging', reply:"Then you've started well. You said hello before you asked what I wanted."},
      {text:"I needed a new beginning. Something of my own.", flag:'luna-beginning-new-start', reply:"A beginning of your own. Yes. You needn't tell me what came before it."}
    ]},
    {id:'sea-nerves',speaker:'Holger', text:"I spent thirty years at sea. On my first crossing, I polished the same brass handle six times. Couldn't think what else to do with my hands."},
    {id:'cups',speaker:'Lunafreya', text:"I've rearranged those cups three times already."},
    {id:'reassurance',speaker:'Holger', text:"Then you're ahead of me. It took me a week to admit I was nervous."},
    {id:'hope',speaker:'Lunafreya', text:'Looking around, I keep thinking…', choices:[
      {text:"I'd like to make a quiet corner for books someday.", flag:'luna-cafe-books', reply:"I've a few books that could use an outing. When you're ready, we can find them a corner."},
      {text:"I'd like to learn everyone's names first.", flag:'luna-cafe-neighbours', reply:"Start with mine. The rest will come in their own time. There are some good people on this street."}
    ]},
    {id:'galley',speaker:'Holger', text:"There was a little galley table we always crowded around. Terrible coffee. Somehow nobody wanted to leave."},
    {id:'miss-sea',speaker:'Lunafreya', text:"Do you miss it?"},
    {id:'voices',speaker:'Holger', text:"Some of the voices. More than the sea, these days."},
    {id:'welcome',speaker:'Holger', text:"But listen to me. First customer, already keeping you talking. I'm very glad you've opened, Lunafreya."},
    {id:'farewell',speaker:'Lunafreya', text:"I'm glad you came in, Holger."}
  ];
})();

/* Stable working identities and literal first-meeting packets. No purchase effects. */
(function () {
  'use strict';
  CAST.visitors={
    keira:{name:'Keira',nameStyle:'feminine',pronouns:'she/her',
      colors:{skin:'#ddb58d',hair:'#49352d',top:'#9c4848',pants:'#3d4a5c',scarf:'#b18d62',longHair:true,hairStyle:3,beard:false},
      arrival:'Keira stops by, with no trolley to hurry back to.',
      returning:'Keira waves to Lunafreya. No deliveries this time.',
      later:"I've come without the trolley today. I'm Keira, by the way.",
      hello:[
        {id:'name',speaker:'Keira',text:"The table kit's here. I'm Keira. Is this a good place to leave it?"},
        {id:'place',speaker:'Lunafreya',text:"Perfect. I'm Lunafreya. I'm still getting used to having room for another table."},
        {id:'practical',speaker:'Keira',text:"Give yourself room to walk around it. The little bag has all the screws. And one spare, for the floor."},
        {id:'laugh',speaker:'Lunafreya',text:"The floor already has quite a collection. Come in sometime when you're not carrying anything."},
        {id:'welcome',speaker:'Keira',text:"I'd like that. It's a nice place to stop."},
        {id:'round',speaker:'Lunafreya',text:"Do you deliver around here often? I'm still learning which street is which."},
        {id:'doors',speaker:'Keira',text:"Most mornings. I know the doors better than the street names. Green one by the bridge: lift the handle, then knock."},
        {id:'map',speaker:'Lunafreya',text:"That sounds more useful than my map."},
        {id:'pictures',speaker:'Keira',text:"It is, until someone paints a door. I take pictures of the little shops sometimes. You notice what changes."},
        {id:'reason',speaker:'Lunafreya',text:"For your deliveries?"},
        {id:'details',speaker:'Keira',text:"Just for me. A lamp in a window, a handwritten sign. Things people have bothered with."},
        {id:'sign',speaker:'Lunafreya',text:"I kept going outside to look at mine after I put it up. As if it might look different the third time."},
        {id:'permission',speaker:'Keira',text:"That's exactly the sort of thing. I'll ask before I photograph yours."},
        {id:'cup',speaker:'Lunafreya',text:"Next time, I'll find you a cup. You can put your coat down."},
        {id:'habit',speaker:'Keira',text:"I usually drink mine standing up. One hand on the cup, one eye on the van."},
        {id:'room',speaker:'Lunafreya',text:"There'll be room for you as well as whatever you've brought."},
        {id:'stay',speaker:'Keira',text:"Then perhaps I'll leave the van out of it. I'd like to see what this place looks like sitting down."}
      ]},
    tomas:{name:'Tomas',nameStyle:'masculine',pronouns:'he/him',
      colors:{skin:'#ddb58d',hair:'#6b4a30',top:'#718b91',pants:'#4b5260',scarf:null,longHair:false,hairStyle:1,beard:true},
      arrival:'Tomas pauses by the window on his way along the street.',
      returning:'Tomas gives Lunafreya a nod, then checks the view rather than the frame.',
      later:"Tomas. We never quite got to names, did we?",
      hello:[
        {id:'name',speaker:'Tomas',text:"Tomas. Here for the left window. The frame's sound underneath, which is a useful start."},
        {id:'view',speaker:'Lunafreya',text:"I'm Lunafreya. I keep trying to imagine the view without the boards."},
        {id:'precise',speaker:'Tomas',text:"Mostly water. It moves about, so there's some variety."},
        {id:'reply',speaker:'Lunafreya',text:"That sounds like exactly enough. Thank you for coming."},
        {id:'welcome',speaker:'Tomas',text:"You're welcome. I'll keep the doorway clear. You have a café to run."},
        {id:'trade',speaker:'Lunafreya',text:"Do you mostly work on places like this?"},
        {id:'useful',speaker:'Tomas',text:"Windows, cupboards. The odd door that needs persuading. I like seeing a thing still being used."},
        {id:'keep',speaker:'Lunafreya',text:"I like that you look for what can stay."},
        {id:'handles',speaker:'Tomas',text:"Old wood's often fine. Handles tell you more. You can usually see where a hand wants to go."},
        {id:'own',speaker:'Lunafreya',text:"Do you make things for yourself as well?"},
        {id:'cupboard',speaker:'Tomas',text:"A cupboard for my daughter's new flat. Small one. The drawings are becoming rather large."},
        {id:'changing',speaker:'Lunafreya',text:"What keeps changing?"},
        {id:'towels',speaker:'Tomas',text:"The hinges. Then the shelves. She asked for somewhere to put towels."},
        {id:'simple',speaker:'Lunafreya',text:"Perhaps leave room for the towels."},
        {id:'plain',speaker:'Tomas',text:"Her exact view. She's chosen the plain version. I'm trying to stop improving it."},
        {id:'lasting',speaker:'Lunafreya',text:"You want it to last."},
        {id:'finished',speaker:'Tomas',text:"Yes. Though it ought to be finished before she moves again."},
        {id:'news',speaker:'Lunafreya',text:"I'd like to hear how it turns out. You can come in just to tell me."},
        {id:'return',speaker:'Tomas',text:"I might. It would make a change to arrive without something that needs fixing."}
      ]}
  };
})();

/* The little wall shelves' books: narration for finished stocking and for a
   reader taking one down, per source (see IMPROVEMENTS.shelf). */
(function () {
  'use strict';
  CAST.shelfLines = {
    box: 'the box is folded flat; six secondhand books wait on the little shelves.'
  };
  CAST.borrowLines = {
    box: ['takes a book down from the little shelves.', 'tilts a spine out from the little shelves and keeps it.',
      'reads the back of a secondhand book, then keeps it.']
  };
})();


/* Holger's books (first-books Pass 3). Two saved scenes: the offer, which
   recalls Lunafreya's first answer to him, and the handover, where she first
   mentions her old bookshop work. `alt` holds context variants, chosen by
   sim-holger.js in the order written: neighbours (she chose names over
   books), no-shelf (nowhere to put them yet), keep (the books stay his),
   library (an established café's big shelf). Node IDs are saved identities. */
(function () {
  'use strict';
  CAST.holgerBooks = {
    offer: [
      {id:'recall',speaker:'Holger',text:"You told me you'd like a quiet corner for books someday. I've been eyeing my own shelves ever since.",
        alt:{neighbours:"You said you wanted to learn everyone's names first. I've been wondering how people get talking in a new place."}},
      {id:'recall-reply',speaker:'Lunafreya',text:"Eyeing them how?",alt:{neighbours:"Any conclusions?"}},
      {id:'box',speaker:'Holger',text:"There's a box I never unpacked after my last ship. Books the crew left behind, mostly.",
        alt:{neighbours:"A book on the table helps. Nobody has to think of what to say. I've a box of them I never unpacked after my last ship."}},
      {id:'count',speaker:'Holger',text:"There are six books. Seven if you count the one holding the box shut."},
      {id:'seventh',speaker:'Lunafreya',text:"What's the seventh?"},
      {id:'tide',speaker:'Holger',text:"A tide table from 1998. It has retired from everything except boxes."},
      {id:'offer',speaker:'Holger',text:"The other six would rather be read. I wondered if they might live here, where somebody could pick one up."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Holger',text:'Your books, here…',choices:[
        {text:"I'd love that. Anyone who comes in could borrow one.",flag:'holger-books-lend',
          reply:"Good. Books shouldn't sit still. I'll write a little something in the front of each."},
        {text:"I'd love that. They could stay yours, just kept here.",flag:'holger-books-keep',
          reply:"Mine, on your wall. Then I'll have a reason to come and visit them."}
      ]},
      {id:'when',speaker:'Holger',text:"I'll bring them next time, before the box changes its mind.",
        alt:{'no-shelf':"They'll wait at mine until you've somewhere to put them. Books are patient. So am I."}},
      {id:'thanks',speaker:'Lunafreya',text:"Thank you, Holger. Really."}
    ],
    gift: [
      {id:'here',speaker:'Holger',text:"I've brought them. They're on your counter, before I could think better of it."},
      {id:'look',speaker:'Lunafreya',text:"Can I look?"},
      {id:'adventure',speaker:'Holger',text:"The adventure one was the bosun's. He read it every crossing and never once finished it. Said he liked not knowing."},
      {id:'cookbook',speaker:'Holger',text:"The cookbook was the cook's, naturally. I nearly kept it. There was something in it I meant to try."},
      {id:'what',speaker:'Lunafreya',text:"What was it?"},
      {id:'decided',speaker:'Holger',text:"I haven't decided. I've only had it twenty years."},
      {id:'shop',speaker:'Lunafreya',text:"We had one like that in the shop where I used to work. Everyone meant to cook from it."},
      {id:'worked',speaker:'Holger',text:"You worked with books?"},
      {id:'readings',speaker:'Lunafreya',text:"Books, coffee, readings in the evening. Mostly I was finding enough chairs."},
      {id:'enjoy',speaker:'Holger',text:"Did you enjoy it? If you don't mind my asking."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Holger',text:'I…',choices:[
        {text:"A lot of it. I think that's why leaving took so long.",flag:'luna-bookshop-fond',
          reply:"Then these are in good hands. Somebody who minded leaving a place."},
        {text:"Most of it. I'll tell you the rest another day.",flag:'luna-bookshop-later',
          reply:"Another day, then. I'm very good at waiting. Ask the tide table."}
      ]},
      {id:'garden',speaker:'Holger',text:"The gardening book I can't explain. Nobody on that ship grew anything but beards."},
      {id:'plates',speaker:'Holger',text:"I've put a note in the front of each. For anyone who stays a while.",
        alt:{keep:"I've written my name in the front of each. So they know where they came from, and where they live now."}},
      {id:'place',speaker:'Lunafreya',text:"They'll go on the little shelves by the fire. I'll put them up between customers.",
        alt:{library:"I'll make room on the big shelf. They'll have plenty of company."}},
      {id:'new',speaker:'Lunafreya',text:"The café feels a little less new already."},
      {id:'crew',speaker:'Holger',text:"Thank the crew. I only carried them."}
    ]
  };
  CAST.shelfLines.holger = "Holger's books stand together on the little shelves; the box is folded flat.";
  // A pool may vary with a remembered choice: the first set flag wins.
  CAST.borrowLines.holger = {
    lines: ["takes down one of Holger's books; there's a note in the front, for anyone who stays a while.",
      "chooses the bosun's adventure book from Holger's row.", "opens Holger's old cookbook and reads a recipe twice."],
    flags: { 'holger-books-keep': ["takes down one of Holger's books; his name is written neatly inside the cover.",
      "chooses the bosun's adventure book from Holger's row.", "opens Holger's old cookbook and reads a recipe twice."] }
  };
  // Someone taking down a book that came from them.
  CAST.borrowLinesOwn = { holger: ['takes down one of his own books, as if calling on an old shipmate.'] };
})();

/* Familiar faces become people (ensemble release 2). Introductions for the
   regulars who had none, keyed by regular ID (Nora's is the legacy
   `lunafreya`; Antonia's is `freya`), and first callbacks for the two working
   neighbours, keyed by visitor ID. Saved prefixes are `<id>-hello-` and
   `<id>-<story>-`; completion sets `<id>-introduced` / `<id>-<story>-done`.
   `alt` variants: familiar (a long-known face), hearth (a working fire),
   menu (the regular's own drink is served), and the named story conditions. */
(function () {
  'use strict';
  CAST.introductions = {
    // visits: the visit (as they arrive) from which the hello is offered;
    // staggered so a new café meets its regulars over several days.
    lunafreya: {visits:2, lines:[
      {id:'cup',speaker:'Nora',text:"Could you leave that cup there? No, not forever. I know you need cups."},
      {id:'why',speaker:'Lunafreya',text:"Is something wrong with it?"},
      {id:'light',speaker:'Nora',text:"Nothing. The light's sitting in it. It won't stay long."},
      {id:'name',speaker:'Nora',text:"Sorry. I'm Nora. I paint. That's usually the explanation for this sort of thing.",
        alt:{familiar:"Sorry. We've shared this room for weeks and I've never said. I'm Nora. I paint."}},
      {id:'luna',speaker:'Lunafreya',text:"Lunafreya. I've seen your sketchbook. I didn't want to look over your shoulder."},
      {id:'chairs',speaker:'Nora',text:"You can. It's mostly chairs. I've drawn your chairs a great deal."},
      {id:'grand',speaker:'Nora',text:"I used to paint big rooms for the people who owned them. Ballrooms. Libraries nobody read in."},
      {id:'evidence',speaker:'Nora',text:"They always asked me to leave out the cups. The coats on the chairs. Anything that showed somebody had been there."},
      {id:'here',speaker:'Lunafreya',text:"There's a lot of evidence here."},
      {id:'better',speaker:'Nora',text:"That's why I keep coming back."},
      {id:'question',speaker:'Nora',text:"Can I ask you something? If somebody painted this place, what would you want it to remember?"},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Nora',text:"I think…",choices:[
        {text:"How it was at the start, before any of us knew what it would be.",flag:'lunafreya-remember-start',
          reply:"The first version. Nobody paints first versions. They're gone before anyone thinks to."},
        {text:"An ordinary afternoon, with somebody in it.",flag:'lunafreya-remember-people',
          reply:"Somebody in it. Good. That's harder. People never sit still for quite the right amount of time."}
      ]},
      {id:'gone',speaker:'Nora',text:"You can have the cup back now. The light's moved on."},
      {id:'another',speaker:'Lunafreya',text:"I'll bring you another. Light included, if I can manage it."}
    ]},
    kasper: {visits:3, lines:[
      {id:'sentence',speaker:'Kasper',text:"I fixed the first sentence. It has caused problems for the second."},
      {id:'day',speaker:'Lunafreya',text:"Is that a good day or a bad day?"},
      {id:'both',speaker:'Kasper',text:"Both, mostly. I'm Kasper. I apologise in advance for the sighing.",
        alt:{familiar:"Both, mostly. I'm Kasper, by the way. You've been very patient with the sighing."}},
      {id:'name',speaker:'Lunafreya',text:"Lunafreya. You're welcome to sigh here. The machine does it all day."},
      {id:'seven',speaker:'Kasper',text:"It's a novel. I've been on chapter seven since spring. People have stopped asking, which is kind of them."},
      {id:'ask',speaker:'Lunafreya',text:"I won't ask what it's about."},
      {id:'story',speaker:'Kasper',text:"Thank you. I wrote a short story once that people liked. Now everything has to prove that wasn't an accident."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Kasper',text:"Then…",choices:[
        {text:"Then stay as long as you like. The table doesn't mind slow chapters.",flag:'kasper-table',
          reply:"That's the nicest thing anyone has said about chapter seven."},
        {text:"Then tell me when you write three good lines. I'd like to know.",flag:'kasper-good-lines',
          reply:"Three good lines. That's a reasonable unit. I'll report."}
      ]},
      {id:'matcha',speaker:'Kasper',text:"And if you ever have iced matcha, I'll become unbearable about it.",
        alt:{menu:"The iced matcha helps. Don't tell the chapter."}},
      {id:'back',speaker:'Lunafreya',text:"Back to the second sentence, then."},
      {id:'waiting',speaker:'Kasper',text:"Back to it. It's waiting. They always are."}
    ]},
    freya: {visits:2, lines:[
      {id:'pages',speaker:'Antonia',text:"Don't mind me. I'm only here for the last forty pages. Again."},
      {id:'again',speaker:'Lunafreya',text:"You've read it before?"},
      {id:'times',speaker:'Antonia',text:"Four times. I know how it ends. I like watching them get there."},
      {id:'name',speaker:'Antonia',text:"I'm Antonia. I drive the 9A, mostly. You're on my way home, which is dangerous for my bedtime.",
        alt:{familiar:"I'm Antonia, by the way. I drive the 9A. You've been on my way home for a while now."}},
      {id:'luna',speaker:'Lunafreya',text:"Lunafreya. I'll try not to keep you up."},
      {id:'quiet',speaker:'Antonia',text:"You don't have to entertain me, you know. Being let alone is one of the nicest things a place can do."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Antonia',text:"Then…",choices:[
        {text:"Then I'll leave you to your forty pages.",flag:'freya-quiet',
          reply:"Perfect. See? We get along already."},
        {text:"Then tell me your favourite stretch of the route, sometime.",flag:'freya-route',
          reply:"Along the water after eleven. Nobody on board, every light on. Like driving a lantern."}
      ]},
      {id:'list',speaker:'Antonia',text:"It's warm in here. That's on the list of nice things too.",
        alt:{hearth:"And the fire. Put that on the list of nice things a place can do."}},
      {id:'enjoy',speaker:'Lunafreya',text:"Enjoy the ending."},
      {id:'same',speaker:'Antonia',text:"I always do. It's the same one. That's the point."}
    ]}
  };
  // One story at a time per neighbour, offered on a later off-duty visit.
  CAST.visitorStories = {
    keira: {id:'cup', after:['keira-introduced','keira-hello-permission'], lines:[
      {id:'coat',speaker:'Keira',text:"I've taken my coat off. I'd like that noted."},
      {id:'noted',speaker:'Lunafreya',text:"Noted. Second cup?"},
      {id:'second',speaker:'Keira',text:"Go on. I never have time for the second one. Today I've decided I do."},
      {id:'passed',speaker:'Keira',text:"I've passed here four times this week on other deliveries. Every time I looked in to see what had changed."},
      {id:'changed',speaker:'Lunafreya',text:"And had anything?"},
      {id:'what',speaker:'Keira',text:"The window's clearer every time I pass. Or I'm paying more attention.",
        alt:{books:"You've got books now. Somebody was reading one by the window.",
          shelves:"The little shelves. Still waiting for their books, I noticed.",
          boarded:"Not much, from outside. Boards keep their secrets. I kept looking anyway."}},
      {id:'ask',speaker:'Keira',text:"I said I'd ask before I photographed your café. So I'm asking."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Keira',text:"A photograph…",choices:[
        {text:"Yes. Take it as it is, while it's still new.",flag:'keira-photo-yes',
          reply:"As it is. That's the only way I ever take them."},
        {text:"Not yet. Let it become a bit more itself first.",flag:'keira-photo-later',
          reply:"Fair. I'll ask again when it's had time. I'm patient with doors."}
      ]},
      {id:'finish',speaker:'Keira',text:"I should go. I'm going to finish this cup first, though. Sitting down."},
      {id:'chairs',speaker:'Lunafreya',text:"Good. That's what the chairs are for."}
    ]},
    tomas: {id:'cupboard', after:['tomas-introduced','tomas-hello-news'], lines:[
      {id:'report',speaker:'Tomas',text:"Cupboard report, as promised."},
      {id:'and',speaker:'Lunafreya',text:"And?"},
      {id:'plain',speaker:'Tomas',text:"I made the plain version. Two shelves, one door. The hinges are the ones she chose."},
      {id:'believed',speaker:'Lunafreya',text:"You believed her."},
      {id:'decided',speaker:'Tomas',text:"I decided to. It's level. Her wall has a different opinion, but that's the wall's business."},
      {id:'towels',speaker:'Lunafreya',text:"And the towels?"},
      {id:'folded',speaker:'Tomas',text:"In it. She sent me a picture. Folded, which is new."},
      {id:'proud',speaker:'Lunafreya',text:"You sound proud."},
      {id:'mostly',speaker:'Tomas',text:"Of the towels, mostly. A little of the cupboard."},
      {id:'bread',speaker:'Tomas',text:"I've moved on to bread. That's going worse."},
      {id:'worse',speaker:'Lunafreya',text:"How much worse?"},
      {id:'door',speaker:'Tomas',text:"The last loaf could have held a door open. I'll bring the next one if it's safe."}
    ]}
  };
  // Remembered-story evidence on later off-duty arrivals.
  CAST.visitors.keira.returningAfter = {flags:['keira-cup-done'], text:'Keira comes in and has her coat off before she reaches the counter.'};
  CAST.visitors.tomas.returningAfter = {flags:['tomas-cupboard-done'], text:'Tomas comes in without a toolbox, a little flour on one sleeve.'};
})();

/* Evening moments at home: Lunafreya alone with a letter or something from a
   box. One is offered per evening (game mode), over her, wherever she is; it
   waits, never expires, and plays where she is. Saved prefix `home-<id>-`,
   completion `home-<id>-done`. `alt`: later (she told Holger "another day"). */
(function () {
  'use strict';
  CAST.voices.Calandra = {pitch:212,filter:780,pace:.92};
  CAST.homeStories = {
    mug: {icon:'mug', label:"Unpack a box", lines:[
      {id:'box',speaker:'Lunafreya',text:"This box says kitchen. It has never been anywhere near a kitchen."},
      {id:'mug',speaker:'Lunafreya',text:"Oh. The shop mug. I told myself I'd packed it by accident."},
      {id:'closing',speaker:'Lunafreya',text:"At closing I'd drink the last of the coffee from it, standing up, counting chairs."},
      {id:'holger',speaker:'Lunafreya',text:"I told Holger I loved a lot of it. I did.",
        alt:{later:"I told Holger I'd tell him the rest another day. Maybe I'll tell the mug first."}},
      {id:'cat',speaker:'Lunafreya',text:"Don't look at me like that. It's only a mug."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Lunafreya',text:"It can live…",choices:[
        {text:"…here, on the desk. For tea in the evenings.",flag:'luna-mug-home',
          reply:"Home, then. It's earned a sit-down."},
        {text:"…downstairs. Someone should drink the last coffee standing up.",flag:'luna-mug-cafe',
          reply:"Back to work, then. It knows the job."}
      ]}
    ]},
    calandra: {icon:'letter', label:"Read Calandra's letter", lines:[
      {id:'record',speaker:'Calandra',text:"Luna. It's your sister. You know that. I'm saying it for the record."},
      {id:'photos',speaker:'Calandra',text:"Did the sign survive? Mum wants photos. I want photos. Dad wants to know if the chairs are sturdy."},
      {id:'eating',speaker:'Calandra',text:"Also: are you eating? Properly? A bun from your own counter does not count."},
      {id:'crossword',speaker:'Calandra',text:"It's very quiet here without you arguing with the crossword."},
      {id:'clue',speaker:'Lunafreya',text:"She has never once let me finish a clue."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Lunafreya',text:"I'll write back and tell her…",choices:[
        {text:"…about the people. Who comes in, and when.",flag:'calandra-told-people',
          reply:"There. Now she'll want to meet every one of them."},
        {text:"…about the room, and what I've done to it.",flag:'calandra-told-place',
          reply:"There. Now she'll want a floor plan, and a photo of every chair."}
      ]},
      {id:'bread',speaker:'Lunafreya',text:"And yes, I'm eating. Mostly bread and cheese. I'll leave that part out."},
      {id:'night',speaker:'Lunafreya',text:"Goodnight, Cal."}
    ]}
  };
})();

/* Gerda's blanket (ensemble release 3): she asks which pattern, knits it
   over six café days (arc `gerda-blanket`, which only runs once asked), then
   presents exactly what was chosen in her own saved scene. Lunafreya chooses
   where it lives; placing it is ordinary work (improvement `blanket`). */
(function () {
  'use strict';
  CAST.arcs.push({
    id: 'gerda-blanket',
    owner: 'gerda',
    knits: true,
    rows: 6,
    after: ['gerda-blanket-asked'],          // no stitches before she has asked
    payoff: 'scene',                         // presented by Gerda's saved scene, not a caption beat
    scarfColor: '#6b7a55',
    colors: { 'gerda-blanket-reeds': '#6b7a55', 'gerda-blanket-stars': '#3d4a5c' },
    patterns: { 'gerda-blanket-reeds': 'reeds', 'gerda-blanket-stars': 'stars' },
    glyph: 'yarn',
    flag: 'gerda-blanket-given',
    knitLines: [
      "Gerda's needles work a long, patient row of the blanket.",
      'Gerda spreads the blanket over her knees to see how far it has come.',
      'Gerda counts under her breath, then nods at the pattern.'
    ],
    beat: ['Gerda folds the finished blanket over her arm.']
  });
  CAST.gerdaWindow.blanket = [
    {id:'needles',speaker:'Gerda',text:"The cat's scarf is finished and my needles have nothing to do. That's dangerous at my age."},
    {id:'make',speaker:'Gerda',text:"I'd like to make you something. A lap blanket, for the evenings. Don't argue, I've already bought the wool."},
    {id:'colour',speaker:'Lunafreya',text:"I wasn't going to argue. I was going to ask what colour."},
    {id:'pattern',speaker:'Gerda',text:"Good question. The pattern first. I have two in mind, and this time I'm asking."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Gerda',text:"The pattern…",choices:[
      {text:"Reeds, like the ones along the water.",flag:'gerda-blanket-reeds',
        reply:"Reeds. Long stitches and a bit of green. You'll see the lake in it."},
      {text:"Little stars.",flag:'gerda-blanket-stars',
        reply:"Little stars. Fiddly, but I like fiddly. Winter blue, then."}
    ]},
    {id:'noticed',speaker:'Lunafreya',text:"You asked me. You didn't just decide."},
    {id:'erik',speaker:'Gerda',text:"Erik used to say I knitted for people the way other people give advice. I'm practising."},
    {id:'while',speaker:'Gerda',text:"It will take a while. Good things are allowed to."}
  ];
  CAST.gerdaWindow.blanketGift = [
    {id:'close',speaker:'Gerda',text:"Close your eyes. No, open them, you'll walk into a chair. Here."},
    {id:'see',speaker:'Lunafreya',text:"Gerda, the reeds look as if they're moving.",
      alt:{stars:"Gerda, there must be a hundred stars."}},
    {id:'count',speaker:'Gerda',text:"I did the water twice. The first lake was too busy.",
      alt:{stars:"Two hundred and twelve. I counted them twice and lost count once."}},
    {id:'chose',speaker:'Gerda',text:"You chose it. I only did the counting. That was the nice part, this time."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Gerda',text:"It could live…",choices:[
      {text:"Here, over the chair nearest the fire, for whoever gets cold.",flag:'gerda-blanket-cafe',
        reply:"Then I'll know where to find it when I'm the one who's cold."},
      {text:"Upstairs with me, for the evenings.",flag:'gerda-blanket-home',
        reply:"Good. Somebody should look after you in the evenings too."}
    ]},
    {id:'use',speaker:'Gerda',text:"Erik would have said it's too nice to use. He was wrong about that sort of thing. Use it."},
    {id:'thanks',speaker:'Lunafreya',text:"Thank you, Gerda. I will."}
  ];
})();

/* The neighbourhood meets itself (ensemble release 4): Marcel, the house
   painter across the lake. He is the distant figure on the ladder
   (`street-house` arc `figure`), so he comes in only when he could not be
   painting (sim-marcel.js) and the far-bank figure is never drawn while he
   sits inside. Newer faces keep a visit rhythm and start after a few days. */
(function () {
  'use strict';
  CAST.regulars.push({
    id: 'marcel',
    name: 'Marcel',
    nameStyle: 'masculine',
    colors: {
      skin: '#b57a4a', hair: '#2a1a12', top: '#d8c9ad', pants: '#3c414d',
      scarf: null, longHair: false, hairStyle: 0, beard: true
    },
    drink: 'cappuccino',
    traits: { wantsBook: false, ownBook: false, chatty: true, laptop: false, pianist: false },
    murmurPitch: 140, speed: 48,
    umbrella: '#4a7a5a',
    arrival: { from: 16.5, to: 17.5 },
    stay: [220, 320],
    seat: 'windowPerch',
    firstDay: 4,
    rhythm: { every: 2, offset: 0 },
    lines: {
      arrival: ['Marcel comes in with paint on his cuffs.'],
      arrivalRain: ['Marcel comes in out of the rain; no painting in this.'],
      arrivalReturn: ['Marcel is back, a fleck of terracotta still on one knuckle.'],
      settle: ['Marcel takes a seat with a view of the far bank.'],
      usualTaken: ['The window is taken; Marcel settles for a view of the room instead.'],
      overheard: [
        'Marcel talks about primer the way other people talk about the weather.',
        'Marcel admits he misses an old shop sign he once painted, then says the new one is fine.',
        {text:'Marcel points across the water at the terracotta house.', requires:['view']}
      ],
      musing: [
        {text:'Marcel looks across the water at the wall he painted.', requires:['view'], flags:['street-house-painted']},
        {text:'Marcel squints across the water, measuring tomorrow\'s light.', requires:['view']},
        {text:'Marcel turns his cup and studies the colour of the foam.', requires:['cup']}
      ],
      backstory: [
        'Marcel has painted half the stairwells on this street; he knows which ones are crooked.',
        'Marcel says every wall has one patch that never takes the colour. He is fond of those.'
      ]
    }
  });
  CAST.voices.Marcel = {pitch:160,filter:650,pace:1.05};
  const street = CAST.arcs.find(a => a.id === 'street-house');
  street.figure = 'marcel';   // the painter on the far quay is this regular
  CAST.introductions.marcel = {visits:1, lines:[
    {id:'window',speaker:'Marcel',text:"I thought your window was getting larger. Turns out you were taking the boards off."},
    {id:'met',speaker:'Lunafreya',text:"Have we met?"},
    {id:'ladder',speaker:'Marcel',text:"Not properly. I'm the one on the ladder across the water. Marcel. The terracotta house.",
      alt:{facadeDone:"Not properly. I was the one on the ladder across the water. Marcel. The terracotta house, a while back now."}},
    {id:'painter',speaker:'Lunafreya',text:"You're the painter! I've been watching that wall go warm for days.",
      alt:{facadeDone:"You're the painter! I watched that wall go warm, one stroke at a time."}},
    {id:'both',speaker:'Marcel',text:"And I've been watching your window. We've been keeping an eye on each other's progress."},
    {id:'why-here',speaker:'Marcel',text:"The light's gone for today, so here I am.",
      alt:{facadeDone:"I'm on a stairwell in the next street now. Much less of a view.",
        rain:"Can't paint in this, so here I am."}},
    {id:'ask',speaker:'Marcel',text:"Can I ask why this side of the lake? Everyone new wants the other side. Better light, they say."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Marcel',text:"I…",choices:[
      {text:"On the viewing day I sat by the water with a coffee and imagined an ordinary Tuesday here.",flag:'luna-lake-tuesday',
        reply:"An ordinary Tuesday. That's the best reason I've heard for anything."},
      {text:"I'll tell you when I've worked it out. It just felt right.",flag:'luna-lake-later',
        reply:"Fair. Half my colours I pick the same way and call it experience."}
    ]},
    {id:'light',speaker:'Marcel',text:"For the record, their light is fine. Ours is better in the evenings."},
    {id:'rain',speaker:'Lunafreya',text:"Come in whenever it rains, then."},
    {id:'closer',speaker:'Marcel',text:"Or when it doesn't. I've a feeling I'll want a closer look at this place too."}
  ]};
})();

/* Ida, the librarian, and Elody, the gardener (ensemble release 4). Both keep
   a rhythm and start after the café's first week. CAST.regularStories holds
   a regular's later saved scenes in order (after an introduction): each has
   `after` flags, is decided at the door, may bring a `parcel` set down on the
   counter, and may hand over a keepsake (`gift`, an improvement id). */
(function () {
  'use strict';
  CAST.regulars.push({
    id: 'ida',
    name: 'Ida',
    nameStyle: 'feminine',
    colors: {
      skin: '#e8b48a', hair: '#8f4a35', top: '#9c4848', pants: '#2c3038',
      scarf: '#c9a04a', longHair: false, hairStyle: 3, beard: false
    },
    drink: 'cinnamon latte',
    traits: { wantsBook: true, ownBook: true, chatty: true, laptop: false, pianist: false },
    murmurPitch: 210, speed: 50,
    umbrella: '#8a6a9a',
    arrival: { from: 15, to: 15.7 },
    stay: [240, 340],
    seat: 'diningTable',
    firstDay: 5,
    rhythm: { every: 3, offset: 0 },
    lines: {
      arrival: ['Ida comes in with a tote bag of library returns.'],
      arrivalRain: ['Ida comes in from the rain with her tote bag held under her coat.'],
      arrivalReturn: [{text:'Ida is back, reading the spines on the little shelves before she reaches the counter.', requires:['wall-shelves']},
        'Ida is back, a new and very dramatic novel under her arm.'],
      settle: ['Ida settles in and opens something extremely dramatic.'],
      usualTaken: ['Her table is taken; Ida finds another and pretends she prefers it.'],
      overheard: [
        'Ida recommends a novel to the next table, then warns them about chapter nine.',
        'Ida explains the difference between a library and a book exchange, fondly and at length.',
        'Something at the table makes Ida laugh into her sleeve.'
      ],
      musing: [
        {text:'Ida reads with the absorbed frown of someone watching a shipwreck.', requires:['reading']},
        {text:'Ida straightens one book on the little shelves, then, remembering, leaves the rest.', requires:['wall-shelves'], flags:['ida-exchange-loose']},
        {text:'Ida tucks a small handwritten note into a book on the little shelves.', requires:['wall-shelves'], flags:['ida-exchange-notes']}
      ],
      backstory: [
        'Ida has worked at the library on the corner for eleven years; she still re-shelves in her sleep.',
        'Ida admits she reads the endings first, then pretends she did not.'
      ]
    }
  });
  CAST.regulars.push({
    id: 'elody',
    name: 'Elody',
    nameStyle: 'feminine',
    colors: {
      skin: '#8a5a3a', hair: '#2a1a12', top: '#6b7a55', pants: '#5a5a5a',
      scarf: '#b5654a', longHair: true, hairStyle: 2, beard: false
    },
    drink: 'cardamom bun',
    traits: { wantsBook: false, ownBook: false, chatty: true, laptop: false, pianist: false },
    murmurPitch: 195, speed: 50,
    umbrella: null,
    arrival: { from: 12, to: 12.7 },
    stay: [200, 300],
    seat: 'diningTable',
    firstDay: 6,
    rhythm: { every: 2, offset: 1 },
    lines: {
      arrival: ['Elody comes in with soil on her knees and a newspaper under her arm.'],
      arrivalRain: ['Elody comes in from the rain looking thoroughly pleased about it.'],
      arrivalReturn: ['Elody waves on her way to the counter, already reporting the rainfall.'],
      settle: ['Elody sits down with the sigh of someone who has been digging all morning.'],
      usualTaken: ['Her table is taken; Elody takes another and admires the view from it.'],
      overheard: [
        'Elody tells the next table about her beans, in some detail.',
        'Elody and the slugs, an ongoing story, gets another chapter.',
        'Elody explains why this week\'s weather was, technically, remarkable.'
      ],
      musing: [
        'Elody inspects her fingernails, gives up on them, and eats her bun.',
        {text:'Elody studies the sky through the window like a forecaster.', requires:['view']},
        {text:'Elody glances at Maud on the counter and gives her an approving nod.', requires:['elody-cutting'], flags:['elody-cutting-cafe']}
      ],
      backstory: [
        'Elody has kept the same allotment for nine years; the slugs have kept it longer.',
        'Elody writes the rainfall in a notebook every morning, even on holiday.'
      ]
    }
  });
  CAST.voices.Ida = {pitch:222,filter:780,pace:.96};
  CAST.voices.Elody = {pitch:198,filter:700,pace:1};
  CAST.introductions.ida = {visits:1, lines:[
    {id:'spines',speaker:'Ida',text:"Sorry. I read spines. It's a professional failing. I'm Ida, from the library on the corner.",
      alt:{noShelf:"Sorry, is there a shelf somewhere? No? Then I brought my own. I'm Ida, from the library on the corner."}},
    {id:'luna',speaker:'Lunafreya',text:"Lunafreya. The shelves are small, I'm afraid.",
      alt:{noShelf:"Lunafreya. No shelves yet. Just tables."}},
    {id:'small',speaker:'Ida',text:"Small shelves are the best kind. You can see everything at once.",
      alt:{noShelf:"Tables are underrated. A book left on a table is an invitation."}},
    {id:'novel',speaker:'Ida',text:"This one's about a lighthouse keeper who falls in love with a shipwreck. Metaphorically. Mostly."},
    {id:'mostly',speaker:'Lunafreya',text:"Mostly?"},
    {id:'nine',speaker:'Ida',text:"Chapter nine is very confusing."},
    {id:'offer',speaker:'Ida',text:"If you ever want people swapping books here, I could help. I'd have it all labelled by Thursday."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Ida',text:"I think…",choices:[
      {text:"Let people wander and find things. No labels.",flag:'ida-exchange-loose',
        reply:"No labels. That's actually lovely. I'll try not to alphabetise anything when you're not looking."},
      {text:"A few handwritten notes would be nice. Just a few.",flag:'ida-exchange-notes',
        reply:"Just a few. I can do just a few. Probably."}
    ]},
    {id:'lighthouse',speaker:'Ida',text:"Either way, somebody should suffer through chapter nine with me. I'll lend you this one when I'm done."}
  ]};
  CAST.introductions.elody = {visits:2, lines:[
    {id:'rain',speaker:'Elody',text:"Twelve millimetres last night. Don't mind me, I keep track. I'm Elody."},
    {id:'luna',speaker:'Lunafreya',text:"Lunafreya. Twelve millimetres of rain?"},
    {id:'plot',speaker:'Elody',text:"On my allotment. The beans were thrilled. The slugs were more thrilled."},
    {id:'winning',speaker:'Lunafreya',text:"Who's winning?"},
    {id:'shared',speaker:'Elody',text:"The slugs, honestly. I've decided it's a shared garden now."},
    {id:'plant',speaker:'Elody',text:"Your plant by the window's doing well. Whoever waters it knows what they're doing.",
      alt:{noPlant:"You've no plants yet. That's not a criticism. Some rooms need time to decide what they want."}},
    {id:'cutting',speaker:'Elody',text:"I've a geranium that won't stop making babies. Would you like a cutting? It could live wherever you like."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Elody',text:"A cutting…",choices:[
      {text:"Yes please. On the counter, where I'll see it all day.",flag:'elody-cutting-cafe',
        reply:"The counter. Lots of company, a bit of steam. She'll love it."},
      {text:"Yes please. For my windowsill upstairs.",flag:'elody-cutting-home',
        reply:"A windowsill at home. Good. Plants like to know where you sleep."}
    ]},
    {id:'maud',speaker:'Elody',text:"I'll bring her next time, in a pot with her name on. She's called Maud. Don't ask."}
  ]};
  CAST.regularStories = {
    elody: [
      {id:'maud', after:['elody-introduced'], parcel:'cutting', gift:'cutting', lines:[
        {id:'here',speaker:'Elody',text:"This is Maud. She's on your counter. Pink when she flowers, which is whenever she likes."},
        {id:'care',speaker:'Elody',text:"Water when the soil's dry. Talk to her when it isn't. She doesn't mind which language."},
        {id:'thanks',speaker:'Lunafreya',text:"Thank you, Elody. I'll look after her."},
        {id:'trick',speaker:'Elody',text:"She'll look after herself. That's the whole trick with geraniums."}
      ]}
    ]
  };
})();

/* A reading afternoon (ensemble release 4's shared gathering). Ida proposes
   it in her second scene and Lunafreya chooses its one rule: nobody says a
   word about their book (`reading-quiet`), or one sentence each at the end,
   no explaining (`reading-sentence`). On a later visit Ida brings it with
   her: a few readers she knows come in, each with their own book, and the
   afternoon waits as an invitation ("ready when you want to begin") until
   the player begins it (sim-gathering.js). In `CAST.gathering.reading`,
   `who` keeps a line for a reader who is actually there (regular ID) and
   `variant` for the chosen rule; `alt` holds context variants. Saved prefix
   `gathering-reading-`, completion `gathering-reading-done`, and
   `reading-afternoon-<id>` for everyone who was there. */
(function () {
  'use strict';
  CAST.regularStories.ida = [
    {id:'reading', after:['ida-introduced'], lines:[
      {id:'idea',speaker:'Ida',text:"Can I run something past you? It isn't a book club. I promise it isn't a book club."},
      {id:'club',speaker:'Lunafreya',text:"That's exactly what somebody starting a book club would say."},
      {id:'afternoon',speaker:'Ida',text:"An afternoon. A few people, each with their own book, reading in the same room. That's all."},
      {id:'reports',speaker:'Ida',text:"Nobody has to have read anything. Nobody has to say anything about it afterwards. No reports."},
      {id:'library',speaker:'Ida',text:"At the library they'd want a sign-up sheet and a theme. I'd like one afternoon without a theme."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Ida',text:"Then…",choices:[
        {text:"Yes. And nobody says a word about their book. Not one.",flag:'reading-quiet',
          reply:"Not one. I'll have to sit on my hands. I'll manage."},
        {text:"Yes. And at the end, one sentence each, read aloud. No explaining.",flag:'reading-sentence',
          reply:"One sentence, no explaining. That's actually perfect. I'm stealing it for the library."}
      ]},
      {id:'ask',speaker:'Ida',text:"I'll bring a few people next time I come. The ones who already read here without being asked."},
      {id:'kettle',speaker:'Lunafreya',text:"I'll have the kettle on. Whenever you're all ready."}
    ]}
  ];
  CAST.gathering = {
    // Who Ida brings, in this order, if Lunafreya knows them: people who read.
    readers: ['holger', 'gerda', 'kasper', 'freya'],
    books: { ida: '#8a6a9a', holger: '#4a7a5a', gerda: '#d9738a', kasper: '#c9a04a', freya: '#3d4a5c' },
    reading: [
      {id:'welcome',speaker:'Ida',text:"Right. One rule, and then I'll be quiet: nobody has to say anything about their book.",
        alt:{sentence:"Right. One rule, and then I'll be quiet: at the end, one sentence each. No explaining it."}},
      {id:'kettle',speaker:'Lunafreya',text:"The kettle's on, and nobody has to get up for anything. Read."},
      {id:'holger',who:'holger',speaker:'Holger',text:"The last reading I went to was on my first ship. The captain read out the weather. We all agreed it was a thriller."},
      {id:'gerda',who:'gerda',speaker:'Gerda',text:"Ida lent me this one. A lighthouse on the cover and a great deal of kissing inside. I'm not going to pretend it's for somebody else."},
      {id:'kasper',who:'kasper',speaker:'Kasper',text:"I've brought somebody else's novel. It's very restful. None of it is my fault."},
      {id:'antonia',who:'freya',speaker:'Antonia',text:"A reading afternoon. The only thing that gets me in here before dark."},
      {id:'hush',speaker:'Lunafreya',text:"…"},
      {id:'quiet',speaker:'Lunafreya',text:"Nobody has said a word for twenty minutes. I think this is my favourite afternoon here so far."},
      {id:'mast',who:'holger',speaker:'Holger',text:"Sorry. Somebody in this book just fell off a mast. It's funnier than it sounds.",
        alt:{bosun:"Sorry. The bosun's book. Somebody just fell off a mast. It's funnier than it sounds."}},
      {id:'shh',speaker:'Ida',text:"Shh. Lovingly."},
      {id:'sentences',variant:'sentence',speaker:'Ida',text:"Sentences, then. I'll go first. “The light went round and round, and never once looked away.” That's all."},
      {id:'s-holger',variant:'sentence',who:'holger',speaker:'Holger',text:"“The sea was calm, which the bosun found suspicious.” I still don't know how it ends. I'd like to keep it that way."},
      {id:'s-gerda',variant:'sentence',who:'gerda',speaker:'Gerda',text:"“She had never been kissed by a lighthouse keeper before.” Don't look at me like that. It's a very good lighthouse."},
      {id:'s-kasper',variant:'sentence',who:'kasper',speaker:'Kasper',text:"“He wrote the letter three times and sent the first one.” It isn't mine. That's why I can read it out loud."},
      {id:'s-antonia',variant:'sentence',who:'freya',speaker:'Antonia',text:"I'll give you the first line, not the last. The last one's mine. “The bus was late, which was the first kind thing that happened to her all day.”"},
      {id:'s-luna',variant:'sentence',speaker:'Lunafreya',text:"“Every good room keeps a chair for whoever comes in last.” It's from the book I keep under the counter."},
      {id:'proud',variant:'quiet',speaker:'Ida',text:"Well. Nobody said a single thing about their book. I'm so proud of us."},
      {id:'again',speaker:'Ida',text:"We should do this again. Not every week. Whenever an afternoon looks right for it."},
      {id:'close',speaker:'Lunafreya',text:"Whenever. The kettle will be on."}
    ],
    // Afterwards, the afternoon shows in ordinary visits.
    musings: {
      holger: [{text:'Holger reads, and now and then looks up to see who else is reading.', requires:['reading'], flags:['reading-afternoon-holger']}],
      kasper: [{text:'Kasper closes the laptop for a chapter of somebody else\'s novel, then opens it again, lighter.', requires:['laptop'], flags:['reading-afternoon-kasper']}],
      freya: [{text:'Antonia reaches the last page and keeps the last line to herself.', requires:['reading'], flags:['reading-afternoon-freya']}],
      ida: [{text:'Ida reads, and very carefully says nothing about it.', requires:['reading'], flags:['gathering-reading-done', 'reading-quiet']},
        {text:'Ida reads a sentence under her breath, then smiles at nobody in particular.', requires:['reading'], flags:['gathering-reading-done', 'reading-sentence']}]
    },
    overheard: {
      gerda: [{text:'Gerda tells the next table about the lighthouse novel, spoilers and all.', flags:['reading-afternoon-gerda']}]
    }
  };
  CAST.regulars.forEach(function (r) {
    (CAST.gathering.musings[r.id] || []).forEach(function (m) { r.lines.musing.push(m); });
    (CAST.gathering.overheard[r.id] || []).forEach(function (m) { r.lines.overheard.push(m); });
  });
})();

/* Second visits (after the introductions): later saved scenes for Holger
   (keeping a fire; the shipmate twenty minutes away), Kasper (which way an
   ending should lean), Nora (the hands behind the counter) and Antonia (a
   bench that faces the wrong way). Same contract as every regular story:
   decided at the door, one per visit, in order, game mode, seated, waits.
   `unless` keeps a story back once any of its flags is set; an `alt` key
   `flag:<name>` picks a variant when that saved flag exists. Nora's flags use
   her legacy regular ID `lunafreya`; Antonia's use `freya`. */
(function () {
  'use strict';
  CAST.regularStories.holger = [
    {id:'fire', after:['holger-books-given'], lines:[
      {id:'look',speaker:'Holger',text:"I keep looking at that fireplace. Old habit. On board you always knew where the warm was.",
        alt:{hearth:"Your fire's drawing well. I check on it before I sit down. Old habit."}},
      {id:'ship',speaker:'Lunafreya',text:"Was there a fire on your ships?"},
      {id:'galley',speaker:'Holger',text:"A stove in the galley. Small, black, bad-tempered. On my second ship it went out in a storm, the worst night of the crossing."},
      {id:'cook',speaker:'Holger',text:"The cook sat down on the floor and cried. Not about the cold. He'd kept that stove going for eleven years."},
      {id:'turns',speaker:'Holger',text:"So we took turns. All night, two at a time, feeding it and holding the door shut. Nobody said it was for him."},
      {id:'warm',speaker:'Lunafreya',text:"Was it warm, at least?"},
      {id:'point',speaker:'Holger',text:"Not very. That wasn't what it was for."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Holger',text:"Then…",choices:[
        {text:"When you're here, the fire's yours to keep.",flag:'holger-fire-his',
          reply:"Then I'll keep it the way we kept that one. Properly, and without mentioning it."},
        {text:"I'm glad you told me that one.",flag:'holger-fire-told',
          reply:"So am I. I've never told it on land before."}
      ]},
      {id:'card',speaker:'Holger',text:"The cook's still going, if you're wondering. He sends me a card every Christmas with a drawing of a stove on it."}
    ]},
    {id:'aksel', after:['holger-fire-done'], lines:[
      {id:'letter',speaker:'Holger',text:"I had a letter from Aksel this week. We sailed together for nineteen years."},
      {id:'where',speaker:'Lunafreya',text:"Where is he now?"},
      {id:'bus',speaker:'Holger',text:"Twenty minutes away, on the bus. He's been there four years. So have I."},
      {id:'neither',speaker:'Holger',text:"Neither of us has suggested anything. You'd think two men who crossed the Kattegat in January could manage a cup of coffee."},
      {id:'voices',speaker:'Lunafreya',text:"You told me once you missed some of the voices."},
      {id:'loud',speaker:'Holger',text:"His was the loudest. He tells a story like he's reading out the shipping forecast. You'd like him. Everyone does, eventually."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Holger',text:"Then…",choices:[
        {text:"Ask him here. I'll keep a table for the two of you.",flag:'holger-aksel-cafe',
          reply:"Here. Yes. He'll complain about the chairs and stay three hours."},
        {text:"Ask him for a walk along the water. Just that.",flag:'holger-aksel-walk',
          reply:"A walk. We never did anything on land without an argument about the route. That might be exactly right."}
      ]},
      {id:'tonight',speaker:'Holger',text:"I'll write back tonight. Before I think better of it."},
      {id:'hear',speaker:'Lunafreya',text:"I'd like to hear how it goes."},
      {id:'will',speaker:'Holger',text:"You will. He'll make sure of that."}
    ]}
  ];
  CAST.regularStories.kasper = [
    {id:'endings', after:['kasper-introduced'], lines:[
      {id:'ask',speaker:'Kasper',text:"Can I ask you something about endings? Purely hypothetically. For a friend who is me.",
        alt:{'flag:reading-afternoon-kasper':"Ever since the reading afternoon I've been thinking about endings. Can I ask you something? For a friend who is me."}},
      {id:'go',speaker:'Lunafreya',text:"Go on."},
      {id:'two',speaker:'Kasper',text:"Some books end quietly. Everything settles and you close them. Others leave a door open and you lie awake."},
      {id:'lean',speaker:'Kasper',text:"Which do you like? I'm not going to do what you say. I just want to know which way the room leans."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Kasper',text:"I like…",choices:[
        {text:"Endings that arrive quietly. Like the last customer going home.",flag:'kasper-ending-quiet',
          reply:"The last customer going home. That's annoyingly good. Now I'm thinking about chairs being put up."},
        {text:"Endings that leave a door open. I like wondering who comes in next.",flag:'kasper-ending-open',
          reply:"Who comes in next. Of course a café would say that. It's a good answer. I resent it slightly."}
      ]},
      {id:'still',speaker:'Kasper',text:"Chapter seven is still chapter seven. But I know which way it wants to end now, which is new.",
        alt:{'flag:kasper-good-lines':"That's worth at least three good lines. I'll report."}},
      {id:'about',speaker:'Lunafreya',text:"I still haven't asked what it's about."},
      {id:'noticed',speaker:'Kasper',text:"I noticed. It's the nicest thing about this place."}
    ]}
  ];
  CAST.regularStories.lunafreya = [
    {id:'portrait', after:['lunafreya-introduced'], lines:[
      {id:'confess',speaker:'Nora',text:"I have to confess something. I went through my sketchbook last night."},
      {id:'and',speaker:'Lunafreya',text:"And?"},
      {id:'hands',speaker:'Nora',text:"You're in it forty times. Every time you're a pair of hands behind the counter. Pouring. Wiping. Never a face."},
      {id:'owners',speaker:'Nora',text:"I've been painting you the way those owners wanted their rooms. Useful, and out of the way. I didn't like noticing that."},
      {id:'ask',speaker:'Nora',text:"So I'm asking, forty sketches late. May I paint you properly? No is a complete answer.",
        alt:{'flag:lunafreya-remember-people':"You said a painting of this place should have somebody in it. I never thought to ask which somebody. May I paint you properly? No is a complete answer."}},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Nora',text:"I…",choices:[
        {text:"Yes. Here, in the café, with the room around me.",flag:'lunafreya-portrait-cafe',
          reply:"With the room around you. Good. Then it can hang where people will see you in it."},
        {text:"Yes, but a small one. Just for upstairs.",flag:'lunafreya-portrait-home',
          reply:"Small, and not for everybody. Those are my favourite kind."},
        {text:"I'd rather stay the hands for now. They're doing their best.",flag:'lunafreya-portrait-no',
          reply:"Then the hands it is, and I'll stop apologising to them. The question keeps, if you ever change your mind."}
      ]},
      {id:'cups',speaker:'Nora',text:"Either way, I'm going to stop leaving out the cups."}
    ]}
  ];
  CAST.regularStories.freya = [
    {id:'bench', after:['freya-introduced'], lines:[
      {id:'stop',speaker:'Antonia',text:"There's a stop at the end of my route, right by the water. I've never told anybody about it.",
        alt:{'flag:freya-route':"You asked about my favourite stretch once. There's a stop at the very end of it, by the water."}},
      {id:'bench',speaker:'Antonia',text:"One bench. It faces the wrong way for the view, so nobody sits on it. I eat my sandwich there on the long shift."},
      {id:'wrong',speaker:'Lunafreya',text:"The wrong way?"},
      {id:'city',speaker:'Antonia',text:"Towards the city. You watch the windows come on, one by one. Much better than water. Water just sits there."},
      {id:'offer',speaker:'Antonia',text:"I could show you tonight, after you close. It's on my way home. It's not a big thing. It's a bench."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Antonia',text:"I'd…",choices:[
        {text:"I'd like that. I'll even close on time.",flag:'freya-bench-yes',
          reply:"Bring a coat. The bench doesn't believe in shelter."},
        {text:"I'd like that another night, when I'm less tired.",flag:'freya-bench-later',
          reply:"The bench will wait. It's very good at it. So am I."}
      ]},
      {id:'ending',speaker:'Antonia',text:"Right. Back to my ending."}
    ]},
    // If it was another night: asked once more, on a later visit, and then
    // left alone (a second "not yet" is answered kindly and never repeated).
    {id:'again', after:['freya-bench-done','freya-bench-later'], unless:['freya-bench-yes'], lines:[
      {id:'still',speaker:'Antonia',text:"The bench is still facing the wrong way, in case you were wondering. Tonight, after you close?"},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Antonia',text:"Tonight…",choices:[
        {text:"Tonight. I've been looking forward to it.",flag:'freya-bench-yes',
          reply:"Good. Coat. I mean it about the coat."},
        {text:"Not tonight. But I like knowing it's there.",flag:'freya-bench-someday',
          reply:"It'll be there. That's the whole point of a bench."}
      ]}
    ]}
  ];
  // The outing itself, remembered at home that night (an evening moment).
  CAST.homeStories.bench = {icon:'bench', label:"Remember Antonia's bench", after:['freya-bench-yes'], lines:[
    {id:'wrong',speaker:'Lunafreya',text:"Antonia's bench. It really does face the wrong way."},
    {id:'windows',speaker:'Lunafreya',text:"We watched the windows come on, one by one. She knows which one belongs to a man who plays the trumpet badly."},
    {id:'bus',speaker:'Lunafreya',text:"A bus went past on its last run, every light on and nobody on board.",
      alt:{'flag:freya-route':"Her 9A went past on its last run, every light on, nobody on board. Like driving a lantern, she said. It was."}},
    {id:'quiet',speaker:'Lunafreya',text:"We hardly said anything. She said that was the point of the bench."},
    {id:'half',speaker:'Lunafreya',text:"I think I have half a bench now. That's more than I had last week."}
  ]};
  const more = {
    holger: [
      {text:'Holger checks the fire before he opens his book, as if it were his watch.', requires:['fire'], flags:['holger-fire-his']},
      {text:'Holger watches the fire for a while, somewhere a long way off.', requires:['fire'], flags:['holger-fire-told']},
      {text:'Holger glances at the door now and then, as if expecting a friend.', flags:['holger-aksel-cafe']},
      {text:'Holger mentions a walk along the harbour, and an argument about a buoy.', flags:['holger-aksel-walk']}
    ],
    kasper: [
      {text:'Kasper types a sentence, reads it, and lets it end there.', requires:['laptop'], flags:['kasper-ending-quiet']},
      {text:'Kasper writes a line and leaves the door of it open.', requires:['laptop'], flags:['kasper-ending-open']}
    ],
    lunafreya: [
      {text:'Nora looks up at Lunafreya, then down at the sketchbook, like somebody memorising a face.', flags:['lunafreya-portrait-cafe']},
      {text:'Nora looks up at Lunafreya, then down at the sketchbook, like somebody memorising a face.', flags:['lunafreya-portrait-home']},
      {text:'Nora sketches the hands at the till, and seems perfectly happy about it.', flags:['lunafreya-portrait-no']}
    ],
    freya: [
      {text:'Antonia glances at the window as if checking which lights have come on.', requires:['view'], flags:['home-bench-done']}
    ]
  };
  CAST.regulars.forEach(function (r) { (more[r.id] || []).forEach(function (m) { r.lines.musing.push(m); }); });
})();

/* Gifts from the neighbours (second beats, part two). Keira's and Tomas's
   stories become ordered lists (sim-visitors.js): each is decided at the door
   of an off-duty visit, one per visit, `after`/`unless` like the regulars',
   `photo` marks a scene after which Keira takes a photograph, and `gift`
   hands over a keepsake (an improvement id) that waits on the counter.
   Keira asks once more if the café was "not yet"; later she brings two
   prints, an early delivery morning and now (keepsake `photo`: by the till,
   or upstairs above the desk). Tomas brings the loaf that didn't hold a door
   open (it becomes that night's supper), and, once the photographs are up, a
   frame made from a board he took off the left window (keepsake `frame`).
   Gerda's own colour: a yellow scarf for herself, knitted as an arc
   (`gerda-own`) and shown in her own scene; she wears it from then on. */
(function () {
  'use strict';
  const keiraCup = CAST.visitorStories.keira, tomasCupboard = CAST.visitorStories.tomas;
  keiraCup.photo = true;
  CAST.visitorStories.keira = [keiraCup,
    {id:'ask', after:['keira-cup-done','keira-photo-later'], unless:['keira-photo-yes'], photo:true, lines:[
      {id:'again',speaker:'Keira',text:"I said I'd ask again when the place had had time. It's had time. It's more itself than it was."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Keira',text:"A photograph…",choices:[
        {text:"Go on, then. As it is.",flag:'keira-photo-yes',reply:"As it is. Hold still, café."},
        {text:"Not yet. I like that you keep asking, though.",flag:'keira-photo-someday',
          reply:"Then I'll keep looking in the window instead. That's allowed."}
      ]}
    ]},
    {id:'print', after:['keira-cup-done','keira-photo-yes'], gift:'photo', lines:[
      {id:'envelope',speaker:'Keira',text:"I brought you something. Don't open it at the till. Well, you can. It's your till."},
      {id:'two',speaker:'Keira',text:"Two photographs. The one I took with permission. And one I took without asking, the morning I brought your first table."},
      {id:'sign',speaker:'Keira',text:"It's just your door and the sign you painted. I photograph handwritten signs. I forgot I had this one."},
      {id:'crooked',speaker:'Lunafreya',text:"Look at it. The sign's crooked. I straightened it three times that morning."},
      {id:'building',speaker:'Keira',text:"I thought I was bringing you furniture. Put them side by side. You were building something the whole time."},
      {id:'half',speaker:'Lunafreya',text:"So were you. You carried half of it in."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Keira',text:"They should go…",choices:[
        {text:"…here, by the till, where I'll see them every day.",flag:'keira-print-cafe',
          reply:"By the till. Then I can check on them when I come in for a coffee."},
        {text:"…upstairs, above my desk.",flag:'keira-print-home',
          reply:"Upstairs. Good. Somewhere you're not working."}
      ]},
      {id:'coat',speaker:'Keira',text:"Coat's off again, by the way. It's becoming a habit."}
    ]}
  ];
  CAST.visitorStories.tomas = [tomasCupboard,
    {id:'bread', after:['tomas-cupboard-done'], lines:[
      {id:'loaf',speaker:'Tomas',text:"The next loaf. As promised. It hasn't held a single door open."},
      {id:'looks',speaker:'Lunafreya',text:"It looks like bread."},
      {id:'praise',speaker:'Tomas',text:"That's the best thing anyone's said about it. Try the end. The end is the honest part."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Tomas',text:"It's…",choices:[
        {text:"Good. Properly good.",flag:'tomas-bread-good',
          reply:"Then I'll make another. It'll be worse. That's how it goes with me."},
        {text:"The crust is wonderful. The middle is still thinking.",flag:'tomas-bread-crust',
          reply:"The middle's always thinking. I'll take the crust."}
      ]},
      {id:'supper',speaker:'Tomas',text:"Keep the rest. Have it for your supper."},
      {id:'thanks',speaker:'Lunafreya',text:"I will. Thank you, Tomas."}
    ]},
    {id:'frame', after:['tomas-bread-done','keira-print-done'], gift:'frame', lines:[
      {id:'photos',speaker:'Tomas',text:"I saw your photographs by the till. They deserve better than drawing pins.",
        alt:{'flag:keira-print-home':"Keira told me about the photographs above your desk. They deserve better than drawing pins."}},
      {id:'made',speaker:'Tomas',text:"So I made a frame. Out of one of the boards I took off your left window, the second day."},
      {id:'window',speaker:'Lunafreya',text:"From the window?"},
      {id:'pine',speaker:'Tomas',text:"Good old pine. It kept the weather out for years. Now it can keep something in."},
      {id:'tomas',speaker:'Lunafreya',text:"Tomas, that's…"},
      {id:'level',speaker:'Tomas',text:"It's level. Your wall will have a different opinion."}
    ]}
  ];
  // The loaf, remembered at supper that night (once).
  CAST.breadSupper = {
    'tomas-bread-good': 'supper is Tomas’s bread tonight, with a little cheese. It is, honestly, good.',
    'tomas-bread-crust': 'supper is Tomas’s bread tonight. The crust really is wonderful; the middle is still thinking.'
  };
  CAST.visitors.tomas.returningAfter = [CAST.visitors.tomas.returningAfter,
    {flags:['tomas-bread-done'], text:'Tomas comes in without a toolbox, and with the look of a man who has been baking.'}];

  CAST.arcs.push({
    id: 'gerda-own',
    owner: 'gerda',
    knits: true,
    rows: 4,
    after: ['gerda-colour-asked'],   // a scarf for herself, once she has said so
    payoff: 'scene',                 // she shows it in her own scene, then wears it
    scarfColor: '#d9a33c',
    colors: { 'gerda-colour-own': '#d9a33c', 'gerda-colour-both': '#d9a33c' },
    patterns: { 'gerda-colour-both': 'stripe' },
    glyph: 'yarn',
    flag: 'gerda-colour-worn',
    knitLines: [
      'Gerda\'s yellow scarf grows a row at a time; she looks pleased with it every time.',
      'Gerda holds the yellow wool up to the window and nods to herself.',
      'Gerda knits, humming, in a colour Erik would have argued with.'
    ],
    beat: ['Gerda casts off the yellow scarf.']
  });
  CAST.gerdaWindow.colour = [
    {id:'wool',speaker:'Gerda',text:"Look at this. I bought it on Tuesday and I've been hiding it from myself ever since."},
    {id:'brave',speaker:'Lunafreya',text:"That's a very brave yellow."},
    {id:'erik',speaker:'Gerda',text:"Erik hated yellow. He said it made everybody look like a custard. So for forty years I knitted in his colours."},
    {id:'still',speaker:'Gerda',text:"I noticed I still do. I stand in the wool shop and think, would he like this. He can't have an opinion any more. I keep giving him one."},
    {id:'mine',speaker:'Gerda',text:"This one is for me. A scarf, in a colour I've liked since I was nine."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Gerda',text:"Then…",choices:[
      {text:"All of it yours, then. Every row.",flag:'gerda-colour-own',
        reply:"Every row. Goodness. I feel as if I've run away from home."},
      {text:"Put one stripe of his rust in it. Both can belong.",flag:'gerda-colour-both',
        reply:"A stripe of his rust in my yellow. Yes. He'd hate it. He'd wear it anyway."}
    ]},
    {id:'days',speaker:'Gerda',text:"It will take a few days. I'm going to enjoy every one of them."}
  ];
  CAST.gerdaWindow.colourShow = [
    {id:'well',speaker:'Gerda',text:"Well? Don't be polite. I'll know."},
    {id:'lamp',speaker:'Lunafreya',text:"It suits you. It looks like a lamp coming on.",
      alt:{'flag:gerda-colour-both':"It suits you. The stripe looks as if it was always going to be there."}},
    {id:'warm',speaker:'Gerda',text:"It's the warmest thing I've ever made, and I've made a great many warm things."},
    {id:'argue',speaker:'Gerda',text:"All mine. It turns out I still know what I like.",
      alt:{'flag:gerda-colour-both':"His rust and my yellow. It turns out they don't argue."}},
    {id:'wear',speaker:'Lunafreya',text:"Wear it in here. The room could use it."}
  ];
  const gerda = CAST.regulars.find(r => r.id === 'gerda');
  gerda.lines.musing.push({text:'Gerda adjusts her yellow scarf and looks, briefly, very pleased with herself.', flags:['gerda-colour-worn']});
  gerda.lines.arrivalReturn.push({text:'Gerda comes in wearing the yellow scarf, like a lamp coming on.', flags:['gerda-colour-worn']});
})();

/* Saira, before there is any piano (ensemble release 5, part one). She
   plays for a choir and teaches; she taps rhythms on the table edge and
   stops when somebody nearby is reading (trait `taps`, sim-patrons). Her
   hello asks what the room should sound like; her second scene asks
   Lunafreya to listen to eight bars of her own (hummed: a line's `sound`
   plays as it begins), and that evening Lunafreya leaves a harmless task
   until morning (home story `rest`). Then Saira brings the handwritten
   score (keepsake `score`): pinned up behind the counter, where Lunafreya
   sometimes hums it (sim-saira.js), or above the bed upstairs. */
(function () {
  'use strict';
  CAST.regulars.push({
    id: 'saira',
    name: 'Saira',
    nameStyle: 'feminine',
    colors: {
      skin: '#b57a4a', hair: '#2a1a12', top: '#7a89a5', pants: '#3d4a5c',
      scarf: '#d9738a', longHair: true, hairStyle: 1, beard: false
    },
    drink: 'hot chocolate',
    traits: { wantsBook: false, ownBook: false, chatty: true, laptop: false, pianist: false, taps: true },
    murmurPitch: 215, speed: 52,
    umbrella: '#c9a04a',
    arrival: { from: 10.8, to: 11.5 },
    stay: [220, 320],
    seat: 'diningTable',
    firstDay: 7,
    rhythm: { every: 3, offset: 2 },
    lines: {
      arrival: ['Saira comes in humming something, and stops at the door.'],
      arrivalRain: ['Saira comes in from the rain with a music folder held under her coat.'],
      arrivalReturn: ['Saira is back, a music folder under her arm and a pencil behind her ear.',
        {text:'Saira comes in humming, and this time she does not stop at the door.', flags:['saira-score-done']}],
      settle: ['Saira sits down and listens to the room for a moment before she drinks.'],
      usualTaken: ['Her table is taken; Saira takes another and seems to like its acoustics.'],
      overheard: [
        'Saira explains to the next table why the alto line is the best line.',
        'Saira tells a story about a hymn, a choir and a very long pause.',
        'Something at the table makes Saira laugh, then hush herself.'
      ],
      musing: [
        {text:'Saira listens to the rain on the window as if she were counting it.', requires:['rain']},
        'Saira pencils a note onto a folded sheet of music, then rubs it out.',
        {text:'Saira hums one note under her breath, then leaves the quiet alone.', flags:['saira-room-quiet']},
        {text:'Saira hums a few bars, so quietly they are gone before anyone notices.', flags:['saira-room-tune']},
        {text:'Saira pencils another bar onto a folded sheet, and this time does not rub it out.', flags:['saira-listen-done']},
        {text:'Saira glances at her score behind the counter and pretends she did not.', requires:['saira-score'], flags:['saira-score-cafe']}
      ],
      backstory: [
        'Saira has played for the same choir for six years; she knows every singer by how they breathe in.',
        'Saira says a choir is twenty-six people agreeing to breathe at the same time. She finds that very moving.'
      ],
      // A bout of tapping ends: on its own, or because somebody is reading.
      tap: ['Saira taps out a rhythm on the table edge, very softly.'],
      tapStop: ['Saira taps a rhythm on the table, notices somebody reading, and stops.',
        'Saira catches herself tapping, glances at a reader, and folds her hands.']
    }
  });
  CAST.voices.Saira = {pitch:218,filter:800,pace:.97};
  CAST.introductions.saira = {visits:2, lines:[
    {id:'tapping',speaker:'Saira',text:"Sorry. Was I tapping? I was tapping. It's the alto line from Thursday. It gets into my hands."},
    {id:'stopped',speaker:'Lunafreya',text:"I didn't mind. You stopped halfway, though."},
    {id:'reader',speaker:'Saira',text:"Somebody was reading. You can't tap your way through somebody else's chapter. I'm Saira."},
    {id:'luna',speaker:'Lunafreya',text:"Lunafreya. Are you a drummer?"},
    {id:'piano',speaker:'Saira',text:"Piano. I play for a choir in the church hall, and I teach. Eleven children and a retired dentist."},
    {id:'dentist',speaker:'Lunafreya',text:"A dentist?"},
    {id:'ten',speaker:'Saira',text:"My ten o'clock. He practises more than all the children put together. Don't tell him about the sugar.",
      alt:{menu:"My ten o'clock. He practises more than all the children put together. Don't tell him I ordered hot chocolate."}},
    {id:'tune',speaker:'Saira',text:"I like it in here. It's got a tune already. Cups, and pages, and the door, and somebody's spoon.",
      alt:{rain:"I like it in here. It's got a tune already. The rain, and cups, and pages, and somebody's spoon.",
        hearth:"I like it in here. It's got a tune already. The fire, and cups, and pages, and somebody's spoon."}},
    {id:'room',speaker:'Saira',text:"Most music wants the whole room to itself. I like the kind that leaves room for the room."},
    {id:'ask',speaker:'Saira',text:"What would you want it to sound like in here? Honestly. You're the one who listens to it all day."},
    {id:'choice',speaker:'Lunafreya',replySpeaker:'Saira',text:"Honestly…",choices:[
      {text:"Like this. Cups and pages. I'd like the quiet to be the loudest thing in the room.",flag:'saira-room-quiet',
        reply:"The quiet as the loudest thing. That's a lovely instruction. Nobody's ever given me that one."},
      {text:"Something small, now and then. The kind you only notice when it stops.",flag:'saira-room-tune',
        reply:"The kind you only notice when it stops. You'd make a terrible concert hall and a very good room."}
    ]},
    {id:'hands',speaker:'Saira',text:"I'll try to keep my hands to myself. No promises the day after choir."}
  ]};
  CAST.regularStories.saira = [
    {id:'listen', after:['saira-introduced'], lines:[
      {id:'favour',speaker:'Saira',text:"Can I ask you a favour? You can say no. I've written something. Eight bars."},
      {id:'what',speaker:'Lunafreya',text:"Eight bars of what?"},
      {id:'mine',speaker:'Saira',text:"Of mine. I haven't written anything just for me since I was nineteen. Everything I play keeps somebody else's time."},
      {id:'follow',speaker:'Saira',text:"I'm good at that. Twenty-six singers breathe in and I'm already there. I'm less good at going first."},
      {id:'ask',speaker:'Saira',text:"Would you listen? I'll only hum it. There isn't a piano, which is honestly a relief.",
        alt:{'flag:saira-room-quiet':"Would you listen? I'll hum it very quietly. You did say the quiet should be the loudest thing."}},
      {id:'wipe',speaker:'Lunafreya',text:"Of course. Let me just wipe this table first."},
      {id:'clean',speaker:'Saira',text:"That table's clean. You wiped it when I sat down. You don't have to do anything. That's the whole favour."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Saira',text:"I…",choices:[
        {text:"You're right. I'm not very good at sitting down when nobody needs anything.",flag:'saira-listen-sit',
          reply:"Then sit badly. Everybody starts badly. Here, have the chair that wobbles."},
        {text:"Can I keep the cloth? It's easier to listen with something in my hands.",flag:'saira-listen-cloth',
          reply:"Keep it. I can't think without a pencil behind my ear. Everybody needs something to hold."}
      ]},
      {id:'eight',speaker:'Saira',text:"Mm, mm-mm, mm… mm-mm. Mm.",sound:'sairaHum'},
      {id:'stops',speaker:'Lunafreya',text:"It stopped."},
      {id:'there',speaker:'Saira',text:"It always stops there. Everything I write waits for a choir to come in. This one has to learn to go on by itself."},
      {id:'cat',speaker:'Saira',text:"The cat has chosen a key, by the way. Several, actually.",sound:'meow'},
      {id:'again',speaker:'Lunafreya',text:"Hum it again next time. Even if it still stops."},
      {id:'thanks',speaker:'Saira',text:"I will. Thank you for listening. It's rarer than you'd think."}
    ]},
    {id:'score', after:['saira-listen-done'], gift:'score', lines:[
      {id:'finished',speaker:'Saira',text:"I finished it. Well. It goes on by itself now, which is the same thing."},
      {id:'paper',speaker:'Saira',text:"I wrote it out for you. Pencil, on the choir's paper. I rubbed the second line out three times. You can still see the ghosts."},
      {id:'rests',speaker:'Saira',text:"It's mostly rests. You said the quiet should be the loudest thing, so I gave the quiet the most bars.",
        alt:{'flag:saira-room-tune':"It's small. It stops before you've noticed it, and then you notice. That's what you asked for. It was hard."}},
      {id:'title',speaker:'Lunafreya',text:"There's no title."},
      {id:'blank',speaker:'Saira',text:"I left it blank. I always name a piece after the room it's for, and this room hasn't told me its name yet."},
      {id:'bus',speaker:'Saira',text:"You don't need a piano to have it. Hum it. That's what I do on the bus. The bus has never complained."},
      {id:'choice',speaker:'Lunafreya',replySpeaker:'Saira',text:"It should go…",choices:[
        {text:"…here, pinned up behind the counter. I'll hum it while I work.",flag:'saira-score-cafe',
          reply:"Behind the counter. Then it lives in the room it was written for. It'll like that."},
        {text:"…upstairs, on the wall above my bed.",flag:'saira-score-home',
          reply:"Above your bed. Good. Somebody should hum it while the café's asleep."}
      ]},
      {id:'thanks',speaker:'Lunafreya',text:"Thank you, Saira. Nobody's ever written me music before."},
      {id:'next',speaker:'Saira',text:"Next time I hum it for you, you're sitting down. Badly is fine.",
        alt:{'flag:saira-listen-cloth':"Next time I hum it for you, bring the cloth. Everybody needs something to hold."}},
      {id:'goes-on',speaker:'Saira',text:"It's only eight bars. But it goes on by itself now. So do I, a little."}
    ]}
  ];
  // That evening, upstairs: a harmless task left until morning.
  CAST.homeStories.rest = {icon:'note', label:'Leave the receipts until morning', after:['saira-listen-done'], lines:[
    {id:'receipts',speaker:'Lunafreya',text:"The week's receipts, in a pile by the computer. I was going to go through them tonight."},
    {id:'badly',speaker:'Lunafreya',text:"Saira says everybody starts badly. So I'm going to sit here, badly, and leave them until morning.",
      alt:{'flag:saira-listen-cloth':"Saira says everybody needs something to hold. Tonight it can be a cup of tea. The receipts can wait until morning."}},
    {id:'tune',speaker:'Lunafreya',text:"Mm, mm-mm… I can't remember how it goes after that. That's all right. Neither can she, yet.",sound:'lunaHum'}
  ]};
})();
