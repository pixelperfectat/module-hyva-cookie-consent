/**
 * UI Features Tests
 *
 * Tests for UI improvements:
 * - Banner scrolling behavior
 * - Cookie details table format
 * - Service managed_by attribute display
 */

const { test, expect } = require('@playwright/test');
const {
    SELECTORS,
    waitForPageReady,
    getBanner,
} = require('./helpers/cookie-consent.helpers');

test.describe('Banner Scrolling', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('banner content area is scrollable when content exceeds viewport', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view to show categories
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // The scrollable container should have overflow-y-auto class
        const scrollableContainer = banner.locator('.overflow-y-auto');
        await expect(scrollableContainer).toBeVisible();

        // Verify the container has the flex-1 class for proper sizing
        const hasFlexClass = await scrollableContainer.evaluate(el =>
            el.classList.contains('flex-1') || el.classList.contains('min-h-0')
        );
        expect(hasFlexClass).toBe(true);
    });

    test('header and footer sections remain fixed while content scrolls', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Header should have flex-shrink-0 to prevent shrinking
        const header = banner.locator('.border-b.flex-shrink-0').first();
        await expect(header).toBeVisible();

        // Footer (actions area) should have flex-shrink-0
        const footer = banner.locator('.border-t.flex-shrink-0').first();
        await expect(footer).toBeVisible();
    });
});

test.describe('Cookie Details Table', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    /**
     * Open the customize view and expand the cookie details.
     * The necessary category always lists Magento's own cookies, so a table must exist.
     */
    async function openCookieDetails(page) {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        await page.locator(SELECTORS.customize).click();
        const showDetailsButton = banner.locator(SELECTORS.showDetails);
        await expect(showDetailsButton).toBeVisible();
        await showDetailsButton.click();

        return banner;
    }

    test('cookie details table has proper headers', async ({ page }) => {
        const banner = await openCookieDetails(page);

        const headerRow = banner.locator('table').first().locator('thead tr');
        await expect(headerRow).toBeVisible();

        // Cookie, Description, Duration (or their translations)
        const headers = headerRow.locator('th');
        await expect(headers).toHaveCount(3);
        await expect(headers.first()).toContainText('Cookie');
    });

    test('cookie details expand and collapse correctly', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();
        await page.locator(SELECTORS.customize).click();

        const toggleButton = banner.locator(SELECTORS.showDetails);
        const firstTable = banner.locator('table').first();
        await expect(toggleButton).toBeVisible();
        await expect(firstTable).toBeHidden();

        await toggleButton.click();
        await expect(firstTable).toBeVisible();

        await toggleButton.click();
        await expect(firstTable).toBeHidden();
    });

    test('cookie table displays cookie name, description, and duration', async ({ page }) => {
        const banner = await openCookieDetails(page);

        const firstRow = banner.locator('table').first().locator('tbody tr').first();
        await expect(firstRow).toBeVisible();

        // Three columns: name, description, duration; the name sits in a <code> element
        await expect(firstRow.locator('td')).toHaveCount(3);
        await expect(firstRow.locator('td').first().locator('code')).toBeVisible();
    });
});

test.describe('Service Managed By Display', () => {
    // No shipped service sets <managed_by>. Set TEST_MANAGED_BY_SERVICE to the title of a service that does
    // (added through another module's cookie_consent.xml) to run this check.
    const managedByService = process.env.TEST_MANAGED_BY_SERVICE;
    test.skip(!managedByService, 'TEST_MANAGED_BY_SERVICE not configured - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('managed_by indicator appears next to the service title', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();
        await page.locator(SELECTORS.customize).click();
        await banner.locator(SELECTORS.showDetails).click();

        const title = banner.locator('div.font-medium', { hasText: managedByService }).first();
        await expect(title).toBeVisible();

        const indicator = title.locator('span.text-xs');
        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveText(/\(.+\)/);
    });
});
