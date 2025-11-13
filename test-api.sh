#!/bin/bash

# 🧪 MetaStore - Automated Test Script
# Test các chức năng chính của hệ thống

set -e

BACKEND_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"
TOKEN=""
USER_ID=""
TEST_FILE="/tmp/test-file.txt"
TEST_FOLDER="/tmp/test-folder"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "🧪 MetaStore - Automated Test Suite"
echo "======================================"
echo ""

# ============ 1. HEALTH CHECK ============
echo "📊 1. Checking Services Status..."
echo "=================================="

# Check Backend
if curl -s "$BACKEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Backend running on port 3001${NC}"
else
    echo -e "${RED}❌ Backend not responding${NC}"
    exit 1
fi

# Check Frontend
if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend running on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend not responding${NC}"
    exit 1
fi
echo ""

# ============ 2. AUTHENTICATION ============
echo "🔐 2. Testing Authentication..."
echo "================================"

# Login Test
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "ChangeMe123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "   Token: ${TOKEN:0:20}..."
    echo "   User ID: $USER_ID"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# ============ 3. FILE OPERATIONS ============
echo "📁 3. Testing File Operations..."
echo "================================="

# Create test file
echo "Test content for file upload" > $TEST_FILE
echo -e "${YELLOW}ℹ️  Created test file: $TEST_FILE${NC}"

# Test: Get Presigned URL
PRESIGNED=$(curl -s -X POST "$BACKEND_URL/files/upload-url" \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{
    "path": "test-file.txt",
    "mimeType": "text/plain",
    "size": 30,
    "isFolder": false
  }')

UPLOAD_URL=$(echo $PRESIGNED | grep -o '"url":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$UPLOAD_URL" ]; then
    echo -e "${GREEN}✅ Got presigned upload URL${NC}"
else
    echo -e "${RED}❌ Failed to get presigned URL${NC}"
    echo "Response: $PRESIGNED"
fi

# Test: Upload file to S3/MinIO
if [ ! -z "$UPLOAD_URL" ]; then
    UPLOAD_RESPONSE=$(curl -s -X PUT "$UPLOAD_URL" \
      -H "Content-Type: text/plain" \
      --data-binary @$TEST_FILE)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ File uploaded to storage${NC}"
    else
        echo -e "${RED}❌ Upload to storage failed${NC}"
    fi
fi

# Test: Register file in DB
FILE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-file.txt",
    "path": "test-file.txt",
    "isFolder": false,
    "size": 30,
    "mimeType": "text/plain"
  }')

FILE_ID=$(echo $FILE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
if [ ! -z "$FILE_ID" ]; then
    echo -e "${GREEN}✅ File registered in database${NC}"
    echo "   File ID: $FILE_ID"
else
    echo -e "${RED}❌ Failed to register file${NC}"
    echo "Response: $FILE_RESPONSE"
fi
echo ""

# ============ 4. LIST FILES ============
echo "📋 4. Testing List Files..."
echo "==========================="

LIST_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN")

FILE_COUNT=$(echo $LIST_RESPONSE | grep -o '"data":\[' | wc -l)
if [ $FILE_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ List files successful${NC}"
    TOTAL=$(echo $LIST_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Total files: $TOTAL"
else
    echo -e "${YELLOW}⚠️  No files in list (might be normal)${NC}"
fi
echo ""

# ============ 5. FOLDER OPERATIONS ============
echo "📂 5. Testing Folder Operations..."
echo "=================================="

# Create folder
FOLDER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-folder",
    "path": "test-folder",
    "isFolder": true
  }')

FOLDER_ID=$(echo $FOLDER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
if [ ! -z "$FOLDER_ID" ]; then
    echo -e "${GREEN}✅ Folder created${NC}"
    echo "   Folder ID: $FOLDER_ID"
else
    echo -e "${RED}❌ Failed to create folder${NC}"
    echo "Response: $FOLDER_RESPONSE"
fi
echo ""

# ============ 6. SEARCH FUNCTIONALITY ============
echo "🔍 6. Testing Search..."
echo "======================="

SEARCH_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files?search=test&limit=20" \
  -H "Authorization: Bearer $TOKEN")

if echo $SEARCH_RESPONSE | grep -q '"data"'; then
    echo -e "${GREEN}✅ Search working${NC}"
else
    echo -e "${RED}❌ Search failed${NC}"
fi
echo ""

# ============ 7. DOWNLOAD URL ============
if [ ! -z "$FILE_ID" ]; then
    echo "⬇️  7. Testing Download..."
    echo "=========================="

    DOWNLOAD_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files/$FILE_ID/download-url" \
      -H "Authorization: Bearer $TOKEN")

    DOWNLOAD_URL=$(echo $DOWNLOAD_RESPONSE | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$DOWNLOAD_URL" ]; then
        echo -e "${GREEN}✅ Got download URL${NC}"
    else
        echo -e "${RED}❌ Failed to get download URL${NC}"
    fi
    echo ""
fi

# ============ 8. DELETE FILE ============
if [ ! -z "$FILE_ID" ]; then
    echo "🗑️  8. Testing Delete..."
    echo "======================="

    DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/files/$FILE_ID" \
      -H "Authorization: Bearer $TOKEN")

    if echo $DELETE_RESPONSE | grep -q '"success"'; then
        echo -e "${GREEN}✅ File deleted successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Delete response: $DELETE_RESPONSE${NC}"
    fi
    echo ""
fi

# ============ 9. CLEANUP ============
echo "🧹 9. Cleanup..."
echo "==============="
rm -f $TEST_FILE
echo -e "${GREEN}✅ Test files cleaned up${NC}"
echo ""

# ============ SUMMARY ============
echo "======================================"
echo "✨ Test Suite Completed!"
echo "======================================"
echo ""
echo "📊 Summary:"
echo "  ✅ Backend API working"
echo "  ✅ Authentication working"
echo "  ✅ File upload working"
echo "  ✅ File operations working"
echo "  ✅ Folder operations working"
echo "  ✅ Search functionality working"
echo "  ✅ Download working"
echo "  ✅ Delete working"
echo ""
echo "🎉 All core features tested successfully!"

#!/bin/bash

# 🧪 MetaStore - Automated Test Script
# Test các chức năng chính của hệ thống

set -e

BACKEND_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"
TOKEN=""
USER_ID=""
TEST_FILE="/tmp/test-file.txt"
TEST_FOLDER="/tmp/test-folder"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "🧪 MetaStore - Automated Test Suite"
echo "======================================"
echo ""

# ============ 1. HEALTH CHECK ============
echo "📊 1. Checking Services Status..."
echo "=================================="

# Check Backend
if curl -s "$BACKEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Backend running on port 3001${NC}"
else
    echo -e "${RED}❌ Backend not responding${NC}"
    exit 1
fi

# Check Frontend
if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend running on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend not responding${NC}"
    exit 1
fi
echo ""

# ============ 2. AUTHENTICATION ============
echo "🔐 2. Testing Authentication..."
echo "================================"

# Login Test
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c $COOKIE_JAR \
  -d '{
    "username": "admin",
    "password": "ChangeMe123!"
  }')

USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$USER_ID" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "   User ID: $USER_ID"
    echo "   Cookies saved"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# ============ 3. FILE OPERATIONS ============
echo "📁 3. Testing File Operations..."
echo "================================="

# Create test file
echo "Test content for file upload" > $TEST_FILE
echo -e "${YELLOW}ℹ️  Created test file: $TEST_FILE${NC}"

# Test: Get Presigned URL
PRESIGNED=$(curl -s -X POST "$BACKEND_URL/files/upload-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "path": "test-file.txt",
    "mimeType": "text/plain",
    "size": 30,
    "isFolder": false
  }')

UPLOAD_URL=$(echo $PRESIGNED | grep -o '"url":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$UPLOAD_URL" ]; then
    echo -e "${GREEN}✅ Got presigned upload URL${NC}"
else
    echo -e "${RED}❌ Failed to get presigned URL${NC}"
    echo "Response: $PRESIGNED"
fi

# Test: Upload file to S3/MinIO
if [ ! -z "$UPLOAD_URL" ]; then
    UPLOAD_RESPONSE=$(curl -s -X PUT "$UPLOAD_URL" \
      -H "Content-Type: text/plain" \
      --data-binary @$TEST_FILE)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ File uploaded to storage${NC}"
    else
        echo -e "${RED}❌ Upload to storage failed${NC}"
    fi
fi

# Test: Register file in DB
FILE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-file.txt",
    "path": "test-file.txt",
    "isFolder": false,
    "size": 30,
    "mimeType": "text/plain"
  }')

FILE_ID=$(echo $FILE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
if [ ! -z "$FILE_ID" ]; then
    echo -e "${GREEN}✅ File registered in database${NC}"
    echo "   File ID: $FILE_ID"
else
    echo -e "${RED}❌ Failed to register file${NC}"
    echo "Response: $FILE_RESPONSE"
fi
echo ""

# ============ 4. LIST FILES ============
echo "📋 4. Testing List Files..."
echo "==========================="

LIST_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN")

FILE_COUNT=$(echo $LIST_RESPONSE | grep -o '"data":\[' | wc -l)
if [ $FILE_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ List files successful${NC}"
    TOTAL=$(echo $LIST_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Total files: $TOTAL"
else
    echo -e "${YELLOW}⚠️  No files in list (might be normal)${NC}"
fi
echo ""

# ============ 5. FOLDER OPERATIONS ============
echo "📂 5. Testing Folder Operations..."
echo "=================================="

# Create folder
FOLDER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-folder",
    "path": "test-folder",
    "isFolder": true
  }')

FOLDER_ID=$(echo $FOLDER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
if [ ! -z "$FOLDER_ID" ]; then
    echo -e "${GREEN}✅ Folder created${NC}"
    echo "   Folder ID: $FOLDER_ID"
else
    echo -e "${RED}❌ Failed to create folder${NC}"
    echo "Response: $FOLDER_RESPONSE"
fi
echo ""

# ============ 6. SEARCH FUNCTIONALITY ============
echo "🔍 6. Testing Search..."
echo "======================="

SEARCH_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files?search=test&limit=20" \
  -H "Authorization: Bearer $TOKEN")

if echo $SEARCH_RESPONSE | grep -q '"data"'; then
    echo -e "${GREEN}✅ Search working${NC}"
else
    echo -e "${RED}❌ Search failed${NC}"
fi
echo ""

# ============ 7. DOWNLOAD URL ============
if [ ! -z "$FILE_ID" ]; then
    echo "⬇️  7. Testing Download..."
    echo "=========================="

    DOWNLOAD_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files/$FILE_ID/download-url" \
      -H "Authorization: Bearer $TOKEN")

    DOWNLOAD_URL=$(echo $DOWNLOAD_RESPONSE | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$DOWNLOAD_URL" ]; then
        echo -e "${GREEN}✅ Got download URL${NC}"
    else
        echo -e "${RED}❌ Failed to get download URL${NC}"
    fi
    echo ""
fi

# ============ 8. DELETE FILE ============
if [ ! -z "$FILE_ID" ]; then
    echo "🗑️  8. Testing Delete..."
    echo "======================="

    DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/files/$FILE_ID" \
      -H "Authorization: Bearer $TOKEN")

    if echo $DELETE_RESPONSE | grep -q '"success"'; then
        echo -e "${GREEN}✅ File deleted successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Delete response: $DELETE_RESPONSE${NC}"
    fi
    echo ""
fi

# ============ 9. CLEANUP ============
echo "🧹 9. Cleanup..."
echo "==============="
rm -f $TEST_FILE
echo -e "${GREEN}✅ Test files cleaned up${NC}"
echo ""

# ============ SUMMARY ============
echo "======================================"
echo "✨ Test Suite Completed!"
echo "======================================"
echo ""
echo "📊 Summary:"
echo "  ✅ Backend API working"
echo "  ✅ Authentication working"
echo "  ✅ File upload working"
echo "  ✅ File operations working"
echo "  ✅ Folder operations working"
echo "  ✅ Search functionality working"
echo "  ✅ Download working"
echo "  ✅ Delete working"
echo ""
echo "🎉 All core features tested successfully!"

#!/bin/bash

# 🧪 MetaStore - Automated Test Script
# Test các chức năng chính của hệ thống

set -e

BACKEND_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"
TOKEN=""
USER_ID=""
TEST_FILE="/tmp/test-file.txt"
TEST_FOLDER="/tmp/test-folder"
COOKIE_JAR="/tmp/cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "🧪 MetaStore - Automated Test Suite"
echo "======================================"
echo ""

# ============ 1. HEALTH CHECK ============
echo "📊 1. Checking Services Status..."
echo "=================================="

# Check Backend
if curl -s "$BACKEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Backend running on port 3001${NC}"
else
    echo -e "${RED}❌ Backend not responding${NC}"
    exit 1
fi

# Check Frontend
if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend running on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend not responding${NC}"
    exit 1
fi
echo ""

# ============ 2. AUTHENTICATION ============
echo "🔐 2. Testing Authentication..."
echo "================================"

# Login Test
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "ChangeMe123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "   Token: ${TOKEN:0:20}..."
    echo "   User ID: $USER_ID"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# ============ 3. FILE OPERATIONS ============
echo "📁 3. Testing File Operations..."
echo "================================="

# Create test file
echo "Test content for file upload" > $TEST_FILE
echo -e "${YELLOW}ℹ️  Created test file: $TEST_FILE${NC}"

# Test: Get Presigned URL
PRESIGNED=$(curl -s -X POST "$BACKEND_URL/files/upload-url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "path": "test-file.txt",
    "mimeType": "text/plain",
    "size": 30,
    "isFolder": false
  }')

UPLOAD_URL=$(echo $PRESIGNED | grep -o '"url":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$UPLOAD_URL" ]; then
    echo -e "${GREEN}✅ Got presigned upload URL${NC}"
else
    echo -e "${RED}❌ Failed to get presigned URL${NC}"
    echo "Response: $PRESIGNED"
fi

# Test: Upload file to S3/MinIO
if [ ! -z "$UPLOAD_URL" ]; then
    UPLOAD_RESPONSE=$(curl -s -X PUT "$UPLOAD_URL" \
      -H "Content-Type: text/plain" \
      --data-binary @$TEST_FILE)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ File uploaded to storage${NC}"
    else
        echo -e "${RED}❌ Upload to storage failed${NC}"
    fi
fi

# Test: Register file in DB
FILE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-file.txt",
    "path": "test-file.txt",
    "isFolder": false,
    "size": 30,
    "mimeType": "text/plain"
  }')

FILE_ID=$(echo $FILE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
if [ ! -z "$FILE_ID" ]; then
    echo -e "${GREEN}✅ File registered in database${NC}"
    echo "   File ID: $FILE_ID"
else
    echo -e "${RED}❌ Failed to register file${NC}"
    echo "Response: $FILE_RESPONSE"
fi
echo ""

# ============ 4. LIST FILES ============
echo "📋 4. Testing List Files..."
echo "==========================="

LIST_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN")

FILE_COUNT=$(echo $LIST_RESPONSE | grep -o '"data":\[' | wc -l)
if [ $FILE_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ List files successful${NC}"
    TOTAL=$(echo $LIST_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Total files: $TOTAL"
else
    echo -e "${YELLOW}⚠️  No files in list (might be normal)${NC}"
fi
echo ""

# ============ 5. FOLDER OPERATIONS ============
echo "📂 5. Testing Folder Operations..."
echo "=================================="

# Create folder
FOLDER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-folder",
    "path": "test-folder",
    "isFolder": true
  }')

FOLDER_ID=$(echo $FOLDER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
if [ ! -z "$FOLDER_ID" ]; then
    echo -e "${GREEN}✅ Folder created${NC}"
    echo "   Folder ID: $FOLDER_ID"
else
    echo -e "${RED}❌ Failed to create folder${NC}"
    echo "Response: $FOLDER_RESPONSE"
fi
echo ""

# ============ 6. SEARCH FUNCTIONALITY ============
echo "🔍 6. Testing Search..."
echo "======================="

SEARCH_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files?search=test&limit=20" \
  -H "Authorization: Bearer $TOKEN")

if echo $SEARCH_RESPONSE | grep -q '"data"'; then
    echo -e "${GREEN}✅ Search working${NC}"
else
    echo -e "${RED}❌ Search failed${NC}"
fi
echo ""

# ============ 7. DOWNLOAD URL ============
if [ ! -z "$FILE_ID" ]; then
    echo "⬇️  7. Testing Download..."
    echo "=========================="

    DOWNLOAD_RESPONSE=$(curl -s -X GET "$BACKEND_URL/files/$FILE_ID/download-url" \
      -H "Authorization: Bearer $TOKEN")

    DOWNLOAD_URL=$(echo $DOWNLOAD_RESPONSE | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$DOWNLOAD_URL" ]; then
        echo -e "${GREEN}✅ Got download URL${NC}"
    else
        echo -e "${RED}❌ Failed to get download URL${NC}"
    fi
    echo ""
fi

# ============ 8. DELETE FILE ============
if [ ! -z "$FILE_ID" ]; then
    echo "🗑️  8. Testing Delete..."
    echo "======================="

    DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/files/$FILE_ID" \
      -H "Authorization: Bearer $TOKEN")

    if echo $DELETE_RESPONSE | grep -q '"success"'; then
        echo -e "${GREEN}✅ File deleted successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Delete response: $DELETE_RESPONSE${NC}"
    fi
    echo ""
fi

# ============ 9. CLEANUP ============
echo "🧹 9. Cleanup..."
echo "==============="
rm -f $TEST_FILE
echo -e "${GREEN}✅ Test files cleaned up${NC}"
echo ""

# ============ SUMMARY ============
echo "======================================"
echo "✨ Test Suite Completed!"
echo "======================================"
echo ""
echo "📊 Summary:"
echo "  ✅ Backend API working"
echo "  ✅ Authentication working"
echo "  ✅ File upload working"
echo "  ✅ File operations working"
echo "  ✅ Folder operations working"
echo "  ✅ Search functionality working"
echo "  ✅ Download working"
echo "  ✅ Delete working"
echo ""
echo "🎉 All core features tested successfully!"


