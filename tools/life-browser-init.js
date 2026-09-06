// Only the disposable reload runner injects this fixture. It advances the
// production world explicitly so a page reload can inspect exact work phases.
if (location.search.includes('life-test')) {
  window.requestAnimationFrame = function(fn) { window.lifeTestFrame = fn; return 1; };
  window.setInterval = function() { return 1; };
}
