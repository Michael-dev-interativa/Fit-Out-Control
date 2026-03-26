const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  page.on('pageerror', (err) => {
    errors.push(String(err && err.message ? err.message : err));
  });
  page.on('console', (msg) => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });

  try {
    const response = await page.goto('https://fit-out-control.vercel.app/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        href: location.href,
        title: document.title,
        rootExists: !!root,
        rootHtmlLength: root ? (root.innerHTML || '').length : -1,
        rootTextLength: root ? (root.innerText || '').length : -1,
        bodyTextLength: (document.body && document.body.innerText || '').length,
        firstBodyText: (document.body && document.body.innerText || '').slice(0, 120),
      };
    });

    console.log('status', response ? response.status() : 'no-response');
    console.log('state', JSON.stringify(state));
    console.log('errors', JSON.stringify(errors));
    console.log('logs', JSON.stringify(logs.slice(-20)));
  } catch (err) {
    console.log('fatal', err && err.message ? err.message : String(err));
    console.log('errors', JSON.stringify(errors));
    console.log('logs', JSON.stringify(logs.slice(-20)));
  } finally {
    await browser.close();
  }
})();
