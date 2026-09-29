/* The dev stages panel through real page loads: ?day opens a playthrough
   morning once (the URL forgets it, so a reload keeps playing), the panel
   lists the mornings, bookmarks a café, skips to the next morning with the
   replaced café kept, opens a bookmark and a new café, and the café that
   opens is clean. Only ?dev pages have the panel. */
module.exports = async function (t) {
  const page = t.page;
  const loaded = () => page.waitForFunction('!!window.__world && document.readyState === "complete"', null, { timeout: 60000, polling: 100 });
  const life = () => t.eval(() => ({ day: __world.memory.life.daysCompleted, search: location.search,
    saved: JSON.parse(localStorage.getItem('cafe-hygge-save')).life.daysCompleted, audit: __dev.audit() }));
  const openPanel = () => t.eval(() => { document.querySelector('#btn-stages').click(); });
  const click = async selector => { await Promise.all([page.waitForNavigation(), page.click(selector)]); await loaded(); };
  await t.viewport(1280, 900);

  await t.open('/');
  if (await t.eval(() => !!document.querySelector('#btn-stages') || !!document.querySelector('#dev-stages')))
    throw Error('the panel exists without ?dev');

  await t.open('/?dev&day=3');
  let s = await life();
  if (s.day !== 2 || s.saved !== 2 || s.search !== '?dev') throw Error('?day=3 opened ' + JSON.stringify(s));
  await t.reload();
  s = await life();
  if (s.day !== 2 || s.audit.length) throw Error('the reload did not continue day 3: ' + JSON.stringify(s));

  await openPanel();
  await page.waitForSelector('#dev-stages[open]');
  const listed = await t.eval(() => [...document.querySelectorAll('#stages-days li .stages-label')].map(e => e.textContent));
  if (listed.length !== 3 || listed[0] !== 'Day 1 — a new café') throw Error('listed ' + listed.join(', '));
  if (!/Day 3, /.test(await t.eval(() => document.querySelector('#stages-now').textContent))) throw Error('this café is not day 3');
  await page.click('#stages-bookmark');
  await page.fill('#stages-mark-name', 'third morning');
  await page.click('#stages-bookmark');
  await page.waitForFunction("document.querySelector('#stages-marks').textContent.includes('day 3, ')");
  await t.shot('panel');

  await click('#stages-next');
  s = await life();
  if (s.day !== 3 || s.saved !== 3 || s.audit.length) throw Error('skipping did not reach day 4: ' + JSON.stringify(s));

  await openPanel();
  await page.waitForSelector('#dev-stages[open]');
  const marks = await t.eval(() => [...document.querySelectorAll('#stages-marks li .stages-label')].map(e => e.textContent));
  if (marks[0] !== 'the café before the last jump' || marks[1] !== 'third morning' || !/^saved /.test(marks[2]))
    throw Error('bookmarks ' + marks.join(', '));
  await click('#stages-marks li:nth-child(2) button');
  s = await life();
  if (s.day !== 2 || s.audit.length) throw Error('the bookmark did not open day 3: ' + JSON.stringify(s));

  await openPanel();
  await page.waitForSelector('#dev-stages[open]');
  await click('[aria-label="open day 1"]');
  s = await t.eval(() => ({ day: __world.memory.life.daysCompleted, first: __world.memory.life.firstOpening.step, holger: !!__world.memory.bonds.holger }));
  if (s.day !== 0 || s.first === 12 || s.holger) throw Error('day 1 is not a new café: ' + JSON.stringify(s));
  return { checks: ['no panel without ?dev', '?day=3 once, then a reload keeps playing', 'the partial playthrough listed',
    'bookmarks, named and not', 'skip to the next morning, the replaced café kept', 'a bookmark opened', 'a new café'] };
};
