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

To verify the module is working:

1. Open the site in an incognito window
2. Check that no `_ga` or tracking cookies are set
3. Open browser DevTools → Console
4. Run: `window.dataLayer` - verify `consent: default` with `analytics_storage: denied`
5. Accept cookies and verify tracking activates

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

Proprietary - See LICENSE file
