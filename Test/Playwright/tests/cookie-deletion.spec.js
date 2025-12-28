// @ts-check
const { test, expect } = require('@playwright/test');
const {
    CONSENT_COOKIE_NAME,
    getAllCookies,
    findCookiesByPattern,
    waitForConsentBanner,
    openCookieSettings,
    acceptAll,
    rejectAll,
    setCategoryAndSave,
    parseConsentCookie,
} = require('./helpers/cookie-consent.helpers');

/**
 * Cookie Deletion on Consent Revocation Tests
 *
 * Tests verify that when a user revokes consent for a category,
 * the cookies belonging to that category are deleted.
 */

test.describe('Cookie Deletion on Consent Revocation', () => {

    test.beforeEach(async ({ context }) => {
        // Clear all cookies before each test
        await context.clearCookies();
    });

    test('should delete GA cookies when analytics consent is revoked', async ({ page, context }) => {
        // Step 1: Navigate and wait for consent banner
        await page.goto('/');
        await waitForConsentBanner(page);

        // Step 2: Accept all cookies
        await acceptAll(page);

        // Step 3: Wait for GA cookies to be set (if GTM/GA4 is configured)
        await page.waitForTimeout(3000);

        let cookies = await getAllCookies(context);
        const gaCookiesBefore = findCookiesByPattern(cookies, '_ga*');

        // Log for debugging
        console.log('GA cookies before revocation:', gaCookiesBefore.map(c => c.name));

        // Step 4: Open cookie settings and revoke analytics
        await openCookieSettings(page);
        await page.waitForTimeout(300);

        // Step 5: Disable analytics and save
        await setCategoryAndSave(page, 'analytics', false);
        await page.waitForTimeout(500);

        // Step 6: Verify GA cookies are deleted
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
        await acceptAll(page);

        // Now revoke analytics
        await openCookieSettings(page);
        await setCategoryAndSave(page, 'analytics', false);

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
        await rejectAll(page);

        // Set some test cookies (simulating what would happen if scripts ran)
        await page.evaluate(() => {
            document.cookie = '_test_analytics=value; path=/';
        });

        let cookies = await getAllCookies(context);
        const testCookieBefore = cookies.find(c => c.name === '_test_analytics');
        expect(testCookieBefore).toBeDefined();

        // Now grant analytics consent (not revoke)
        await openCookieSettings(page);
        await setCategoryAndSave(page, 'analytics', true);

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
        await acceptAll(page);

        // Verify consent cookie exists
        let cookies = await getAllCookies(context);
        const consentCookie = cookies.find(c => c.name === CONSENT_COOKIE_NAME);
        expect(consentCookie).toBeDefined();

        // Parse consent cookie value
        const value = parseConsentCookie(consentCookie);
        expect(value).not.toBeNull();
        if (value) {
            expect(value.categories.necessary).toBe(true);
            expect(value.categories.analytics).toBe(true);
            expect(value.categories.marketing).toBe(true);
        }

        // Now revoke analytics
        await openCookieSettings(page);
        await setCategoryAndSave(page, 'analytics', false);

        // Verify consent cookie is updated
        cookies = await getAllCookies(context);
        const updatedConsentCookie = cookies.find(c => c.name === CONSENT_COOKIE_NAME);
        expect(updatedConsentCookie).toBeDefined();

        const updatedValue = parseConsentCookie(updatedConsentCookie);
        expect(updatedValue).not.toBeNull();
        if (updatedValue) {
            expect(updatedValue.categories.analytics).toBe(false);
            expect(updatedValue.categories.necessary).toBe(true);
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
        await acceptAll(page);

        let cookies = await getAllCookies(context);
        const fbCookiesBefore = findCookiesByPattern(cookies, '_fbp');
        expect(fbCookiesBefore.length).toBe(1);

        // Revoke marketing
        await openCookieSettings(page);
        await setCategoryAndSave(page, 'marketing', false);

        // Verify FB cookie is deleted
        cookies = await getAllCookies(context);
        const fbCookiesAfter = findCookiesByPattern(cookies, '_fbp');
        expect(fbCookiesAfter.length).toBe(0);
    });

});
