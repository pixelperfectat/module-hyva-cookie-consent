<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Fake;

use Magento\Framework\App\Config\ScopeConfigInterface;

/**
 * In-memory config. Values are stored per scope type, so a read at the wrong scope returns null.
 */
class FakeScopeConfig implements ScopeConfigInterface
{
    /**
     * @var array<string, array<string, mixed>>
     */
    private array $values = [];

    /**
     * @var array<int, string>
     */
    private array $reads = [];

    /**
     * @param array<string, mixed> $storeValues Values readable at store scope
     */
    public function __construct(array $storeValues = [])
    {
        foreach ($storeValues as $path => $value) {
            $this->set($path, $value);
        }
    }

    public function set(string $path, mixed $value, string $scopeType = 'store'): self
    {
        $this->values[$scopeType][$path] = $value;
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function getValue($path, $scopeType = ScopeConfigInterface::SCOPE_TYPE_DEFAULT, $scopeCode = null)
    {
        $this->reads[] = (string) $path;
        return $this->values[$scopeType][$path] ?? null;
    }

    /**
     * @inheritDoc
     */
    public function isSetFlag($path, $scopeType = ScopeConfigInterface::SCOPE_TYPE_DEFAULT, $scopeCode = null)
    {
        return (bool) $this->getValue($path, $scopeType, $scopeCode);
    }

    /**
     * Number of reads of the given path
     */
    public function readCount(string $path): int
    {
        return count(array_filter($this->reads, static fn(string $read) => $read === $path));
    }
}
