<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model\Config\Source;

use Magento\Framework\Data\OptionSourceInterface;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Config\Source\BannerStyle;
use Pixelperfect\HyvaCookieConsent\Model\Config\Source\GtmStrategy;
use Pixelperfect\HyvaCookieConsent\Model\Config\Source\LoadingMethod;
use Pixelperfect\HyvaCookieConsent\Model\Config\Source\Position;

/**
 * The option values are what the templates and the ViewModel compare against.
 */
class OptionSourcesTest extends TestCase
{
    /**
     * @return array<string, array{0: OptionSourceInterface, 1: array<string, string>}>
     */
    public static function sourceProvider(): array
    {
        return [
            'banner style' => [new BannerStyle(), [
                'modal' => 'Modal (Center Overlay)',
                'bar' => 'Bar (Bottom Fixed)',
            ]],
            'gtm strategy' => [new GtmStrategy(), [
                'strict' => 'Strict (Block until consent)',
                'infrastructure' => 'Infrastructure (Load immediately, push consent to dataLayer)',
            ]],
            'loading method' => [new LoadingMethod(), [
                'direct' => 'Direct (Module loads script)',
                'gtm' => 'Via Google Tag Manager',
                'disabled' => 'Disabled',
            ]],
            'position' => [new Position(), [
                'left' => 'Bottom Left',
                'right' => 'Bottom Right',
            ]],
        ];
    }

    /**
     * @dataProvider sourceProvider
     * @param array<string, string> $expected
     */
    public function testOptions(OptionSourceInterface $source, array $expected): void
    {
        $options = [];
        foreach ($source->toOptionArray() as $option) {
            $options[$option['value']] = (string) $option['label'];
        }

        self::assertSame($expected, $options);
    }
}
