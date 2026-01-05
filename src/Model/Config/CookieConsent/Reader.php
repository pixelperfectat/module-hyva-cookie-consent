<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent;

use Magento\Framework\Config\FileResolverInterface;
use Magento\Framework\Config\Reader\Filesystem;
use Magento\Framework\Config\ValidationStateInterface;

/**
 * Reads and merges cookie_consent.xml files from all modules
 */
class Reader extends Filesystem
{
    /**
     * List of id attributes for merging
     *
     * @var array<string, string>
     */
    protected $_idAttributes = [
        '/cookie_consent/categories/category' => 'code',
        '/cookie_consent/services/service' => 'code',
        '/cookie_consent/services/service/config_fields/field' => 'code',
        '/cookie_consent/services/service/cookies/cookie' => 'name',
    ];

    /**
     * @param FileResolverInterface $fileResolver File resolver
     * @param Converter $converter XML to array converter
     * @param SchemaLocator $schemaLocator XSD schema locator
     * @param ValidationStateInterface $validationState Validation state
     * @param string $fileName Config file name
     * @param array<string, string> $idAttributes ID attributes for merging
     * @param string $domDocumentClass DOM document class
     * @param string $defaultScope Default scope
     */
    public function __construct(
        FileResolverInterface $fileResolver,
        Converter $converter,
        SchemaLocator $schemaLocator,
        ValidationStateInterface $validationState,
        string $fileName = 'cookie_consent.xml',
        array $idAttributes = [],
        string $domDocumentClass = \Magento\Framework\Config\Dom::class,
        string $defaultScope = 'global'
    ) {
        parent::__construct(
            $fileResolver,
            $converter,
            $schemaLocator,
            $validationState,
            $fileName,
            $idAttributes,
            $domDocumentClass,
            $defaultScope
        );
    }
}
