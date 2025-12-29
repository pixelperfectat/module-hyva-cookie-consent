#!/bin/bash
# =============================================================================
# Reset Cookie Consent Services - Restore from Backup
# =============================================================================
# Usage: ./reset-services.sh
#
# This script restores the Magento configuration from a backup created by
# configure-services.sh. Run this after testing to restore original settings.
#
# Supports multiple Magento CLI environments:
# - Standard Magento (bin/magento)
# - Mark Shust's Docker (bin/cli bin/magento)
# - n98-magerun2

set -e

# Find script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAYWRIGHT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Backup file location
BACKUP_FILE="$PLAYWRIGHT_DIR/.config-backup"

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
    echo "Please restore services manually in Magento Admin:"
    echo ""
    echo "  Stores > Configuration > Web > Cookie Consent (Hyva)"
    echo ""
    echo "Or install n98-magerun2: https://github.com/netz98/n98-magerun2"
    echo "============================================================================="
    exit 1
fi

echo "Using Magento CLI: $MAGENTO_CLI"
echo ""

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

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "============================================================================="
    echo "ERROR: No backup file found at $BACKUP_FILE"
    echo "============================================================================="
    echo ""
    echo "Run ./configure-services.sh first to create a backup."
    echo ""
    exit 1
fi

echo "Restoring configuration from backup..."
echo ""

# Read backup file and restore each value
RESTORE_COUNT=0
while IFS='=' read -r path value; do
    # Skip comments and empty lines
    [[ "$path" =~ ^#.*$ ]] && continue
    [[ -z "$path" ]] && continue

    echo "  Restoring: $path"
    if set_config "$path" "$value"; then
        ((RESTORE_COUNT++))
    fi
done < "$BACKUP_FILE"

echo ""
echo "Restored $RESTORE_COUNT configuration values."

# Remove backup file after successful restore
rm -f "$BACKUP_FILE"
echo "Backup file removed."

# Flush config cache
echo ""
echo "Flushing config cache..."
$MAGENTO_CLI cache:flush config 2>/dev/null || $MAGENTO_CLI cache:clean config 2>/dev/null || true

echo ""
echo "============================================================================="
echo "Configuration restored from backup."
echo ""
echo "Your original service configuration has been restored."
echo "============================================================================="
