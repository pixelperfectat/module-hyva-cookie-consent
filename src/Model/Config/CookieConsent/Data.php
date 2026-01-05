<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent;

use Magento\Framework\Config\Data as ConfigData;
use Magento\Framework\Config\CacheInterface;
use Magento\Framework\Serialize\SerializerInterface;

/**
 * Cookie consent configuration data container with caching
 */
class Data extends ConfigData
{
    /**
     * Cache identifier
     */
    private const CACHE_ID = 'cookie_consent_config';

    /**
     * @param Reader $reader Config reader
     * @param CacheInterface $cache Config cache
     * @param SerializerInterface $serializer Serializer for cache
     * @param string $cacheId Cache identifier
     */
    public function __construct(
        Reader $reader,
        CacheInterface $cache,
        SerializerInterface $serializer,
        string $cacheId = self::CACHE_ID
    ) {
        parent::__construct($reader, $cache, $cacheId, $serializer);
    }

    /**
     * Get all categories configuration
     *
     * @return array<string, array<string, mixed>>
     */
    public function getCategories(): array
    {
        return $this->get('categories') ?? [];
    }

    /**
     * Get all services configuration
     *
     * @return array<string, array<string, mixed>>
     */
    public function getServices(): array
    {
        return $this->get('services') ?? [];
    }

    /**
     * Get single category configuration by code
     *
     * @param string $code Category code
     * @return array<string, mixed>|null
     */
    public function getCategory(string $code): ?array
    {
        return $this->get('categories/' . $code);
    }

    /**
     * Get single service configuration by code
     *
     * @param string $code Service code
     * @return array<string, mixed>|null
     */
    public function getService(string $code): ?array
    {
        return $this->get('services/' . $code);
    }
}
