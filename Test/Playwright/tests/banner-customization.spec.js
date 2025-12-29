/**
 * Banner Customization Workflow Tests
 *
 * Tests the complete customization workflow:
 * - Customize button opens settings view
 * - Individual category toggles work correctly
 * - Save Preferences saves the selected categories
 * - Back button returns to main view
 */

const { test, expect } = require('@playwright/test');
const {
    SELECTORS,
    CONSENT_COOKIE_NAME,
    waitForPageReady,
    getBanner,
    getConsentData,
    clickFloatingButton,
} = require('./helpers/cookie-consent.helpers');

test.describe('Banner Customization Workflow', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('Customize button opens settings view with category toggles', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Banner should be visible
        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Click Customize button
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Category toggles should now be visible
        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        await expect(analyticsToggle).toBeVisible();
        await expect(marketingToggle).toBeVisible();

        // Save Preferences button should be visible
        await expect(page.locator(SELECTORS.savePreferences)).toBeVisible();
    });

    test('Category toggles can be clicked and reflect state changes', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Get initial state of analytics toggle
        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const initialAriaChecked = await analyticsToggle.getAttribute('aria-checked');

        // Click to toggle
        await analyticsToggle.click();
        await page.waitForTimeout(300);

        // State should change
        const newAriaChecked = await analyticsToggle.getAttribute('aria-checked');
        expect(newAriaChecked).not.toBe(initialAriaChecked);

        // Click again to toggle back
        await analyticsToggle.click();
        await page.waitForTimeout(300);

        const finalAriaChecked = await analyticsToggle.getAttribute('aria-checked');
        expect(finalAriaChecked).toBe(initialAriaChecked);
    });

    test('Save Preferences saves selected categories correctly', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Enable analytics but disable marketing
        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Set analytics to enabled (click if not already active)
        const analyticsActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        if (!analyticsActive) {
            await analyticsToggle.click();
            await page.waitForTimeout(300);
        }

        // Set marketing to disabled (click if currently active)
        const marketingActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        if (marketingActive) {
            await marketingToggle.click();
            await page.waitForTimeout(300);
        }

        // Save preferences
        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1000);

        // Banner should close
        const banner = getBanner(page);
        await expect(banner).not.toBeVisible();

        // Check consent cookie has correct values
        const consentData = await getConsentData(context);
        expect(consentData).not.toBeNull();
        expect(consentData.categories.necessary).toBe(true);
        expect(consentData.categories.analytics).toBe(true);
        expect(consentData.categories.marketing).toBe(false);
    });

    test('Back button returns to main view without saving', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Toggle analytics
        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        await analyticsToggle.click();
        await page.waitForTimeout(300);

        // Click Back button (same button as Customize, shows different text when in details view)
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Should be back in main view - category toggles hidden
        await expect(analyticsToggle).not.toBeVisible();

        // Accept All should be visible again
        await expect(page.locator(SELECTORS.acceptAll)).toBeVisible();

        // No consent cookie should be set yet
        const consentData = await getConsentData(context);
        expect(consentData).toBeNull();
    });

    test('Reopening settings shows previously saved preferences', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view and save with specific settings
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const marketingToggle = page.locator(SELECTORS.categoryToggle('marketing'));

        // Enable analytics, ensure marketing is off
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

        // Save
        await page.locator(SELECTORS.savePreferences).click();
        await page.waitForTimeout(1000);

        // Reopen settings via floating button
        await clickFloatingButton(page);
        await page.waitForTimeout(500);

        // Open details view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Analytics should still be enabled
        const analyticsNowActive = await analyticsToggle.evaluate(el => el.classList.contains('is-active'));
        expect(analyticsNowActive).toBe(true);

        // Marketing should still be disabled
        const marketingNowActive = await marketingToggle.evaluate(el => el.classList.contains('is-active'));
        expect(marketingNowActive).toBe(false);
    });

    test('Necessary cookies toggle is always active and cannot be disabled', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Necessary category should not have a toggle button (required categories show "Immer aktiv" text in German)
        const necessaryToggle = page.locator(SELECTORS.categoryToggle('necessary'));

        // The toggle should not exist for necessary category
        const toggleCount = await necessaryToggle.count();
        expect(toggleCount).toBe(0);

        // Look for "Immer aktiv" text (German for "Always Active") near the necessary category
        const alwaysActiveText = page.locator('text=Immer aktiv').first();
        await expect(alwaysActiveText).toBeVisible();
    });
});
