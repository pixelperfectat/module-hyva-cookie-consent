<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\ModuleStatus;
use Pixelperfect\HyvaCookieConsent\Test\Unit\Fake\FakeScopeConfig;

class ModuleStatusTest extends TestCase
{
    /**
     * @return array<string, array{0: mixed, 1: bool}>
     */
    public static function flagProvider(): array
    {
        return [
            'unset (config.xml default is 0)' => [null, false],
            'disabled' => ['0', false],
            'enabled' => ['1', true],
        ];
    }

    /**
     * @dataProvider flagProvider
     */
    public function testReadsTheEnableFlagAtStoreScope(mixed $value, bool $expected): void
    {
        $scopeConfig = new FakeScopeConfig(['web/hyva_cookie_consent/general/enabled' => $value]);

        self::assertSame($expected, (new ModuleStatus($scopeConfig))->isEnabled());
    }

    public function testAFlagSetOnlyAtDefaultScopeIsNotReadAsTheStoreValue(): void
    {
        $scopeConfig = (new FakeScopeConfig())->set('web/hyva_cookie_consent/general/enabled', '1', 'default');

        self::assertFalse((new ModuleStatus($scopeConfig))->isEnabled());
    }
}
