<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Observer;

use Hyva\Theme\Service\CurrentTheme;
use Magento\Framework\Event\Observer as Event;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\View\LayoutInterface;

/**
 * Adds the hyva_cookie_consent_non_hyva_theme layout handle on pages that are not rendered with a Hyva theme
 *
 * The blocks in default.xml need Alpine.js and Hyva's JavaScript, so on a Luma page, such as a checkout served by
 * Hyva's theme fallback, they would show as plain text. The handle removes them there. It checks the theme, not
 * the route, because the pages the fallback serves are a store setting.
 */
class AddNonHyvaThemeLayoutHandle implements ObserverInterface
{
    public const HANDLE = 'hyva_cookie_consent_non_hyva_theme';

    /**
     * @param CurrentTheme $currentTheme Theme of the current page
     */
    public function __construct(
        private readonly CurrentTheme $currentTheme
    ) {
    }

    /**
     * Add the handle on layout_load_before, before the layout updates are loaded
     *
     * @param Event $event
     * @return void
     */
    public function execute(Event $event): void
    {
        if ($this->currentTheme->isHyva()) {
            return;
        }

        $layout = $event->getData('layout');
        if ($layout instanceof LayoutInterface) {
            $layout->getUpdate()->addHandle(self::HANDLE);
        }
    }
}
