<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Api\Data;

/**
 * Interface for cookie consent service
 *
 * Services represent tracking/analytics tools (e.g., Google Analytics, Facebook Pixel)
 */
interface ServiceInterface
{
    /**
     * Get service code identifier
     *
     * @return string
     */
    public function getCode(): string;

    /**
     * Get display title
     *
     * @return string
     */
    public function getTitle(): string;

    /**
     * Get service description
     *
     * @return string
     */
    public function getDescription(): string;

    /**
     * Get category code this service belongs to
     *
     * @return string
     */
    public function getCategory(): string;

    /**
     * Get template path for rendering service script
     *
     * @return string
     */
    public function getTemplate(): string;

    /**
     * Check if service is enabled in admin configuration
     *
     * @return bool
     */
    public function isEnabled(): bool;

    /**
     * Check if this is a tag manager service
     *
     * @return bool
     */
    public function isTagManager(): bool;

    /**
     * Get code of service that manages this service (e.g., GTM)
     *
     * @return string|null
     */
    public function getManagedBy(): ?string;

    /**
     * Get configuration value from admin settings
     *
     * @param string $field Config field name
     * @return mixed
     */
    public function getConfigValue(string $field): mixed;

    /**
     * Get cookie definitions for this service
     *
     * @return array<string, array<string, string>>
     */
    public function getCookies(): array;

    /**
     * Get loading method (direct, gtm, or disabled)
     *
     * @return string
     */
    public function getLoadingMethod(): string;

    /**
     * Check if service should be loaded directly by the module
     *
     * @return bool
     */
    public function isDirectLoading(): bool;

    /**
     * Check if service is loaded via Google Tag Manager
     *
     * @return bool
     */
    public function isGtmLoading(): bool;
}
