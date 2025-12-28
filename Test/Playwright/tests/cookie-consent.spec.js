/**
 * Pixelperfect_HyvaCookieConsent - Playwright E2E Tests
 *
 * These tests verify the cookie consent system works correctly:
 * - Banner appears for new visitors
 * - Cookies are blocked until consent
 * - Accept/Reject All work correctly
 * - GTM Infrastructure Mode with Consent Mode v2
 * - Consent persists across page loads
 * - Floating button allows re-opening settings
 *
 * Run with: npx playwright test
 *
 * Note: Tests use a self-signed SSL certificate, so ignoreHTTPSErrors is required.
 */

const { test, expect } = require('@playwright/test');
const {
    SELECTORS,
    CONSENT_COOKIE_NAME,
    getAllCookies,
    waitForPageReady,
    clickAcceptAll,
    clickRejectAll,
    clickFloatingButton,
    getConsentData,
    getBanner,
    findDataLayerEvent,
    getCookieConsentConfig,
    getCookieConsentGroups,
} = require('./helpers/cookie-consent.helpers');

test.describe('Cookie Consent Banner', () => {
    test.beforeEach(async ({ context }) => {
        // Clear all cookies before each test to simulate new visitor
        await context.clearCookies();
    });

    test('banner appears for new visitors', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Check buttons exist using data-testid selectors
        await expect(page.locator(SELECTORS.acceptAll)).toBeVisible();
        await expect(page.locator(SELECTORS.rejectAll)).toBeVisible();
        await expect(page.locator(SELECTORS.customize)).toBeVisible();
    });

    test('cookies are blocked before consent', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const cookies = await getAllCookies(context);
        const cookieNames = cookies.map(c => c.name);

        // Should only have necessary cookies
        expect(cookieNames).toContain('PHPSESSID');

        // Should NOT have tracking cookies
        expect(cookieNames.some(n => n.startsWith('_ga'))).toBeFalsy();
        expect(cookieNames.some(n => n === '_fbp')).toBeFalsy();

        // Should NOT have consent cookie yet
        expect(cookieNames).not.toContain(CONSENT_COOKIE_NAME);
    });

    test('Accept All grants consent and sets cookies', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Click Accept All
        await clickAcceptAll(page);

        // Banner should close
        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // Wait for cookies to be set
        await page.waitForTimeout(2000);

        const cookies = await getAllCookies(context);
        const cookieNames = cookies.map(c => c.name);

        // Should have consent cookie
        expect(cookieNames).toContain(CONSENT_COOKIE_NAME);

        // Should have GA cookies (if GTM/GA4 is configured)
        expect(cookieNames.some(n => n.startsWith('_ga'))).toBeTruthy();

        // Verify consent cookie value
        const consentValue = await getConsentData(context);
        expect(consentValue.categories.necessary).toBe(true);
        expect(consentValue.categories.analytics).toBe(true);
        expect(consentValue.categories.marketing).toBe(true);
        expect(consentValue.categories.preferences).toBe(true);
    });

    test('Reject All denies consent and blocks tracking cookies', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Click Reject All
        await clickRejectAll(page);

        // Banner should close
        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        await page.waitForTimeout(2000);

        const cookies = await getAllCookies(context);
        const cookieNames = cookies.map(c => c.name);

        // Should have consent cookie (to remember rejection)
        expect(cookieNames).toContain(CONSENT_COOKIE_NAME);

        // Should NOT have tracking cookies
        expect(cookieNames.some(n => n.startsWith('_ga'))).toBeFalsy();
        expect(cookieNames.some(n => n === '_fbp')).toBeFalsy();

        // Verify consent cookie shows rejection
        const consentValue = await getConsentData(context);
        expect(consentValue.categories.necessary).toBe(true);
        expect(consentValue.categories.analytics).toBe(false);
        expect(consentValue.categories.marketing).toBe(false);
    });
});

test.describe('GTM Infrastructure Mode + Consent Mode v2', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('consent_default event fires with denied state', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const consentDefault = await findDataLayerEvent(page, 'consent_default');

        expect(consentDefault).toBeDefined();
        expect(consentDefault.consent_analytics).toBe(false);
        expect(consentDefault.consent_marketing).toBe(false);
    });

    test('consent_update event fires after accepting', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        const consentUpdate = await findDataLayerEvent(page, 'consent_update');

        expect(consentUpdate).toBeDefined();
        expect(consentUpdate.consent_analytics).toBe(true);
        expect(consentUpdate.consent_marketing).toBe(true);
    });
});

test.describe('Consent Persistence', () => {
    test('consent persists across page loads', async ({ page, context }) => {
        await context.clearCookies();

        // Visit first page and accept
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Verify banner is closed
        let banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // Reload the page (portable - works on any installation)
        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should NOT appear on reload
        banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // Cookies should persist
        const cookies = await getAllCookies(context);
        const cookieNames = cookies.map(c => c.name);
        expect(cookieNames).toContain(CONSENT_COOKIE_NAME);
        expect(cookieNames.some(n => n.startsWith('_ga'))).toBeTruthy();
    });
});

test.describe('Floating Button', () => {
    test('floating button reopens consent settings', async ({ page, context }) => {
        await context.clearCookies();

        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept all first
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Banner should be closed
        let banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // Find and click floating button
        const floatingBtn = page.locator(SELECTORS.floatingButton);
        await expect(floatingBtn).toBeVisible();
        await clickFloatingButton(page);

        // Banner should reopen
        banner = getBanner(page);
        await expect(banner).toBeVisible();
    });
});

test.describe('Cookie Config Structure', () => {
    test('cookie_consent_config uses correct Hyva format', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const config = await getCookieConsentConfig(page);

        // Config should have groups as keys with arrays of cookie names
        expect(Array.isArray(config.necessary)).toBe(true);
        expect(config.necessary).toContain('hyva_cookie_consent');
        expect(config.necessary).toContain('PHPSESSID');
        expect(config.necessary).toContain('form_key');

        // Analytics group should exist if services are enabled
        if (config.analytics) {
            expect(Array.isArray(config.analytics)).toBe(true);
        }
    });

    test('cookie_consent_groups initialized correctly', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const groups = await getCookieConsentGroups(page);

        // Necessary should always be true
        expect(groups.necessary).toBe(true);

        // Other groups should be false by default
        expect(groups.analytics).toBe(false);
        expect(groups.marketing).toBe(false);
        expect(groups.preferences).toBe(false);
    });
});
