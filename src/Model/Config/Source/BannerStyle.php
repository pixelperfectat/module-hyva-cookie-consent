<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\Source;

use Magento\Framework\Data\OptionSourceInterface;

/**
 * Banner style options for cookie consent dialog
 */
class BannerStyle implements OptionSourceInterface
{
    /**
     * Get banner style options
     *
     * @return array<int, array<string, string>>
     */
    public function toOptionArray(): array
    {
        return [
            ['value' => 'modal', 'label' => __('Modal (Center Overlay)')],
            ['value' => 'bar', 'label' => __('Bar (Bottom Fixed)')]
        ];
    }
}
