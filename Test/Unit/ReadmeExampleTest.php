<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit;

use DOMDocument;
use PHPUnit\Framework\TestCase;

/**
 * The README's cookie_consent.xml example is copied into other modules, so it must validate.
 */
class ReadmeExampleTest extends TestCase
{
    public function testCookieConsentXmlExampleValidatesAgainstTheSchema(): void
    {
        $root = dirname(__DIR__, 2);
        $readme = (string) file_get_contents($root . '/README.md');
        self::assertSame(1, preg_match('/```xml\n(<\?xml.*?<\/cookie_consent>)\n```/s', $readme, $match));

        $dom = new DOMDocument();
        self::assertTrue($dom->loadXML($match[1]));
        self::assertTrue($dom->schemaValidate($root . '/src/etc/cookie_consent.xsd'));
    }
}
