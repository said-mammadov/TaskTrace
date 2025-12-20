#!/bin/bash

# =============================================================================
# TaskTracker - Lokal Server Dayandırma Skripti
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     TaskTracker Dayandırılır...        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo ""

# Backend dayandır
if [ -f "${SCRIPT_DIR}/backend.pid" ]; then
    PID=$(cat "${SCRIPT_DIR}/backend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}[✓]${NC} Backend dayandırıldı (PID: $PID)"
    fi
    rm -f "${SCRIPT_DIR}/backend.pid"
fi

# Frontend dayandır
if [ -f "${SCRIPT_DIR}/frontend.pid" ]; then
    PID=$(cat "${SCRIPT_DIR}/frontend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}[✓]${NC} Frontend dayandırıldı (PID: $PID)"
    fi
    rm -f "${SCRIPT_DIR}/frontend.pid"
fi

# Qalan prosesləri təmizlə
pkill -f "uvicorn server:app" 2>/dev/null && echo -e "${GREEN}[✓]${NC} Uvicorn prosesləri dayandırıldı" || true
pkill -f "react-scripts start" 2>/dev/null && echo -e "${GREEN}[✓]${NC} React prosesləri dayandırıldı" || true
pkill -f "node.*react" 2>/dev/null || true

echo ""
echo -e "${GREEN}[✓]${NC} TaskTracker tamamilə dayandırıldı"
echo ""
