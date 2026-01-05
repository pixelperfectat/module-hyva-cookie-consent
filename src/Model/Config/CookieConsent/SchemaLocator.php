<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent;

use Magento\Framework\Config\SchemaLocatorInterface;
use Magento\Framework\Module\Dir;
use Magento\Framework\Module\Dir\Reader as ModuleReader;

/**
 * Locates the XSD schema for cookie_consent.xml validation
 */
class SchemaLocator implements SchemaLocatorInterface
{
    private string $schema;

    /**
     * @param ModuleReader $moduleReader Module directory reader
     */
    public function __construct(
        ModuleReader $moduleReader
    ) {
        $etcDir = $moduleReader->getModuleDir(Dir::MODULE_ETC_DIR, 'Pixelperfect_HyvaCookieConsent');
        $this->schema = $etcDir . '/cookie_consent.xsd';
    }

    /**
     * Get path to merged config schema
     *
     * @return string
     */
    public function getSchema(): string
    {
        return $this->schema;
    }

    /**
     * Get path to per-file validation schema
     *
     * @return string
     */
    public function getPerFileSchema(): string
    {
        return $this->schema;
    }
}
