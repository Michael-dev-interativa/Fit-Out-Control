import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

async function run() {
  const url = process.env.REPORT_URL || 'http://localhost:5173/visualizarlistadocumentos?documentoId=25';
  const out = path.resolve(process.cwd(), `report-documento-25.pdf`);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1600 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', (msg) => {
    const text = `${msg.type()}: ${msg.text()}`;
    consoleMessages.push(text);
    console.log('PAGE CONSOLE>', text);
  });

  page.on('pageerror', (err) => {
    consoleMessages.push('pageerror: ' + String(err));
    console.error('PAGE ERROR>', err);
  });

  console.log('navigating to', url);
  // use 'load' instead of 'networkidle' to avoid long waits due to background API calls
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  // wait for report pages to render (or timeout)
  try {
    await page.waitForSelector('.report-page', { timeout: 30000 });
  } catch (e) {
    console.warn('report-page selector not found within timeout');
  }

  // short pause to let images settle
  await page.waitForTimeout(2500);

  // produce PDF
  console.log('writing PDF to', out);
  await page.pdf({ path: out, format: 'A4', printBackground: true });

  await browser.close();

  // save console messages
  fs.writeFileSync(path.resolve(process.cwd(), 'report-console.log'), consoleMessages.join('\n'));
  console.log('done — PDF and console log saved');
}

run().catch((err) => {
  console.error('generate-report-pdf failed', err && (err.stack || err.message || String(err)));
  process.exit(2);
});
