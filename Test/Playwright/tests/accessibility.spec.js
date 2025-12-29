/**
 * Accessibility Tests
 *
 * Tests for accessibility compliance:
 * - ARIA labels present
 * - Keyboard navigation works
 * - Focus management correct
 * - Semantic HTML structure
 * - Screen reader compatibility
 */

const { test, expect } = require('@playwright/test');
const {
    SELECTORS,
    waitForPageReady,
    getBanner,
    clickAcceptAll,
} = require('./helpers/cookie-consent.helpers');

test.describe('Accessibility', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('banner has proper ARIA role and labels', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Banner should have dialog role
        await expect(banner).toHaveAttribute('role', 'dialog');

        // Banner should have aria-modal for modal behavior
        await expect(banner).toHaveAttribute('aria-modal', 'true');

        // Banner should have aria-label
        const ariaLabel = await banner.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
    });

    test('buttons have accessible names', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept All button should have text content
        const acceptButton = page.locator(SELECTORS.acceptAll);
        await expect(acceptButton).toBeVisible();
        const acceptText = await acceptButton.textContent();
        expect(acceptText?.trim()).toBeTruthy();

        // Reject All button should have text content
        const rejectButton = page.locator(SELECTORS.rejectAll);
        await expect(rejectButton).toBeVisible();
        const rejectText = await rejectButton.textContent();
        expect(rejectText?.trim()).toBeTruthy();

        // Customize button should have text content
        const customizeButton = page.locator(SELECTORS.customize);
        await expect(customizeButton).toBeVisible();
        const customizeText = await customizeButton.textContent();
        expect(customizeText?.trim()).toBeTruthy();
    });

    test('category toggles have proper ARIA attributes', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        // Check analytics toggle
        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        await expect(analyticsToggle).toBeVisible();

        // Toggle should have switch role
        await expect(analyticsToggle).toHaveAttribute('role', 'switch');

        // Toggle should have aria-checked
        const ariaChecked = await analyticsToggle.getAttribute('aria-checked');
        expect(['true', 'false']).toContain(ariaChecked);

        // Toggle should have aria-label
        const ariaLabel = await analyticsToggle.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
    });

    test('toggle aria-checked updates when clicked', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const initialState = await analyticsToggle.getAttribute('aria-checked');

        // Click toggle
        await analyticsToggle.click();
        await page.waitForTimeout(300);

        // State should change
        const newState = await analyticsToggle.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
    });

    test('keyboard navigation works for main buttons', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // All main buttons should be focusable
        const acceptButton = page.locator(SELECTORS.acceptAll);
        const rejectButton = page.locator(SELECTORS.rejectAll);
        const customizeButton = page.locator(SELECTORS.customize);

        // Test that buttons can receive focus
        await acceptButton.focus();
        await expect(acceptButton).toBeFocused();

        await rejectButton.focus();
        await expect(rejectButton).toBeFocused();

        await customizeButton.focus();
        await expect(customizeButton).toBeFocused();
    });

    test('Enter key activates focused button', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Focus on the Accept All button directly
        await page.locator(SELECTORS.acceptAll).focus();
        await page.waitForTimeout(100);

        // Press Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        // Banner should close
        await expect(banner).not.toBeVisible();
    });

    test('Space key activates focused toggle', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        const initialState = await analyticsToggle.getAttribute('aria-checked');

        // Focus on toggle
        await analyticsToggle.focus();
        await page.waitForTimeout(100);

        // Press Space
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);

        // State should change
        const newState = await analyticsToggle.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
    });

    test('floating button is keyboard accessible', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Accept consent to show floating button
        await clickAcceptAll(page);
        await page.waitForTimeout(1000);

        // Find floating button
        const floatingButton = page.locator(SELECTORS.floatingButton);
        await expect(floatingButton).toBeVisible();

        // Focus on floating button
        await floatingButton.focus();
        await page.waitForTimeout(100);

        // Press Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Banner should reopen
        const banner = getBanner(page);
        await expect(banner).toBeVisible();
    });

    test('semantic heading structure in banner', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Banner should have a heading
        const heading = banner.locator('h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible();

        // Heading should have text content
        const headingText = await heading.textContent();
        expect(headingText?.trim()).toBeTruthy();
    });

    test('links have accessible text', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Find privacy policy link within the banner
        const links = banner.locator('a');
        const linkCount = await links.count();

        // If there are links, they should have accessible names
        for (let i = 0; i < linkCount; i++) {
            const link = links.nth(i);
            const text = await link.textContent();
            const ariaLabel = await link.getAttribute('aria-label');
            // Link should have either text content or aria-label
            expect(text?.trim() || ariaLabel).toBeTruthy();
        }
    });

    test('color contrast is maintained with toggle states', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Open customize view
        await page.locator(SELECTORS.customize).click();
        await page.waitForTimeout(500);

        const analyticsToggle = page.locator(SELECTORS.categoryToggle('analytics'));
        await expect(analyticsToggle).toBeVisible();

        // Check that toggle has visible styling (not transparent/invisible)
        const backgroundColor = await analyticsToggle.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
        });

        // Background color should not be fully transparent
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(backgroundColor).not.toBe('transparent');
    });

    test('no keyboard trap in banner', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Tab through all focusable elements
        const maxTabs = 20; // Prevent infinite loop
        let tabCount = 0;
        let escapedBanner = false;

        while (tabCount < maxTabs) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(50);
            tabCount++;

            // Check if focus has left the banner (which would mean no trap)
            const focusedInBanner = await page.evaluate(() => {
                const focused = document.activeElement;
                const banner = document.getElementById('cookie-consent-banner');
                return banner?.contains(focused) || focused === banner;
            });

            if (!focusedInBanner) {
                escapedBanner = true;
                break;
            }
        }

        // Either we escaped the banner or tabbed through reasonable number of elements
        // Both are acceptable - the key is no infinite loop
        expect(tabCount).toBeLessThan(maxTabs);
    });
});
