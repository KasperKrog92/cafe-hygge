/* Motion continuity: no character snaps between poses. Runs busy private
   furnished worlds at 12 fps and renders each person alone every tick. A
   frame where the silhouette jumps (head height or overall shape) while the
   body is not travelling is a pop: sitting, kneeling or standing without a
   transition, or a pose swapped in one frame. The cat's stylized poses are
   reported, not failed. Evaluate on a disposable ?dev page (run-suites.js). */
(function () {
  const failures = [], examples = [], catPops = {};
  const c = document.createElement('canvas'); c.width = 140; c.height = 130;
  const g = c.getContext('2d', { willReadFrequently: true });
  function mask(e, cat) {
    g.clearRect(0, 0, 140, 130); g.save(); g.translate(70 - Math.round(e.x), 105 - Math.round(e.y));
    if (cat) SCENE.drawCat(g, e); else SCENE.drawPerson(g, e);
    g.restore();
    const d = g.getImageData(0, 0, 140, 130).data, m = new Uint8Array(140 * 130);
    let top = 130;
    for (let i = 0; i < m.length; i++) if (d[i * 4 + 3] > 200) { m[i] = 1; if (top === 130) top = Math.floor(i / 140); }
    return { m: m, top: top };
  }
  function iou(a, b) {
    let inter = 0, uni = 0;
    for (let i = 0; i < a.length; i++) { inter += a[i] & b[i]; uni += a[i] | b[i]; }
    return uni ? inter / uni : 1;
  }
  let samples = 0, sits = 0, rises = 0;
  for (const seed of [5, 42]) {
    const w = __dev.furnishedWorld({ random: SIM.seededRandom(seed) });
    for (let i = 0; i < 4 * 60; i++) SIM.update(w, 0.25);
    const prev = new Map();
    for (let k = 0; k < 12 * 120; k++) {
      SIM.update(w, 1 / 12);
      const people = w.patrons.filter(p => !p.outside).concat([w.barista]);
      people.concat([w.cat]).forEach(function (e) {
        const cat = e === w.cat, key = cat ? 'cat' : e === w.barista ? 'barista' : e.id;
        const now = mask(e, cat), was = prev.get(key);
        prev.set(key, { m: now.m, top: now.top, x: e.x, y: e.y, pose: e.pose, state: e.state });
        samples++;
        if (!was) return;
        if (!cat && was.pose !== 'sit' && e.pose === 'sit') sits++;
        if (!cat && was.pose === 'sit' && e.pose !== 'sit') rises++;
        if (Math.hypot(e.x - was.x, e.y - was.y) > 1.5) return;       // travelling bodies change shape
        const headJump = Math.abs(now.top - was.top), overlap = iou(now.m, was.m);
        if (headJump <= 4 && overlap >= 0.6) return;
        const what = (was.state + '/' + was.pose + ' -> ' + e.state + '/' + e.pose);
        if (cat) { catPops[what] = (catPops[what] || 0) + 1; return; }
        failures.push(key); if (examples.length < 8) examples.push({ seed, t: k / 12, what, headJump, overlap: +overlap.toFixed(2) });
      });
    }
  }
  if (sits < 4 || rises < 2) throw Error('Too little seating traffic to judge motion: ' + sits + ' sits, ' + rises + ' rises');
  if (failures.length) throw Error(failures.length + ' human pose pops: ' + JSON.stringify(examples));
  return { samples, sits, rises, humanPops: 0, catPops };
})()
