<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Test\Unit\Template;

use PHPUnit\Framework\TestCase;

class ConsentBannerTest extends TestCase
{
    private static function classesOf(string $testId): string
    {
        $content = (string) file_get_contents(__DIR__ . '/../../../src/view/frontend/templates/consent-banner.phtml');
        self::assertSame(
            1,
            preg_match('/data-testid="' . $testId . '"\s+class="([^"]+)"/', $content, $match),
            'Button ' . $testId . ' not found'
        );

        return (string) preg_replace('/\s+/', ' ', $match[1]);
    }

    /**
     * Regulators (EDPB guidelines 03/2022, CNIL, DSK) treat a visually weaker reject option as nudging.
     */
    public function testRejectAllLooksExactlyLikeAcceptAll(): void
    {
        self::assertSame(self::classesOf('cookie-accept-all'), self::classesOf('cookie-reject-all'));
        self::assertStringContainsString('btn-primary', self::classesOf('cookie-reject-all'));
    }
}
