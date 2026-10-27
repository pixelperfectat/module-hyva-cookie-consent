<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Api\Data\CategoryInterface;
use Pixelperfect\HyvaCookieConsent\Model\Category;
use Pixelperfect\HyvaCookieConsent\Model\CategoryFactory;
use Pixelperfect\HyvaCookieConsent\Model\CategoryPool;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Data as ConfigData;

class CategoryPoolTest extends TestCase
{
    /**
     * @param array<string, array<string, mixed>> $categories
     */
    private function pool(array $categories): CategoryPool
    {
        $factory = $this->createMock(CategoryFactory::class);
        $factory->method('create')->willReturnCallback(
            static fn(array $data) => new Category(...$data)
        );
        $configData = $this->createMock(ConfigData::class);
        $configData->method('getCategories')->willReturn($categories);

        return new CategoryPool($factory, $configData);
    }

    /**
     * @param array<string, CategoryInterface> $categories
     * @return array<int, string>
     */
    private static function codes(array $categories): array
    {
        return array_values(array_map(static fn(CategoryInterface $category) => $category->getCode(), $categories));
    }

    public function testBuildsCategoriesFromTheXmlConfig(): void
    {
        $pool = $this->pool([
            'analytics' => [
                'code' => 'analytics',
                'title' => 'Analytics',
                'description' => 'Stats',
                'required' => false,
                'sort_order' => 20,
            ],
            'necessary' => [
                'code' => 'necessary',
                'title' => 'Necessary',
                'description' => 'Always',
                'required' => true,
                'sort_order' => 10,
            ],
        ]);

        $necessary = $pool->getCategory('necessary');
        self::assertInstanceOf(CategoryInterface::class, $necessary);
        self::assertSame('Necessary', $necessary->getTitle());
        self::assertSame('Always', $necessary->getDescription());
        self::assertTrue($necessary->isRequired());
        self::assertSame(10, $necessary->getSortOrder());
        self::assertNull($pool->getCategory('marketing'));
        self::assertSame(['analytics', 'necessary'], $pool->getCategoryCodes());
    }

    public function testMissingValuesGetDefaults(): void
    {
        $category = $this->pool(['social' => []])->getCategory('social');

        self::assertInstanceOf(CategoryInterface::class, $category);
        self::assertSame('social', $category->getCode());
        self::assertSame('', $category->getTitle());
        self::assertSame('', $category->getDescription());
        self::assertFalse($category->isRequired());
        self::assertSame(0, $category->getSortOrder());
    }

    public function testTheCodeInTheDataWinsOverTheArrayKey(): void
    {
        $category = $this->pool(['legacy_key' => ['code' => 'social']])->getCategory('legacy_key');

        self::assertInstanceOf(CategoryInterface::class, $category);
        self::assertSame('social', $category->getCode());
    }

    public function testValuesAreCastToTheirTypes(): void
    {
        $category = $this->pool(['x' => ['code' => 'x', 'required' => '1', 'sort_order' => '7']])->getCategory('x');

        self::assertInstanceOf(CategoryInterface::class, $category);
        self::assertTrue($category->isRequired());
        self::assertSame(7, $category->getSortOrder());
    }

    public function testCategoriesAreSortedBySortOrderAndKeepTheirKeys(): void
    {
        $pool = $this->pool([
            'preferences' => ['code' => 'preferences', 'sort_order' => 40],
            'necessary' => ['code' => 'necessary', 'sort_order' => 10],
            'marketing' => ['code' => 'marketing', 'sort_order' => 30],
            'analytics' => ['code' => 'analytics', 'sort_order' => 20],
        ]);

        $sorted = $pool->getCategories();
        self::assertSame(['necessary', 'analytics', 'marketing', 'preferences'], array_keys($sorted));
        self::assertSame(['necessary', 'analytics', 'marketing', 'preferences'], self::codes($sorted));
        self::assertSame($sorted, $pool->getCategories());
        self::assertSame(['preferences', 'necessary', 'marketing', 'analytics'], $pool->getCategoryCodes());
    }

    public function testSplitsRequiredAndOptionalCategories(): void
    {
        $pool = $this->pool([
            'necessary' => ['code' => 'necessary', 'required' => true],
            'analytics' => ['code' => 'analytics', 'required' => false],
            'marketing' => ['code' => 'marketing'],
        ]);

        self::assertSame(['necessary'], array_keys($pool->getRequiredCategories()));
        self::assertSame(['analytics', 'marketing'], array_keys($pool->getOptionalCategories()));
    }
}
