<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Api\Data;

/**
 * Interface for cookie consent category
 *
 * Categories group related cookies and services (e.g., necessary, analytics, marketing)
 */
interface CategoryInterface
{
    /**
     * Get category code identifier
     *
     * @return string
     */
    public function getCode(): string;

    /**
     * Get display title (translatable)
     *
     * @return string
     */
    public function getTitle(): string;

    /**
     * Get category description (translatable)
     *
     * @return string
     */
    public function getDescription(): string;

    /**
     * Check if consent for this category is required (cannot be disabled)
     *
     * @return bool
     */
    public function isRequired(): bool;

    /**
     * Get sort order for display
     *
     * @return int
     */
    public function getSortOrder(): int;
}
