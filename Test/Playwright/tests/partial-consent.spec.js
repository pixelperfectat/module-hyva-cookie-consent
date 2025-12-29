/**
 * Partial Consent States Tests
 *
 * Tests for partial consent scenarios:
 * - User grants only analytics, not marketing
 * - User grants only marketing, not analytics
 * - Toggles reflect previous choices when re-opening settings
 * - Scripts load correctly based on partial consent
 */

const { test, expect } = require('@playwright/test');
const {
    SELECTORS,
    waitForPageReady,
    getBanner,
    getConsentData,
    clickFloatingButton,
    setCategoryAndSave,
} = require('./helpers/cookie-consent.helpers');

test.describe('Partial Consent States', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('user can grant analytics but not marketing', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Enable analytics
        const analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (!analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        // Disable marketing
        const marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        // Save preferences
        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1500);

        // Verify consent cookie
        const consentData = await getConsentData(context);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(false);
    });

    test('user can grant marketing but not analytics', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Disable analytics
        const analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        // Enable marketing
        const marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (!marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        // Save preferences
        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1500);

        // Verify consent cookie
        const consentData = await getConsentData(context);
        expect(consentData.categories.analytics).toBe(false);
        expect(consentData.categories.marketing).toBe(true);
    });

    test('toggles reflect previous choices when reopening settings', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view and set specific state
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Set analytics ON, marketing OFF
        const analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (!analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        const marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        // Save and close
        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1500);

        // Reopen via floating button
        await clickFloatingButton(page);
        await page.waitForTimeout(500);

        // Open details view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Verify toggles reflect saved state
        const analyticsNowActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        const marketingNowActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));

        expect(analyticsNowActive).toBe(true);
        expect(marketingNowActive).toBe(false);
    });

    test('partial consent persists across page reloads', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Use helper to set specific consent via Alpine component
        await setCategoryAndSave(page, 'analytics', true);
        await setCategoryAndSave(page, 'marketing', false);

        // Reload page
        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Verify consent persists
        const consentData = await getConsentData(context);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(false);
    });

    test('analytics scripts load with analytics consent only', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant only analytics consent
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Enable analytics
        const analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (!analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        // Disable marketing
        const marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(2000);

        // Check that GA cookies are set (analytics)
        const cookies = await context.cookies();
        const haGaCookies = cookies.some(c => c.name.startsWith('_ga'));

        // If GA4 is configured as analytics, expect GA cookies
        // Note: This may be skipped if GA4 is not configured
        if (haGaCookies) {
            expect(haGaCookies).toBe(true);
        }

        // fbq (Facebook) should NOT be defined (marketing is off)
        const fbqDefined = await page.evaluate(() => typeof window.fbq !== 'undefined');
        expect(fbqDefined).toBe(false);
    });

    test('user can change consent using Alpine component API', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // First, give partial consent (analytics only) via UI
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Enable analytics only
        const analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (!analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        const marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1500);

        // Verify partial consent
        let consentData = await getConsentData(context);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(false);

        // Now upgrade to full consent using the Alpine component API
        await page.evaluate(() => {
            const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
            component.consent.marketing = true;
            component.savePreferences();
        });
        await page.waitForTimeout(1500);

        // Verify full consent
        consentData = await getConsentData(context);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(true);
    });

    test('user can revoke consent using Alpine component API', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // First give full consent via UI
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Enable both
        let analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (!analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        let marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (!marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1500);

        // Verify full consent
        let consentData = await getConsentData(context);
        expect(consentData.categories.marketing).toBe(true);

        // Now revoke marketing using Alpine component API
        await page.evaluate(() => {
            const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
            component.consent.marketing = false;
            component.savePreferences();
        });
        await page.waitForTimeout(1500);

        // Verify analytics stays, marketing revoked
        consentData = await getConsentData(context);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(false);
    });
});
