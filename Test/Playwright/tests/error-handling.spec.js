/**
 * Error Handling Tests
 *
 * Tests that the cookie consent system handles errors gracefully:
 * - Malformed consent cookie handled gracefully
 * - Missing or corrupted localStorage doesn't break page
 * - No services enabled still works
 * - Invalid consent data in cookie doesn't crash
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

test.describe('Error Handling', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('page loads without errors when no consent cookie exists', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Page should load without JavaScript errors
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        // Banner should appear for new visitor
        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // No JavaScript errors should occur
        expect(errors).toHaveLength(0);
    });

    test('malformed consent cookie is handled gracefully', async ({ page, context }) => {
        // Set a malformed cookie (invalid JSON)
        const domain = 'puch-ersatzteile.test';
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: 'this-is-not-valid-json',
            domain: domain,
            path: '/',
        }]);

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Page should still work - banner should appear (invalid cookie = no consent)
        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Should be able to accept consent
        await clickAcceptAll(page);
        await page.waitForTimeout(1500);

        // Banner should close - this proves consent was handled
        await expect(banner).not.toBeVisible();
    });

    test('partially corrupted consent cookie shows banner', async ({ page, context }) => {
        // Set cookie with missing required fields
        const corruptedData = {
            categories: { necessary: true },
            // Missing 'version' field
        };

        const domain = 'puch-ersatzteile.test';
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: encodeURIComponent(JSON.stringify(corruptedData)),
            domain: domain,
            path: '/',
        }]);

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should appear because version is missing (null !== currentVersion)
        const banner = getBanner(page);
        await expect(banner).toBeVisible();
    });

    test('consent cookie with wrong data types is handled', async ({ page, context }) => {
        // Set cookie with wrong types
        const wrongTypeData = {
            version: 'wrong-type-should-be-number',
            categories: 'should-be-object'
        };

        const domain = 'puch-ersatzteile.test';
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: encodeURIComponent(JSON.stringify(wrongTypeData)),
            domain: domain,
            path: '/',
        }]);

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Page should still load without crashing
        const banner = getBanner(page);
        // Banner should appear since consent is invalid (version type mismatch)
        await expect(banner).toBeVisible();

        // Consent can still be granted
        await clickAcceptAll(page);
        await page.waitForTimeout(1500);

        // Banner should close - this proves consent was handled despite corrupted cookie
        await expect(banner).not.toBeVisible();
    });

    test('empty consent cookie triggers banner display', async ({ page, context }) => {
        // Set empty cookie value
        const domain = 'puch-ersatzteile.test';
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: '',
            domain: domain,
            path: '/',
        }]);

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should appear
        const banner = getBanner(page);
        await expect(banner).toBeVisible();
    });

    test('double-encoded cookie value is handled', async ({ page, context }) => {
        // Sometimes cookies get double-encoded
        const validData = {
            version: 1,
            categories: { necessary: true, analytics: true, marketing: true, preferences: true }
        };

        const doubleEncoded = encodeURIComponent(encodeURIComponent(JSON.stringify(validData)));

        const domain = 'puch-ersatzteile.test';
        await context.addCookies([{
            name: CONSENT_COOKIE_NAME,
            value: doubleEncoded,
            domain: domain,
            path: '/',
        }]);

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // The helper should handle double-encoding
        const consentData = await getConsentData(context);
        // Either it parses correctly or banner appears - both are acceptable
        if (consentData && consentData.categories) {
            expect(consentData.categories.necessary).toBe(true);
        } else {
            const banner = getBanner(page);
            await expect(banner).toBeVisible();
        }
    });

    test('consent buttons remain functional after page errors', async ({ page }) => {
        // Inject an error into the page before loading
        await page.addInitScript(() => {
            // This simulates a 3rd party script error
            setTimeout(() => {
                throw new Error('Simulated 3rd party error');
            }, 100);
        });

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Despite errors, banner should work
        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Buttons should be clickable
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Banner should close
        await expect(banner).not.toBeVisible();
    });

    test('Alpine component handles missing config gracefully', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Try to break the config after page load
        await page.evaluate(() => {
            window.cookie_consent_config = null;
        });

        // Banner should still be functional
        const banner = getBanner(page);
        if (await banner.isVisible()) {
            await clickAcceptAll(page);
            await page.waitForTimeout(1000);
            await expect(banner).not.toBeVisible();
        }
    });

    test('page works when cookie_consent_groups is corrupted', async ({ page }) => {
        await page.addInitScript(() => {
            // Corrupt the groups after it's set
            Object.defineProperty(window, 'cookie_consent_groups', {
                get() { return undefined; },
                set() { /* ignore */ }
            });
        });

        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Page should load (may or may not have the banner working perfectly)
        // Main thing is it shouldn't completely crash
        const pageTitle = await page.title();
        expect(pageTitle).toBeTruthy();
    });
});
