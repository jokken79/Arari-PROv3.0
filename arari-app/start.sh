#!/bin/bash

# 粗利 PRO v2.0 - Start Script
# Starts both backend (FastAPI) and frontend (Next.js)

echo "🚀 Starting 粗利 PRO v2.0..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the arari-app directory"
    exit 1
fi

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
echo "🔧 Starting Backend (FastAPI) on port 8000..."
cd api && python main.py &
BACKEND_PID=$!
cd ..

echo "🔧 Starting Frontend (Next.js) on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 粗利 PRO v2.0 is starting up!"
echo ""
echo "📊 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
