<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model;

use Pixelperfect\HyvaCookieConsent\Api\Data\CategoryInterface;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Data as ConfigData;

/**
 * Pool of cookie consent categories loaded from cookie_consent.xml
 */
class CategoryPool
{
    /**
     * @var array<string, CategoryInterface>
     */
    private array $categories = [];

    /**
     * Cached sorted categories (null = not yet computed)
     *
     * @var array<string, CategoryInterface>|null
     */
    private ?array $sortedCategoriesCache = null;

    /**
     * @param CategoryFactory $categoryFactory Factory for creating Category instances
     * @param ConfigData $configData XML configuration data
     */
    public function __construct(
        private readonly CategoryFactory $categoryFactory,
        private readonly ConfigData $configData
    ) {
        $this->loadCategories();
    }

    /**
     * Load categories from XML configuration
     *
     * @return void
     */
    private function loadCategories(): void
    {
        $categoriesConfig = $this->configData->getCategories();

        foreach ($categoriesConfig as $code => $data) {
            $this->categories[$code] = $this->categoryFactory->create([
                'code' => $data['code'] ?? $code,
                'title' => $data['title'] ?? '',
                'description' => $data['description'] ?? '',
                'required' => (bool) ($data['required'] ?? false),
                'sortOrder' => (int) ($data['sort_order'] ?? 0)
            ]);
        }
    }

    /**
     * Get all categories sorted by sort_order
     *
     * Results are cached for the duration of the request to avoid
     * repeated sorting when this method is called multiple times.
     *
     * @return array<string, CategoryInterface>
     */
    public function getCategories(): array
    {
        if ($this->sortedCategoriesCache === null) {
            $categories = $this->categories;
            uasort($categories, static fn(CategoryInterface $a, CategoryInterface $b) =>
                $a->getSortOrder() <=> $b->getSortOrder()
            );
            $this->sortedCategoriesCache = $categories;
        }

        return $this->sortedCategoriesCache;
    }

    /**
     * Get category by code
     *
     * @param string $code Category code identifier
     * @return CategoryInterface|null
     */
    public function getCategory(string $code): ?CategoryInterface
    {
        return $this->categories[$code] ?? null;
    }

    /**
     * Get all category codes
     *
     * @return array<int, string>
     */
    public function getCategoryCodes(): array
    {
        return array_keys($this->categories);
    }

    /**
     * Get required (necessary) categories
     *
     * @return array<string, CategoryInterface>
     */
    public function getRequiredCategories(): array
    {
        return array_filter(
            $this->categories,
            static fn(CategoryInterface $category) => $category->isRequired()
        );
    }

    /**
     * Get optional (non-required) categories
     *
     * @return array<string, CategoryInterface>
     */
    public function getOptionalCategories(): array
    {
        return array_filter(
            $this->categories,
            static fn(CategoryInterface $category) => !$category->isRequired()
        );
    }
}
