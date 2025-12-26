<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\Source;

use Magento\Framework\Data\OptionSourceInterface;

/**
 * Google Tag Manager loading strategy options
 */
class GtmStrategy implements OptionSourceInterface
{
    /**
     * Get GTM loading strategy options
     *
     * @return array<int, array<string, string>>
     */
    public function toOptionArray(): array
    {
        return [
            ['value' => 'strict', 'label' => __('Strict (Block until consent)')],
            ['value' => 'infrastructure', 'label' => __('Infrastructure (Load immediately, push consent to dataLayer)')]
        ];
    }
}
