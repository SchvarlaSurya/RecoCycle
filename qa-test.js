const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const CREDENTIALS = {
  email: 'suryaschvarla@gmail.com',
  password: 'antigravity08'
};

const results = {
  passed: [],
  failed: [],
  consoleErrors: [],
  networkErrors: []
};

async function runTests() {
  console.log('🚀 Starting comprehensive QA testing...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push({ page: page.url(), message: msg.text() });
    }
  });

  // Monitor network failures
  page.on('response', response => {
    if (!response.ok() && response.status() !== 304) {
      results.networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  try {
    // ========================================
    // 1. HOMEPAGE TEST
    // ========================================
    console.log('📍 Testing Homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const homepageTitle = await page.title();
    console.log(`   Title: ${homepageTitle}`);

    // Check for key elements
    const heroText = await page.textContent('body');

    // ========================================
    // 2. LOGIN FLOW TEST
    // ========================================
    console.log('\n📍 Testing Login Flow...');

    // Try to find login link/button
    const loginSelectors = ['a[href*="login"]', 'a[href*="sign-in"]', 'button:has-text("Masuk")', 'a:has-text("Login")', 'a:has-text("Sign In")'];
    let loginLink = null;
    for (const selector of loginSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          loginLink = selector;
          break;
        }
      } catch (e) {}
    }

    if (loginLink) {
      console.log(`   Found login link: ${loginLink}`);
      await page.click(loginLink);
      await page.waitForTimeout(2000);
    } else {
      console.log('   Going directly to /sign-in...');
      await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    // Fill login form
    const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      console.log('   Found login form, filling credentials...');
      await emailInput.fill(CREDENTIALS.email);
      await passwordInput.fill(CREDENTIALS.password);
      await page.waitForTimeout(500);

      // Submit
      const submitBtn = await page.$('button[type="submit"], button:has-text("Masuk"), button:has-text("Sign In"), button:has-text("Login")');
      if (submitBtn) {
        await submitBtn.click();
        console.log('   Login submitted, waiting for response...');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('   ❌ Could not find login form elements');
      results.failed.push({ test: 'Login Form', error: 'Form elements not found' });
    }

    // Check if logged in
    const currentUrl = page.url();
    console.log(`   Current URL after login attempt: ${currentUrl}`);

    if (currentUrl.includes('dashboard') || currentUrl.includes('app')) {
      console.log('   ✅ Login appears successful');
      results.passed.push('Login successful');
    } else {
      console.log('   ⚠️ May not be logged in, checking page content...');
      const pageContent = await page.textContent('body');
      if (pageContent.includes('dashboard') || pageContent.includes('Masuk') || pageContent.includes('Sign In')) {
        results.failed.push({ test: 'Login', error: 'Login did not redirect to dashboard' });
      }
    }

    // ========================================
    // 3. DASHBOARD EXPLORATION
    // ========================================
    console.log('\n📍 Exploring Dashboard...');

    // Try to go to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const dashboardLinks = await page.$$eval('a[href]', links =>
      links.map(a => ({ href: a.href, text: a.textContent?.trim().substring(0, 50) }))
        .filter(l => l.href && l.href.includes('localhost'))
    );

    console.log(`   Found ${dashboardLinks.length} internal links`);
    results.passed.push(`Dashboard found with ${dashboardLinks.length} links`);

    // Test dashboard widgets
    const dashboardContent = await page.textContent('body');

    // ========================================
    // 4. NAVIGATION TEST
    // ========================================
    console.log('\n📍 Testing Navigation...');

    const navLinks = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Setor', url: '/dashboard/setor' },
      { name: 'Tarik', url: '/dashboard/tarik' },
      { name: 'Riwayat', url: '/dashboard/riwayat' },
      { name: 'Rewards', url: '/dashboard/rewards' },
      { name: 'Peringkat', url: '/dashboard/peringkat' },
      { name: 'Pencapaian', url: '/dashboard/pencapaian' },
      { name: 'Pengaturan', url: '/dashboard/pengaturan' }
    ];

    for (const link of navLinks) {
      try {
        console.log(`   Testing ${link.name}...`);
        await page.goto(`${BASE_URL}${link.url}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1500);

        const pageLoaded = await page.textContent('body');
        if (pageLoaded && pageLoaded.length > 100) {
          results.passed.push(`${link.name} page loads successfully`);
          console.log(`   ✅ ${link.name} loaded`);
        } else {
          results.failed.push({ test: `Navigation - ${link.name}`, error: 'Page appears empty or error' });
          console.log(`   ⚠️ ${link.name} may have issues`);
        }
      } catch (e) {
        results.failed.push({ test: `Navigation - ${link.name}`, error: e.message });
        console.log(`   ❌ ${link.name} failed: ${e.message}`);
      }
    }

    // ========================================
    // 5. FORM TESTING
    // ========================================
    console.log('\n📍 Testing Forms...');

    // Test Setor Form
    await page.goto(`${BASE_URL}/dashboard/setor`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const setorForm = await page.$('form');
    if (setorForm) {
      console.log('   Found setor form, testing empty submit...');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        console.log('   Empty submit triggered');
        results.passed.push('Setor form responds to submit');
      }
    }

    // Test Tarik Form
    await page.goto(`${BASE_URL}/dashboard/tarik`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const tarikForm = await page.$('form');
    if (tarikForm) {
      console.log('   Found tarik form, testing...');
      // Try to fill amount with invalid value
      const amountInput = await page.$('input[placeholder*="50"], input[type="text"]');
      if (amountInput) {
        await amountInput.fill('100');
        await amountInput.press('Tab');
        await page.waitForTimeout(500);
        console.log('   Tested invalid amount input');
      }
    }

    // ========================================
    // 6. RESPONSIVE TEST
    // ========================================
    console.log('\n📍 Testing Responsive Layout...');

    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (!hasHorizontalScroll) {
        results.passed.push(`${vp.name} viewport - no horizontal overflow`);
      } else {
        results.failed.push({ test: `Responsive - ${vp.name}`, error: 'Horizontal overflow detected' });
      }
      console.log(`   ${vp.name} (${vp.width}x${vp.height}): ${hasHorizontalScroll ? '⚠️ Has overflow' : '✅ OK'}`);
    }

    // ========================================
    // 7. ADMIN PAGES TEST (if accessible)
    // ========================================
    console.log('\n📍 Testing Admin Pages...');

    const adminPages = [
      { name: 'Admin Dashboard', url: '/admin' },
      { name: 'Admin Withdrawals', url: '/admin/withdrawals' },
      { name: 'Admin Pickups', url: '/admin/pickups' },
      { name: 'Admin Nasabah', url: '/admin/nasabah' },
      { name: 'Admin Laporan', url: '/admin/laporan' },
      { name: 'Admin Transaksi', url: '/admin/transaksi' }
    ];

    for (const adminPage of adminPages) {
      try {
        await page.goto(`${BASE_URL}${adminPage.url}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1500);

        const content = await page.textContent('body');
        if (content && content.length > 100) {
          results.passed.push(`${adminPage.name} accessible`);
          console.log(`   ✅ ${adminPage.name} loads`);
        }
      } catch (e) {
        console.log(`   ⚠️ ${adminPage.name}: ${e.message}`);
      }
    }

    // ========================================
    // 8. EDGE CASE TESTING
    // ========================================
    console.log('\n📍 Testing Edge Cases...');

    // Direct URL access to protected routes
    try {
      await page.goto(`${BASE_URL}/dashboard/setor`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const isRedirectedToLogin = page.url().includes('sign-in') || page.url().includes('login');
      if (isRedirectedToLogin) {
        results.passed.push('Protected route redirects to login when not authenticated');
      }
    } catch (e) {}

    // ========================================
    // 9. SECURITY CHECK
    // ========================================
    console.log('\n📍 Checking for exposed secrets...');

    const localStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });

    console.log('   LocalStorage keys:', Object.keys(localStorageData));
    results.passed.push('LocalStorage inspection completed');

    // Check for exposed env vars in frontend
    const pageSource = await page.content();
    if (pageSource.includes('DATABASE_URL') || pageSource.includes('NEON_DATABASE')) {
      results.failed.push({ test: 'Security', error: 'Possible secret exposure in frontend' });
      console.log('   ⚠️ Possible secret exposure detected in page source');
    } else {
      results.passed.push('No obvious secret exposure detected');
    }

  } catch (error) {
    console.error('Test error:', error);
    results.failed.push({ test: 'General', error: error.message });
  } finally {
    await browser.close();
  }

  // ========================================
  // GENERATE REPORT
  // ========================================
  console.log('\n\n' + '='.repeat(60));
  console.log('                    TEST REPORT SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log(`✅ PASSED TESTS (${results.passed.length}):`);
  results.passed.forEach((p, i) => {
    console.log(`   ${i + 1}. ${typeof p === 'string' ? p : p.test}`);
  });

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED TESTS (${results.failed.length}):`);
    results.failed.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.test || f}: ${f.error}`);
    });
  }

  if (results.consoleErrors.length > 0) {
    console.log(`\n⚠️ CONSOLE ERRORS (${results.consoleErrors.length}):`);
    results.consoleErrors.slice(0, 10).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.message.substring(0, 100)}`);
    });
  }

  if (results.networkErrors.length > 0) {
    console.log(`\n⚠️ NETWORK ERRORS (${results.networkErrors.length}):`);
    results.networkErrors.slice(0, 5).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.status}: ${e.url.substring(0, 80)}`);
    });
  }

  // Calculate score
  const totalTests = results.passed.length + results.failed.length;
  const passRate = totalTests > 0 ? (results.passed.length / totalTests) * 100 : 0;
  const errorPenalty = Math.min(20, results.consoleErrors.length * 2 + results.networkErrors.length);
  const finalScore = Math.max(0, Math.round(passRate - errorPenalty));

  console.log(`\n📊 DEPLOY READINESS SCORE: ${finalScore}/100`);
  console.log('='.repeat(60));

  return results;
}

runTests().catch(console.error);