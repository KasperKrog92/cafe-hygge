/* The mandatory first hello through the real page: splash, setup, Holger's
   pulsing invitation button, the conversation panel and both of his choices. */
module.exports = async function (t) {
  await t.open('/');
  await t.eval(() => { if (__world.memory.life.firstOpening.step !== 0) throw Error('stale save'); });
  await t.page.getByRole('button', { name: 'step inside' }).click();
  await t.eval(() => {
    const w = __world; SIM.skipUnpacking(w);
    for (let n = 0; n < 8000 && w.shop.phase === 'settling'; n++) SIM.update(w, .25);
    for (let n = 0; n < 2000 && !SIM.holgerAvailable(w); n++) SIM.update(w, .1);
    if (!SIM.holgerAvailable(w)) throw Error('Holger never waited at the counter');
  });
  const meet = t.page.locator('#meet-holger');
  await meet.waitFor({ state: 'visible', timeout: 5000 });
  if ((await meet.getAttribute('aria-label')) !== 'Talk with Holger') throw Error('invitation button label');
  await t.shot('invitation');
  await meet.click();
  // Read to his first choice through the single continue button, then answer.
  const answers = t.page.locator('#conversation-answers button');
  await answers.first().waitFor({ state: 'visible', timeout: 5000 });
  for (let i = 0; i < 60 && (await answers.count()) < 2; i++) {
    await answers.first().click();
    await t.page.waitForTimeout(40);
  }
  if ((await t.page.locator('#conversation-answers button').count()) < 2) throw Error('no choice offered');
  await t.shot('choice');
  await t.page.locator('#conversation-answers button').first().click();
  await t.eval(() => { if (!__world.moment) throw Error('conversation ended at the first choice'); });
  return { checks: ['splash', 'setup', 'pulsing invitation button', 'conversation', 'choice'] };
};
