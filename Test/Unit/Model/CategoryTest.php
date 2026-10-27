<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Category;

class CategoryTest extends TestCase
{
    public function testDefaultsToOptionalWithSortOrderZero(): void
    {
        $category = new Category('analytics', 'Analytics', 'Stats');

        self::assertSame('analytics', $category->getCode());
        self::assertSame('Analytics', $category->getTitle());
        self::assertSame('Stats', $category->getDescription());
        self::assertFalse($category->isRequired());
        self::assertSame(0, $category->getSortOrder());
    }

    public function testKeepsRequiredFlagAndSortOrder(): void
    {
        $category = new Category('necessary', 'Necessary', 'Always', true, 10);

        self::assertTrue($category->isRequired());
        self::assertSame(10, $category->getSortOrder());
    }
}
