<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent;

use DOMDocument;
use DOMElement;
use DOMNode;
use Magento\Framework\Config\ConverterInterface;

/**
 * Converts cookie_consent.xml DOM to PHP array
 */
class Converter implements ConverterInterface
{
    /**
     * Convert DOM document to array
     *
     * @param DOMDocument $source XML document
     * @return array{categories: array<string, array<string, mixed>>, services: array<string, array<string, mixed>>}
     */
    public function convert($source): array
    {
        $result = [
            'categories' => [],
            'services' => [],
        ];

        $xpath = new \DOMXPath($source);

        // Convert categories
        $categoryNodes = $xpath->query('/cookie_consent/categories/category');
        if ($categoryNodes !== false) {
            foreach ($categoryNodes as $categoryNode) {
                if ($categoryNode instanceof DOMElement) {
                    $categoryData = $this->convertCategory($categoryNode);
                    $result['categories'][$categoryData['code']] = $categoryData;
                }
            }
        }

        // Convert services
        $serviceNodes = $xpath->query('/cookie_consent/services/service');
        if ($serviceNodes !== false) {
            foreach ($serviceNodes as $serviceNode) {
                if ($serviceNode instanceof DOMElement) {
                    $serviceData = $this->convertService($serviceNode);
                    $result['services'][$serviceData['code']] = $serviceData;
                }
            }
        }

        return $result;
    }

    /**
     * Convert category node to array
     *
     * @param DOMElement $node Category DOM element
     * @return array<string, mixed>
     */
    private function convertCategory(DOMElement $node): array
    {
        return [
            'code' => $node->getAttribute('code'),
            'title' => $this->getChildNodeValue($node, 'title'),
            'description' => $this->getChildNodeValue($node, 'description'),
            'required' => $this->getBoolAttribute($node, 'required', false),
            'sort_order' => (int) ($node->getAttribute('sort_order') ?: 100),
        ];
    }

    /**
     * Convert service node to array
     *
     * @param DOMElement $node Service DOM element
     * @return array<string, mixed>
     */
    private function convertService(DOMElement $node): array
    {
        $serviceData = [
            'code' => $node->getAttribute('code'),
            'category' => $node->getAttribute('category'),
            'title' => $this->getChildNodeValue($node, 'title'),
            'description' => $this->getChildNodeValue($node, 'description'),
            'template' => $this->getChildNodeValue($node, 'template'),
            'enabled_by_default' => $this->getChildNodeBoolValue($node, 'enabled_by_default', false),
            'is_tag_manager' => $this->getChildNodeBoolValue($node, 'is_tag_manager', false),
            'managed_by' => $this->getChildNodeValue($node, 'managed_by'),
            'config_fields' => $this->convertConfigFields($node),
            'cookies' => $this->convertCookies($node),
        ];

        return $serviceData;
    }

    /**
     * Convert config_fields child nodes to array
     *
     * @param DOMElement $serviceNode Service DOM element
     * @return array<string, array<string, mixed>>
     */
    private function convertConfigFields(DOMElement $serviceNode): array
    {
        $configFields = [];
        $fieldsNode = $this->getChildElement($serviceNode, 'config_fields');

        if ($fieldsNode === null) {
            return $configFields;
        }

        foreach ($fieldsNode->childNodes as $fieldNode) {
            if ($fieldNode instanceof DOMElement && $fieldNode->nodeName === 'field') {
                $code = $fieldNode->getAttribute('code');
                $configFields[$code] = [
                    'code' => $code,
                    'type' => $fieldNode->getAttribute('type') ?: 'text',
                    'required' => $this->getBoolAttribute($fieldNode, 'required', false),
                ];
            }
        }

        return $configFields;
    }

    /**
     * Convert cookies child nodes to array
     *
     * @param DOMElement $serviceNode Service DOM element
     * @return array<string, array<string, string>>
     */
    private function convertCookies(DOMElement $serviceNode): array
    {
        $cookies = [];
        $cookiesNode = $this->getChildElement($serviceNode, 'cookies');

        if ($cookiesNode === null) {
            return $cookies;
        }

        foreach ($cookiesNode->childNodes as $cookieNode) {
            if ($cookieNode instanceof DOMElement && $cookieNode->nodeName === 'cookie') {
                $name = $cookieNode->getAttribute('name');
                $cookies[$name] = [
                    'name' => $name,
                    'duration' => $cookieNode->getAttribute('duration'),
                    'description' => $this->getChildNodeValue($cookieNode, 'description'),
                ];
            }
        }

        return $cookies;
    }

    /**
     * Get text value of a child element
     *
     * @param DOMElement $parent Parent element
     * @param string $childName Child element name
     * @return string|null
     */
    private function getChildNodeValue(DOMElement $parent, string $childName): ?string
    {
        $child = $this->getChildElement($parent, $childName);
        return $child?->textContent ?: null;
    }

    /**
     * Get boolean value of a child element
     *
     * @param DOMElement $parent Parent element
     * @param string $childName Child element name
     * @param bool $default Default value
     * @return bool
     */
    private function getChildNodeBoolValue(DOMElement $parent, string $childName, bool $default): bool
    {
        $value = $this->getChildNodeValue($parent, $childName);
        if ($value === null) {
            return $default;
        }
        return in_array(strtolower($value), ['true', '1', 'yes'], true);
    }

    /**
     * Get child element by name
     *
     * @param DOMElement $parent Parent element
     * @param string $childName Child element name
     * @return DOMElement|null
     */
    private function getChildElement(DOMElement $parent, string $childName): ?DOMElement
    {
        foreach ($parent->childNodes as $child) {
            if ($child instanceof DOMElement && $child->nodeName === $childName) {
                return $child;
            }
        }
        return null;
    }

    /**
     * Get boolean attribute value
     *
     * @param DOMElement $node Element
     * @param string $attrName Attribute name
     * @param bool $default Default value
     * @return bool
     */
    private function getBoolAttribute(DOMElement $node, string $attrName, bool $default): bool
    {
        $value = $node->getAttribute($attrName);
        if ($value === '') {
            return $default;
        }
        return in_array(strtolower($value), ['true', '1', 'yes'], true);
    }
}
