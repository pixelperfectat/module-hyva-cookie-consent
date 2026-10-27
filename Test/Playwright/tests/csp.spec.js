/**
 * Strict CSP Tests
 *
 * Records Content-Security-Policy violations while the visitor accepts all cookies. Run it against a
 * store with Hyva's strict CSP (no 'unsafe-inline' in script-src) and the services you want to check
 * enabled; with a relaxed policy it passes trivially.
 *
 * Run with: npm test -- csp.spec.js
 */

const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    clickAcceptAll,
    getConsentLoaders,
} = require('./helpers/cookie-consent.helpers');

test.describe('Strict CSP', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            window.__cspViolations = [];
            document.addEventListener('securitypolicyviolation', (event) => {
                window.__cspViolations.push({
                    directive: event.effectiveDirective || event.violatedDirective,
                    blockedURI: event.blockedURI,
                    sample: event.sample,
                });
            });
        });
    });

    test('no script-src violations before or after Accept All', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await clickAcceptAll(page);
        await page.waitForTimeout(3000);

        const violations = await page.evaluate(() => window.__cspViolations);
        const scriptViolations = violations.filter(v => String(v.directive).startsWith('script-src'));
        expect(scriptViolations).toEqual([]);

        // Every registered service loader ran
        const loaders = await getConsentLoaders(page);
        expect(loaders.filter(loader => !loader.loaded)).toEqual([]);
    });

    test('service loaders run on a reload with saved consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);
        await clickAcceptAll(page);

        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);
        await page.waitForTimeout(3000);

        const violations = await page.evaluate(() => window.__cspViolations);
        expect(violations.filter(v => String(v.directive).startsWith('script-src'))).toEqual([]);
        expect((await getConsentLoaders(page)).filter(loader => !loader.loaded)).toEqual([]);
    });
});
