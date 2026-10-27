<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Api\Data\ServiceInterface;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Data as ConfigData;
use Pixelperfect\HyvaCookieConsent\Model\Service;
use Pixelperfect\HyvaCookieConsent\Model\ServiceFactory;
use Pixelperfect\HyvaCookieConsent\Model\ServicePool;
use Pixelperfect\HyvaCookieConsent\Test\Unit\Fake\FakeScopeConfig;

class ServicePoolTest extends TestCase
{
    private FakeScopeConfig $scopeConfig;

    protected function setUp(): void
    {
        $this->scopeConfig = new FakeScopeConfig();
    }

    /**
     * @param array<string, array<string, mixed>> $services
     */
    private function pool(array $services): ServicePool
    {
        $scopeConfig = $this->scopeConfig;
        $factory = $this->createMock(ServiceFactory::class);
        $factory->method('create')->willReturnCallback(
            static fn(array $data) => new Service($scopeConfig, ...$data)
        );
        $configData = $this->createMock(ConfigData::class);
        $configData->method('getServices')->willReturn($services);

        return new ServicePool($factory, $configData);
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private static function blockable(string $code, string $category, array $extra = []): array
    {
        return array_merge(
            ['code' => $code, 'category' => $category, 'template' => 'Vendor_Module::' . $code . '.phtml'],
            $extra
        );
    }

    private function enable(string $code, bool $enabled = true): void
    {
        $this->scopeConfig->set('hyva_cookie_consent/services/' . $code . '/enabled', $enabled ? '1' : '0');
    }

    /**
     * A pool with an informational service, two enabled and one disabled blockable service.
     */
    private function mixedPool(): ServicePool
    {
        $this->enable('google_tag_manager');
        $this->enable('facebook_pixel');
        $this->enable('hotjar', false);
        $this->scopeConfig->set('hyva_cookie_consent/services/facebook_pixel/loading_method', 'gtm');

        return $this->pool([
            'magento_session' => [
                'code' => 'magento_session',
                'category' => 'necessary',
                'cookies' => ['PHPSESSID' => ['name' => 'PHPSESSID']],
            ],
            'google_tag_manager' => self::blockable('google_tag_manager', 'analytics', ['is_tag_manager' => true]),
            'facebook_pixel' => self::blockable('facebook_pixel', 'marketing', [
                'managed_by' => 'google_tag_manager',
                'cookies' => ['_fbp' => ['name' => '_fbp']],
            ]),
            'hotjar' => self::blockable('hotjar', 'analytics', [
                'managed_by' => 'google_tag_manager',
                'cookies' => ['_hjid' => ['name' => '_hjid']],
            ]),
        ]);
    }

    /**
     * @param array<string, ServiceInterface> $services
     * @return array<int, string>
     */
    private static function codes(array $services): array
    {
        return array_keys($services);
    }

    public function testBuildsServicesFromTheXmlConfig(): void
    {
        $pool = $this->pool([
            'tracker' => [
                'code' => 'tracker',
                'title' => 'Tracker',
                'description' => 'Tracks',
                'category' => 'marketing',
                'template' => 'Vendor_Module::tracker.phtml',
                'is_tag_manager' => '1',
                'managed_by' => 'google_tag_manager',
                'config_fields' => ['id' => ['code' => 'id']],
                'cookies' => ['_t' => ['name' => '_t']],
                'enabled_by_default' => '1',
            ],
        ]);

        $service = $pool->getService('tracker');
        self::assertInstanceOf(Service::class, $service);
        self::assertSame(['id' => ['code' => 'id']], $service->getConfigFields());
        self::assertSame('Tracker', $service->getTitle());
        self::assertSame('Tracks', $service->getDescription());
        self::assertSame('marketing', $service->getCategory());
        self::assertSame('Vendor_Module::tracker.phtml', $service->getTemplate());
        self::assertTrue($service->isTagManager());
        self::assertSame('google_tag_manager', $service->getManagedBy());
        self::assertSame(['_t' => ['name' => '_t']], $service->getCookies());
        self::assertTrue($service->isEnabled(), 'enabled_by_default applies while the admin flag is unset');
        self::assertNull($pool->getService('unknown'));
    }

    public function testMissingValuesGetDefaults(): void
    {
        $pool = $this->pool([
            'plain' => [],
            'blockable' => ['template' => 'Vendor_Module::x.phtml'],
        ]);

        $plain = $pool->getService('plain');
        self::assertInstanceOf(Service::class, $plain);
        self::assertSame('plain', $plain->getCode());
        self::assertSame('', $plain->getTitle());
        self::assertSame('', $plain->getDescription());
        self::assertSame('analytics', $plain->getCategory());
        self::assertSame('', $plain->getTemplate());
        self::assertFalse($plain->isTagManager());
        self::assertNull($plain->getManagedBy());
        self::assertSame([], $plain->getConfigFields());
        self::assertSame([], $plain->getCookies());

        $blockable = $pool->getService('blockable');
        self::assertInstanceOf(ServiceInterface::class, $blockable);
        self::assertFalse($blockable->isEnabled(), 'Blockable services are off unless enabled_by_default says so');
    }

    public function testTheCodeInTheDataWinsOverTheArrayKey(): void
    {
        $service = $this->pool(['legacy_key' => ['code' => 'tracker']])->getService('legacy_key');

        self::assertInstanceOf(ServiceInterface::class, $service);
        self::assertSame('tracker', $service->getCode());
    }

    public function testFiltersEnabledServices(): void
    {
        $pool = $this->mixedPool();

        self::assertSame(
            ['magento_session', 'google_tag_manager', 'facebook_pixel', 'hotjar'],
            self::codes($pool->getAllServices())
        );
        self::assertSame(
            ['magento_session', 'google_tag_manager', 'facebook_pixel'],
            self::codes($pool->getEnabledServices())
        );
    }

    public function testEnabledServicesAreComputedOncePerRequest(): void
    {
        $pool = $this->mixedPool();
        $first = $pool->getEnabledServices();
        $this->enable('hotjar');

        self::assertSame($first, $pool->getEnabledServices());
        self::assertArrayNotHasKey('hotjar', $pool->getServicesForCategory('analytics'));
    }

    public function testServicesForCategoryOnlyIncludesEnabledOnes(): void
    {
        $pool = $this->mixedPool();

        self::assertSame(['google_tag_manager'], self::codes($pool->getServicesForCategory('analytics')));
        self::assertSame(['facebook_pixel'], self::codes($pool->getServicesForCategory('marketing')));
        self::assertSame([], $pool->getServicesForCategory('preferences'));
    }

    public function testTagManagerAndManagedServices(): void
    {
        $pool = $this->mixedPool();

        self::assertSame(['google_tag_manager'], self::codes($pool->getTagManagerServices()));
        self::assertSame(
            ['facebook_pixel', 'hotjar'],
            self::codes($pool->getServicesManagedBy('google_tag_manager')),
            'Managed services are listed whether enabled or not'
        );
        self::assertSame([], $pool->getServicesManagedBy('other'));
    }

    public function testCookiesByCategoryCoverEnabledServicesOnly(): void
    {
        self::assertSame(
            [
                'necessary' => ['PHPSESSID' => ['name' => 'PHPSESSID']],
                'analytics' => [],
                'marketing' => ['_fbp' => ['name' => '_fbp']],
            ],
            $this->mixedPool()->getAllCookiesByCategory()
        );
    }

    public function testCookiesOfServicesInTheSameCategoryAreCombined(): void
    {
        $this->enable('a');
        $this->enable('b');
        $pool = $this->pool([
            'a' => self::blockable('a', 'analytics', ['cookies' => ['_a' => ['name' => '_a']]]),
            'b' => self::blockable('b', 'analytics', ['cookies' => ['_b' => ['name' => '_b']]]),
        ]);

        self::assertSame(
            ['analytics' => ['_a' => ['name' => '_a'], '_b' => ['name' => '_b']]],
            $pool->getAllCookiesByCategory()
        );
    }

    public function testSplitsByLoadingMethod(): void
    {
        $pool = $this->mixedPool();

        self::assertSame(['magento_session', 'google_tag_manager'], self::codes($pool->getDirectLoadingServices()));
        self::assertSame(['facebook_pixel'], self::codes($pool->getGtmLoadingServices()));
        self::assertSame(['google_tag_manager'], self::codes($pool->getDirectLoadingServicesForCategory('analytics')));
        self::assertSame([], $pool->getDirectLoadingServicesForCategory('marketing'));
        self::assertSame(['facebook_pixel'], self::codes($pool->getGtmLoadingServicesForCategory('marketing')));
        self::assertSame([], $pool->getGtmLoadingServicesForCategory('analytics'));
    }
}
