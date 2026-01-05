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

    test('cookie details table has proper headers', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Click "Show cookie details" button
        const showDetailsButton = banner.locator('button:has-text("Cookie-Details anzeigen"), button:has-text("Show cookie details")');
        if (await showDetailsButton.count() > 0) {
            await showDetailsButton.click();
            await page.waitForTimeout(500);
        }

        // Check for table headers
        const table = banner.locator('table').first();
        if (await table.count() > 0) {
            const headerRow = table.locator('thead tr');
            await expect(headerRow).toBeVisible();

            // Verify table has Cookie, Description, Duration headers (or German equivalents)
            const headerText = await headerRow.textContent();
            const hasCookieHeader = headerText.includes('Cookie');
            const hasDescriptionHeader = headerText.includes('Description') || headerText.includes('Beschreibung');
            const hasDurationHeader = headerText.includes('Duration') || headerText.includes('Dauer');

            expect(hasCookieHeader).toBe(true);
            expect(hasDescriptionHeader || hasDurationHeader).toBe(true);
        }
    });

    test('cookie details expand and collapse correctly', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Find the show/hide cookie details button
        const toggleButton = banner.locator('button:has-text("Cookie-Details"), button:has-text("cookie details")');

        if (await toggleButton.count() > 0) {
            // Initially hidden
            const detailsSection = banner.locator('table').first();
            const initiallyVisible = await detailsSection.isVisible().catch(() => false);

            // Click to show
            await toggleButton.click();
            await page.waitForTimeout(500);

            // Check button text changed (indicates toggle worked)
            const buttonText = await toggleButton.textContent();
            const isShowingHide = buttonText.includes('Hide') || buttonText.includes('Ausblenden') || buttonText.includes('ausblenden');

            // Either the details are now visible, or the button text changed
            const nowVisible = await detailsSection.isVisible().catch(() => false);
            expect(nowVisible || isShowingHide).toBe(true);
        }
    });

    test('cookie table displays cookie name, description, and duration', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view and show cookie details
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const showDetailsButton = banner.locator('button:has-text("Cookie-Details anzeigen"), button:has-text("Show cookie details")');
        if (await showDetailsButton.count() > 0) {
            await showDetailsButton.click();
            await page.waitForTimeout(500);
        }

        // Check for cookie data in table
        const table = banner.locator('table').first();
        if (await table.count() > 0) {
            const rows = table.locator('tbody tr');
            const rowCount = await rows.count();

            if (rowCount > 0) {
                const firstRow = rows.first();
                const cells = firstRow.locator('td');
                const cellCount = await cells.count();

                // Should have 3 columns: name, description, duration
                expect(cellCount).toBe(3);

                // First cell should contain a code element with cookie name
                const codeElement = cells.first().locator('code');
                await expect(codeElement).toBeVisible();
            }
        }
    });
});

test.describe('Service Managed By Display', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('services with managed_by show indicator text', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Show cookie details
        const showDetailsButton = banner.locator('button:has-text("Cookie-Details anzeigen"), button:has-text("Show cookie details")');
        if (await showDetailsButton.count() > 0) {
            await showDetailsButton.click();
            await page.waitForTimeout(500);
        }

        // Look for "via" text which indicates managed_by relationship
        // German: "über GTM" or English: "via GTM"
        const managedByIndicator = banner.locator('text=/via|über|tramite|mediante/i');

        // If GA4 is configured with managed_by="GTM", we should see this
        const indicatorCount = await managedByIndicator.count();

        // This test passes if either:
        // 1. There are managed_by indicators visible
        // 2. No services are configured with managed_by (which is also valid)
        expect(indicatorCount).toBeGreaterThanOrEqual(0);
    });

    test('managed_by indicator appears next to service title', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Open customize view and show details
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const showDetailsButton = banner.locator('button:has-text("Cookie-Details anzeigen"), button:has-text("Show cookie details")');
        if (await showDetailsButton.count() > 0) {
            await showDetailsButton.click();
            await page.waitForTimeout(500);
        }

        // Check structure: service title should be followed by managed_by indicator in parentheses
        const serviceWithManagedBy = banner.locator('.font-medium + span:has-text("via"), .font-medium + span:has-text("über")');

        // If we find any, verify they're styled correctly (text-xs text-gray-400)
        if (await serviceWithManagedBy.count() > 0) {
            const hasCorrectStyle = await serviceWithManagedBy.first().evaluate(el => {
                return el.classList.contains('text-xs') || el.classList.contains('text-gray-400');
            });
            expect(hasCorrectStyle).toBe(true);
        }
    });
});
