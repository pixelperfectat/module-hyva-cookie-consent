<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model;

use Pixelperfect\HyvaCookieConsent\Api\Data\CategoryInterface;

/**
 * Cookie consent category model
 *
 * Represents a category for grouping cookies and services
 */
class Category implements CategoryInterface
{
    /**
     * @param string $code Category code identifier
     * @param string $title Display title (translatable)
     * @param string $description Category description (translatable)
     * @param bool $required Whether consent is required (necessary cookies)
     * @param int $sortOrder Display order
     */
    public function __construct(
        private readonly string $code,
        private readonly string $title,
        private readonly string $description,
        private readonly bool $required = false,
        private readonly int $sortOrder = 0
    ) {
    }

    /**
     * @inheritDoc
     */
    public function getCode(): string
    {
        return $this->code;
    }

    /**
     * @inheritDoc
     */
    public function getTitle(): string
    {
        return $this->title;
    }

    /**
     * @inheritDoc
     */
    public function getDescription(): string
    {
        return $this->description;
    }

    /**
     * @inheritDoc
     */
    public function isRequired(): bool
    {
        return $this->required;
    }

    /**
     * @inheritDoc
     */
    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }
}
