<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Observer;

use Magento\Framework\App\Filesystem\DirectoryList;
use Magento\Framework\Component\ComponentRegistrar;
use Magento\Framework\DataObject;
use Magento\Framework\Event\Observer;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Observer\RegisterModuleForHyvaConfig;

class RegisterModuleForHyvaConfigTest extends TestCase
{
    private function observer(): RegisterModuleForHyvaConfig
    {
        $registrar = $this->createMock(ComponentRegistrar::class);
        $registrar->method('getPath')
            ->with(ComponentRegistrar::MODULE, 'Pixelperfect_HyvaCookieConsent')
            ->willReturn('/var/www/html/vendor/pixelperfectat/module-hyva-cookie-consent/src');
        $directoryList = $this->createMock(DirectoryList::class);
        $directoryList->method('getRoot')->willReturn('/var/www/html');

        return new RegisterModuleForHyvaConfig($registrar, $directoryList);
    }

    public function testAddsTheModuleSourceRelativeToTheMagentoRoot(): void
    {
        $config = new DataObject();

        $this->observer()->execute(new Observer(['config' => $config]));

        self::assertSame(
            [['src' => 'vendor/pixelperfectat/module-hyva-cookie-consent/src']],
            $config->getData('extensions')
        );
    }

    public function testKeepsExtensionsRegisteredByOtherModules(): void
    {
        $config = new DataObject(['extensions' => [['src' => 'app/code/Vendor/Other']]]);

        $this->observer()->execute(new Observer(['config' => $config]));

        self::assertSame(
            [['src' => 'app/code/Vendor/Other'], ['src' => 'vendor/pixelperfectat/module-hyva-cookie-consent/src']],
            $config->getData('extensions')
        );
    }
}
