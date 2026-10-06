/* The cached café light map must remain local to its inputs, render-only,
   and faithful to installed furniture and each source's power supply. */
(function () {
  'use strict';
  const checks = [], failures = [];
  const live = window.__world, memory = MEMORY.state;
  const production = JSON.stringify({ world: live, memory: memory, audio: SND.settings });
  const full = __dev.furnishedWorld({ random: SIM.seededRandom(781) });
  const modest = __dev.modestWorld({ random: SIM.seededRandom(782) });
  function fixture(base, hour) { return __dev.study({ world: base, hour: hour, seats: [] }); }
  function copy(w) { return structuredClone(w); }
  function state(g) {
    const m = g.getTransform();
    return JSON.stringify({ alpha: g.globalAlpha, composite: g.globalCompositeOperation,
      fill: g.fillStyle, stroke: g.strokeStyle, transform: [m.a, m.b, m.c, m.d, m.e, m.f] });
  }
  function render(w, styled) {
    const c = document.createElement('canvas'); c.width = SCENE.W; c.height = SCENE.H;
    const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, c.width, c.height);
    if (styled) {
      g.translate(3, 5); g.scale(0.9, 0.9);
      g.globalAlpha = 0.73; g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#184152'; g.strokeStyle = '#a15832';
    }
    const beforeWorld = JSON.stringify(w), beforeContext = state(g);
    SCENE.drawLighting(g, w);
    if (beforeWorld !== JSON.stringify(w)) failures.push('Lighting changed its world');
    if (beforeContext !== state(g)) failures.push('Lighting changed caller drawing state');
    return c.toDataURL();
  }
  function compare(label, a, b, equal) {
    if ((render(a) === render(b)) !== equal) failures.push(label);
    else checks.push(label);
  }

  const variants = [fixture(full, 12), fixture(full, 20), fixture(full, 23),
    fixture(modest, 12), fixture(modest, 23)];
  const unpowered = copy(variants[2]); unpowered.shop.lights = 0; variants.push(unpowered);
  const curtained = copy(variants[2]); curtained.shop.curtains = [1, 1]; variants.push(curtained);
  const rainy = copy(variants[0]); rainy.rain = 1; variants.push(rainy);
  const images = variants.map(w => render(w));
  // Reverse order forces every warmed map to be reused after another world,
  // including the smaller café and the same café with its lights switched off.
  for (let i = variants.length - 1; i >= 0; i--)
    if (render(variants[i]) !== images[i]) failures.push('Interleaved cache changed variant ' + i);
  render(variants[2], true);
  checks.push('Repeatable across eight interleaved furnished/C0/day/night/power/weather fixtures');

  let a = fixture(modest, 23), b = copy(a);
  a.fire.level = 1; b.fire.level = 0;
  compare('An uninstalled hearth emits no light', a, b, true);
  a = fixture(modest, 23); b = copy(a); a.candles.mantel = 1; b.candles.mantel = 0;
  compare('An uninstalled mantel emits no candle light', a, b, true);
  ['nook', 'studio', 'piano'].forEach(function (id) {
    a = fixture(full, 23); a.shop.lights = 0; b = copy(a);
    b.memory.life.furniture[id] = false;
    if (id === 'piano') b.memory.life.projects.piano.stage = 'available';
    compare('Unpowered ' + id + ' lamps emit no light', a, b, true);
  });
  a = fixture(full, 23); a.shop.lights = 0; a.candles.mantel = 0; b = copy(a); b.candles.mantel = 1;
  compare('Mantel candles remain independent of electricity', a, b, false);
  a = fixture(full, 23); a.shop.lights = 0; a.tables[0].candle = 0; b = copy(a); b.tables[0].candle = 1;
  compare('Table candles remain independent of electricity', a, b, false);
  a = fixture(full, 23); a.shop.lights = 0; a.fire.level = 0; b = copy(a); b.fire.level = 1;
  compare('The installed fire remains independent of electricity', a, b, false);
  a = fixture(full, 12); b = copy(a); b.rain = 1;
  compare('Daylight responds to rain', a, b, false);
  a = fixture(full, 12); b = copy(a); b.shop.curtains = [1, 1];
  compare('Daylight responds to curtains', a, b, false);

  if (live !== window.__world || memory !== MEMORY.state || production !==
      JSON.stringify({ world: window.__world, memory: MEMORY.state, audio: SND.settings }))
    failures.push('Lighting fixtures changed production state');
  if (failures.length) throw new Error(JSON.stringify({ checks: checks, failures: failures }));
  checks.push('Rendering preserves fixture, live state and caller drawing state');
  return { checks: checks, failures: failures };
})()
