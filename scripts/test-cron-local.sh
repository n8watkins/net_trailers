#!/bin/bash

# Test cron job locally script
# This script simulates the cron job execution on localhost

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Local Cron Job Testing Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo -e "${YELLOW}Please create a .env.local file with CRON_SECRET${NC}"
    exit 1
fi

# Load environment variables
source .env.local

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}Error: CRON_SECRET not set in .env.local${NC}"
    exit 1
fi

# Default to localhost:3000
BASE_URL="${1:-http://localhost:3000}"

echo -e "${GREEN}Base URL:${NC} $BASE_URL"
echo -e "${GREEN}CRON_SECRET:${NC} ${CRON_SECRET:0:10}... (hidden)"
echo ""

# Test update-trending cron job
echo -e "${BLUE}Testing /api/cron/update-trending...${NC}"
echo ""

# Make the request
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$BASE_URL/api/cron/update-trending")

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)

# Extract response body (all but last line)
response_body=$(echo "$response" | sed '$d')

# Check if successful
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Success! (HTTP $http_code)${NC}"
    echo ""
    echo -e "${BLUE}Response:${NC}"
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
else
    echo -e "${RED}✗ Failed! (HTTP $http_code)${NC}"
    echo ""
    echo -e "${YELLOW}Response:${NC}"
    echo "$response_body"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"
