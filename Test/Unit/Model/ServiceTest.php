<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Pixelperfect\HyvaCookieConsent\Model\Config\Source\LoadingMethod;
use Pixelperfect\HyvaCookieConsent\Model\Service;
use Pixelperfect\HyvaCookieConsent\Test\Unit\Fake\FakeScopeConfig;

class ServiceTest extends TestCase
{
    private const ENABLED_PATH = 'hyva_cookie_consent/services/tracker/enabled';
    private const TEMPLATE = 'Vendor_Module::tracker.phtml';

    private FakeScopeConfig $scopeConfig;

    protected function setUp(): void
    {
        $this->scopeConfig = new FakeScopeConfig();
    }

    /**
     * @param array<string, mixed> $arguments
     */
    private function service(array $arguments = []): Service
    {
        return new Service(
            $this->scopeConfig,
            ...array_merge(
                ['code' => 'tracker', 'title' => 'Tracker', 'description' => 'Tracks', 'category' => 'analytics'],
                $arguments
            )
        );
    }

    public function testExposesItsDefinition(): void
    {
        $cookies = ['_trk' => ['name' => '_trk', 'duration' => '1 year', 'description' => 'ID']];
        $fields = ['tracking_id' => ['code' => 'tracking_id', 'type' => 'text', 'required' => '1']];
        $service = $this->service([
            'template' => self::TEMPLATE,
            'isTagManager' => true,
            'managedBy' => 'google_tag_manager',
            'configFields' => $fields,
            'cookies' => $cookies,
        ]);

        self::assertSame('tracker', $service->getCode());
        self::assertSame('Tracker', $service->getTitle());
        self::assertSame('Tracks', $service->getDescription());
        self::assertSame('analytics', $service->getCategory());
        self::assertSame(self::TEMPLATE, $service->getTemplate());
        self::assertTrue($service->hasTemplate());
        self::assertTrue($service->isTagManager());
        self::assertSame('google_tag_manager', $service->getManagedBy());
        self::assertSame($fields, $service->getConfigFields());
        self::assertSame($cookies, $service->getCookies());
    }

    public function testDefaultsForAnInformationalService(): void
    {
        $service = $this->service();

        self::assertSame('', $service->getTemplate());
        self::assertFalse($service->hasTemplate());
        self::assertFalse($service->isTagManager());
        self::assertNull($service->getManagedBy());
        self::assertSame([], $service->getConfigFields());
        self::assertSame([], $service->getCookies());
    }

    public function testServiceWithoutTemplateIsAlwaysEnabledWithoutReadingConfig(): void
    {
        $this->scopeConfig->set(self::ENABLED_PATH, '0');

        self::assertTrue($this->service(['enabledByDefault' => false])->isEnabled());
        self::assertSame(0, $this->scopeConfig->readCount(self::ENABLED_PATH));
    }

    public function testUnsetEnabledFlagFallsBackToTheDefault(): void
    {
        self::assertTrue($this->service(['template' => self::TEMPLATE])->isEnabled());
        self::assertTrue($this->service(['template' => self::TEMPLATE, 'enabledByDefault' => true])->isEnabled());
        self::assertFalse($this->service(['template' => self::TEMPLATE, 'enabledByDefault' => false])->isEnabled());
    }

    public function testStoreScopeEnabledFlagWins(): void
    {
        $this->scopeConfig->set(self::ENABLED_PATH, '0');
        self::assertFalse($this->service(['template' => self::TEMPLATE, 'enabledByDefault' => true])->isEnabled());

        $this->scopeConfig->set(self::ENABLED_PATH, '1');
        self::assertTrue($this->service(['template' => self::TEMPLATE, 'enabledByDefault' => false])->isEnabled());
    }

    public function testDefaultScopeEnabledFlagIsNotRead(): void
    {
        $this->scopeConfig->set(self::ENABLED_PATH, '1', 'default');

        self::assertFalse($this->service(['template' => self::TEMPLATE, 'enabledByDefault' => false])->isEnabled());
    }

    public function testEnabledStateIsReadOncePerInstance(): void
    {
        $this->scopeConfig->set(self::ENABLED_PATH, '0');
        $service = $this->service(['template' => self::TEMPLATE]);

        self::assertFalse($service->isEnabled());
        $this->scopeConfig->set(self::ENABLED_PATH, '1');
        self::assertFalse($service->isEnabled());
        self::assertSame(1, $this->scopeConfig->readCount(self::ENABLED_PATH));
    }

    public function testConfigValuesAreReadFromTheServiceSectionAndCached(): void
    {
        $path = 'hyva_cookie_consent/services/tracker/tracking_id';
        $this->scopeConfig->set($path, 'ID-123');
        $service = $this->service();

        self::assertSame('ID-123', $service->getConfigValue('tracking_id'));
        self::assertSame('ID-123', $service->getConfigValue('tracking_id'));
        self::assertSame(1, $this->scopeConfig->readCount($path));
    }

    public function testMissingConfigValueIsNullAndCachedToo(): void
    {
        $path = 'hyva_cookie_consent/services/tracker/missing';
        $service = $this->service();

        self::assertNull($service->getConfigValue('missing'));
        self::assertNull($service->getConfigValue('missing'));
        self::assertSame(1, $this->scopeConfig->readCount($path));
    }

    public function testHasRequiredConfigChecksOnlyRequiredFields(): void
    {
        $fields = [
            'optional' => ['code' => 'optional', 'type' => 'text', 'required' => ''],
            'tracking_id' => ['code' => 'tracking_id', 'type' => 'text', 'required' => '1'],
        ];
        $service = $this->service(['configFields' => $fields]);
        self::assertFalse($service->hasRequiredConfig(), 'Required field without a value');

        $this->scopeConfig->set('hyva_cookie_consent/services/tracker/tracking_id', 'ID-1');
        self::assertTrue($this->service(['configFields' => $fields])->hasRequiredConfig());
    }

    public function testHasRequiredConfigStopsAtTheFirstMissingRequiredField(): void
    {
        $fields = [
            'first' => ['code' => 'first', 'required' => '1'],
            'second' => ['code' => 'second', 'required' => '1'],
        ];
        $this->scopeConfig->set('hyva_cookie_consent/services/tracker/second', 'set');

        self::assertFalse($this->service(['configFields' => $fields])->hasRequiredConfig());
        self::assertTrue($this->service()->hasRequiredConfig(), 'No fields means nothing is missing');
    }

    public function testDisabledServiceHasTheDisabledLoadingMethod(): void
    {
        $this->scopeConfig->set(self::ENABLED_PATH, '0');
        $this->scopeConfig->set('hyva_cookie_consent/services/tracker/loading_method', 'direct');
        $service = $this->service(['template' => self::TEMPLATE]);

        self::assertSame(LoadingMethod::METHOD_DISABLED, $service->getLoadingMethod());
        self::assertFalse($service->isDirectLoading());
        self::assertFalse($service->isGtmLoading());
    }

    public function testConfiguredLoadingMethodWins(): void
    {
        $this->scopeConfig->set('hyva_cookie_consent/services/tracker/loading_method', 'gtm');
        $service = $this->service(['template' => self::TEMPLATE]);

        self::assertSame(LoadingMethod::METHOD_GTM, $service->getLoadingMethod());
        self::assertTrue($service->isGtmLoading());
        self::assertFalse($service->isDirectLoading());
    }

    public function testLoadingMethodDefaults(): void
    {
        $withTemplate = $this->service(['template' => self::TEMPLATE, 'managedBy' => 'google_tag_manager']);
        self::assertSame(LoadingMethod::METHOD_DIRECT, $withTemplate->getLoadingMethod());
        self::assertTrue($withTemplate->isDirectLoading());

        $managed = $this->service(['managedBy' => 'google_tag_manager']);
        self::assertSame(LoadingMethod::METHOD_GTM, $managed->getLoadingMethod());

        $informational = $this->service();
        self::assertSame(LoadingMethod::METHOD_DIRECT, $informational->getLoadingMethod());
    }
}
