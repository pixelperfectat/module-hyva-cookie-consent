<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Observer;

use Magento\Framework\Event\Observer as Event;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\View\LayoutInterface;
use Pixelperfect\HyvaCookieConsent\Model\ModuleStatus;

/**
 * Adds the hyva_cookie_consent_enabled layout handle while cookie consent is enabled
 *
 * Layout <remove> directives have no ifconfig, so the removals of Magento's cookie notice and Google
 * Analytics blocks live in that handle and only apply when the module is switched on.
 */
class AddEnabledLayoutHandle implements ObserverInterface
{
    public const HANDLE = 'hyva_cookie_consent_enabled';

    /**
     * @param ModuleStatus $moduleStatus Cookie consent on/off switch
     */
    public function __construct(
        private readonly ModuleStatus $moduleStatus
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
        if (!$this->moduleStatus->isEnabled()) {
            return;
        }

        $layout = $event->getData('layout');
        if ($layout instanceof LayoutInterface) {
            $layout->getUpdate()->addHandle(self::HANDLE);
        }
    }
}
