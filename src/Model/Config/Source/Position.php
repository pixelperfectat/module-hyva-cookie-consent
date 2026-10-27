<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\Source;

use Magento\Framework\Data\OptionSourceInterface;

/**
 * Position options for floating cookie settings button
 */
class Position implements OptionSourceInterface
{
    /**
     * Get position options
     *
     * @return array<int, array{value: string, label: \Magento\Framework\Phrase}>
     */
    public function toOptionArray(): array
    {
        return [
            ['value' => 'left', 'label' => __('Bottom Left')],
            ['value' => 'right', 'label' => __('Bottom Right')]
        ];
    }
}
