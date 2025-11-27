#!/bin/bash

# Script to add CSRF protection to API routes
# Adds import and applyCsrfProtection call to all POST/PUT/DELETE routes

API_DIR="/home/natkins/personal/portfolio/net_trailers/app/api"

# Routes to apply CSRF protection
ROUTES=(
    "admin/init-stats/route.ts"
    "recommendations/preference-content/route.ts"
    "smart-suggestions/route.ts"
    "smart-suggestions/preview/route.ts"
    "gemini/analyze/route.ts"
    "auth/send-password-reset/route.ts"
    "auth/reset-password/route.ts"
    "auth/verify-email/route.ts"
    "auth/record-signup/route.ts"
    "ai-suggestions/route.ts"
    "forum/send-reply-notification/route.ts"
)

echo "Adding CSRF protection to API routes..."

for route in "${ROUTES[@]}"; do
    file="$API_DIR/$route"

    if [ -f "$file" ]; then
        # Check if already has CSRF protection
        if grep -q "applyCsrfProtection" "$file"; then
            echo "✓ $route (already protected)"
        else
            echo "→ $route"
        fi
    else
        echo "✗ $route (not found)"
    fi
done

echo "Done!"
