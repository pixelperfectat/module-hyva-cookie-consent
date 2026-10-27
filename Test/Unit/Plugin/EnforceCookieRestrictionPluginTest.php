<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Plugin;

use Magento\Cookie\Helper\Cookie as CookieHelper;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\ModuleStatus;
use Pixelperfect\HyvaCookieConsent\Plugin\EnforceCookieRestrictionPlugin;
use Pixelperfect\HyvaCookieConsent\Test\Unit\Fake\FakeScopeConfig;

class EnforceCookieRestrictionPluginTest extends TestCase
{
    private function plugin(bool $moduleEnabled): EnforceCookieRestrictionPlugin
    {
        $scopeConfig = new FakeScopeConfig(['web/hyva_cookie_consent/general/enabled' => $moduleEnabled ? '1' : '0']);

        return new EnforceCookieRestrictionPlugin(new ModuleStatus($scopeConfig));
    }

    /**
     * Values Magento's helper returns: the raw web/cookie/cookie_restriction config value.
     *
     * @return array<string, array{0: mixed}>
     */
    public static function configuredValueProvider(): array
    {
        return [
            'restriction off' => ['0'],
            'restriction on' => ['1'],
            'unset' => [null],
        ];
    }

    /**
     * @dataProvider configuredValueProvider
     */
    public function testRestrictionIsOnWhileTheModuleIsEnabled(mixed $configured): void
    {
        $result = $this->plugin(true)->afterIsCookieRestrictionModeEnabled(
            $this->createMock(CookieHelper::class),
            $configured
        );

        self::assertTrue($result);
    }

    /**
     * @dataProvider configuredValueProvider
     */
    public function testMagentosAnswerIsUntouchedWhileTheModuleIsDisabled(mixed $configured): void
    {
        $result = $this->plugin(false)->afterIsCookieRestrictionModeEnabled(
            $this->createMock(CookieHelper::class),
            $configured
        );

        self::assertSame($configured, $result);
    }
}
