// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Cookie Deletion on Consent Revocation Tests
 *
 * Tests verify that when a user revokes consent for a category,
 * the cookies belonging to that category are deleted.
 */

/**
 * Helper to get all cookies from browser context
 * @param {import('@playwright/test').BrowserContext} context
 */
async function getAllCookies(context) {
  return await context.cookies();
}

/**
 * Helper to find cookies by name pattern (supports wildcards)
 * @param {Array} cookies
 * @param {string} pattern - Pattern like '_ga' or '_ga_*'
 */
function findCookiesByPattern(cookies, pattern) {
  const regexPattern = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
  const regex = new RegExp(regexPattern);
  return cookies.filter(c => regex.test(c.name));
}

/**
 * Wait for consent banner to be visible
 * @param {import('@playwright/test').Page} page
 */
async function waitForConsentBanner(page) {
  await page.waitForSelector('[x-data="hyvaCookieConsent"]', { state: 'visible', timeout: 10000 });
}

/**
 * Open cookie settings (either via floating button or event)
 * @param {import('@playwright/test').Page} page
 */
async function openCookieSettings(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-cookie-settings'));
  });
  await page.waitForTimeout(500);
}

test.describe('Cookie Deletion on Consent Revocation', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies before each test
    await context.clearCookies();
  });

  test('should delete GA cookies when analytics consent is revoked', async ({ page, context }) => {
    // Step 1: Navigate and wait for consent banner
    await page.goto('/');
    await waitForConsentBanner(page);

    // Step 2: Accept all cookies
    await page.click('button:has-text("Accept All")');
    await page.waitForTimeout(500);

    // Step 3: Wait for GA cookies to be set (if GTM/GA4 is configured)
    await page.waitForTimeout(3000);

    let cookies = await getAllCookies(context);
    const gaCookiesBefore = findCookiesByPattern(cookies, '_ga*');

    // Log for debugging
    console.log('GA cookies before revocation:', gaCookiesBefore.map(c => c.name));

    // Step 4: Open cookie settings
    await openCookieSettings(page);
    await waitForConsentBanner(page);

    // Step 5: Click Customize to show toggles
    const customizeButton = page.locator('button:has-text("Customize")');
    if (await customizeButton.isVisible()) {
      await customizeButton.click();
      await page.waitForTimeout(500);
    }

    // Step 6: Disable analytics category
    const analyticsToggle = page.locator('[data-category="analytics"] button[role="switch"]');
    if (await analyticsToggle.isVisible()) {
      const isChecked = await analyticsToggle.getAttribute('aria-checked');
      if (isChecked === 'true') {
        await analyticsToggle.click();
      }
    }

    // Step 7: Save preferences
    await page.click('button:has-text("Save Preferences")');
    await page.waitForTimeout(1000);

    // Step 8: Verify GA cookies are deleted
    cookies = await getAllCookies(context);
    const gaCookiesAfter = findCookiesByPattern(cookies, '_ga*');

    console.log('GA cookies after revocation:', gaCookiesAfter.map(c => c.name));

    // If GA cookies were present before, they should be deleted now
    if (gaCookiesBefore.length > 0) {
      expect(gaCookiesAfter.length).toBe(0);
    }
  });

  test('should handle wildcard cookie patterns correctly', async ({ page, context }) => {
    // Navigate first
    await page.goto('/');
    await waitForConsentBanner(page);

    // Manually set test cookies that match our patterns
    await page.evaluate(() => {
      document.cookie = '_ga=test123; path=/';
      document.cookie = '_ga_ABC123XYZ=test456; path=/';
      document.cookie = '_ga_TESTID999=test789; path=/';
      document.cookie = '_unrelated_cookie=keep; path=/';
    });

    // Verify cookies were set
    let cookies = await getAllCookies(context);
    const gaCookiesBefore = findCookiesByPattern(cookies, '_ga*');
    expect(gaCookiesBefore.length).toBeGreaterThanOrEqual(3);

    // Accept all first
    await page.click('button:has-text("Accept All")');
    await page.waitForTimeout(500);

    // Now revoke analytics
    await openCookieSettings(page);
    await waitForConsentBanner(page);

    const customizeButton = page.locator('button:has-text("Customize")');
    if (await customizeButton.isVisible()) {
      await customizeButton.click();
      await page.waitForTimeout(500);
    }

    const analyticsToggle = page.locator('[data-category="analytics"] button[role="switch"]');
    if (await analyticsToggle.isVisible()) {
      await analyticsToggle.click();
    }

    await page.click('button:has-text("Save Preferences")');
    await page.waitForTimeout(500);

    // Verify GA cookies are deleted but unrelated cookie remains
    cookies = await getAllCookies(context);
    const gaCookiesAfter = findCookiesByPattern(cookies, '_ga*');
    const unrelatedCookie = cookies.find(c => c.name === '_unrelated_cookie');

    expect(gaCookiesAfter.length).toBe(0);
    expect(unrelatedCookie).toBeDefined();
  });

  test('should not delete cookies when consent is granted (not revoked)', async ({ page, context }) => {
    // Navigate
    await page.goto('/');
    await waitForConsentBanner(page);

    // Start with reject all
    await page.click('button:has-text("Reject All")');
    await page.waitForTimeout(500);

    // Set some test cookies (simulating what would happen if scripts ran)
    await page.evaluate(() => {
      document.cookie = '_test_analytics=value; path=/';
    });

    let cookies = await getAllCookies(context);
    const testCookieBefore = cookies.find(c => c.name === '_test_analytics');
    expect(testCookieBefore).toBeDefined();

    // Now grant analytics consent (not revoke)
    await openCookieSettings(page);
    await waitForConsentBanner(page);

    const customizeButton = page.locator('button:has-text("Customize")');
    if (await customizeButton.isVisible()) {
      await customizeButton.click();
      await page.waitForTimeout(500);
    }

    const analyticsToggle = page.locator('[data-category="analytics"] button[role="switch"]');
    if (await analyticsToggle.isVisible()) {
      const isChecked = await analyticsToggle.getAttribute('aria-checked');
      if (isChecked === 'false') {
        await analyticsToggle.click();
      }
    }

    await page.click('button:has-text("Save Preferences")');
    await page.waitForTimeout(500);

    // Cookie should still exist (we granted, not revoked)
    cookies = await getAllCookies(context);
    const testCookieAfter = cookies.find(c => c.name === '_test_analytics');
    expect(testCookieAfter).toBeDefined();
  });

  test('should verify consent cookie is maintained', async ({ page, context }) => {
    // Navigate
    await page.goto('/');
    await waitForConsentBanner(page);

    // Accept all
    await page.click('button:has-text("Accept All")');
    await page.waitForTimeout(500);

    // Verify consent cookie exists
    let cookies = await getAllCookies(context);
    const consentCookie = cookies.find(c => c.name === 'hyva_cookie_consent');
    expect(consentCookie).toBeDefined();

    // Parse consent cookie value
    if (consentCookie) {
      const value = JSON.parse(decodeURIComponent(consentCookie.value));
      expect(value.categories.necessary).toBe(true);
      expect(value.categories.analytics).toBe(true);
      expect(value.categories.marketing).toBe(true);
    }

    // Now revoke analytics
    await openCookieSettings(page);
    await waitForConsentBanner(page);

    const customizeButton = page.locator('button:has-text("Customize")');
    if (await customizeButton.isVisible()) {
      await customizeButton.click();
      await page.waitForTimeout(500);
    }

    const analyticsToggle = page.locator('[data-category="analytics"] button[role="switch"]');
    if (await analyticsToggle.isVisible()) {
      await analyticsToggle.click();
    }

    await page.click('button:has-text("Save Preferences")');
    await page.waitForTimeout(500);

    // Verify consent cookie is updated
    cookies = await getAllCookies(context);
    const updatedConsentCookie = cookies.find(c => c.name === 'hyva_cookie_consent');
    expect(updatedConsentCookie).toBeDefined();

    if (updatedConsentCookie) {
      const value = JSON.parse(decodeURIComponent(updatedConsentCookie.value));
      expect(value.categories.analytics).toBe(false);
      expect(value.categories.necessary).toBe(true);
    }
  });

  test('should delete marketing cookies when marketing consent is revoked', async ({ page, context }) => {
    // Navigate
    await page.goto('/');
    await waitForConsentBanner(page);

    // Set test marketing cookies
    await page.evaluate(() => {
      document.cookie = '_fbp=test123; path=/';
    });

    // Accept all first
    await page.click('button:has-text("Accept All")');
    await page.waitForTimeout(500);

    let cookies = await getAllCookies(context);
    const fbCookiesBefore = findCookiesByPattern(cookies, '_fbp');
    expect(fbCookiesBefore.length).toBe(1);

    // Revoke marketing
    await openCookieSettings(page);
    await waitForConsentBanner(page);

    const customizeButton = page.locator('button:has-text("Customize")');
    if (await customizeButton.isVisible()) {
      await customizeButton.click();
      await page.waitForTimeout(500);
    }

    const marketingToggle = page.locator('[data-category="marketing"] button[role="switch"]');
    if (await marketingToggle.isVisible()) {
      const isChecked = await marketingToggle.getAttribute('aria-checked');
      if (isChecked === 'true') {
        await marketingToggle.click();
      }
    }

    await page.click('button:has-text("Save Preferences")');
    await page.waitForTimeout(500);

    // Verify FB cookie is deleted
    cookies = await getAllCookies(context);
    const fbCookiesAfter = findCookiesByPattern(cookies, '_fbp');
    expect(fbCookiesAfter.length).toBe(0);
  });

});
