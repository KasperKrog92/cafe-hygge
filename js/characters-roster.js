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
   his behavior is unchanged. Phase 1 adds the rest of the roster. */
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
        lines: { arrival: [], overheard: [], musing: [], backstory: [] }
      }
    ]
  };
})();
