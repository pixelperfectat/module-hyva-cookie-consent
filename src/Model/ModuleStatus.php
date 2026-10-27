<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;

/**
 * Whether cookie consent is switched on for the current store view
 *
 * Everything that changes Magento's own behaviour (cookie restriction mode, removing the native cookie notice
 * and Google Analytics blocks) checks this, so an installed but disabled module leaves the shop untouched.
 */
class ModuleStatus
{
    public const XML_PATH_ENABLED = 'web/hyva_cookie_consent/general/enabled';

    /**
     * @param ScopeConfigInterface $scopeConfig Magento configuration reader
     */
    public function __construct(
        private readonly ScopeConfigInterface $scopeConfig
    ) {
    }

    /**
     * Check if cookie consent is enabled for the current store view
     *
     * @return bool
     */
    public function isEnabled(): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH_ENABLED, ScopeInterface::SCOPE_STORE);
    }
}
