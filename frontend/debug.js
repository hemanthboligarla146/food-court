import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log('API RESPONSE:', response.url(), response.status());
        response.text().then(text => console.log('API BODY:', text)).catch(() => {});
      }
    });

    console.log('Navigating to http://localhost:5173/admin-login ...');
    await page.goto('http://localhost:5173/admin-login', { waitUntil: 'networkidle2' });
    
    console.log('Filling out form...');
    await page.type('input[name="username"]', 'admin');
    await page.type('input[name="password"]', 'admin123');
    
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000); // Wait for response

    console.log('Done.');
    await browser.close();
  } catch (error) {
    console.error('Puppeteer Script Error:', error);
  }
})();
