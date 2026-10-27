# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Composer metadata (keywords, authors, homepage, support links) and the Magento modules the code uses: Store, Config, Backend and Theme.
- Infection mutation testing, run by `composer check`.

### Changed
- PHP 8.2 is supported again: the constraint is now `~8.2.0 || ~8.3.0 || ~8.4.0`.
- `magento/module-cookie` and `magento/module-csp` have version bounds instead of `*`.
- Development tooling uses `pixelperfectat/coding-standard` 0.2, with CI through the shared `pixelperfectat/ci-templates` workflow and Renovate.

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

[Unreleased]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.3.0...HEAD
[0.3.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/pixelperfectat/module-hyva-cookie-consent/releases/tag/0.1.0
