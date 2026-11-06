<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Observer;

use Hyva\Theme\Service\CurrentTheme;
use Magento\Framework\Event\Observer;
use Magento\Framework\View\Layout\ProcessorInterface;
use Magento\Framework\View\LayoutInterface;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Observer\AddNonHyvaThemeLayoutHandle;

class AddNonHyvaThemeLayoutHandleTest extends TestCase
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

    private function observer(bool $isHyva): AddNonHyvaThemeLayoutHandle
    {
        $currentTheme = $this->createMock(CurrentTheme::class);
        $currentTheme->method('isHyva')->willReturn($isHyva);

        return new AddNonHyvaThemeLayoutHandle($currentTheme);
    }

    public function testAddsTheHandleOnAPageThatIsNotRenderedWithAHyvaTheme(): void
    {
        $this->observer(false)->execute(new Observer(['layout' => $this->layout()]));

        self::assertSame(['hyva_cookie_consent_non_hyva_theme'], $this->handles);
    }

    public function testLeavesHyvaPagesAlone(): void
    {
        $this->observer(true)->execute(new Observer(['layout' => $this->layout()]));

        self::assertSame([], $this->handles);
    }

    public function testIgnoresAnEventWithoutALayout(): void
    {
        $this->observer(false)->execute(new Observer([]));

        self::assertSame([], $this->handles);
    }

    public function testTheHandleRemovesEveryBlockTheModuleLayoutAdds(): void
    {
        $layoutDir = __DIR__ . '/../../../src/view/frontend/layout/';
        $handleFile = $layoutDir . AddNonHyvaThemeLayoutHandle::HANDLE . '.xml';

        $added = [];
        foreach (glob($layoutDir . '*.xml') ?: [] as $file) {
            if ($file !== $handleFile) {
                $added = array_merge($added, $this->attributeValues($file, '//block/@name'));
            }
        }
        $removed = $this->attributeValues($handleFile, '//referenceBlock[@remove="true"]/@name');

        self::assertNotEmpty($added);
        self::assertSame([], array_values(array_diff($added, $removed)), 'Blocks not removed on non-Hyva pages');
    }

    /**
     * @return array<int, string>
     */
    private function attributeValues(string $file, string $xpath): array
    {
        $document = new \DOMDocument();
        self::assertTrue($document->load($file), 'Cannot parse ' . $file);

        $values = [];
        foreach ((new \DOMXPath($document))->query($xpath) ?: [] as $node) {
            $values[] = (string) $node->nodeValue;
        }

        return $values;
    }
}
