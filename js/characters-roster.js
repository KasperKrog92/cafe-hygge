/* Café Hygge — the regulars roster, as pure data.

   `window.CAST.regulars` is the bible for established regulars: each entry
   fixes a face, a drink, a set of habits, a usual seat, and (later) the pools
   of lines they might overhear or muse aloud. Pure data, zero dependencies —
   loaded before sim-core so the sim (and the dev audit) can read it.

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
     lines      { arrival, overheard, musing, backstory } — filled from Phase 2

   Row one is Holger, carrying the exact values his hardcoded builder used, so
   his behavior is unchanged. Phase 1 adds the rest of the roster and wires the
   sim to read these rows. The `lines.arrival` pool is populated now (each
   regular needs a way in); overheard/musing/backstory stay empty until Phase 2
   gives the roster its voice.

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
        traits: { wantsBook: true, ownBook: true, chatty: false, laptop: false, pianist: false },
        murmurPitch: 130, speed: 46,
        umbrella: '#3d4a5c',
        arrival: { from: 9, to: 9 + 2 / 3 },
        stay: [280, 420],
        seat: 'firesideLeft',
        lines: {
          arrival: ['Holger steps in, as steady as the clock.'],
          overheard: [], musing: [], backstory: []
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
          overheard: [], musing: [], backstory: []
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
          overheard: [], musing: [], backstory: []
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
          overheard: [], musing: [], backstory: []
        }
      }
    ]
  };
})();
