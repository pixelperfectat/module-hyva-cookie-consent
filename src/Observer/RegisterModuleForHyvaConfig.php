<?php

declare(strict_types=1);

namespace Pixelperfect\HyvaCookieConsent\Observer;

use Magento\Framework\Component\ComponentRegistrar;
use Magento\Framework\Event\Observer as Event;
use Magento\Framework\Event\ObserverInterface;

class RegisterModuleForHyvaConfig implements ObserverInterface
{
    public function __construct(
        private readonly ComponentRegistrar $componentRegistrar
    ) {
    }

    public function execute(Event $event): void
    {
        $config = $event->getData('config');
        $extensions = $config->hasData('extensions') ? $config->getData('extensions') : [];

        $path = $this->componentRegistrar->getPath(ComponentRegistrar::MODULE, 'Pixelperfect_HyvaCookieConsent');

        $extensions[] = ['src' => substr($path, strlen(BP) + 1)];

        $config->setData('extensions', $extensions);
    }
}