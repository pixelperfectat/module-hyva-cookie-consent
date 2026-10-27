<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Observer;

use Magento\Framework\App\Filesystem\DirectoryList;
use Magento\Framework\Component\ComponentRegistrar;
use Magento\Framework\Event\Observer as Event;
use Magento\Framework\Event\ObserverInterface;

/**
 * Adds this module to Hyva's Tailwind config so its template classes end up in the theme CSS
 */
class RegisterModuleForHyvaConfig implements ObserverInterface
{
    /**
     * @param ComponentRegistrar $componentRegistrar Resolves the module's install path
     * @param DirectoryList $directoryList Resolves the Magento root
     */
    public function __construct(
        private readonly ComponentRegistrar $componentRegistrar,
        private readonly DirectoryList $directoryList
    ) {
    }

    /**
     * Append the module's path, relative to the Magento root, to the hyva_config_generate_before extensions
     *
     * @param Event $event
     * @return void
     */
    public function execute(Event $event): void
    {
        $config = $event->getData('config');
        $extensions = $config->hasData('extensions') ? $config->getData('extensions') : [];

        $path = $this->componentRegistrar->getPath(ComponentRegistrar::MODULE, 'Pixelperfect_HyvaCookieConsent');
        $rootPath = $this->directoryList->getRoot();

        $extensions[] = ['src' => substr($path, strlen($rootPath) + 1)];

        $config->setData('extensions', $extensions);
    }
}
