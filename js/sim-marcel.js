/* Café Hygge — Marcel, the painter across the lake. One presence: while the
   facade is his work in progress he comes in only when he could not be on
   the ladder (rain, or the light gone), and the far-bank figure and its
   invitation wait while he sits inside (SCENE.figureInside). He first comes
   once the left window is clear: they have been watching each other's work. */
(function () {
  'use strict';
  function painting(w) {
    const rec = w.memory.arcs['street-house'];
    return !!rec && rec.stage === 0 && !w.memory.flags['street-house-painted'];
  }
  SIM.gateRegular('marcel', {
    mayVisit: w => SCENE.windowOpen(w, SCENE.L.win) && (!painting(w) || w.rain >= 0.3 || w.daylight <= 0.45)
  });
})();
