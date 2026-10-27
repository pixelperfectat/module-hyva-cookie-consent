/**
 * GTM Strict Mode Tests
 *
 * Tests for Google Tag Manager when configured in "strict" mode.
 * In this mode, GTM is held back until the user grants consent for GTM's category, which is
 * "analytics" in the shipped cookie_consent.xml.
 *
 * SKIP if:
 * - GTM container ID not configured
 * - GTM mode is not "strict"
 *
 * Run with: npm test -- gtm-strict.spec.js
 */

const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    setCategoryAndSave,
    clickAcceptAll,
    getBanner,
    getConsentLoaders,
    escapeJsLikeMagento,
} = require('./helpers/cookie-consent.helpers');

const gtmId = process.env.TEST_GTM_CONTAINER_ID;
const gtmMode = process.env.TEST_GTM_MODE || 'infrastructure';
const GTM_CATEGORY = 'analytics';

/**
 * The GTM loader registered by the service template
 */
async function getGtmLoader(page) {
    const loaders = await getConsentLoaders(page, GTM_CATEGORY);
    return loaders.find(loader => loader.source.includes('googletagmanager.com/gtm.js'));
}

// Skip entire file if GTM not configured or not in strict mode
test.describe('GTM Strict Mode', () => {
    test.skip(!gtmId, 'GTM Container ID not configured - skipping');
    test.skip(gtmMode !== 'strict', 'GTM not in strict mode - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('GTM code waits in a consent loader before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const loader = await getGtmLoader(page);
        expect(loader).toBeTruthy();
        expect(loader.loaded).toBe(false);
        expect(loader.source).toContain(escapeJsLikeMagento(gtmId));
    });

    test('GTM script NOT loaded before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).not.toBeAttached();
    });

    test('dataLayer has no gtm.js event before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // cookie-config always creates dataLayer for the Consent Mode default
        const hasGtmLoad = await page.evaluate(() => (window.dataLayer || []).some(e => e.event === 'gtm.js'));
        expect(hasGtmLoad).toBe(false);
    });

    test('GTM loads after analytics consent granted', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await setCategoryAndSave(page, GTM_CATEGORY, true);

        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();
        expect((await getGtmLoader(page)).loaded).toBe(true);
    });

    test('GTM loads after Accept All', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await clickAcceptAll(page);

        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();
    });

    test('dataLayer receives consent_granted event after consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await setCategoryAndSave(page, GTM_CATEGORY, true);

        const consentEvent = await page.evaluate(() => {
            return (window.dataLayer || []).find(e => e.event === 'consent_granted') || null;
        });

        expect(consentEvent).not.toBeNull();
        expect(consentEvent.consent_analytics).toBe(true);
        expect(consentEvent.consent_marketing).toBe(false);
    });

    test('noscript iframe waits in a template before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate((category) => {
            const templates = document.querySelectorAll(`template[data-consent-category="${category}"]`);
            return Array.from(templates).map(t => t.innerHTML).join('');
        }, GTM_CATEGORY);

        expect(templateContent).toContain('googletagmanager.com/ns.html');
    });

    test('marketing consent alone does NOT load GTM', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await setCategoryAndSave(page, 'marketing', true);
        await page.waitForTimeout(1000);

        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).not.toBeAttached();
    });

    test('GTM persists after page reload with consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();
    });
});
