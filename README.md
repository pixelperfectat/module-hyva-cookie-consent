# Pixelperfect Hyva Cookie Consent

GDPR/ePrivacy-compliant cookie consent management for Magento 2 with Hyva theme.

## Features

- **Actually blocks cookies** until explicit consent is given
- **Google Consent Mode v2** support - GTM/GA4 automatically respect consent
- **CSP Strict Mode** compatible - works with Content Security Policy
- **Full Page Cache** compatible - consent handled client-side
- **Category-based consent** - Necessary, Analytics, Marketing, Preferences
- **Built-in service templates** - GTM, GA4, Facebook Pixel, Microsoft Clarity, Hotjar, Matomo
- **Floating settings button** - Users can change preferences anytime
- **Multi-language** - EN, DE, FR, ES, IT translations included
- **Extensible** - Add custom categories and services via `di.xml`

## Requirements

- Magento 2.4.x
- PHP 8.3+
- Hyva Theme

## Installation

```bash
composer require pixelperfectat/module-hyva-cookie-consent
bin/magento setup:upgrade
bin/magento cache:flush
```

## Configuration

### General Settings

Navigate to **Stores → Configuration → Web → Cookie Consent (Hyva)**

| Setting | Description |
|---------|-------------|
| Enable Cookie Consent | Enable/disable the module |
| Consent Cookie Lifetime | Days to remember consent (default: 365) |
| Consent Version | Increment to force re-consent after policy changes |
| Banner Style | Modal (center overlay) or Bar (bottom fixed) |
| Floating Button Position | Left or Right |
| Banner Headline/Description | Customizable text |
| Privacy Policy URL | Link to your privacy policy |

### Service Configuration

Navigate to **Stores → Configuration → Cookie Consent Services**

Each service can be individually enabled with its own configuration:

- **Google Tag Manager** - Container ID, Loading Strategy (Strict/Infrastructure)
- **Google Analytics 4** - Measurement ID
- **Facebook Pixel** - Pixel ID
- **Microsoft Clarity** - Project ID
- **Hotjar** - Site ID
- **Matomo** - Tracker URL, Site ID

### Service Loading Methods

Each service supports a **Loading Method** configuration:

| Method | Description | Use Case |
|--------|-------------|----------|
| **Direct** | Module loads the service script directly | Default. Use when the module manages the service. |
| **Via GTM** | GTM loads the service; module only provides consent events | Use when GTM manages the service configuration. |

**When to use "Via GTM":**

If you configure Google Analytics, Facebook Pixel, or other services within GTM (rather than using this module's direct integration), set their Loading Method to "Via GTM". This:

- Prevents duplicate script loading
- Ensures consent events are still pushed to dataLayer
- Allows GTM tags to use Consent Mode triggers

Example: If GA4 is configured as a GTM tag, set GA4's Loading Method to "Via GTM" in this module. The module will push `consent_update` events to dataLayer, and your GTM GA4 tag will respect them via Consent Mode.

## How It Works

### Google Consent Mode v2

The module implements Google Consent Mode v2, which is the standard that GTM and GA4 automatically respect:

```javascript
// Set BEFORE GTM loads
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  // ...
});

// When user grants consent
gtag('consent', 'update', {
  'analytics_storage': 'granted',
  // ...
});
```

This means **no GTM configuration changes are required** - tags with Consent Mode enabled will automatically wait for consent.

### Category to Consent Mode Mapping

| Category | Google Consent Mode |
|----------|---------------------|
| necessary | `security_storage: granted` |
| analytics | `analytics_storage` |
| marketing | `ad_storage`, `ad_user_data`, `ad_personalization` |
| preferences | `functionality_storage`, `personalization_storage` |

### Script Blocking Patterns

The module supports two patterns for blocking scripts until consent:

**1. External scripts with `data-consent-*` attributes:**
```html
<script type="text/plain"
        data-consent-category="analytics"
        data-consent-src="https://example.com/script.js">
</script>
```

**2. Inline scripts in `<template>` tags:**
```html
<template data-consent-category="marketing">
  <script>
    // This script only runs after marketing consent
  </script>
</template>
```

### GTM Loading Strategies

**Strict Mode (default):**
- GTM is blocked until analytics consent is given
- Use when you want complete control

**Infrastructure Mode:**
- GTM loads immediately
- Consent state is pushed to dataLayer
- GTM tags should use Consent Mode or consent-based triggers
- Recommended when GTM manages its own consent logic

### DataLayer Events for GTM

When using GTM (especially in Infrastructure Mode), the module pushes consent events to the dataLayer:

| Event | When Fired | Description |
|-------|------------|-------------|
| `consent_default` | Page load | Initial consent state before user interaction |
| `consent_update` | User accepts/rejects/saves | Updated consent state after user action |

**Event Payload:**

```javascript
{
    event: 'consent_default', // or 'consent_update'
    consent_necessary: true,   // Always true
    consent_analytics: false,  // User's choice
    consent_marketing: false,  // User's choice
    consent_preferences: false // User's choice
}
```

**Using in GTM:**

1. Create a **Custom Event Trigger** for `consent_update`
2. Create **Data Layer Variables** for each `consent_*` field
3. Use these in tag firing conditions or Consent Mode settings

Example GTM trigger configuration:
- Trigger Type: Custom Event
- Event Name: `consent_update`
- Fire on: `consent_analytics equals true`

### Magento Cookie Restriction Mode

This module integrates with Magento's native cookie restriction mode:

- **Enables** `web/cookie/cookie_restriction` setting automatically
- **Removes** Magento's default cookie notice block (we provide our own banner)
- **Integrates** with Hyva's `cookie_restriction_enabled` JavaScript check

This ensures that Hyva's `hyva.setCookie()` function respects consent - cookies are only set after the user grants permission for the relevant category.

## Extending the Module

### Adding Custom Categories

Add categories via `di.xml` in your module:

```xml
<type name="Pixelperfect\HyvaCookieConsent\Model\CategoryPool">
    <arguments>
        <argument name="categories" xsi:type="array">
            <item name="social" xsi:type="array">
                <item name="code" xsi:type="string">social</item>
                <item name="title" xsi:type="string">Social Media</item>
                <item name="description" xsi:type="string">Enable social media integrations</item>
                <item name="required" xsi:type="boolean">false</item>
                <item name="sort_order" xsi:type="number">50</item>
            </item>
        </argument>
    </arguments>
</type>
```

### Adding Custom Services

Add services via `di.xml`:

```xml
<type name="Pixelperfect\HyvaCookieConsent\Model\ServicePool">
    <arguments>
        <argument name="services" xsi:type="array">
            <item name="custom_tracking" xsi:type="array">
                <item name="code" xsi:type="string">custom_tracking</item>
                <item name="title" xsi:type="string">Custom Tracking</item>
                <item name="description" xsi:type="string">Our custom analytics</item>
                <item name="category" xsi:type="string">analytics</item>
                <item name="template" xsi:type="string">Vendor_Module::services/custom.phtml</item>
                <item name="enabled_by_default" xsi:type="boolean">false</item>
                <item name="cookies" xsi:type="array">
                    <item name="_custom" xsi:type="array">
                        <item name="name" xsi:type="string">_custom</item>
                        <item name="duration" xsi:type="string">1 year</item>
                        <item name="description" xsi:type="string">Custom tracking ID</item>
                    </item>
                </item>
            </item>
        </argument>
    </arguments>
</type>
```

### Service Template Example

Create a template that respects consent blocking:

```php
<?php
// Vendor/Module/view/frontend/templates/services/custom.phtml

$service = $block->getData('service');
$trackingId = $service->getConfigValue('tracking_id');

if (empty($trackingId)) {
    return;
}

$category = $service->getCategory();
?>

<template data-consent-category="<?= $escaper->escapeHtmlAttr($category) ?>">
    <script>
        // Your tracking code here
        initCustomTracking('<?= $escaper->escapeJs($trackingId) ?>');
    </script>
</template>
```

## JavaScript Events

The module dispatches events you can listen to:

```javascript
// When consent is updated
window.addEventListener('cookie-consent-updated', (event) => {
    console.log('Consent changed:', event.detail);
    // { necessary: true, analytics: true, marketing: false, preferences: false }
});

// Open the cookie settings modal programmatically
window.dispatchEvent(new CustomEvent('open-cookie-settings'));
```

## Hyva Integration

The module integrates with Hyva's built-in cookie consent infrastructure:

```javascript
// Access consent state
window.cookie_consent_groups.analytics // true/false

// Check in Alpine.js components
x-show="window.cookie_consent_groups.marketing"
```

## CSP Whitelist

The module includes CSP whitelist entries for supported services. For custom services, add entries to your module's `etc/csp_whitelist.xml`:

```xml
<csp_whitelist>
    <policies>
        <policy id="script-src">
            <values>
                <value id="custom" type="host">cdn.custom-service.com</value>
            </values>
        </policy>
    </policies>
</csp_whitelist>
```

## Disabling Magento's Native Google Analytics

This module automatically removes Magento's native `Magento_GoogleAnalytics` block to prevent it from setting cookies before consent. If you're using GTM for analytics, this is the recommended approach.

## Testing

### Manual Testing

To verify the module is working:

1. Open the site in an incognito window
2. Check that no `_ga` or tracking cookies are set
3. Open browser DevTools → Console
4. Run: `window.dataLayer` - verify `consent_default` event with `consent_analytics: false`
5. Accept cookies and verify `consent_update` event fires with `consent_analytics: true`
6. Verify tracking cookies are now set

### Automated Testing (Playwright)

The module includes comprehensive Playwright E2E tests:

```bash
cd Test/Playwright
npm install
npx playwright install chromium

# Copy and configure environment
cp .env.example .env
# Edit .env to set your PLAYWRIGHT_BASE_URL

# Run tests
npm test

# Run tests with browser visible
npm run test:headed

# Debug mode
npm run test:debug
```

#### Configuring Service Tests

The test suite supports testing all 6 built-in services. Tests are **skipped automatically** if the service ID is not configured, allowing module users to test only the services they use.

**Step 1: Configure `.env` file:**

```bash
cd Test/Playwright
cp .env.example .env
```

Edit `.env` with your test service IDs:

```bash
# Required - your Magento store URL
PLAYWRIGHT_BASE_URL=https://your-store.test

# Optional service IDs (tests skip if not set)
TEST_GTM_CONTAINER_ID=GTM-XXXXXX
TEST_GTM_MODE=infrastructure    # or "strict"
TEST_GA4_MEASUREMENT_ID=G-XXXXXXX
TEST_FB_PIXEL_ID=1234567890
TEST_HOTJAR_SITE_ID=1234567
TEST_CLARITY_PROJECT_ID=xxxxxxxxxx
TEST_MATOMO_URL=https://matomo.example.com
TEST_MATOMO_SITE_ID=1
```

**Step 2: Configure Magento services:**

Use the portable configuration script:

```bash
# Configure services in infrastructure mode
./scripts/configure-services.sh infrastructure

# Or configure for strict mode testing
./scripts/configure-services.sh strict
```

The script automatically detects your Magento CLI:
- Standard Magento: `bin/magento`
- Mark Shust's Docker: `bin/cli bin/magento`
- n98-magerun2 (if installed)

**Step 3: Run tests:**

```bash
npm test
```

#### GTM Mode Testing

GTM has two loading strategies that require different test configurations:

| Mode | Script Loading | Tests File |
|------|---------------|------------|
| **Infrastructure** | GTM loads immediately; consent pushed to dataLayer | `gtm-infrastructure.spec.js` |
| **Strict** | GTM blocked until marketing consent | `gtm-strict.spec.js` |

Set `TEST_GTM_MODE` in your `.env` to match your Magento configuration. Only the matching test file will run.

To test both modes:

```bash
# Test infrastructure mode
./scripts/configure-services.sh infrastructure
npm test

# Then test strict mode
./scripts/configure-services.sh strict
npm test
```

#### Test Coverage

**Cookie Consent Banner** (`cookie-consent.spec.js`):
- Banner appears for new visitors
- Cookies blocked before consent
- Accept All grants consent and sets cookies
- Reject All denies consent and blocks tracking

**GTM Infrastructure Mode** (`gtm-infrastructure.spec.js`):
- GTM script loads immediately without consent
- `consent_default` event fires with denied state on page load
- `consent_update` event fires after user accepts/rejects
- Consent persists on page reload

**GTM Strict Mode** (`gtm-strict.spec.js`):
- GTM blocked in template before marketing consent
- GTM loads after marketing consent granted
- Analytics consent alone does NOT load GTM

**Service Templates** (`service-templates.spec.js`):
- GA4: Template structure, gtag blocked/activated
- Facebook Pixel: Marketing category, fbq blocked/activated
- Hotjar: Analytics category, hj blocked/activated
- Microsoft Clarity: Analytics category, clarity blocked/activated
- Matomo: Analytics category, _paq blocked/activated

**Cookie Deletion** (`cookie-deletion.spec.js`):
- GA cookies deleted when analytics consent is revoked
- Marketing cookies deleted when marketing consent is revoked
- Wildcard pattern matching (`_ga_*` matches `_ga_ABC123`)
- Consent cookie value updates correctly

#### Shared Test Helpers

The module provides reusable test helpers in `Test/Playwright/tests/helpers/cookie-consent.helpers.js`:

```javascript
const {
    SELECTORS,           // All UI element selectors
    waitForConsentBanner,
    acceptAll,
    rejectAll,
    clickAcceptAll,
    clickRejectAll,
    openCookieSettings,
    setCategoryAndSave,
    getConsentData,
    findDataLayerEvent,
    // ... and more
} = require('./helpers/cookie-consent.helpers');
```

### Data Attributes for Testing

All interactive elements have stable `data-testid` attributes for reliable test automation:

| Element | Selector |
|---------|----------|
| Accept All button | `[data-testid="cookie-accept-all"]` |
| Reject All button | `[data-testid="cookie-reject-all"]` |
| Customize button | `[data-testid="cookie-customize"]` |
| Save Preferences button | `[data-testid="cookie-save-preferences"]` |
| Show/Hide Details button | `[data-testid="cookie-show-details"]` |
| Floating settings button | `[data-testid="cookie-settings-button"]` |
| Category toggle | `[data-category="analytics"]` (by category code) |
| Banner container | `#cookie-consent-banner` |

These selectors are language-agnostic and won't break when translations change.

## Cookie Deletion on Consent Revocation

When a user revokes consent for a category (e.g., disables Analytics after previously accepting), the module automatically deletes all known first-party cookies belonging to that category.

### How It Works

1. Cookie patterns are defined in `di.xml` for each service (e.g., `_ga`, `_ga_*`, `_fbp`)
2. When consent is revoked, JavaScript matches these patterns against actual browser cookies
3. Matching cookies are deleted by setting their expiration to the past

### Supported Patterns

- **Exact match**: `_ga` - matches only `_ga`
- **Wildcard suffix**: `_ga_*` - matches `_ga_ABC123`, `_ga_XYZ`, etc.
- **Wildcard anywhere**: `_pk_id.*` - matches `_pk_id.1.abc`, `_pk_id.2.xyz`

### Limitations

**Cannot delete:**
- **HttpOnly cookies** - Cookies set with the HttpOnly flag by the server cannot be accessed or deleted via JavaScript. Some analytics services set HttpOnly cookies which will persist until they expire or are cleared manually.
- **Third-party cookies** - Cookies set by external domains (e.g., `doubleclick.net`) cannot be deleted as JavaScript can only access cookies on the same domain.
- **Secure cookies on HTTP** - If running on HTTP (not recommended), cookies set with the Secure flag cannot be deleted.

**Recommended additional measures:**
- Use Google Consent Mode v2 (built-in) - GA4 respects consent updates and stops tracking
- Configure services to use first-party cookies where possible
- Inform users about browser cookie clearing for complete removal

## Troubleshooting

**GA cookies still being set?**
- Check if another module/theme is loading GA
- Verify GTM tags have Consent Mode enabled
- Clear all caches and test in incognito

**Banner not showing?**
- Check if module is enabled in admin
- Clear layout cache: `bin/magento cache:clean layout`

**Scripts not activating after consent?**
- Verify `data-consent-category` matches a valid category code
- Check browser console for JavaScript errors

## License

MIT License - see [LICENSE](LICENSE) file for details.
