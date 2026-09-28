<?php
/**
 * Local Development Overrides - EXAMPLE
 *
 * Copy this file to config.local.php and fill in your own credentials:
 *   cp api/config.local.example.php api/config.local.php
 *
 * config.local.php is loaded automatically by config.php when present and is
 * git-ignored, so it is the right place for real passwords. Never commit it.
 * Remove or comment this file out for production deployments.
 *
 * The DB_* constants are kept for backwards compatibility. EDUTRACK_DB_CONFIG
 * holds the same values in array form so config.php can apply environment
 * variable overrides without redefining an already-defined constant.
 *
 * Every define() below is guarded: when config.php has already defined a value
 * from an environment variable, this file must not overwrite it. Unguarded
 * defines are also what used to emit a warning on every request.
 */

if (!defined('EDUTRACK_DB_CONFIG')) {
    define('EDUTRACK_DB_CONFIG', [
        'host' => '127.0.0.1',
        'port' => '3306',
        'name' => 'edutrack',
        'user' => 'your_db_user',
        'pass' => 'your_db_password',
    ]);
}

if (!defined('DB_HOST')) define('DB_HOST', EDUTRACK_DB_CONFIG['host']);
if (!defined('DB_PORT')) define('DB_PORT', EDUTRACK_DB_CONFIG['port']);
if (!defined('DB_NAME')) define('DB_NAME', EDUTRACK_DB_CONFIG['name']);
if (!defined('DB_USER')) define('DB_USER', EDUTRACK_DB_CONFIG['user']);
if (!defined('DB_PASS')) define('DB_PASS', EDUTRACK_DB_CONFIG['pass']);
