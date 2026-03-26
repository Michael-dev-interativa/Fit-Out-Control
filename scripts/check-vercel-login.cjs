const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('console', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('pageerror', err.message));

  const response = await page.goto('https://fit-out-control.vercel.app/Login', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('status', response ? response.status() : 'no-response');

  const rootInfo = await page.$eval('#root', (el) => ({
    textLen: (el.innerText || '').length,
    htmlLen: (el.innerHTML || '').length,
    firstHtml: (el.innerHTML || '').slice(0, 200),
  })).catch(() => null);

  console.log('root', JSON.stringify(rootInfo));

  await page.screenshot({
    path: 'tmp-vercel-login.png',
    fullPage: true,
  });

  await browser.close();
})();
