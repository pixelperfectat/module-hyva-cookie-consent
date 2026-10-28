/**
 * Magento Consent Cookie Tests
 *
 * Modules outside this one (trackers such as Smile Elasticsuite, Magento's own restriction mode) read
 * Magento's native consent signal, the user_allowed_save_cookie cookie, not hyva_cookie_consent:
 * - Accept All sets it in Magento's format ({"<websiteId>":1})
 * - Reject All, partial consent and withdrawal leave it absent
 * - A visitor who consented before the upgrade gets it on the next page load
 */

const { test, expect } = require('@playwright/test');
const {
    waitForPageReady,
    clickAcceptAll,
    clickRejectAll,
    acceptAll,
    rejectAll,
    setCategoryAndSave,
} = require('./helpers/cookie-consent.helpers');

const MAGENTO_CONSENT_COOKIE = 'user_allowed_save_cookie';

async function getMagentoConsent(context) {
    const cookie = (await context.cookies()).find(c => c.name === MAGENTO_CONSENT_COOKIE);
    return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null;
}

async function isWebsiteAllowedByHyva(page) {
    return page.evaluate(() => {
        const raw = document.cookie.match('(^|;) ?user_allowed_save_cookie=([^;]*)(;|$)');
        return raw ? JSON.parse(decodeURIComponent(raw[2]))[CURRENT_WEBSITE_ID] === 1 : false;
    });
}

test.describe('Magento consent cookie', () => {
    test.beforeEach(async ({ context }) => {
        await context.clearCookies();
    });

    test('Accept All sets user_allowed_save_cookie for the current website', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await clickAcceptAll(page);

        const websiteId = await page.evaluate(() => String(CURRENT_WEBSITE_ID));
        expect(await getMagentoConsent(context)).toEqual({ [websiteId]: 1 });
        expect(await isWebsiteAllowedByHyva(page)).toBe(true);
    });

    test('Reject All does not set it', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await clickRejectAll(page);

        expect(await getMagentoConsent(context)).toBeNull();
        expect(await isWebsiteAllowedByHyva(page)).toBe(false);
    });

    test('partial consent does not set it', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await rejectAll(page);
        await setCategoryAndSave(page, 'analytics', true);

        expect(await getMagentoConsent(context)).toBeNull();
    });

    test('withdrawing consent removes it', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);

        await acceptAll(page);
        expect(await getMagentoConsent(context)).not.toBeNull();

        await setCategoryAndSave(page, 'marketing', false);
        expect(await getMagentoConsent(context)).toBeNull();

        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);
        expect(await getMagentoConsent(context)).toBeNull();
    });

    test('an earlier Accept All gets the cookie on the next page load', async ({ page, context }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForPageReady(page);
        await acceptAll(page);

        // Simulate a visitor who accepted before this cookie was written
        await context.clearCookies({ name: MAGENTO_CONSENT_COOKIE });
        expect(await getMagentoConsent(context)).toBeNull();

        await page.reload({ waitUntil: 'networkidle' });
        await waitForPageReady(page);
        expect(await getMagentoConsent(context)).not.toBeNull();
    });
});
