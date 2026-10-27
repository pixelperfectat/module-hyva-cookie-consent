<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model\Config\CookieConsent;

use DOMDocument;
use Magento\Framework\Config\FileResolverInterface;
use Magento\Framework\Config\ValidationStateInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Module\Dir;
use Magento\Framework\Module\Dir\Reader as ModuleReader;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Converter;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Reader;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\SchemaLocator;

/**
 * Reads cookie_consent.xml files through the real merger, converter and XSD.
 */
class ReaderTest extends TestCase
{
    private const ETC_DIR = __DIR__ . '/../../../../../src/etc';

    private function schemaLocator(): SchemaLocator
    {
        $moduleReader = $this->createMock(ModuleReader::class);
        $moduleReader->method('getModuleDir')
            ->with(Dir::MODULE_ETC_DIR, 'Pixelperfect_HyvaCookieConsent')
            ->willReturn(self::ETC_DIR);

        return new SchemaLocator($moduleReader);
    }

    /**
     * @param array<string, string> $files
     */
    private function reader(array $files): Reader
    {
        $fileResolver = new class ($files) implements FileResolverInterface {
            /**
             * @param array<string, string> $files
             */
            public function __construct(private readonly array $files)
            {
            }

            /**
             * @inheritDoc
             */
            public function get($filename, $scope)
            {
                return $filename === 'cookie_consent.xml' ? $this->files : [];
            }
        };
        $validationState = new class implements ValidationStateInterface {
            /**
             * @inheritDoc
             */
            public function isValidationRequired()
            {
                return true;
            }
        };

        return new Reader($fileResolver, new Converter(), $this->schemaLocator(), $validationState);
    }

    public function testSchemaLocatorPointsAtTheModuleXsd(): void
    {
        $locator = $this->schemaLocator();

        self::assertSame(self::ETC_DIR . '/cookie_consent.xsd', $locator->getSchema());
        self::assertSame(self::ETC_DIR . '/cookie_consent.xsd', $locator->getPerFileSchema());
    }

    public function testShippedConfigurationIsValid(): void
    {
        $dom = new DOMDocument();
        $dom->load(self::ETC_DIR . '/cookie_consent.xml');

        self::assertTrue($dom->schemaValidate(self::ETC_DIR . '/cookie_consent.xsd'));
    }

    public function testMergesFilesFromSeveralModulesByCode(): void
    {
        $base = (string) file_get_contents(self::ETC_DIR . '/cookie_consent.xml');
        $extension = <<<XML
<?xml version="1.0"?>
<cookie_consent>
    <categories>
        <category code="analytics" sort_order="25">
            <title>Statistics</title>
            <description>Renamed by another module</description>
        </category>
    </categories>
    <services>
        <service code="google_analytics_4" category="analytics">
            <title>Google Analytics 4</title>
            <description>Web analytics</description>
            <cookies>
                <cookie name="_gid" duration="1 day"/>
            </cookies>
        </service>
        <service code="vendor_widget" category="preferences">
            <title>Widget</title>
            <description>Third-party widget</description>
        </service>
    </services>
</cookie_consent>
XML;

        $result = $this->reader(['base.xml' => $base, 'extension.xml' => $extension])->read();

        self::assertSame('Statistics', $result['categories']['analytics']['title']);
        self::assertSame(25, $result['categories']['analytics']['sort_order']);
        self::assertSame(
            ['_ga', '_ga_*', '_gid'],
            array_keys($result['services']['google_analytics_4']['cookies']),
            'Cookies merge by name instead of replacing the list'
        );
        self::assertSame(
            'Pixelperfect_HyvaCookieConsent::services/google-analytics-4.phtml',
            $result['services']['google_analytics_4']['template']
        );
        self::assertSame('preferences', $result['services']['vendor_widget']['category']);
        self::assertCount(4, $result['categories']);
    }

    public function testRejectsAFileThatViolatesTheSchema(): void
    {
        $invalid = '<?xml version="1.0"?><cookie_consent><category code="x"/></cookie_consent>';

        $this->expectException(LocalizedException::class);
        $this->reader(['invalid.xml' => $invalid])->read();
    }
}
