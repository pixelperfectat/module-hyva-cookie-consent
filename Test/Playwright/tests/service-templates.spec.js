/**
 * Service Template Tests
 *
 * Tests that verify each service template renders correctly and respects consent.
 * Service code is registered as a consent loader (window.hyvaCookieConsentLoaders) and runs once
 * the visitor consents to the service's category.
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
    getConsentLoaders,
    escapeJsLikeMagento,
} = require('./helpers/cookie-consent.helpers');

/**
 * Concatenated load() sources of the loaders registered for a category
 */
async function loaderSource(page, category) {
    const loaders = await getConsentLoaders(page, category);
    return loaders.map(loader => loader.source).join('\n');
}

/**
 * Concatenated innerHTML of the consent templates (now only <noscript> fallbacks) for a category
 */
async function templateContent(page, category) {
    return await page.evaluate((wanted) => {
        const templates = document.querySelectorAll(`template[data-consent-category="${wanted}"]`);
        return Array.from(templates).map(t => t.innerHTML).join('');
    }, category);
}

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

        // Inline config waits in an analytics loader
        expect(await loaderSource(page, 'analytics')).toContain(`gtag('config', '${escapeJsLikeMagento(ga4Id)}'`);
    });

    // window.gtag always exists: cookie-config defines it for the Consent Mode default.
    // What consent gates is gtag.js itself and the config command.
    test('gtag.js not loaded before consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).not.toBeAttached();
        const configured = await page.evaluate(
            (id) => (window.dataLayer || []).some(e => e[0] === 'config' && e[1] === id),
            ga4Id
        );
        expect(configured).toBe(false);
    });

    test('gtag.js loaded and configured after analytics consent', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await setCategoryAndSave(page, 'analytics', true);

        await expect(page.locator(`script[src*="googletagmanager.com/gtag/js?id=${ga4Id}"]`)).toBeAttached();
        const configured = await page.evaluate(
            (id) => (window.dataLayer || []).some(e => e[0] === 'config' && e[1] === id),
            ga4Id
        );
        expect(configured).toBe(true);
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

    test('code waits in a marketing loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Facebook Pixel code waits in a marketing loader, its noscript pixel in a marketing template
        expect(await loaderSource(page, 'marketing')).toContain('fbq');
        expect(await templateContent(page, 'marketing')).toContain('facebook.com/tr');
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

    test('pixel ID appears in the loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        expect(await loaderSource(page, 'marketing')).toContain(escapeJsLikeMagento(fbPixelId));
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

    test('code waits in an analytics loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Hotjar code waits in an analytics loader
        const source = await loaderSource(page, 'analytics');
        expect(source).toContain('hotjar');
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

    test('site ID appears in the loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const source = await loaderSource(page, 'analytics');
        expect(source).toContain(hotjarId);
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

    test('code waits in an analytics loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Clarity code waits in an analytics loader
        const source = await loaderSource(page, 'analytics');
        expect(source).toContain('clarity');
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

    test('project ID appears in the loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const source = await loaderSource(page, 'analytics');
        expect(source).toContain(escapeJsLikeMagento(clarityId));
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

    test('code waits in an analytics loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        // Matomo code (_paq) waits in an analytics loader
        const source = await loaderSource(page, 'analytics');
        expect(source).toContain('_paq');
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

    test('tracker URL appears in the loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const source = await loaderSource(page, 'analytics');

        // The template appends a trailing slash and escapes the URL for JavaScript
        const normalizedUrl = matomoUrl.replace(/\/$/, '') + '/';
        expect(source).toContain(escapeJsLikeMagento(normalizedUrl));
    });

    test('site ID appears in the loader', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        const source = await loaderSource(page, 'analytics');
        expect(source).toContain(escapeJsLikeMagento(matomoSiteId));
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

        // Categories of consent templates, blocked scripts and registered loaders
        const categories = await page.evaluate(() => {
            const templates = document.querySelectorAll('template[data-consent-category]');
            const scripts = document.querySelectorAll('script[data-consent-category]');
            const elements = [...templates, ...scripts];
            const loaders = window.hyvaCookieConsentLoaders || [];
            return [
                ...elements.map(el => el.getAttribute('data-consent-category')),
                ...loaders.map(loader => loader.category),
            ];
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
