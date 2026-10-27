<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Template;

use PHPUnit\Framework\TestCase;

/**
 * Static checks that keep the storefront templates working under Hyva's strict CSP (no unsafe-inline).
 *
 * Hyva authorises an inline script only when $hyvaCsp->registerInlineScript() runs right after its closing
 * tag (nonce on uncached pages, hash in the CSP header on cached ones). Scripts that are cloned into the
 * page later from a <template> are not covered by that, so service code must not live there.
 */
class StrictCspTest extends TestCase
{
    private const TEMPLATE_DIR = __DIR__ . '/../../../src/view/frontend/templates';
    private const REGISTER_CALL = '<?php $hyvaCsp->registerInlineScript() ?>';

    /**
     * @return array<string, array{0: string}>
     */
    public static function templateProvider(): array
    {
        $templates = [];
        foreach (glob(self::TEMPLATE_DIR . '/{,*/}*.phtml', GLOB_BRACE) ?: [] as $file) {
            $templates[substr($file, strlen(self::TEMPLATE_DIR) + 1)] = [$file];
        }
        return $templates;
    }

    public function testTheProviderFindsAllTemplates(): void
    {
        self::assertCount(9, self::templateProvider());
    }

    /**
     * @dataProvider templateProvider
     */
    public function testEveryExecutableInlineScriptIsRegistered(string $file): void
    {
        $content = (string) file_get_contents($file);
        preg_match_all('/<script\b([^>]*)>.*?<\/script>(\s*)/s', $content, $matches, PREG_OFFSET_CAPTURE);

        $unregistered = [];
        foreach ($matches[0] as $index => [$script, $offset]) {
            $attributes = $matches[1][$index][0];
            if (preg_match('/\btype="text\/plain"/', $attributes) || preg_match('/\bsrc=/', $attributes)) {
                continue; // inert placeholder or external script, no inline code to authorise
            }
            if (substr($content, $offset + strlen($script), strlen(self::REGISTER_CALL)) !== self::REGISTER_CALL) {
                $unregistered[] = 'line ' . (substr_count(substr($content, 0, $offset), "\n") + 1);
            }
        }

        self::assertSame([], $unregistered, 'Inline scripts not registered with HyvaCsp in ' . basename($file));
    }

    /**
     * @dataProvider templateProvider
     */
    public function testNoInlineScriptHidesInsideATemplateElement(string $file): void
    {
        $content = (string) file_get_contents($file);
        preg_match_all('/<template\b[^>]*>(.*?)<\/template>/s', $content, $matches);

        $withScripts = array_filter(
            $matches[1],
            static fn(string $templateContent) => str_contains($templateContent, '<script')
        );

        self::assertSame([], array_values($withScripts), basename($file));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function serviceTemplateProvider(): array
    {
        return [
            'GTM strict mode' => ['services/google-tag-manager.phtml'],
            'GA4' => ['services/google-analytics-4.phtml'],
            'Facebook Pixel' => ['services/facebook-pixel.phtml'],
            'Clarity' => ['services/microsoft-clarity.phtml'],
            'Hotjar' => ['services/hotjar.phtml'],
            'Matomo' => ['services/matomo.phtml'],
        ];
    }

    /**
     * @dataProvider serviceTemplateProvider
     */
    public function testServiceCodeIsAConsentGatedLoader(string $template): void
    {
        $content = (string) file_get_contents(self::TEMPLATE_DIR . '/' . $template);

        self::assertStringContainsString(
            "(window.hyvaCookieConsentLoaders = window.hyvaCookieConsentLoaders || []).push({\n"
            . "        category: '<?= \$escaper->escapeJs(\$category) ?>',\n"
            . '        load() {',
            $content
        );
    }

    public function testTheConfigScriptRunsLoadersOnlyForConsentedCategories(): void
    {
        $content = (string) file_get_contents(self::TEMPLATE_DIR . '/cookie-config.phtml');

        self::assertStringContainsString(
            'window.hyvaCookieConsentLoaders = window.hyvaCookieConsentLoaders || [];',
            $content
        );
        self::assertStringContainsString('if (consentedCategories.includes(loader.category)) {', $content);
        self::assertStringContainsString('loader.loaded = true;', $content);
    }
}
