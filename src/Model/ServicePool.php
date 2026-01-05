<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model;

use Pixelperfect\HyvaCookieConsent\Api\Data\ServiceInterface;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Data as ConfigData;

/**
 * Pool of cookie consent services loaded from cookie_consent.xml
 *
 * Services without a template are informational only (necessary cookies).
 * Services with a template are blockable and require user consent.
 */
class ServicePool
{
    /**
     * @var array<string, ServiceInterface>
     */
    private array $services = [];

    /**
     * Cached array of enabled services (null = not yet computed)
     *
     * @var array<string, ServiceInterface>|null
     */
    private ?array $enabledServicesCache = null;

    /**
     * @param ServiceFactory $serviceFactory Factory for creating Service instances
     * @param ConfigData $configData XML configuration data
     */
    public function __construct(
        private readonly ServiceFactory $serviceFactory,
        private readonly ConfigData $configData
    ) {
        $this->loadServices();
    }

    /**
     * Load services from XML configuration
     *
     * @return void
     */
    private function loadServices(): void
    {
        $servicesConfig = $this->configData->getServices();

        foreach ($servicesConfig as $code => $data) {
            $this->services[$code] = $this->serviceFactory->create([
                'code' => $data['code'] ?? $code,
                'title' => $data['title'] ?? '',
                'description' => $data['description'] ?? '',
                'category' => $data['category'] ?? 'analytics',
                'template' => $data['template'] ?? '',
                'isTagManager' => (bool) ($data['is_tag_manager'] ?? false),
                'managedBy' => $data['managed_by'] ?? null,
                'configFields' => $data['config_fields'] ?? [],
                'cookies' => $data['cookies'] ?? [],
                'enabledByDefault' => (bool) ($data['enabled_by_default'] ?? false)
            ]);
        }
    }

    /**
     * Get all services (regardless of enabled state)
     *
     * @return array<string, ServiceInterface>
     */
    public function getAllServices(): array
    {
        return $this->services;
    }

    /**
     * Get all enabled services
     *
     * Services without templates (necessary/informational) are always enabled.
     * Services with templates are enabled based on admin configuration.
     *
     * Results are cached for the duration of the request to avoid
     * repeated config reads when this method is called multiple times.
     *
     * @return array<string, ServiceInterface>
     */
    public function getEnabledServices(): array
    {
        if ($this->enabledServicesCache === null) {
            $this->enabledServicesCache = array_filter(
                $this->services,
                static fn(ServiceInterface $service) => $service->isEnabled()
            );
        }

        return $this->enabledServicesCache;
    }

    /**
     * Get enabled services for a specific category
     *
     * @param string $category Category code
     * @return array<string, ServiceInterface>
     */
    public function getServicesForCategory(string $category): array
    {
        return array_filter(
            $this->getEnabledServices(),
            static fn(ServiceInterface $service) => $service->getCategory() === $category
        );
    }

    /**
     * Get a specific service by code
     *
     * @param string $code Service code identifier
     * @return ServiceInterface|null
     */
    public function getService(string $code): ?ServiceInterface
    {
        return $this->services[$code] ?? null;
    }

    /**
     * Get all tag manager services
     *
     * @return array<string, ServiceInterface>
     */
    public function getTagManagerServices(): array
    {
        return array_filter(
            $this->getEnabledServices(),
            static fn(ServiceInterface $service) => $service->isTagManager()
        );
    }

    /**
     * Get services managed by a specific tag manager
     *
     * @param string $tagManagerCode Tag manager service code
     * @return array<string, ServiceInterface>
     */
    public function getServicesManagedBy(string $tagManagerCode): array
    {
        return array_filter(
            $this->services,
            static fn(ServiceInterface $service) => $service->getManagedBy() === $tagManagerCode
        );
    }

    /**
     * Get all cookies from enabled services grouped by category
     *
     * @return array<string, array<string, array<string, string>>>
     */
    public function getAllCookiesByCategory(): array
    {
        $cookiesByCategory = [];

        foreach ($this->getEnabledServices() as $service) {
            $category = $service->getCategory();
            if (!isset($cookiesByCategory[$category])) {
                $cookiesByCategory[$category] = [];
            }

            foreach ($service->getCookies() as $cookieName => $cookieData) {
                $cookiesByCategory[$category][$cookieName] = $cookieData;
            }
        }

        return $cookiesByCategory;
    }

    /**
     * Get services that should be loaded directly by the module
     *
     * These services have templates and the module injects their scripts
     *
     * @return array<string, ServiceInterface>
     */
    public function getDirectLoadingServices(): array
    {
        return array_filter(
            $this->getEnabledServices(),
            static fn(ServiceInterface $service) => $service->isDirectLoading()
        );
    }

    /**
     * Get services that are loaded via Google Tag Manager
     *
     * These services appear in the consent banner for transparency
     * but their scripts are managed by GTM
     *
     * @return array<string, ServiceInterface>
     */
    public function getGtmLoadingServices(): array
    {
        return array_filter(
            $this->getEnabledServices(),
            static fn(ServiceInterface $service) => $service->isGtmLoading()
        );
    }

    /**
     * Get direct loading services for a specific category
     *
     * @param string $category Category code
     * @return array<string, ServiceInterface>
     */
    public function getDirectLoadingServicesForCategory(string $category): array
    {
        return array_filter(
            $this->getDirectLoadingServices(),
            static fn(ServiceInterface $service) => $service->getCategory() === $category
        );
    }

    /**
     * Get GTM loading services for a specific category
     *
     * @param string $category Category code
     * @return array<string, ServiceInterface>
     */
    public function getGtmLoadingServicesForCategory(string $category): array
    {
        return array_filter(
            $this->getGtmLoadingServices(),
            static fn(ServiceInterface $service) => $service->getCategory() === $category
        );
    }
}
