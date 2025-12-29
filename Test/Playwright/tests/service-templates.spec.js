/**
 * Service Template Tests
 *
 * Tests that verify each service template renders correctly and respects consent.
 * Tests are SKIPPED if the corresponding service ID is not configured in .env
 *
 * Run with: npm test -- service-templates.spec.js
 */

const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    acceptAll,
    rejectAll,
    setCategoryAndSave,
    getBanner,
} = require('./helpers/cookie-consent.helpers');

// Service IDs from environment
const ga4Id = process.env.TEST_GA4_MEASUREMENT_ID;
const fbPixelId = process.env.TEST_FB_PIXEL_ID;
const hotjarId = process.env.TEST_HOTJAR_SITE_ID;
const clarityId = process.env.TEST_CLARITY_PROJECT_ID;
const matomoUrl = process.env.TEST_MATOMO_URL;
const matomoSiteId = process.env.TEST_MATOMO_SITE_ID;

// =============================================================================
// Google Analytics 4 Tests
// =============================================================================
test.describe('Google Analytics 4', () => {
    test.skip(!ga4Id, 'GA4 Measurement ID not configured - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('template renders with correct structure', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Check external script loader (blocked with type="text/plain")
        const scriptLoader = page.locator(
            `script[type="text/plain"][data-consent-category="analytics"][data-consent-src*="${ga4Id}"]`
        );
        await expect(scriptLoader).toBeAttached();

        // Check inline config template exists
        const templates = page.locator('template[data-consent-category="analytics"]');
        const count = await templates.count();
        expect(count).toBeGreaterThan(0);
    });

    test('gtag not defined before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const gtagExists = await page.evaluate(() => typeof window.gtag === 'function');
        expect(gtagExists).toBe(false);
    });

    test('gtag defined after analytics consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant only analytics consent
        await setCategoryAndSave(page, 'analytics', true);
        await page.waitForTimeout(2000);

        // gtag should now be defined
        const gtagExists = await page.evaluate(() => typeof window.gtag === 'function');
        expect(gtagExists).toBe(true);
    });

    test('measurement ID appears in script src', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const scriptSrc = await page.locator(
            'script[data-consent-src*="googletagmanager.com/gtag/js"]'
        ).getAttribute('data-consent-src');

        expect(scriptSrc).toContain(ga4Id);
    });
});

// =============================================================================
// Facebook Pixel Tests
// =============================================================================
test.describe('Facebook Pixel', () => {
    test.skip(!fbPixelId, 'Facebook Pixel ID not configured - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('template renders with marketing category', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Facebook Pixel should be in a marketing template
        const fbTemplate = page.locator('template[data-consent-category="marketing"]');
        const count = await fbTemplate.count();
        expect(count).toBeGreaterThan(0);

        // Check template contains fbq initialization
        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="marketing"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain('fbq');
    });

    test('fbq not defined before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const fbqExists = await page.evaluate(() => typeof window.fbq === 'function');
        expect(fbqExists).toBe(false);
    });

    test('fbq defined after marketing consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant marketing consent
        await setCategoryAndSave(page, 'marketing', true);
        await page.waitForTimeout(2000);

        // fbq should now be defined
        const fbqExists = await page.evaluate(() => typeof window.fbq === 'function');
        expect(fbqExists).toBe(true);
    });

    test('pixel ID appears in template', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="marketing"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain(fbPixelId);
    });
});

// =============================================================================
// Hotjar Tests
// =============================================================================
test.describe('Hotjar', () => {
    test.skip(!hotjarId, 'Hotjar Site ID not configured - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('template renders with analytics category', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Check template contains Hotjar initialization
        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain('hotjar');
    });

    test('hj not defined before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const hjExists = await page.evaluate(() => typeof window.hj === 'function');
        expect(hjExists).toBe(false);
    });

    test('hj defined after analytics consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant analytics consent
        await setCategoryAndSave(page, 'analytics', true);
        await page.waitForTimeout(2000);

        // hj should now be defined (queue function)
        const hjExists = await page.evaluate(() => typeof window.hj === 'function');
        expect(hjExists).toBe(true);
    });

    test('site ID appears in template', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain(hotjarId);
    });
});

// =============================================================================
// Microsoft Clarity Tests
// =============================================================================
test.describe('Microsoft Clarity', () => {
    test.skip(!clarityId, 'Clarity Project ID not configured - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('template renders with analytics category', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Check template contains Clarity initialization
        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain('clarity');
    });

    test('clarity not defined before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const clarityExists = await page.evaluate(() => typeof window.clarity === 'function');
        expect(clarityExists).toBe(false);
    });

    test('clarity defined after analytics consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Grant analytics consent
        await setCategoryAndSave(page, 'analytics', true);
        await page.waitForTimeout(2000);

        // clarity should now be defined
        const clarityExists = await page.evaluate(() => typeof window.clarity === 'function');
        expect(clarityExists).toBe(true);
    });

    test('project ID appears in template', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain(clarityId);
    });
});

// =============================================================================
// Matomo Tests
// =============================================================================
test.describe('Matomo', () => {
    test.skip(!matomoUrl || !matomoSiteId, 'Matomo URL or Site ID not configured - skipping');

    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('template renders with analytics category', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Check template contains Matomo initialization (_paq)
        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain('_paq');
    });

    test('_paq not tracking before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // _paq may exist as an array but shouldn't have Matomo methods
        const matomoLoaded = await page.evaluate(() => {
            return window._paq && window._paq.push && typeof window.Matomo !== 'undefined';
        });
        expect(matomoLoaded).toBe(false);
    });

    test('tracker URL appears in template', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });

        // URL should appear (possibly without trailing slash)
        const normalizedUrl = matomoUrl.replace(/\/$/, '');
        expect(templateContent).toContain(normalizedUrl);
    });

    test('site ID appears in template', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const templateContent = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category="analytics"]');
            return Array.from(templates).map(t => t.innerHTML).join('');
        });
        expect(templateContent).toContain(matomoSiteId);
    });
});

// =============================================================================
// General Template Tests
// =============================================================================
test.describe('Template Consent Attributes', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('all templates have valid data-consent-category', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Get all consent templates
        const categories = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category]');
            const scripts = document.querySelectorAll('script[data-consent-category]');
            const elements = [...templates, ...scripts];
            return elements.map(el => el.getAttribute('data-consent-category'));
        });

        // All should be valid category codes
        const validCategories = ['necessary', 'analytics', 'marketing', 'preferences'];
        for (const category of categories) {
            expect(validCategories).toContain(category);
        }
    });

    test('service information shown in consent banner', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const banner = getBanner(page);
        await expect(banner).toBeVisible();

        // Check that category sections exist
        const analyticsSection = banner.locator('text=Analytics').or(banner.locator('text=Analyse'));
        const marketingSection = banner.locator('text=Marketing').or(banner.locator('text=Werbung'));

        // At least one category should be visible
        const analyticsVisible = await analyticsSection.count() > 0;
        const marketingVisible = await marketingSection.count() > 0;

        expect(analyticsVisible || marketingVisible).toBe(true);
    });
});
