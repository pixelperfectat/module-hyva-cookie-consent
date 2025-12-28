// @ts-check
/**
 * Shared helpers for cookie consent Playwright tests
 *
 * These helpers provide stable, language-agnostic selectors and
 * reusable functions for testing cookie consent functionality.
 */

/**
 * Selectors registry - single source of truth for all test selectors.
 * Uses data-testid attributes for stability across different locales.
 */
const SELECTORS = {
    banner: '#cookie-consent-banner',
    alpineComponent: '[x-data="hyvaCookieConsent"]',
    acceptAll: '[data-testid="cookie-accept-all"]',
    rejectAll: '[data-testid="cookie-reject-all"]',
    customize: '[data-testid="cookie-customize"]',
    savePreferences: '[data-testid="cookie-save-preferences"]',
    showDetails: '[data-testid="cookie-show-details"]',
    floatingButton: '[data-testid="cookie-settings-button"]',
    categoryToggle: (category) => `[data-category="${category}"]`,
};

/**
 * Cookie name used to store consent preferences
 */
const CONSENT_COOKIE_NAME = 'hyva_cookie_consent';

/**
 * Helper to get all cookies from browser context
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<Array<import('@playwright/test').Cookie>>}
 */
async function getAllCookies(context) {
    return await context.cookies();
}

/**
 * Helper to find cookies by name pattern (supports wildcards)
 * @param {Array} cookies
 * @param {string} pattern - Pattern like '_ga' or '_ga_*'
 * @returns {Array}
 */
function findCookiesByPattern(cookies, pattern) {
    const regexPattern = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexPattern);
    return cookies.filter(c => regex.test(c.name));
}

/**
 * Wait for consent banner to be visible
 * @param {import('@playwright/test').Page} page
 */
async function waitForConsentBanner(page) {
    await page.waitForSelector(SELECTORS.alpineComponent, { state: 'visible', timeout: 10000 });
}

/**
 * Wait for page to be ready (banner loaded)
 * @param {import('@playwright/test').Page} page
 */
async function waitForPageReady(page) {
    await page.waitForTimeout(2000);
}

/**
 * Open cookie settings via custom event (works even when banner is closed)
 * @param {import('@playwright/test').Page} page
 */
async function openCookieSettings(page) {
    await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    });
    await page.waitForTimeout(500);
}

/**
 * Accept all cookies using Alpine component
 * @param {import('@playwright/test').Page} page
 */
async function acceptAll(page) {
    await page.evaluate(() => {
        const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
        component.acceptAll();
    });
    await page.waitForTimeout(500);
}

/**
 * Accept all cookies by clicking the button
 * @param {import('@playwright/test').Page} page
 */
async function clickAcceptAll(page) {
    await page.locator(SELECTORS.acceptAll).click();
    await page.waitForTimeout(1500);
}

/**
 * Reject all cookies using Alpine component
 * @param {import('@playwright/test').Page} page
 */
async function rejectAll(page) {
    await page.evaluate(() => {
        const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
        component.rejectAll();
    });
    await page.waitForTimeout(500);
}

/**
 * Reject all cookies by clicking the button
 * @param {import('@playwright/test').Page} page
 */
async function clickRejectAll(page) {
    await page.locator(SELECTORS.rejectAll).click();
    await page.waitForTimeout(1500);
}

/**
 * Toggle a category and save preferences
 * @param {import('@playwright/test').Page} page
 * @param {string} category - Category to toggle (e.g., 'analytics', 'marketing')
 */
async function toggleCategoryAndSave(page, category) {
    await page.evaluate((cat) => {
        const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
        component.toggleCategory(cat);
        component.savePreferences();
    }, category);
    await page.waitForTimeout(500);
}

/**
 * Set a category to a specific value and save
 * @param {import('@playwright/test').Page} page
 * @param {string} category
 * @param {boolean} enabled
 */
async function setCategoryAndSave(page, category, enabled) {
    await page.evaluate(({ cat, val }) => {
        const component = Alpine.$data(document.querySelector('[x-data="hyvaCookieConsent"]'));
        component.consent[cat] = val;
        component.savePreferences();
    }, { cat: category, val: enabled });
    await page.waitForTimeout(500);
}

/**
 * Parse the consent cookie value
 * @param {object} cookie - Cookie object from Playwright
 * @returns {object|null} Parsed consent data or null
 */
function parseConsentCookie(cookie) {
    if (!cookie) return null;
    try {
        let decoded = decodeURIComponent(cookie.value);
        // Check if still encoded (starts with %7B which is {)
        if (decoded.startsWith('%7B') || decoded.includes('%22')) {
            decoded = decodeURIComponent(decoded);
        }
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Failed to parse consent cookie:', e, cookie.value);
        return null;
    }
}

/**
 * Get the consent cookie from context
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<object|undefined>}
 */
async function getConsentCookie(context) {
    const cookies = await getAllCookies(context);
    return cookies.find(c => c.name === CONSENT_COOKIE_NAME);
}

/**
 * Get parsed consent data from context
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<object|null>}
 */
async function getConsentData(context) {
    const cookie = await getConsentCookie(context);
    return parseConsentCookie(cookie);
}

/**
 * Check if banner is visible
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
function getBanner(page) {
    return page.locator(SELECTORS.banner);
}

/**
 * Get dataLayer information
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{exists: boolean, events: Array}>}
 */
async function getDataLayer(page) {
    return await page.evaluate(() => {
        if (typeof window.dataLayer !== 'undefined') {
            return {
                exists: true,
                events: [...window.dataLayer]
            };
        }
        return { exists: false, events: [] };
    });
}

/**
 * Find a specific event in dataLayer
 * @param {import('@playwright/test').Page} page
 * @param {string} eventName - Event name to find
 * @returns {Promise<object|undefined>}
 */
async function findDataLayerEvent(page, eventName) {
    const dataLayer = await getDataLayer(page);
    if (!dataLayer.exists) return undefined;
    return dataLayer.events.find(e => e.event === eventName);
}

/**
 * Get cookie_consent_config from window
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>}
 */
async function getCookieConsentConfig(page) {
    return await page.evaluate(() => window.cookie_consent_config);
}

/**
 * Get cookie_consent_groups from window
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>}
 */
async function getCookieConsentGroups(page) {
    return await page.evaluate(() => window.cookie_consent_groups);
}

/**
 * Click the floating settings button
 * @param {import('@playwright/test').Page} page
 */
async function clickFloatingButton(page) {
    await page.locator(SELECTORS.floatingButton).click();
    await page.waitForTimeout(500);
}

module.exports = {
    SELECTORS,
    CONSENT_COOKIE_NAME,
    getAllCookies,
    findCookiesByPattern,
    waitForConsentBanner,
    waitForPageReady,
    openCookieSettings,
    acceptAll,
    clickAcceptAll,
    rejectAll,
    clickRejectAll,
    toggleCategoryAndSave,
    setCategoryAndSave,
    parseConsentCookie,
    getConsentCookie,
    getConsentData,
    getBanner,
    getDataLayer,
    findDataLayerEvent,
    getCookieConsentConfig,
    getCookieConsentGroups,
    clickFloatingButton,
};
