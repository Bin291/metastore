#!/bin/bash

# MetaStore API Test Script
# Usage: ./test-api.sh

API_URL="http://localhost:3001/api"
COOKIES_FILE="/tmp/metastore-cookies.txt"

echo "🧪 MetaStore API Test Script"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -b "$COOKIES_FILE" "$API_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
                -d "$data" -b "$COOKIES_FILE" -c "$COOKIES_FILE" "$API_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST -b "$COOKIES_FILE" -c "$COOKIES_FILE" "$API_URL$endpoint")
        fi
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH -H "Content-Type: application/json" \
            -d "$data" -b "$COOKIES_FILE" "$API_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE -b "$COOKIES_FILE" "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ OK (${http_code})${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (${http_code})${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Clean up
rm -f "$COOKIES_FILE"

echo "1. Testing Health Check..."
test_endpoint "GET" "/health" "" "Health check"

echo ""
echo "2. Testing Login..."
test_endpoint "POST" "/auth/login" '{"username":"admin","password":"ChangeMe123!"}' "Login as admin"

if [ $? -ne 0 ]; then
    echo -e "${RED}Login failed! Cannot continue tests.${NC}"
    exit 1
fi

echo ""
echo "3. Testing Get Current User..."
test_endpoint "GET" "/users/me" "" "Get current user"

echo ""
echo "4. Testing List Files..."
test_endpoint "GET" "/files" "" "List files"

echo ""
echo "5. Testing List Share Links..."
test_endpoint "GET" "/share-links" "" "List share links"

echo ""
echo "6. Testing List Invites (Admin only)..."
test_endpoint "GET" "/invites" "" "List invites"

echo ""
echo "7. Testing List Users (Admin only)..."
test_endpoint "GET" "/users" "" "List users"

echo ""
echo "============================"
echo -e "${GREEN}✅ API Tests Complete!${NC}"
echo ""
echo "Note: Some endpoints may require specific data or permissions."
echo "For full testing, use the manual test guide in TEST_GUIDE.md"

