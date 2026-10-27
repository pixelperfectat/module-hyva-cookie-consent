<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\ViewModel;

use Magento\Framework\Serialize\Serializer\Json;
use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Category;
use Pixelperfect\HyvaCookieConsent\Model\CategoryFactory;
use Pixelperfect\HyvaCookieConsent\Model\CategoryPool;
use Pixelperfect\HyvaCookieConsent\Model\Config\CookieConsent\Data as ConfigData;
use Pixelperfect\HyvaCookieConsent\Model\Service;
use Pixelperfect\HyvaCookieConsent\Model\ServiceFactory;
use Pixelperfect\HyvaCookieConsent\Model\ServicePool;
use Pixelperfect\HyvaCookieConsent\Test\Unit\Fake\FakeScopeConfig;
use Pixelperfect\HyvaCookieConsent\ViewModel\CookieConsent;

class CookieConsentTest extends TestCase
{
    private FakeScopeConfig $scopeConfig;
    private CategoryPool $categoryPool;
    private ServicePool $servicePool;

    protected function setUp(): void
    {
        $this->scopeConfig = new FakeScopeConfig();
    }

    /**
     * @param array<string, array<string, mixed>> $categories
     * @param array<string, array<string, mixed>> $services
     */
    private function viewModel(array $categories = [], array $services = []): CookieConsent
    {
        $scopeConfig = $this->scopeConfig;
        $configData = $this->createMock(ConfigData::class);
        $configData->method('getCategories')->willReturn($categories);
        $configData->method('getServices')->willReturn($services);

        $categoryFactory = $this->createMock(CategoryFactory::class);
        $categoryFactory->method('create')->willReturnCallback(static fn(array $data) => new Category(...$data));
        $serviceFactory = $this->createMock(ServiceFactory::class);
        $serviceFactory->method('create')->willReturnCallback(
            static fn(array $data) => new Service($scopeConfig, ...$data)
        );

        $this->categoryPool = new CategoryPool($categoryFactory, $configData);
        $this->servicePool = new ServicePool($serviceFactory, $configData);

        return new CookieConsent($this->scopeConfig, $this->categoryPool, $this->servicePool, new Json());
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function categories(): array
    {
        return [
            'marketing' => ['code' => 'marketing', 'required' => false, 'sort_order' => 30],
            'necessary' => ['code' => 'necessary', 'required' => true, 'sort_order' => 10],
            'analytics' => ['code' => 'analytics', 'required' => false, 'sort_order' => 20],
        ];
    }

    /**
     * Services with overlapping and empty cookie names; hotjar is disabled.
     *
     * @return array<string, array<string, mixed>>
     */
    private function services(): array
    {
        $this->scopeConfig->set('hyva_cookie_consent/services/google_analytics_4/enabled', '1');
        $this->scopeConfig->set('hyva_cookie_consent/services/hotjar/enabled', '0');

        return [
            'magento_session' => [
                'category' => 'necessary',
                'cookies' => ['PHPSESSID' => ['name' => 'PHPSESSID'], 'form_key' => ['name' => 'form_key']],
            ],
            'google_analytics_4' => [
                'category' => 'analytics',
                'template' => 'Vendor_Module::ga4.phtml',
                'cookies' => ['_ga' => ['name' => '_ga'], '_ga_*' => ['name' => '_ga_*'], 'blank' => ['name' => '']],
            ],
            'other_analytics' => [
                'category' => 'analytics',
                'cookies' => ['_ga' => ['name' => '_ga'], 'nameless' => ['duration' => '1 day']],
            ],
            'hotjar' => [
                'category' => 'analytics',
                'template' => 'Vendor_Module::hotjar.phtml',
                'cookies' => ['_hjid' => ['name' => '_hjid']],
            ],
            'facebook_pixel' => [
                'category' => 'marketing',
                'template' => 'Vendor_Module::fb.phtml',
                'enabled_by_default' => false,
                'cookies' => ['_fbp' => ['name' => '_fbp']],
            ],
        ];
    }

    public function testEnabledFlagIsReadAtStoreScope(): void
    {
        self::assertFalse($this->viewModel()->isEnabled());

        $this->scopeConfig->set('web/hyva_cookie_consent/general/enabled', '1', 'default');
        self::assertFalse($this->viewModel()->isEnabled());

        $this->scopeConfig->set('web/hyva_cookie_consent/general/enabled', '1');
        self::assertTrue($this->viewModel()->isEnabled());
    }

    public function testFallbacksWhenNothingIsConfigured(): void
    {
        $viewModel = $this->viewModel();

        self::assertSame(365, $viewModel->getCookieLifetime());
        self::assertSame(1, $viewModel->getConsentVersion());
        self::assertSame('modal', $viewModel->getBannerStyle());
        self::assertSame('left', $viewModel->getFloatingButtonPosition());
        self::assertSame('Cookie Settings', $viewModel->getBannerHeadline());
        self::assertStringStartsWith('We use cookies to enhance', $viewModel->getBannerDescription());
        self::assertSame('/privacy-policy', $viewModel->getPrivacyPolicyUrl());
        self::assertFalse($viewModel->isGtmInfrastructureMode());
        self::assertNull($viewModel->getGtmContainerId());
    }

    public function testEmptyValuesAlsoFallBack(): void
    {
        foreach (['general/cookie_lifetime', 'general/consent_version', 'ui/banner_style',
                     'ui/floating_button_position', 'text/banner_headline', 'text/privacy_policy_url'] as $path) {
            $this->scopeConfig->set('web/hyva_cookie_consent/' . $path, '');
        }
        $this->scopeConfig->set('web/hyva_cookie_consent/general/cookie_lifetime', '0');
        $this->scopeConfig->set('hyva_cookie_consent/services/google_tag_manager/container_id', '');
        $viewModel = $this->viewModel();

        self::assertSame(365, $viewModel->getCookieLifetime());
        self::assertSame(1, $viewModel->getConsentVersion());
        self::assertSame('modal', $viewModel->getBannerStyle());
        self::assertSame('left', $viewModel->getFloatingButtonPosition());
        self::assertSame('Cookie Settings', $viewModel->getBannerHeadline());
        self::assertSame('/privacy-policy', $viewModel->getPrivacyPolicyUrl());
        self::assertNull($viewModel->getGtmContainerId());
    }

    public function testConfiguredValuesAreReturned(): void
    {
        $values = [
            'web/hyva_cookie_consent/general/cookie_lifetime' => '30',
            'web/hyva_cookie_consent/general/consent_version' => '4',
            'web/hyva_cookie_consent/ui/banner_style' => 'bar',
            'web/hyva_cookie_consent/ui/floating_button_position' => 'right',
            'web/hyva_cookie_consent/text/banner_headline' => 'Cookies',
            'web/hyva_cookie_consent/text/banner_description' => 'We ask first.',
            'web/hyva_cookie_consent/text/privacy_policy_url' => '/privacy',
            'hyva_cookie_consent/services/google_tag_manager/loading_strategy' => 'infrastructure',
            'hyva_cookie_consent/services/google_tag_manager/container_id' => 'GTM-XXXXXXX',
        ];
        foreach ($values as $path => $value) {
            $this->scopeConfig->set($path, $value);
        }
        $viewModel = $this->viewModel();

        self::assertSame(30, $viewModel->getCookieLifetime());
        self::assertSame(4, $viewModel->getConsentVersion());
        self::assertSame('bar', $viewModel->getBannerStyle());
        self::assertSame('right', $viewModel->getFloatingButtonPosition());
        self::assertSame('Cookies', $viewModel->getBannerHeadline());
        self::assertSame('We ask first.', $viewModel->getBannerDescription());
        self::assertSame('/privacy', $viewModel->getPrivacyPolicyUrl());
        self::assertTrue($viewModel->isGtmInfrastructureMode());
        self::assertSame('GTM-XXXXXXX', $viewModel->getGtmContainerId());
    }

    public function testOnlyTheInfrastructureStrategyCountsAsInfrastructureMode(): void
    {
        $this->scopeConfig->set('hyva_cookie_consent/services/google_tag_manager/loading_strategy', 'strict');

        self::assertFalse($this->viewModel()->isGtmInfrastructureMode());
    }

    public function testCategoriesAndServicesComeFromThePools(): void
    {
        $viewModel = $this->viewModel(self::categories(), $this->services());

        self::assertSame(['necessary', 'analytics', 'marketing'], array_keys($viewModel->getCategories()));
        self::assertSame(
            ['magento_session', 'google_analytics_4', 'other_analytics'],
            array_keys($viewModel->getEnabledServices())
        );
        self::assertSame(
            ['google_analytics_4', 'other_analytics'],
            array_keys($viewModel->getServicesForCategory('analytics'))
        );
        self::assertSame($this->servicePool, $viewModel->getServicePool());
        self::assertSame($this->categoryPool, $viewModel->getCategoryPool());
    }

    public function testCookieConsentConfigListsCookieNamesOfEnabledServicesPerCategory(): void
    {
        $json = $this->viewModel(self::categories(), $this->services())->getCookieConsentConfigJson();

        self::assertSame(
            '{"necessary":["PHPSESSID","form_key"],"analytics":["_ga","_ga_*"]}',
            $json,
            'Disabled services are left out, names are unique and empty names are dropped'
        );
    }

    public function testEmptyPoolsGiveEmptyJsonObjects(): void
    {
        $viewModel = $this->viewModel();

        self::assertSame('[]', $viewModel->getCookieConsentConfigJson());
        self::assertSame('[]', $viewModel->getCookiePatternsForDeletionJson());
        self::assertSame('{"necessary":true}', $viewModel->getInitialConsentGroupsJson());
    }

    public function testInitialConsentGroupsGrantOnlyNecessary(): void
    {
        self::assertSame(
            '{"necessary":true,"analytics":false,"marketing":false}',
            $this->viewModel(self::categories())->getInitialConsentGroupsJson()
        );
    }

    public function testDeletionPatternsCoverDisabledServicesToo(): void
    {
        self::assertSame(
            '{"necessary":["PHPSESSID","form_key"],"analytics":["_ga","_ga_*","_hjid"],"marketing":["_fbp"]}',
            $this->viewModel(self::categories(), $this->services())->getCookiePatternsForDeletionJson()
        );
    }
}
