<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\ViewModel;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\ScopeInterface;
use Pixelperfect\HyvaCookieConsent\Api\Data\CategoryInterface;
use Pixelperfect\HyvaCookieConsent\Api\Data\ServiceInterface;
use Pixelperfect\HyvaCookieConsent\Model\CategoryPool;
use Pixelperfect\HyvaCookieConsent\Model\ServicePool;

/**
 * Main ViewModel for cookie consent functionality
 *
 * Provides data to templates for rendering the consent banner, cookie information,
 * and script activation logic
 */
class CookieConsent implements ArgumentInterface
{
    private const CONFIG_PATH_PREFIX = 'web/hyva_cookie_consent/';
    private const SERVICES_CONFIG_PATH_PREFIX = 'hyva_cookie_consent/services/';

    /**
     * @param ScopeConfigInterface $scopeConfig Magento configuration reader
     * @param CategoryPool $categoryPool Pool of consent categories
     * @param ServicePool $servicePool Pool of tracking services
     * @param Json $jsonSerializer JSON serializer
     */
    public function __construct(
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly CategoryPool $categoryPool,
        private readonly ServicePool $servicePool,
        private readonly Json $jsonSerializer
    ) {
    }

    /**
     * Check if cookie consent module is enabled
     *
     * @return bool
     */
    public function isEnabled(): bool
    {
        return $this->scopeConfig->isSetFlag(
            self::CONFIG_PATH_PREFIX . 'general/enabled',
            ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * Get cookie lifetime in days
     *
     * @return int
     */
    public function getCookieLifetime(): int
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'general/cookie_lifetime',
            ScopeInterface::SCOPE_STORE
        );
        return (int) ($value ?: 365);
    }

    /**
     * Get consent version for re-consent handling
     *
     * @return int
     */
    public function getConsentVersion(): int
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'general/consent_version',
            ScopeInterface::SCOPE_STORE
        );
        return (int) ($value ?: 1);
    }

    /**
     * Get banner style (modal or bar)
     *
     * @return string
     */
    public function getBannerStyle(): string
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'ui/banner_style',
            ScopeInterface::SCOPE_STORE
        );
        return $value ?: 'modal';
    }

    /**
     * Get floating button position (left or right)
     *
     * @return string
     */
    public function getFloatingButtonPosition(): string
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'ui/floating_button_position',
            ScopeInterface::SCOPE_STORE
        );
        return $value ?: 'left';
    }

    /**
     * Get banner headline text
     *
     * @return string
     */
    public function getBannerHeadline(): string
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'text/banner_headline',
            ScopeInterface::SCOPE_STORE
        );
        return $value ?: (string) __('Cookie Settings');
    }

    /**
     * Get banner description text
     *
     * @return string
     */
    public function getBannerDescription(): string
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'text/banner_description',
            ScopeInterface::SCOPE_STORE
        );
        return $value ?: (string) __('We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. By clicking "Accept All", you consent to our use of cookies.');
    }

    /**
     * Get privacy policy URL
     *
     * @return string
     */
    public function getPrivacyPolicyUrl(): string
    {
        $value = $this->scopeConfig->getValue(
            self::CONFIG_PATH_PREFIX . 'text/privacy_policy_url',
            ScopeInterface::SCOPE_STORE
        );
        return $value ?: '/privacy-policy';
    }

    /**
     * Get all consent categories sorted by sort order
     *
     * @return array<string, CategoryInterface>
     */
    public function getCategories(): array
    {
        return $this->categoryPool->getCategories();
    }

    /**
     * Get all enabled services
     *
     * @return array<string, ServiceInterface>
     */
    public function getEnabledServices(): array
    {
        return $this->servicePool->getEnabledServices();
    }

    /**
     * Get enabled services for a specific category
     *
     * @param string $categoryCode Category code
     * @return array<string, ServiceInterface>
     */
    public function getServicesForCategory(string $categoryCode): array
    {
        return $this->servicePool->getServicesForCategory($categoryCode);
    }

    /**
     * Check if GTM is in infrastructure mode
     *
     * @return bool
     */
    public function isGtmInfrastructureMode(): bool
    {
        $strategy = $this->scopeConfig->getValue(
            self::SERVICES_CONFIG_PATH_PREFIX . 'google_tag_manager/loading_strategy',
            ScopeInterface::SCOPE_STORE
        );
        return $strategy === 'infrastructure';
    }

    /**
     * Get GTM container ID
     *
     * @return string|null
     */
    public function getGtmContainerId(): ?string
    {
        $value = $this->scopeConfig->getValue(
            self::SERVICES_CONFIG_PATH_PREFIX . 'google_tag_manager/container_id',
            ScopeInterface::SCOPE_STORE
        );
        return $value ?: null;
    }

    /**
     * Get cookie consent config JSON for Hyva integration
     *
     * Hyva expects: { groupName: [cookieName1, cookieName2, ...], ... }
     * The getGroupByCookieName() function iterates over groups and checks
     * if the array of cookie names includes the requested cookie.
     *
     * @return string JSON encoded config
     */
    public function getCookieConsentConfigJson(): string
    {
        // Build config with group as key and array of cookie names as value
        $config = [
            'necessary' => [
                'hyva_cookie_consent',  // Critical: consent cookie must be in necessary!
                'PHPSESSID',
                'form_key',
                'mage-cache-storage',
                'mage-cache-storage-section-invalidation',
                'mage-cache-sessid',
                'mage-messages',
            ],
            'preferences' => [
                'recently_viewed_product',
                'recently_viewed_product_previous',
                'recently_compared_product',
                'recently_compared_product_previous',
                'product_data_storage',
            ],
        ];

        // Add cookies from enabled services to their respective categories
        foreach ($this->servicePool->getEnabledServices() as $service) {
            $category = $service->getCategory();
            if (!isset($config[$category])) {
                $config[$category] = [];
            }

            foreach ($service->getCookies() as $cookie) {
                $cookieName = $cookie['name'] ?? '';
                if (!empty($cookieName) && !in_array($cookieName, $config[$category], true)) {
                    $config[$category][] = $cookieName;
                }
            }
        }

        return $this->jsonSerializer->serialize($config);
    }

    /**
     * Get initial consent groups JSON for JavaScript
     *
     * @return string JSON encoded consent groups
     */
    public function getInitialConsentGroupsJson(): string
    {
        $groups = ['necessary' => true];

        foreach ($this->categoryPool->getCategories() as $category) {
            if (!$category->isRequired()) {
                $groups[$category->getCode()] = false;
            }
        }

        return $this->jsonSerializer->serialize($groups);
    }

    /**
     * Get cookie patterns grouped by category for JavaScript deletion logic
     *
     * Used to delete first-party cookies when consent is revoked for a category.
     * Returns cookie name patterns (including wildcards like _ga_*) grouped by category.
     *
     * Note: Uses ALL services (not just enabled) because cookies may be set by external
     * tag managers or other sources, and we want to clean them up regardless.
     *
     * @return string JSON encoded cookie patterns by category
     */
    public function getCookiePatternsForDeletionJson(): string
    {
        $patterns = [];

        foreach ($this->servicePool->getAllServices() as $service) {
            $category = $service->getCategory();
            if (!isset($patterns[$category])) {
                $patterns[$category] = [];
            }

            foreach ($service->getCookies() as $cookie) {
                $cookieName = $cookie['name'] ?? '';
                if (!empty($cookieName) && !in_array($cookieName, $patterns[$category], true)) {
                    $patterns[$category][] = $cookieName;
                }
            }
        }

        // Add standard Magento cookies for preferences category
        if (!isset($patterns['preferences'])) {
            $patterns['preferences'] = [];
        }
        $preferenceCookies = [
            'recently_viewed_product',
            'recently_viewed_product_previous',
            'recently_compared_product',
            'recently_compared_product_previous',
            'product_data_storage'
        ];
        foreach ($preferenceCookies as $cookie) {
            if (!in_array($cookie, $patterns['preferences'], true)) {
                $patterns['preferences'][] = $cookie;
            }
        }

        return $this->jsonSerializer->serialize($patterns);
    }

    /**
     * Get service pool instance
     *
     * @return ServicePool
     */
    public function getServicePool(): ServicePool
    {
        return $this->servicePool;
    }

    /**
     * Get category pool instance
     *
     * @return CategoryPool
     */
    public function getCategoryPool(): CategoryPool
    {
        return $this->categoryPool;
    }
}
