# Pixelperfect Hyvä Cookie Consent

[![CI](https://github.com/pixelperfectat/module-hyva-cookie-consent/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pixelperfectat/module-hyva-cookie-consent/actions/workflows/ci.yml)
[![Packagist version](https://img.shields.io/packagist/v/pixelperfectat/module-hyva-cookie-consent)](https://packagist.org/packages/pixelperfectat/module-hyva-cookie-consent)
[![PHP](https://img.shields.io/packagist/dependency-v/pixelperfectat/module-hyva-cookie-consent/php)](composer.json)
[![License: MIT](https://img.shields.io/packagist/l/pixelperfectat/module-hyva-cookie-consent)](LICENSE)

GDPR/ePrivacy cookie consent banner for Magento 2 shops on the Hyvä theme, with Google Consent Mode v2 and
consent-gated tracking integrations.

## Features

- **Opt-in by default**: optional categories start unchecked, and the bundled tracking services only load after
  the visitor consents to their category (except GTM in infrastructure mode, see below). With the module enabled, Magento's cookie restriction mode is on, so
  `hyva.setCookie()` holds back cookies of categories that have no consent yet.
- **Reject as easy as accept**: "Reject All" and "Accept All" sit side by side on the first layer, in the same style.
- **Google Consent Mode v2**: a `default` command (everything denied until consent) and an `update` command on every
  choice.
- **Hyvä strict CSP**: the banner and the bundled service integrations work without `unsafe-inline` and
  `unsafe-eval` (see [Content Security Policy](#content-security-policy)).
- **Full Page Cache compatible**: the consent state is handled in the browser.
- **Categories**: Necessary, Analytics, Marketing, Preferences.
- **XML configuration**: services and their cookies are defined in `cookie_consent.xml`, and other modules can add
  their own.
- **Bundled integrations**: Google Tag Manager, Google Analytics 4, Facebook Pixel, Microsoft Clarity, Hotjar, Matomo.
- **Floating settings button**: visitors can change or withdraw consent at any time.
- **Translations**: en_US, de_DE, fr_FR, es_ES, it_IT.

## Requirements

| | Version |
|---|---|
| Magento Open Source / Adobe Commerce | 2.4.6 – 2.4.8 (`magento/framework` 103) |
| PHP | 8.2, 8.3, 8.4 or 8.5 (as far as your Magento version supports it) |
| Hyvä theme module (`hyva-themes/magento2-theme-module`) | 1.3.11 or later (1.3.11 introduced the `HyvaCsp` view model the templates use) |

## Installation

```bash
composer require pixelperfectat/module-hyva-cookie-consent
bin/magento setup:upgrade
bin/magento cache:flush
```

The module is installed **disabled**. Until you switch it on, it changes nothing in the shop: Magento's cookie
restriction mode, its cookie notice and its Google Analytics block stay exactly as you configured them.

Switch it on under **Stores → Configuration → General → Web → Cookie Consent (Hyva) → General Settings →
Enable Cookie Consent**, then flush the cache. The module registers itself in Hyvä's Tailwind config, so run
`bin/magento hyva:config:generate` and rebuild your theme's CSS (`npm run build` in its `web/tailwind` directory) to
include the banner's classes.

## Configuration

### General, UI and text settings

**Stores → Configuration → General → Web → Cookie Consent (Hyva)**. All settings work per store view.

| Setting | Config path | Default | Description |
|---|---|---|---|
| Enable Cookie Consent | `web/hyva_cookie_consent/general/enabled` | No | Shows the banner and the floating button, turns cookie restriction mode on and removes Magento's own cookie notice and Google Analytics block. |
| Consent Cookie Lifetime (days) | `web/hyva_cookie_consent/general/cookie_lifetime` | 365 | How long the `hyva_cookie_consent` cookie keeps the visitor's choice. Empty or 0 means 365. |
| Consent Version | `web/hyva_cookie_consent/general/consent_version` | 1 | Increase it after a policy change: visitors whose saved choice has another version see the banner again. |
| Banner Style | `web/hyva_cookie_consent/ui/banner_style` | Modal | Modal (centred overlay) or Bar (fixed at the bottom). |
| Floating Button Position | `web/hyva_cookie_consent/ui/floating_button_position` | Bottom Left | Bottom Left or Bottom Right. |
| Banner Headline | `web/hyva_cookie_consent/text/banner_headline` | "Cookie Settings" | Banner title. The shipped default is translated to the store's locale; your own text is shown as entered. |
| Banner Description | `web/hyva_cookie_consent/text/banner_description` | "We use cookies to enhance…" | Banner text, followed by the privacy policy link. Translated like the headline. |
| Privacy Policy URL | `web/hyva_cookie_consent/text/privacy_policy_url` | `/privacy-policy` | Relative or absolute URL. |

While the module is enabled, cookie restriction mode is always on for that store view, whatever **Web → Default Cookie
Settings → Cookie Restriction Mode** says; Hyvä needs it to hold cookies back. With the module disabled, that setting
applies as usual.

### Tracking services

**Stores → Configuration → General → Cookie Consent Services → Tracking Services**. A service renders only when it is
enabled and its ID is filled in.

| Service | Fields (`hyva_cookie_consent/services/<service>/…`) | Category |
|---|---|---|
| Google Tag Manager (`google_tag_manager`) | Enable, Container ID, Loading Strategy (Strict / Infrastructure, default Strict) | analytics |
| Google Analytics 4 (`google_analytics_4`) | Enable, Loading Method, Measurement ID | analytics |
| Facebook Pixel (`facebook_pixel`) | Enable, Loading Method, Pixel ID | marketing |
| Microsoft Clarity (`microsoft_clarity`) | Enable, Loading Method, Project ID | analytics |
| Hotjar (`hotjar`) | Enable, Loading Method, Site ID | analytics |
| Matomo (`matomo`) | Enable, Loading Method, Tracker URL, Site ID | analytics |

The **Loading Method** field has no effect on the storefront yet: an enabled service with an ID always loads
directly, even with "Via Google Tag Manager" selected (see [Known limitations](#known-limitations)). To run a service
only through GTM, disable it here.

## How it works

### Consent flow

1. `cookie-config.phtml` sets the Consent Mode default, publishes the cookie lists per category to Hyvä
   (`window.cookie_consent_config`, `window.cookie_consent_groups`) and registers the `hyvaCookieConsent` Alpine
   component.
2. Without a saved choice for the current consent version, the banner opens. Nothing optional runs.
3. On Accept All, Reject All or Save Preferences, the choice is stored in the `hyva_cookie_consent` cookie
   (`{version, categories, timestamp}`), Hyvä's consent groups are updated, a Consent Mode `update` is pushed, and the
   loaders of the consented categories run. On later page views this happens straight away from the saved cookie.
4. When a category is withdrawn, first-party cookies matching that category's cookie names (wildcards such as `_ga_*`
   included) are deleted.
5. Magento's own consent cookie `user_allowed_save_cookie` (`{"<websiteId>":1}`), which other modules and Magento's
   cookie restriction mode read, is kept in step: it is set only while every optional category is granted, and
   removed after Reject All, a partial choice or a withdrawal. It is all-or-nothing and its readers know nothing about
   categories, so it never says yes to more than the visitor allowed. Visitors who accepted everything before this
   behaviour existed get it on their next page view.

### Google Consent Mode v2

```javascript
// Pushed before the bundled GTM/GA4 code, from the saved choice (denied without one)
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  // ...
});

// Pushed on every choice
gtag('consent', 'update', {
  'analytics_storage': 'granted',
  // ...
});
```

| Category | Google Consent Mode |
|----------|---------------------|
| necessary | `security_storage: granted` (always) |
| analytics | `analytics_storage` |
| marketing | `ad_storage`, `ad_user_data`, `ad_personalization` |
| preferences | `functionality_storage`, `personalization_storage` |

Tags in GTM that have Consent Mode enabled respect these signals without further configuration.

### GTM loading strategies

**Strict (default):** GTM loads only after the visitor consents to its category (analytics). It then pushes a
`consent_granted` event with `consent_analytics: true` and the current marketing and preferences choices. Marketing
tags inside the container must use Consent Mode or consent-based triggers, because analytics consent alone loads the
container.

**Infrastructure:** GTM loads on every page, before any choice. The module pushes a `consent_default` event with the
saved choice, and a `consent_update` event with `consent_<category>` flags after every choice. Every tag in the
container must then use Consent Mode or these events as triggers; this is the merchant's responsibility.

### Content Security Policy

Every inline script in the module's templates is registered with Hyvä's `$hyvaCsp->registerInlineScript()`, which
adds a nonce, or a hash in the CSP header on full-page-cached pages. The service integrations don't inject inline code
later: each service template registers a loader function that runs once consent is given (see
[Loading your own script](#loading-your-own-script)).

`etc/csp_whitelist.xml` allows the hosts of Google Tag Manager/Analytics, Facebook, Clarity and Hotjar. **Matomo is
self-hosted, so add your tracker host** to `script-src`, `connect-src` and `img-src` in your own module's
`csp_whitelist.xml`. Custom HTML tags in a GTM container that run inline code need their own CSP setup (for example
`strict-dynamic`); that is outside this module.

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

Use the four existing categories. A new `<category>` shows up in the banner, but its toggle gets no "active" styling
and Consent Mode knows nothing about it (see [Known limitations](#known-limitations)).

### Loading your own script

Load a consent-gated script from your own template and register a loader for its category. The module runs it
once the visitor consents to that category (on the click, or on page load when consent was given earlier):

```php
<?php
/** @var \Magento\Framework\Escaper $escaper */
/** @var \Hyva\Theme\ViewModel\HyvaCsp $hyvaCsp */
$trackingId = 'ABC-123'; // e.g. from your own config
?>
<script>
    (window.hyvaCookieConsentLoaders = window.hyvaCookieConsentLoaders || []).push({
        category: 'analytics',
        load() {
            // Your tracking code here
            initCustomTracking('<?= $escaper->escapeJs($trackingId) ?>');
        }
    });
</script>
<?php $hyvaCsp->registerInlineScript() ?>
```

Render the block anywhere in the page body (for example in `before.body.end`); the loader must be on the page when it
loads, because the module checks the loaders when Alpine starts and after every choice. Each loader runs at most once
per page. The script itself is an ordinary inline script, so `registerInlineScript()` authorises it under a strict CSP.
Scripts it loads from other hosts still need `csp_whitelist.xml` entries.

The older pattern still works without a strict CSP: wrap a `<script>` in
`<template data-consent-category="analytics">` and the module clones it into the page on consent. Under a
strict CSP the browser blocks such a script, because it never went through `registerInlineScript()`.

## JavaScript Events

```javascript
// When consent is updated
window.addEventListener('cookie-consent-updated', (event) => {
    console.log('Consent changed:', event.detail);
});

// Open the cookie settings modal programmatically
window.dispatchEvent(new CustomEvent('open-cookie-settings'));
```

## Known limitations

- **No server-side consent record.** The choice lives only in the visitor's `hyva_cookie_consent` cookie (with a
  timestamp). If you need proof of consent under Art. 7(1) GDPR, you need a separate consent log.
- **Withdrawing consent doesn't stop scripts that already run.** Matching first-party cookies are deleted, but
  Clarity, Hotjar, Facebook Pixel or Matomo keep running until the next page load and may set their cookies again.
- **Loading Method is ignored.** "Via Google Tag Manager" doesn't stop the module from loading a service directly; only
  disabling the service does.
- **Only the four built-in categories work fully.** A custom category's toggle has no active styling, and the Consent
  Mode mapping covers only analytics, marketing and preferences.
- **The `<template>` element of a service in `cookie_consent.xml` is not rendered.** It only marks the service as
  blockable.
- **Hyvä's own consent lists are replaced, not merged.** The module assigns `window.cookie_consent_config` and
  `window.cookie_consent_groups`, so entries Hyvä or other modules put there before (for example `last_visited_store`)
  are lost. Cookies that are in no category fall back to Magento's `user_allowed_save_cookie`, which this module sets
  only when every optional category is granted, so `hyva.setCookie()` holds them back after a partial choice.
- **GTM infrastructure mode ignores the consent version.** Its `consent_default` event reports the saved choice even
  when the consent version has changed (the Consent Mode default does check the version).
- **The Consent Mode default is set at the end of the body**, ahead of the bundled GTM/GA4 code but after anything
  another module or theme puts in `<head>`.
- **The cookie table lists the consent cookie as "1 year"**, whatever Consent Cookie Lifetime says.
- **No REST or GraphQL API**: headless storefronts are not supported.
- **Upgrading from 0.3.0 or earlier:** those versions set Cookie Restriction Mode to Yes as a module default. If you
  saved the Web configuration page meanwhile, Magento stored that Yes; set it back yourself if you don't want it once the
  module is disabled.

## Uninstall

```bash
bin/magento module:disable Pixelperfect_HyvaCookieConsent
composer remove pixelperfectat/module-hyva-cookie-consent
bin/magento setup:upgrade
bin/magento cache:flush
```

(`bin/magento module:uninstall Pixelperfect_HyvaCookieConsent` does the same for a composer install.) The module has no
database tables. Its settings stay in `core_config_data` under `web/hyva_cookie_consent/*` and
`hyva_cookie_consent/*`; delete those rows if you want them gone. Rebuild the Hyvä theme CSS afterwards.

## Development

### Checks

```bash
composer install
composer check   # validate, lint, phpcs, phpstan, phpunit, infection
```

The dev tools need PHP 8.3 or later. Hyvä's theme module and two of its dependencies come from public GitHub
repositories declared in `composer.json`; if anonymous GitHub API limits get in the way, run
`composer config -g use-github-api false` first.

### Manual testing

1. Open the site in a private window and check that no `_ga`, `_fbp`, `_clck`, `_hjid` or `_pk_*` cookies exist.
2. In DevTools → Console, `window.dataLayer` contains a `['consent', 'default', {...}]` entry with everything denied
   (and, in GTM infrastructure mode, a `consent_default` event).
3. Accept the cookies: a `['consent', 'update', {...}]` entry follows (plus `consent_update` in infrastructure mode),
   the enabled services load, and their cookies appear.
4. On a store with Hyvä's strict CSP, the Console shows no "Refused to execute inline script" errors.

### Automated testing (Playwright)

The Playwright suite in `Test/Playwright` needs a running Magento + Hyvä store with the module enabled. It is not
part of CI.

```bash
cd Test/Playwright
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env: PLAYWRIGHT_BASE_URL, and the TEST_* service IDs for the services you want to test
npm test
```

## Troubleshooting

**GA cookies still being set?**
- Check whether another module or the theme loads GA
- Verify GTM tags have Consent Mode enabled
- Clear all caches and test in a private window

**Banner not showing?**
- Check that the module is enabled for the store view
- Clear the layout and full page caches: `bin/magento cache:clean layout full_page`

**Scripts not activating after consent?**
- Check that the loader's `category` (or `data-consent-category`) matches a category code
- Check the browser console for JavaScript or CSP errors

## License

MIT License - see [LICENSE](LICENSE) file for details.
