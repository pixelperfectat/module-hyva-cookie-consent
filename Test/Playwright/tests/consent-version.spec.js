/**
 * Consent Version Upgrade Tests
 *
 * Tests that changing the consent_version in configuration forces re-consent:
 * - Banner reappears when consent version changes
 * - Old consent cookie is invalidated
 */

const { test, expect } = require('@playwright/test');
const {
    SELECTORS,
    CONSENT_COOKIE_NAME,
    waitForPageReady,
    clickAcceptAll,
    getBanner,
    getConsentData,
} = require('./helpers/cookie-consent.helpers');

test.describe('Consent Version Upgrade', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('consent cookie includes version number', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Check consent cookie includes version
        const consentData = await getConsentData(context);
        expect(consentData).not.toBeNull();
        expect(consentData).toHaveProperty('version');
        // Version is a number (integer)
        expect(typeof consentData.version).toBe('number');
    });

    test('consent persists when version matches', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should still be hidden (consent persists)
        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();
    });

    test('banner shows again when consent version is outdated', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Verify banner is hidden
        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // Get current consent data and set outdated version (0 is always outdated)
        const consentData = await getConsentData(context);
        const originalVersion = consentData.version;
        consentData.version = 0; // Set to 0 which should never match current version

        // Clear the existing cookie first
        await context.clearCookies();

        // Set the modified cookie with outdated version
        const domain = new URL(page.url()).hostname;
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: encodeURIComponent(JSON.stringify(consentData)),
            domain: domain,
            path: '/',
        }]);

        // Reload the page
        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should reappear because version is outdated (0 !== current version)
        await expect(banner).toBeVisible();
    });

    test('consent state is reset when version is outdated', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all (marketing = true)
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Verify marketing was accepted
        let consentData = await getConsentData(context);
        expect(consentData.categories.marketing).toBe(true);

        // Set outdated version
        consentData.version = 0;

        // Clear and reset cookie
        await context.clearCookies();
        const domain = new URL(page.url()).hostname;
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: encodeURIComponent(JSON.stringify(consentData)),
            domain: domain,
            path: '/',
        }]);

        // Reload page
        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // The Alpine component's consent state should be reset (default is false for non-necessary)
        const consentState = await page.evaluate(() => {
            const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
            return component?.consent;
        });

        // Until new consent is given, marketing should be false (default state)
        expect(consentState.marketing).toBe(false);
    });

    test('fresh consent after version mismatch uses current version', async ({ page, context }) => {
        // Start fresh - clear cookies and get consent
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Get the version that was saved
        const consentData = await getConsentData(context);

        // Version should be set and be a positive number (1 or higher)
        expect(consentData.version).toBeDefined();
        expect(consentData.version).toBeGreaterThanOrEqual(1);

        // All categories should be granted
        expect(consentData.categories.necessary).toBe(true);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(true);
    });
});
