// Screenshot + DOM-inspect helper for the Travel app.
// Uses the pre-installed global Playwright + Chromium, routing through the
// agent proxy so external cover images load.
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const OUT = process.env.OUT_DIR || '/home/user/MxcliTest1/App/.mxcli';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;

(async () => {
  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (PROXY) launchOpts.proxy = { server: PROXY, bypass: 'localhost,127.0.0.1,::1' };
  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  // ---- Overview ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.trip-card', { timeout: 30000 });
  await page.waitForTimeout(2500); // let images settle

  // Inspect the first card
  const info = await page.evaluate(() => {
    const card = document.querySelector('.trip-card');
    if (!card) return { found: false };
    const imgDiv = card.querySelector('.mx-image, [class*="image"], [style*="background-image"]');
    const badge = card.querySelector('.trip-status-badge');
    const badgeText = badge ? badge.textContent.trim() : null;
    const cs = imgDiv ? getComputedStyle(imgDiv) : null;
    return {
      found: true,
      cardClasses: card.className,
      imgTag: imgDiv ? imgDiv.tagName + '.' + imgDiv.className : null,
      bgImage: cs ? cs.backgroundImage.slice(0, 120) : null,
      imgHeight: cs ? cs.height : null,
      badgePresent: !!badge,
      badgeText,
      badgeHTML: badge ? badge.innerHTML.slice(0, 200) : null,
    };
  });
  console.log('CARD_INFO ' + JSON.stringify(info, null, 2));

  await page.screenshot({ path: OUT + '/shot-overview.png', fullPage: false });

  // ---- Detail: click the first card ----
  try {
    await page.click('.trip-card', { timeout: 10000 });
    await page.waitForTimeout(2500);
    await page.waitForSelector('.trip-header, .day-card', { timeout: 20000 });
    await page.waitForTimeout(2000);
    // If a day isn't auto-selected, click the first day card to populate the timeline
    const hasActivity = await page.$('.activity-row');
    if (!hasActivity) {
      const day = await page.$('.day-card');
      if (day) { await day.click(); await page.waitForTimeout(1500); }
    }
    await page.screenshot({ path: OUT + '/shot-detail.png', fullPage: false });

    const dinfo = await page.evaluate(() => ({
      header: !!document.querySelector('.trip-header'),
      days: document.querySelectorAll('.day-card').length,
      activities: document.querySelectorAll('.activity-row').length,
      headerBg: (() => {
        const el = document.querySelector('.trip-header .mx-image, .trip-header [style*="background-image"]');
        return el ? getComputedStyle(el).backgroundImage.slice(0, 120) : null;
      })(),
    }));
    console.log('DETAIL_INFO ' + JSON.stringify(dinfo, null, 2));
  } catch (e) {
    console.log('DETAIL_ERROR ' + e.message);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
