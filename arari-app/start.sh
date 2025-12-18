#!/bin/bash

# 粗利 PRO v2.0 - Start Script
# Starts both backend (FastAPI) and frontend (Next.js)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting 粗利 PRO v2.0..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the arari-app directory${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep ":$port " | grep LISTEN >/dev/null; then
        return 0 # Port is in use
    else
        return 1 # Port is free
    fi
}

# Check if ports are available
echo "🔍 Checking port availability..."
if check_port 8000; then
    echo -e "${YELLOW}⚠️  Port 8000 (backend) is already in use${NC}"
    echo -e "${YELLOW}   Please stop the process using port 8000 or choose a different port${NC}"
    exit 1
fi

if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 (frontend) is already in use${NC}"
    echo -e "${YELLOW}   Please stop the process using port 3000 or choose a different port${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ports 8000 and 3000 are available${NC}"
echo ""

# Install backend dependencies if needed
if [ ! -d "api/__pycache__" ]; then
    echo "📦 Installing backend dependencies..."
    pip install -r api/requirements.txt
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo ""
echo -e "${GREEN}🔧 Starting Backend (FastAPI) on port 8000...${NC}"
cd api && python main.py &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 2

echo -e "${GREEN}🔧 Starting Frontend (Next.js) on port 3000...${NC}"
npm run dev &
FRONTEND_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

echo ""
echo -e "${GREEN}✅ 粗利 PRO v2.0 is starting up!${NC}"
echo ""
echo -e "📊 ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "🔌 ${GREEN}Backend API:${NC} http://localhost:8000"
echo -e "📚 ${GREEN}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
