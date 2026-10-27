# Pixelperfect Hyva Cookie Consent

GDPR/ePrivacy-compliant cookie consent management for Magento 2 with Hyva theme.

## Features

- **Actually blocks cookies** until explicit consent is given
- **Google Consent Mode v2** support - GTM/GA4 automatically respect consent
- **CSP Strict Mode** compatible - works with Content Security Policy
- **Full Page Cache** compatible - consent handled client-side
- **Category-based consent** - Necessary, Analytics, Marketing, Preferences
- **XML configuration** - Define categories, services, and cookies via XML
- **Built-in service templates** - GTM, GA4, Facebook Pixel, Microsoft Clarity, Hotjar, Matomo
- **Floating settings button** - Users can change preferences anytime
- **Multi-language** - EN, DE, FR, ES, IT translations included

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

### Admin Settings

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

The module implements Google Consent Mode v2:

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

**No GTM configuration changes required** - tags with Consent Mode enabled automatically wait for consent.

### Category to Consent Mode Mapping

| Category | Google Consent Mode |
|----------|---------------------|
| necessary | `security_storage: granted` |
| analytics | `analytics_storage` |
| marketing | `ad_storage`, `ad_user_data`, `ad_personalization` |
| preferences | `functionality_storage`, `personalization_storage` |

### GTM Loading Strategies

**Strict Mode (default):**
- GTM is blocked until analytics consent is given

**Infrastructure Mode:**
- GTM loads immediately
- Consent state is pushed to dataLayer
- GTM tags should use Consent Mode or consent-based triggers

## Extending the Module

### XML Configuration

Categories, services and cookies are configured via `cookie_consent.xml`. Files from all modules are merged by
`code` (categories, services, config fields) and `name` (cookies). Add the file to your module's `etc/` directory,
for example to list the cookies of a third-party script in an existing category:

```xml
<?xml version="1.0"?>
<cookie_consent xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:noNamespaceSchemaLocation="urn:magento:module:Pixelperfect_HyvaCookieConsent:etc/cookie_consent.xsd">
    <services>
        <service code="custom_tracking" category="analytics">
            <title>Custom Tracking</title>
            <description>Our custom analytics service</description>
            <cookies>
                <cookie name="_custom" duration="1 year">
                    <description>Custom tracking ID</description>
                </cookie>
                <cookie name="_custom_*" duration="1 day">
                    <description>Session state (wildcards are allowed)</description>
                </cookie>
            </cookies>
        </service>
    </services>
</cookie_consent>
```

The schema is `src/etc/cookie_consent.xsd`. `code`, `category`, cookie `name` and `duration` are attributes;
`required` and `sort_order` are attributes of `<category>`.

What a service entry does:
- Its cookies appear in the banner's cookie table, and `hyva.setCookie()` holds them back until the service's
  category is accepted.
- When consent for the category is revoked, first-party cookies matching the names are deleted.
- A service without `<template>` is informational and always listed. With `<template>`, it's listed only while
  `hyva_cookie_consent/services/<code>/enabled` is set (or `<enabled_by_default>` is true). The module does not
  render the template itself; load your script from your own block.

## JavaScript Events

```javascript
// When consent is updated
window.addEventListener('cookie-consent-updated', (event) => {
    console.log('Consent changed:', event.detail);
});

// Open the cookie settings modal programmatically
window.dispatchEvent(new CustomEvent('open-cookie-settings'));
```

## Testing

### Manual Testing

1. Open the site in an incognito window
2. Check that no `_ga` or tracking cookies are set
3. Open browser DevTools → Console
4. Run: `window.dataLayer` - verify `consent_default` event
5. Accept cookies and verify `consent_update` event fires
6. Verify tracking cookies are now set

### Automated Testing (Playwright)

```bash
cd Test/Playwright
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env to set your PLAYWRIGHT_BASE_URL
npm test
```

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
