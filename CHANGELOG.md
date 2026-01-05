# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [0.1.0] - 2025-01-01

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
