/**
 * GTM Strict Mode Tests
 *
 * Tests for Google Tag Manager when configured in "strict" mode.
 * In this mode, GTM is blocked until the user grants marketing consent.
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
} = require('./helpers/cookie-consent.helpers');

const gtmId = process.env.TEST_GTM_CONTAINER_ID;
const gtmMode = process.env.TEST_GTM_MODE || 'infrastructure';

// Skip entire file if GTM not configured or not in strict mode
test.describe('GTM Strict Mode', () => {
    test.skip(!gtmId, 'GTM Container ID not configured - skipping');
    test.skip(gtmMode !== 'strict', 'GTM not in strict mode - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('GTM script blocked in template before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // GTM should be wrapped in a marketing template
        const gtmTemplate = page.locator('template[data-consent-category="marketing"]');
        await expect(gtmTemplate).toBeAttached();

        // Check template contains GTM script
        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="marketing"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain('googletagmanager.com/gtm.js');
    });

    test('GTM script NOT loaded before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // GTM script should NOT be in the main DOM (only in template)
        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).not.toBeAttached();
    });

    test('dataLayer may not exist before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // In strict mode, dataLayer might not be initialized until GTM loads
        // Or it might be initialized empty by other scripts
        const dataLayerInfo = await page.evaluate(() => {
            return {
                exists: typeof window.dataLayer !== 'undefined',
                isArray: Array.isArray(window.dataLayer),
                length: window.dataLayer ? window.dataLayer.length : 0
            };
        });

        // If dataLayer exists, it should not have GTM-specific events
        if (dataLayerInfo.exists) {
            const hasGtmLoad = await page.evaluate(() => {
                return window.dataLayer.some(e => e.event === 'gtm.js');
            });
            expect(hasGtmLoad).toBe(false);
        }
    });

    test('GTM loads after marketing consent granted', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant marketing consent
        await setCategoryAndSave(page, 'marketing', true);
        await page.waitForTimeout(2000);

        // Now GTM script should be loaded
        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();
    });

    test('GTM loads after Accept All', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all cookies
        await clickAcceptAll(page);
        await page.waitForTimeout(2000);

        // GTM should be loaded
        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();
    });

    test('dataLayer receives consent_granted event after consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant marketing consent
        await setCategoryAndSave(page, 'marketing', true);
        await page.waitForTimeout(2000);

        // Check dataLayer for consent event
        const consentEvent = await page.evaluate(() => {
            if (!window.dataLayer) return null;
            return window.dataLayer.find(e =>
                e.event === 'consent_granted' ||
                e.event === 'consent_update'
            );
        });

        // Should have some consent event
        expect(consentEvent).toBeDefined();
    });

    test('container ID appears in template', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="marketing"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });

        expect(templateContent).toContain(gtmId);
    });

    test('noscript iframe in template before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // In strict mode, noscript should also be wrapped in template
        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="marketing"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });

        expect(templateContent).toContain('googletagmanager.com/ns.html');
    });

    test('analytics consent alone does NOT load GTM', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant only analytics consent (GTM needs marketing in strict mode)
        await setCategoryAndSave(page, 'analytics', true);
        await page.waitForTimeout(1000);

        // GTM should NOT be loaded (it's in marketing category)
        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).not.toBeAttached();
    });

    test('GTM persists after page reload with consent', async ({ page }) => {
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

        // GTM should still be loaded
        const gtmScript = page.locator(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`);
        await expect(gtmScript).toBeAttached();
    });
});
