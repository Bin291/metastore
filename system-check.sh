#!/bin/bash

# MetaStore System Check Script
# Kiểm tra trạng thái toàn bộ hệ thống

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          MetaStore - System Status Check v1.0              ║"
echo "║                                                            ║"
echo "║  A secure file management platform with share links       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

check_url() {
    if curl -s "$1" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        return 0
    else
        return 1
    fi
}

# Check Backend
echo -n "🔵 Backend (NestJS on port 3001)... "
if check_port 3001; then
    if check_url "http://localhost:3001/api/app"; then
        echo -e "${GREEN}✅ Running${NC}"
    else
        echo -e "${RED}❌ Port open but API not responding${NC}"
    fi
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check Frontend
echo -n "🟢 Frontend (Next.js on port 3000)... "
if check_port 3000; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

# Check MinIO
echo -n "🟡 MinIO (Storage on port 9000)... "
if check_port 9000; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️  Not running${NC}"
fi

# Check PostgreSQL
echo -n "🔴 PostgreSQL (Database on port 5432)... "
if check_port 5432; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️  Not running (using SQLite)${NC}"
fi

# Check Redis
echo -n "🟠 Redis (Cache on port 6379)... "
if check_port 6379; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️  Not running (optional)${NC}"
fi

# Check Files
echo ""
echo "📁 Project Structure:"
echo -n "  Backend... "
if [ -d "backend" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "  Frontend... "
if [ -d "frontend" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "  Database (SQLite)... "
if check_file "backend/data/metastore.db"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${YELLOW}⚠️  Not created${NC}"
fi

# Check Node Modules
echo ""
echo "📦 Dependencies:"
echo -n "  Backend node_modules... "
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "  Frontend node_modules... "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Environment
echo ""
echo "⚙️  Configuration:"
echo -n "  Backend .env... "
if check_file "backend/.env"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "  Frontend .env.local... "
if check_file "frontend/.env.local"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${YELLOW}⚠️  Not created${NC}"
fi

# Summary
echo ""
echo "📊 Quick Commands:"
echo "  Backend:  cd backend && npm run start:dev"
echo "  Frontend: cd frontend && npm run dev"
echo "  MinIO:    docker-compose up -d minio"
echo "  Full:     docker-compose up -d"
echo ""
echo "🌐 Access Points:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  MinIO:     http://localhost:9000"
echo "  API Docs:  http://localhost:3001/api/docs (if Swagger enabled)"
echo ""
echo "🔑 Default Credentials:"
echo "  Username: admin"
echo "  Password: ChangeMe123!"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ MetaStore Status Check Complete!"
echo "════════════════════════════════════════════════════════════"

