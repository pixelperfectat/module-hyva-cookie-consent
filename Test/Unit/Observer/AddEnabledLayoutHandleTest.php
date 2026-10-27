<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\View\Layout\ProcessorInterface;
use Magento\Framework\View\LayoutInterface;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\ModuleStatus;
use Pixelperfect\HyvaCookieConsent\Observer\AddEnabledLayoutHandle;
use Pixelperfect\HyvaCookieConsent\Test\Unit\Fake\FakeScopeConfig;

class AddEnabledLayoutHandleTest extends TestCase
{
    /**
     * @var array<int, string>
     */
    private array $handles = [];

    private function layout(): LayoutInterface
    {
        $update = $this->createMock(ProcessorInterface::class);
        $update->method('addHandle')->willReturnCallback(function (string $handle) use ($update) {
            $this->handles[] = $handle;
            return $update;
        });
        $layout = $this->createMock(LayoutInterface::class);
        $layout->method('getUpdate')->willReturn($update);

        return $layout;
    }

    private function observer(bool $moduleEnabled): AddEnabledLayoutHandle
    {
        $scopeConfig = new FakeScopeConfig(['web/hyva_cookie_consent/general/enabled' => $moduleEnabled ? '1' : '0']);

        return new AddEnabledLayoutHandle(new ModuleStatus($scopeConfig));
    }

    public function testAddsTheHandleWhileTheModuleIsEnabled(): void
    {
        $this->observer(true)->execute(new Observer(['layout' => $this->layout()]));

        self::assertSame(['hyva_cookie_consent_enabled'], $this->handles);
    }

    public function testLeavesTheLayoutAloneWhileTheModuleIsDisabled(): void
    {
        $this->observer(false)->execute(new Observer(['layout' => $this->layout()]));

        self::assertSame([], $this->handles);
    }

    public function testIgnoresAnEventWithoutALayout(): void
    {
        $this->observer(true)->execute(new Observer([]));

        self::assertSame([], $this->handles);
    }

    public function testTheHandleFileHoldsTheRemovalsAndDefaultNoLonger(): void
    {
        $layoutDir = __DIR__ . '/../../../src/view/frontend/layout/';
        $handle = (string) file_get_contents($layoutDir . AddEnabledLayoutHandle::HANDLE . '.xml');
        $default = (string) file_get_contents($layoutDir . 'default.xml');

        foreach (['google_analytics', 'cookie_notices'] as $block) {
            $removal = '<referenceBlock name="' . $block . '" remove="true"/>';
            self::assertStringContainsString($removal, $handle);
            self::assertStringNotContainsString($removal, $default);
        }
    }

    public function testConfigXmlNoLongerForcesCookieRestriction(): void
    {
        $config = (string) file_get_contents(__DIR__ . '/../../../src/etc/config.xml');

        self::assertStringNotContainsString('<cookie_restriction>', $config);
    }
}
