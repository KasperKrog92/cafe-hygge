/* Capture helpers shared by the ?life-test ui flows; tools/ui/lib/ is not
   itself a flow. On those pages tools/life-browser-init.js stubs
   requestAnimationFrame and the flow renders each frame by hand
   (lifeTestFrame), so frames must be drawn deliberately before a screenshot. */

// t.viewport already waits for the page's resize handler (run-suites.js).
exports.resize = function (t, width, height) { return t.viewport(width, height); };

// Render frames spaced in real time. The conversation camera eases its zoom
// by real elapsed time (performance.now in main.js render), so without this
// a capture shows it frozen wherever the last hand-drawn frame left it.
// Each frame also advances the simulation by that real ~0.1 s.
exports.settle = async function (t, frames) {
  for (let i = 0; i < (frames || 8); i++) {
    await t.page.waitForTimeout(100);
    await t.eval(() => lifeTestFrame(performance.now()));
  }
};
