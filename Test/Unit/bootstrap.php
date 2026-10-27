<?php

declare(strict_types=1);

use Magento\Framework\Code\Generator\Io;
use Magento\Framework\Filesystem\Driver\File;
use Magento\Framework\TestFramework\Unit\Autoloader\FactoryGenerator;
use Magento\Framework\TestFramework\Unit\Autoloader\GeneratedClassesAutoloader;

require dirname(__DIR__, 2) . '/vendor/autoload.php';

if (!function_exists('__')) {
    require dirname(__DIR__, 2) . '/vendor/magento/framework/Phrase/__.php';
}

// Magento generates *Factory classes at runtime. Generate mockable stand-ins for the unit tests.
$generatedClassesAutoloader = new GeneratedClassesAutoloader(
    [new FactoryGenerator()],
    new Io(new File(), sys_get_temp_dir() . '/hyva-cookie-consent-unit-generated')
);
spl_autoload_register([$generatedClassesAutoloader, 'load']);
