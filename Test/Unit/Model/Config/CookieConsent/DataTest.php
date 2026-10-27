<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model\Config\CookieConsent;

use Magento\Framework\Config\CacheInterface;
use Magento\Framework\Serialize\Serializer\Json;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Data;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Reader;

class DataTest extends TestCase
{
    private const CONFIG = [
        'categories' => ['analytics' => ['code' => 'analytics', 'title' => 'Analytics']],
        'services' => ['hotjar' => ['code' => 'hotjar', 'category' => 'analytics']],
    ];

    /**
     * @param array<string, mixed> $config
     */
    private function data(array $config): Data
    {
        $cache = $this->createMock(CacheInterface::class);
        $cache->method('load')->with('cookie_consent_config')->willReturn((new Json())->serialize($config));

        return new Data($this->createMock(Reader::class), $cache, new Json());
    }

    public function testReadsSectionsAndEntriesFromTheCachedConfig(): void
    {
        $data = $this->data(self::CONFIG);

        self::assertSame(self::CONFIG['categories'], $data->getCategories());
        self::assertSame(self::CONFIG['services'], $data->getServices());
        self::assertSame(self::CONFIG['categories']['analytics'], $data->getCategory('analytics'));
        self::assertSame(self::CONFIG['services']['hotjar'], $data->getService('hotjar'));
    }

    public function testMissingSectionsAndEntriesAreEmpty(): void
    {
        $data = $this->data([]);

        self::assertSame([], $data->getCategories());
        self::assertSame([], $data->getServices());
        self::assertNull($data->getCategory('analytics'));
        self::assertNull($data->getService('hotjar'));
    }

    public function testReadsTheConfigFromTheReaderOnACacheMissAndCachesIt(): void
    {
        $reader = $this->createMock(Reader::class);
        $reader->expects(self::once())->method('read')->willReturn(self::CONFIG);
        $cache = $this->createMock(CacheInterface::class);
        $cache->method('load')->willReturn(false);
        $cache->expects(self::once())->method('save')
            ->with((new Json())->serialize(self::CONFIG), 'cookie_consent_config');

        $data = new Data($reader, $cache, new Json());

        self::assertSame(self::CONFIG['services'], $data->getServices());
    }
}
