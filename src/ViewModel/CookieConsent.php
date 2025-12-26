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
     * Maps cookies to their consent groups for the Hyva cookie consent infrastructure
     *
     * @return string JSON encoded config
     */
    public function getCookieConsentConfigJson(): string
    {
        $config = [];

        foreach ($this->servicePool->getEnabledServices() as $service) {
            $category = $service->getCategory();
            foreach ($service->getCookies() as $cookie) {
                $cookieName = $cookie['name'] ?? '';
                if (!empty($cookieName)) {
                    $config[$cookieName] = $category;
                }
            }
        }

        // Add standard Magento cookies to necessary category
        $config['PHPSESSID'] = 'necessary';
        $config['form_key'] = 'necessary';
        $config['mage-cache-storage'] = 'necessary';
        $config['mage-cache-storage-section-invalidation'] = 'necessary';
        $config['mage-cache-sessid'] = 'necessary';
        $config['mage-messages'] = 'necessary';
        $config['recently_viewed_product'] = 'preferences';
        $config['recently_viewed_product_previous'] = 'preferences';
        $config['recently_compared_product'] = 'preferences';
        $config['recently_compared_product_previous'] = 'preferences';
        $config['product_data_storage'] = 'preferences';

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
