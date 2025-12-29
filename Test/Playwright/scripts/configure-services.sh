#!/bin/bash
# =============================================================================
# Configure Cookie Consent Services for Testing
# =============================================================================
# Usage: ./configure-services.sh [infrastructure|strict]
#
# This script configures the Hyvä Cookie Consent module services in Magento
# based on the environment variables defined in .env
#
# Supports multiple Magento CLI environments:
# - Standard Magento (bin/magento)
# - Mark Shust's Docker (bin/cli bin/magento)
# - n98-magerun2

set -e

GTM_MODE=${1:-infrastructure}

# Find script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAYWRIGHT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find the Magento root - look for bin/magento or composer.json with magento
find_magento_root() {
    local current="$PLAYWRIGHT_DIR"

    # Go up directories looking for Magento root
    for i in {1..6}; do
        current="$(dirname "$current")"
        if [ -f "$current/bin/magento" ] || [ -f "$current/bin/cli" ]; then
            echo "$current"
            return 0
        fi
        # Check composer.json for Magento
        if [ -f "$current/composer.json" ] && grep -q "magento/product" "$current/composer.json" 2>/dev/null; then
            echo "$current"
            return 0
        fi
    done

    echo ""
}

PROJECT_ROOT=$(find_magento_root)

if [ -z "$PROJECT_ROOT" ]; then
    echo "WARNING: Could not auto-detect Magento root directory."
    echo "Trying current working directory..."
    PROJECT_ROOT="$(pwd)"
fi

echo "Magento root: $PROJECT_ROOT"

# Detect available Magento CLI
detect_magento_cli() {
    # Check for bin/magento (works for standard Magento and Docker setups like Mark Shust's)
    if [ -x "$PROJECT_ROOT/bin/magento" ]; then
        echo "$PROJECT_ROOT/bin/magento"
        return 0
    fi

    # Check for n98-magerun2 in PATH
    if command -v n98-magerun2 &> /dev/null; then
        echo "n98-magerun2 --root-dir=$PROJECT_ROOT"
        return 0
    fi

    # Check for magerun2 alias
    if command -v magerun2 &> /dev/null; then
        echo "magerun2 --root-dir=$PROJECT_ROOT"
        return 0
    fi

    echo ""
}

MAGENTO_CLI=$(detect_magento_cli)

if [ -z "$MAGENTO_CLI" ]; then
    echo "============================================================================="
    echo "ERROR: No Magento CLI found!"
    echo "============================================================================="
    echo ""
    echo "Please configure services manually in Magento Admin:"
    echo ""
    echo "  Stores > Configuration > Web > Cookie Consent (Hyva)"
    echo "  - Enable Cookie Consent: Yes"
    echo ""
    echo "  Stores > Configuration > Cookie Consent Services"
    echo "  - Enable and configure each service with your test IDs"
    echo ""
    echo "Or install n98-magerun2: https://github.com/netz98/n98-magerun2"
    echo "============================================================================="
    exit 1
fi

echo "Using Magento CLI: $MAGENTO_CLI"
echo ""

# Backup file location
BACKUP_FILE="$PLAYWRIGHT_DIR/.config-backup"

# Helper function to get current config value
get_config() {
    local path="$1"
    # Try config:show first (works for database and env.php values)
    local value
    value=$($MAGENTO_CLI config:show "$path" 2>/dev/null || echo "")
    # Trim whitespace
    echo "$value" | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Helper function to set config
set_config() {
    local path="$1"
    local value="$2"

    # Try with --lock-env first (Magento 2.2+), fall back to plain set
    if ! $MAGENTO_CLI config:set "$path" "$value" --lock-env 2>/dev/null; then
        $MAGENTO_CLI config:set "$path" "$value" 2>/dev/null || {
            echo "  WARNING: Failed to set $path"
            return 1
        }
    fi
    return 0
}

# Save current config to backup file before modifying
save_backup() {
    echo "Saving current configuration to backup..."

    # All config paths we modify
    local paths=(
        "hyva_cookie_consent/general/enabled"
        "hyva_cookie_consent/services/google_tag_manager/enabled"
        "hyva_cookie_consent/services/google_tag_manager/container_id"
        "hyva_cookie_consent/services/google_tag_manager/loading_strategy"
        "hyva_cookie_consent/services/google_analytics_4/enabled"
        "hyva_cookie_consent/services/google_analytics_4/measurement_id"
        "hyva_cookie_consent/services/facebook_pixel/enabled"
        "hyva_cookie_consent/services/facebook_pixel/pixel_id"
        "hyva_cookie_consent/services/hotjar/enabled"
        "hyva_cookie_consent/services/hotjar/site_id"
        "hyva_cookie_consent/services/microsoft_clarity/enabled"
        "hyva_cookie_consent/services/microsoft_clarity/project_id"
        "hyva_cookie_consent/services/matomo/enabled"
        "hyva_cookie_consent/services/matomo/tracker_url"
        "hyva_cookie_consent/services/matomo/site_id"
    )

    # Create backup file
    echo "# Cookie Consent Config Backup - $(date)" > "$BACKUP_FILE"
    echo "# Restore with: ./reset-services.sh" >> "$BACKUP_FILE"
    echo "" >> "$BACKUP_FILE"

    for path in "${paths[@]}"; do
        local value
        value=$(get_config "$path")
        echo "${path}=${value}" >> "$BACKUP_FILE"
    done

    echo "Backup saved to $BACKUP_FILE"
    echo ""
}

# Load .env file if exists
if [ -f "$PLAYWRIGHT_DIR/.env" ]; then
    echo "Loading configuration from .env..."
    # Export variables, ignoring comments and empty lines
    set -a
    # shellcheck source=/dev/null
    source <(grep -v '^#' "$PLAYWRIGHT_DIR/.env" | grep -v '^$' | sed 's/\r$//')
    set +a
else
    echo "WARNING: No .env file found at $PLAYWRIGHT_DIR/.env"
    echo "Using environment variables if set..."
fi

echo ""

# Save current configuration to backup before modifying
if [ ! -f "$BACKUP_FILE" ]; then
    save_backup
else
    echo "Backup already exists at $BACKUP_FILE"
    echo "Run ./reset-services.sh first to restore and remove the backup."
    echo ""
fi

echo "Configuring services..."
echo ""

# Enable module
echo "Enabling Cookie Consent module..."
set_config "hyva_cookie_consent/general/enabled" "1"

# Track if any service was configured
SERVICES_CONFIGURED=0

# Configure GTM if ID provided
if [ -n "$TEST_GTM_CONTAINER_ID" ]; then
    echo "Configuring Google Tag Manager ($GTM_MODE mode)..."
    set_config "hyva_cookie_consent/services/google_tag_manager/enabled" "1"
    set_config "hyva_cookie_consent/services/google_tag_manager/container_id" "$TEST_GTM_CONTAINER_ID"
    set_config "hyva_cookie_consent/services/google_tag_manager/loading_strategy" "$GTM_MODE"
    SERVICES_CONFIGURED=1
fi

# Configure GA4 if ID provided
if [ -n "$TEST_GA4_MEASUREMENT_ID" ]; then
    echo "Configuring Google Analytics 4..."
    set_config "hyva_cookie_consent/services/google_analytics_4/enabled" "1"
    set_config "hyva_cookie_consent/services/google_analytics_4/measurement_id" "$TEST_GA4_MEASUREMENT_ID"
    SERVICES_CONFIGURED=1
fi

# Configure Facebook Pixel if ID provided
if [ -n "$TEST_FB_PIXEL_ID" ]; then
    echo "Configuring Facebook Pixel..."
    set_config "hyva_cookie_consent/services/facebook_pixel/enabled" "1"
    set_config "hyva_cookie_consent/services/facebook_pixel/pixel_id" "$TEST_FB_PIXEL_ID"
    SERVICES_CONFIGURED=1
fi

# Configure Hotjar if ID provided
if [ -n "$TEST_HOTJAR_SITE_ID" ]; then
    echo "Configuring Hotjar..."
    set_config "hyva_cookie_consent/services/hotjar/enabled" "1"
    set_config "hyva_cookie_consent/services/hotjar/site_id" "$TEST_HOTJAR_SITE_ID"
    SERVICES_CONFIGURED=1
fi

# Configure Clarity if ID provided
if [ -n "$TEST_CLARITY_PROJECT_ID" ]; then
    echo "Configuring Microsoft Clarity..."
    set_config "hyva_cookie_consent/services/microsoft_clarity/enabled" "1"
    set_config "hyva_cookie_consent/services/microsoft_clarity/project_id" "$TEST_CLARITY_PROJECT_ID"
    SERVICES_CONFIGURED=1
fi

# Configure Matomo if URL and ID provided
if [ -n "$TEST_MATOMO_URL" ] && [ -n "$TEST_MATOMO_SITE_ID" ]; then
    echo "Configuring Matomo..."
    set_config "hyva_cookie_consent/services/matomo/enabled" "1"
    set_config "hyva_cookie_consent/services/matomo/tracker_url" "$TEST_MATOMO_URL"
    set_config "hyva_cookie_consent/services/matomo/site_id" "$TEST_MATOMO_SITE_ID"
    SERVICES_CONFIGURED=1
fi

echo ""

if [ $SERVICES_CONFIGURED -eq 0 ]; then
    echo "WARNING: No service IDs found in environment variables."
    echo "Set TEST_GTM_CONTAINER_ID, TEST_GA4_MEASUREMENT_ID, etc. in .env"
fi

# Flush config cache
echo "Flushing config cache..."
$MAGENTO_CLI cache:flush config 2>/dev/null || $MAGENTO_CLI cache:clean config 2>/dev/null || true

echo ""
echo "============================================================================="
echo "Done! Services configured for testing."
echo ""
echo "GTM Mode: $GTM_MODE"
echo ""
echo "Run tests with: npm test"
echo "Restore original config with: ./scripts/reset-services.sh"
echo "============================================================================="
