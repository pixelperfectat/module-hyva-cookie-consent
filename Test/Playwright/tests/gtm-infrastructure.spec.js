/**
 * GTM Infrastructure Mode Tests
 *
 * Tests for Google Tag Manager when configured in "infrastructure" mode.
 * In this mode, GTM loads immediately and consent state is pushed to dataLayer.
 *
 * SKIP if:
 * - GTM container ID not configured
 * - GTM mode is not "infrastructure"
 *
 * Run with: npm test -- gtm-infrastructure.spec.js
 */

const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    clickAcceptAll,
    clickRejectAll,
    getBanner,
    findDataLayerEvent,
} = require('./helpers/cookie-consent.helpers');

const gtmId = process.env.TEST_GTM_CONTAINER_ID;
const gtmMode = process.env.TEST_GTM_MODE || 'infrastructure';

// Skip entire file if GTM not configured or not in infrastructure mode
test.describe('GTM Infrastructure Mode', () => {
    test.skip(!gtmId, 'GTM Container ID not configured - skipping');
    test.skip(gtmMode !== 'infrastructure', 'GTM not in infrastructure mode - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('GTM script loads immediately without consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // GTM script should be in a regular script tag, NOT in a template
        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();

        // Should NOT be wrapped in a template
        const gtmInTemplate = page.locator(`template script[src*="googletagmanager.com/gtm.js"]`);
        await expect(gtmInTemplate).not.toBeAttached();
    });

    test('dataLayer exists on page load', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const dataLayerExists = await page.evaluate(() => Array.isArray(window.dataLayer));
        expect(dataLayerExists).toBe(true);
    });

    test('consent_default event pushed with denied state', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const consentDefault = await findDataLayerEvent(page, 'consent_default');

        expect(consentDefault).toBeDefined();
        expect(consentDefault.consent_necessary).toBe(true);
        expect(consentDefault.consent_analytics).toBe(false);
        expect(consentDefault.consent_marketing).toBe(false);
        expect(consentDefault.consent_preferences).toBe(false);
    });

    test('consent_update event pushed after Accept All', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all cookies
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        const consentUpdate = await findDataLayerEvent(page, 'consent_update');

        expect(consentUpdate).toBeDefined();
        expect(consentUpdate.consent_necessary).toBe(true);
        expect(consentUpdate.consent_analytics).toBe(true);
        expect(consentUpdate.consent_marketing).toBe(true);
        expect(consentUpdate.consent_preferences).toBe(true);
    });

    test('consent_update event pushed after Reject All', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Reject all cookies
        await clickRejectAll(page);
        await page.waitForTimeout(1000);

        const consentUpdate = await findDataLayerEvent(page, 'consent_update');

        expect(consentUpdate).toBeDefined();
        expect(consentUpdate.consent_necessary).toBe(true);
        expect(consentUpdate.consent_analytics).toBe(false);
        expect(consentUpdate.consent_marketing).toBe(false);
    });

    test('GTM container ID in script src', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const gtmScript = page.locator('script[src*="googletagmanager.com/gtm.js"]');
        const src = await gtmScript.getAttribute('src');

        expect(src).toContain(gtmId);
    });

    test('noscript iframe present for GTM', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // GTM noscript iframe should be present
        const gtmNoscript = page.locator(`noscript iframe[src*="googletagmanager.com/ns.html?id=${gtmId}"]`);
        await expect(gtmNoscript).toBeAttached();
    });

    test('consent persists on page reload', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should not appear
        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // consent_default should now show granted state (from saved consent)
        const consentDefault = await findDataLayerEvent(page, 'consent_default');

        expect(consentDefault).toBeDefined();
        expect(consentDefault.consent_analytics).toBe(true);
        expect(consentDefault.consent_marketing).toBe(true);
    });

    test('dataLayer events have correct structure', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const consentDefault = await findDataLayerEvent(page, 'consent_default');

        // Verify all expected properties exist
        expect(consentDefault).toHaveProperty('event');
        expect(consentDefault).toHaveProperty('consent_necessary');
        expect(consentDefault).toHaveProperty('consent_analytics');
        expect(consentDefault).toHaveProperty('consent_marketing');
        expect(consentDefault).toHaveProperty('consent_preferences');

        // Values should be booleans
        expect(typeof consentDefault.consent_necessary).toBe('boolean');
        expect(typeof consentDefault.consent_analytics).toBe('boolean');
        expect(typeof consentDefault.consent_marketing).toBe('boolean');
        expect(typeof consentDefault.consent_preferences).toBe('boolean');
    });
});
