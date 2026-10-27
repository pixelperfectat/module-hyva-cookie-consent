<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Plugin;

use Magento\Cookie\Helper\Cookie as CookieHelper;
use Pixelperfect\HyvaCookieConsent\Model\ModuleStatus;

/**
 * Turns on Magento's cookie restriction mode while cookie consent is enabled
 *
 * Hyva's hyva.setCookie() only holds cookies back until consent when the Cookie helper reports restriction
 * mode, so the module needs it on. Doing it here instead of as a config.xml default keeps a disabled module
 * from changing the shop.
 */
class EnforceCookieRestrictionPlugin
{
    /**
     * @param ModuleStatus $moduleStatus Cookie consent on/off switch
     */
    public function __construct(
        private readonly ModuleStatus $moduleStatus
    ) {
    }

    /**
     * Report restriction mode as on while cookie consent is enabled, otherwise keep Magento's answer
     *
     * @param CookieHelper $subject
     * @param mixed $result The configured web/cookie/cookie_restriction value
     * @return mixed
     */
    public function afterIsCookieRestrictionModeEnabled(CookieHelper $subject, mixed $result): mixed
    {
        return $this->moduleStatus->isEnabled() ? true : $result;
    }
}
