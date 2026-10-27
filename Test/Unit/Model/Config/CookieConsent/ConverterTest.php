<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model\Config\CookieConsent;

use DOMDocument;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Converter;

class ConverterTest extends TestCase
{
    private Converter $converter;

    protected function setUp(): void
    {
        $this->converter = new Converter();
    }

    /**
     * @return array{categories: array<string, array<string, mixed>>, services: array<string, array<string, mixed>>}
     */
    private function convert(string $xml): array
    {
        $dom = new DOMDocument();
        $dom->loadXML($xml);
        return $this->converter->convert($dom);
    }

    public function testEmptyDocumentYieldsEmptySections(): void
    {
        self::assertSame(['categories' => [], 'services' => []], $this->convert('<cookie_consent/>'));
    }

    public function testConvertsCategoryAttributesAndChildren(): void
    {
        $result = $this->convert(<<<XML
<cookie_consent>
    <categories>
        <category code="necessary" required="true" sort_order="10">
            <title>Strictly Necessary</title>
            <description>Always on</description>
        </category>
        <category code="social">
            <description>Social widgets</description>
            <title>Social</title>
        </category>
    </categories>
</cookie_consent>
XML);

        self::assertSame(
            [
                'necessary' => [
                    'code' => 'necessary',
                    'title' => 'Strictly Necessary',
                    'description' => 'Always on',
                    'required' => true,
                    'sort_order' => 10,
                ],
                'social' => [
                    'code' => 'social',
                    'title' => 'Social',
                    'description' => 'Social widgets',
                    'required' => false,
                    'sort_order' => 100,
                ],
            ],
            $result['categories']
        );
    }

    /**
     * @return array<string, array{0: string, 1: bool}>
     */
    public static function booleanAttributeProvider(): array
    {
        return [
            'true' => ['true', true],
            'TRUE (case-insensitive)' => ['TRUE', true],
            '1' => ['1', true],
            'yes' => ['yes', true],
            'Yes (case-insensitive)' => ['Yes', true],
            'false' => ['false', false],
            '0' => ['0', false],
            'anything else' => ['on', false],
        ];
    }

    /**
     * @dataProvider booleanAttributeProvider
     */
    public function testRequiredAttributeParsing(string $value, bool $expected): void
    {
        $result = $this->convert(
            '<cookie_consent><categories><category code="c" required="' . $value . '">'
            . '<title>T</title><description>D</description></category></categories></cookie_consent>'
        );

        self::assertSame($expected, $result['categories']['c']['required']);
    }

    /**
     * @dataProvider booleanAttributeProvider
     */
    public function testServiceBooleanChildParsing(string $value, bool $expected): void
    {
        $result = $this->convert(
            '<cookie_consent><services><service code="s" category="analytics"><title>T</title>'
            . '<description>D</description><enabled_by_default>' . $value . '</enabled_by_default>'
            . '<is_tag_manager>' . $value . '</is_tag_manager></service></services></cookie_consent>'
        );

        self::assertSame($expected, $result['services']['s']['enabled_by_default']);
        self::assertSame($expected, $result['services']['s']['is_tag_manager']);
    }

    public function testConvertsFullService(): void
    {
        $result = $this->convert(<<<XML
<cookie_consent>
    <services>
        <service code="tracker" category="marketing">
            <title>Tracker</title>
            <description>Tracks things</description>
            <template>Vendor_Module::tracker.phtml</template>
            <enabled_by_default>true</enabled_by_default>
            <is_tag_manager>false</is_tag_manager>
            <managed_by>google_tag_manager</managed_by>
            <config_fields>
                <!-- a comment node must be skipped -->
                <field code="tracking_id" type="select" required="true"/>
                <field code="note"/>
                <other code="ignored"/>
            </config_fields>
            <cookies>
                <!-- a comment node must be skipped -->
                <cookie name="_trk" duration="1 year">
                    <description>Visitor ID</description>
                </cookie>
                <cookie name="_trk_s" duration="Session"/>
                <other name="ignored" duration="x"/>
            </cookies>
        </service>
    </services>
</cookie_consent>
XML);

        self::assertSame(
            [
                'tracker' => [
                    'code' => 'tracker',
                    'category' => 'marketing',
                    'title' => 'Tracker',
                    'description' => 'Tracks things',
                    'template' => 'Vendor_Module::tracker.phtml',
                    'enabled_by_default' => true,
                    'is_tag_manager' => false,
                    'managed_by' => 'google_tag_manager',
                    'config_fields' => [
                        'tracking_id' => ['code' => 'tracking_id', 'type' => 'select', 'required' => true],
                        'note' => ['code' => 'note', 'type' => 'text', 'required' => false],
                    ],
                    'cookies' => [
                        '_trk' => ['name' => '_trk', 'duration' => '1 year', 'description' => 'Visitor ID'],
                        '_trk_s' => ['name' => '_trk_s', 'duration' => 'Session', 'description' => null],
                    ],
                ],
            ],
            $result['services']
        );
    }

    public function testMinimalServiceGetsDefaults(): void
    {
        $result = $this->convert(<<<XML
<cookie_consent>
    <services>
        <service code="info" category="necessary">
            <title>Info</title>
            <cookies>
                <cookie name="c1" duration="Session"><description>Nested description</description></cookie>
            </cookies>
        </service>
    </services>
</cookie_consent>
XML);

        $service = $result['services']['info'];
        // The cookie's description is not a direct child of the service, so it must not leak upwards.
        self::assertNull($service['description']);
        self::assertNull($service['template']);
        self::assertNull($service['managed_by']);
        self::assertFalse($service['enabled_by_default']);
        self::assertFalse($service['is_tag_manager']);
        self::assertSame([], $service['config_fields']);
        self::assertSame('Nested description', $service['cookies']['c1']['description']);
    }

    public function testEmptyChildElementsBecomeNull(): void
    {
        $result = $this->convert(
            '<cookie_consent><services><service code="s" category="a"><title></title><description/>'
            . '<template></template><config_fields/><cookies/></service></services></cookie_consent>'
        );

        self::assertNull($result['services']['s']['title']);
        self::assertNull($result['services']['s']['description']);
        self::assertNull($result['services']['s']['template']);
        self::assertSame([], $result['services']['s']['config_fields']);
        self::assertSame([], $result['services']['s']['cookies']);
    }

    public function testIgnoresElementsOutsideTheExpectedPaths(): void
    {
        $result = $this->convert(<<<XML
<cookie_consent>
    <category code="stray"><title>T</title><description>D</description></category>
    <categories>
        <!-- comment -->
        <category code="kept"><title>T</title><description>D</description></category>
    </categories>
    <services>
        <service code="kept_service" category="a"><title>T</title><description>D</description></service>
    </services>
    <service code="stray_service" category="a"><title>T</title><description>D</description></service>
</cookie_consent>
XML);

        self::assertSame(['kept'], array_keys($result['categories']));
        self::assertSame(['kept_service'], array_keys($result['services']));
    }

    public function testShippedConfigurationConvertsAsDocumented(): void
    {
        $dom = new DOMDocument();
        $dom->load(dirname(__DIR__, 5) . '/src/etc/cookie_consent.xml');
        $result = $this->converter->convert($dom);

        self::assertSame(['necessary', 'analytics', 'marketing', 'preferences'], array_keys($result['categories']));
        self::assertTrue($result['categories']['necessary']['required']);
        self::assertFalse($result['categories']['analytics']['required']);

        $categoriesByService = array_map(static fn(array $service) => $service['category'], $result['services']);
        self::assertSame('analytics', $categoriesByService['google_tag_manager']);
        self::assertSame('analytics', $categoriesByService['google_analytics_4']);
        self::assertSame('analytics', $categoriesByService['microsoft_clarity']);
        self::assertSame('analytics', $categoriesByService['hotjar']);
        self::assertSame('analytics', $categoriesByService['matomo']);
        self::assertSame('marketing', $categoriesByService['facebook_pixel']);
        self::assertTrue($result['services']['google_tag_manager']['is_tag_manager']);
    }
}
