# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-10-28

### Fixed
- Magento's own consent cookie `user_allowed_save_cookie` was never set, so modules that read it, such as tracking extensions, never saw consent, even after Accept All ([#4](https://github.com/pixelperfectat/module-hyva-cookie-consent/issues/4)). It is now set in Magento's format when every optional category is granted and removed after Reject All, a partial choice or a withdrawal. Visitors who accepted everything earlier get it on their next page view.

### Changed
- After Accept All, Magento's own Google tags (GA4 and Google Ads from the Google API settings) now run, because they read `user_allowed_save_cookie`. Configure GA4 either there or in this module's Google Analytics 4 service, not both. Gating them by category is planned ([#9](https://github.com/pixelperfectat/module-hyva-cookie-consent/issues/9)).

## [0.4.0] - 2026-10-28

### Added
- Composer metadata (keywords, authors, homepage, support links) and the Magento modules the code uses: Store, Config, Backend and Theme.
- Infection mutation testing, run by `composer check`.
- Unit tests for the XML configuration pipeline, the category and service pools, the ViewModel, the observers and the cookie restriction plugin, plus template checks for the strict-CSP rules.
- `window.hyvaCookieConsentLoaders`: other modules can register consent-gated scripts that work under a strict CSP (see the README).
- A Playwright spec that records CSP violations after consent.

### Changed
- The "Reject All" button has the same style as "Accept All" (`btn btn-primary`) instead of the weaker secondary style, so neither choice is visually favoured.
- `hyva-themes/magento2-theme-module` must be 1.3.11 or later. The consent config, floating button and service templates use the `HyvaCsp` view model, which first ships in 1.3.11, so older Hyvä versions failed on page render.
- PHP 8.2 and 8.5 are supported: the constraint is now `~8.2.0 || ~8.3.0 || ~8.4.0 || ~8.5.0`.
- `magento/module-cookie` and `magento/module-csp` have version bounds instead of `*`.
- Development tooling uses `pixelperfectat/coding-standard` 0.2, with CI through the shared `pixelperfectat/ci-templates` workflow and Renovate.
- The composer dist archive no longer contains the tests, the CI workflow and the dev configuration files.
- The README documents every setting, the supported versions, uninstalling and the known limitations.

### Fixed
- Installing the module changed the shop even while "Enable Cookie Consent" was off: it forced Magento's cookie restriction mode on and removed the native cookie notice and Google Analytics blocks, so a disabled module left Hyvä blocking cookies with no banner. All three now apply only while the module is enabled. Restriction mode comes from a plugin on `Magento\Cookie\Helper\Cookie` instead of a `config.xml` default, and the block removals live in the `hyva_cookie_consent_enabled` layout handle.
- Google Tag Manager (strict mode), Google Analytics 4, Facebook Pixel, Microsoft Clarity, Hotjar and Matomo were blocked by a strict Content Security Policy after consent. Their code now registers with `HyvaCsp` and runs from a consent-gated loader (`window.hyvaCookieConsentLoaders`) instead of being cloned out of a `<template>`.
- The banner headline and description stayed English on non-English store views: the English defaults in `config.xml` always counted as configured text, so the translated fallback never ran. Configured text now goes through translation, so the shipped default is localised and custom text is shown unchanged.
- The `cookie_consent.xml` example in the README didn't validate against the schema.
- Playwright specs expected GTM in the marketing category (it is in analytics) and contained assertions that could never fail.

## [0.3.0] - 2026-01-13

### Changed
- The banner and config templates use computed properties instead of inline expressions, so the banner works with Alpine's CSP build.

## [0.2.0] - 2026-01-05

### Added
- XML configuration system (`cookie_consent.xml`) for defining categories, services, and cookies
- XSD schema for validation of XML configuration files
- Config reader, converter, schema locator, and data classes for XML processing
- Comprehensive built-in service templates (GTM, GA4, Facebook Pixel, Microsoft Clarity, Hotjar, Matomo)
- Service `managed_by` attribute to indicate services managed through other services (e.g., GA4 via GTM)
- Cookie details expandable section in consent banner showing all cookies per service

### Changed
- Refactored from PHP-based service configuration to XML-based configuration
- Updated consent banner UI with improved scrolling behavior for modal and bar styles
- Cookie details now displayed in proper table format with headers
- Improved translation coverage across all 5 languages (DE, EN, FR, ES, IT)
- PHPStan level 6 compliance: replaced `BP` constant with `DirectoryList` injection

### Fixed
- Banner scrolling issues when content exceeds viewport height
- Cookie details table alignment and formatting
- Missing translations for cookie descriptions and durations

## [0.1.0] - 2026-01-03

### Added
- Initial release with GDPR/ePrivacy-compliant cookie consent management
- Google Consent Mode v2 support
- CSP Strict Mode compatibility
- Full Page Cache compatibility
- Category-based consent (Necessary, Analytics, Marketing, Preferences)
- Floating settings button for preference management
- Multi-language support (EN, DE, FR, ES, IT)
- Modal and bar banner styles
- Admin configuration for banner customization

[Unreleased]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.4.1...HEAD
[0.4.1]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.4.0...0.4.1
[0.4.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/releases/tag/0.1.0
