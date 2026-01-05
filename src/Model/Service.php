<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;
use Pixelperfect\HyvaCookieConsent\Api\Data\ServiceInterface;
use Pixelperfect\HyvaCookieConsent\Model\Config\Source\LoadingMethod;

/**
 * Cookie consent service model
 *
 * Represents a tracking/analytics service with its configuration and cookies
 */
class Service implements ServiceInterface
{
    private const CONFIG_PATH_PREFIX = 'hyva_cookie_consent/services/';

    /**
     * Cached enabled state (null = not yet computed)
     */
    private ?bool $isEnabledCache = null;

    /**
     * Cache for config values by field name
     *
     * @var array<string, mixed>
     */
    private array $configCache = [];

    /**
     * @param ScopeConfigInterface $scopeConfig Magento configuration reader
     * @param string $code Service code identifier
     * @param string $title Display title
     * @param string $description Service description
     * @param string $category Category code this service belongs to
     * @param string $template Template path for rendering service script
     * @param bool $isTagManager Whether this is a tag manager service
     * @param string|null $managedBy If service is managed by another service (e.g., GTM)
     * @param array<string, array<string, string>> $configFields Admin config fields
     * @param array<string, array<string, string>> $cookies Cookie definitions
     * @param bool $enabledByDefault Default enabled state
     */
    public function __construct(
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly string $code,
        private readonly string $title,
        private readonly string $description,
        private readonly string $category,
        private readonly string $template = '',
        private readonly bool $isTagManager = false,
        private readonly ?string $managedBy = null,
        private readonly array $configFields = [],
        private readonly array $cookies = [],
        private readonly bool $enabledByDefault = true
    ) {
    }

    /**
     * @inheritDoc
     */
    public function getCode(): string
    {
        return $this->code;
    }

    /**
     * @inheritDoc
     */
    public function getTitle(): string
    {
        return $this->title;
    }

    /**
     * @inheritDoc
     */
    public function getDescription(): string
    {
        return $this->description;
    }

    /**
     * @inheritDoc
     */
    public function getCategory(): string
    {
        return $this->category;
    }

    /**
     * @inheritDoc
     */
    public function getTemplate(): string
    {
        return $this->template;
    }

    /**
     * @inheritDoc
     */
    public function isEnabled(): bool
    {
        // Services without templates are informational only (always enabled)
        if (!$this->hasTemplate()) {
            return true;
        }

        if ($this->isEnabledCache !== null) {
            return $this->isEnabledCache;
        }

        $path = self::CONFIG_PATH_PREFIX . $this->code . '/enabled';
        $value = $this->scopeConfig->getValue($path, ScopeInterface::SCOPE_STORE);

        if ($value === null) {
            $this->isEnabledCache = $this->enabledByDefault;
        } else {
            $this->isEnabledCache = (bool) $value;
        }

        return $this->isEnabledCache;
    }

    /**
     * @inheritDoc
     */
    public function hasTemplate(): bool
    {
        return !empty($this->template);
    }

    /**
     * @inheritDoc
     */
    public function isTagManager(): bool
    {
        return $this->isTagManager;
    }

    /**
     * @inheritDoc
     */
    public function getManagedBy(): ?string
    {
        return $this->managedBy;
    }

    /**
     * @inheritDoc
     */
    public function getConfigValue(string $field): mixed
    {
        if (!array_key_exists($field, $this->configCache)) {
            $path = self::CONFIG_PATH_PREFIX . $this->code . '/' . $field;
            $this->configCache[$field] = $this->scopeConfig->getValue($path, ScopeInterface::SCOPE_STORE);
        }

        return $this->configCache[$field];
    }

    /**
     * @inheritDoc
     */
    public function getCookies(): array
    {
        return $this->cookies;
    }

    /**
     * Get admin config fields definition
     *
     * @return array<string, array<string, string>>
     */
    public function getConfigFields(): array
    {
        return $this->configFields;
    }

    /**
     * Check if this service has required configuration values set
     *
     * @return bool
     */
    public function hasRequiredConfig(): bool
    {
        foreach ($this->configFields as $fieldCode => $fieldConfig) {
            if (!empty($fieldConfig['required'])) {
                $value = $this->getConfigValue($fieldCode);
                if (empty($value)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * @inheritDoc
     */
    public function getLoadingMethod(): string
    {
        // First check if service is enabled at all
        if (!$this->isEnabled()) {
            return LoadingMethod::METHOD_DISABLED;
        }

        // Check admin config for loading method
        $loadingMethod = $this->getConfigValue('loading_method');

        if ($loadingMethod !== null) {
            return (string) $loadingMethod;
        }

        // Default: if service has a template, it's direct loading
        // If no template (GTM-managed in di.xml), it's GTM loading
        if (!empty($this->template)) {
            return LoadingMethod::METHOD_DIRECT;
        }

        // Service defined without template is assumed to be GTM-managed
        if ($this->managedBy !== null) {
            return LoadingMethod::METHOD_GTM;
        }

        return LoadingMethod::METHOD_DIRECT;
    }

    /**
     * @inheritDoc
     */
    public function isDirectLoading(): bool
    {
        return $this->getLoadingMethod() === LoadingMethod::METHOD_DIRECT;
    }

    /**
     * @inheritDoc
     */
    public function isGtmLoading(): bool
    {
        return $this->getLoadingMethod() === LoadingMethod::METHOD_GTM;
    }
}
