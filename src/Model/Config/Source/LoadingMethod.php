<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\Source;

use Magento\Framework\Data\OptionSourceInterface;

/**
 * Service loading method options
 *
 * Determines how a tracking service is loaded:
 * - direct: Module loads the script directly (blocked until consent)
 * - gtm: Service is loaded via Google Tag Manager (GTM handles consent)
 * - disabled: Service is completely disabled
 */
class LoadingMethod implements OptionSourceInterface
{
    public const METHOD_DIRECT = 'direct';
    public const METHOD_GTM = 'gtm';
    public const METHOD_DISABLED = 'disabled';

    /**
     * Get loading method options
     *
     * @return array<int, array<string, string>>
     */
    public function toOptionArray(): array
    {
        return [
            [
                'value' => self::METHOD_DIRECT,
                'label' => __('Direct (Module loads script)')
            ],
            [
                'value' => self::METHOD_GTM,
                'label' => __('Via Google Tag Manager')
            ],
            [
                'value' => self::METHOD_DISABLED,
                'label' => __('Disabled')
            ]
        ];
    }
}
