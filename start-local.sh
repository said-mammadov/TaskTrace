#!/bin/bash

# =============================================================================
# TaskTracker - Lokal Server Başlatma Skripti
# Yalnız localhost:3000 və localhost:8001 istifadə edir
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONGO_DATA_DIR="${SCRIPT_DIR}/mongodb_data"
LOG_DIR="${SCRIPT_DIR}/logs"

# Rənglər
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "${LOG_DIR}"
mkdir -p "${MONGO_DATA_DIR}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ${GREEN}TaskTracker - Lokal Server Başladılır${BLUE}                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Əvvəlki prosesləri dayandır
echo -e "${YELLOW}[*]${NC} Köhnə proseslər təmizlənir..."
pkill -f "uvicorn server:app" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node.*react" 2>/dev/null || true
sleep 1

# MongoDB başlatmaq
echo -e "${YELLOW}[*]${NC} MongoDB yoxlanılır..."
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}[*]${NC} MongoDB başladılır..."
    mongod --dbpath "${MONGO_DATA_DIR}" --port 27017 --fork --logpath "${LOG_DIR}/mongodb.log" 2>/dev/null || \
    sudo systemctl start mongod 2>/dev/null || \
    sudo service mongodb start 2>/dev/null || true
    sleep 2
fi

if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}[✓]${NC} MongoDB işləyir (port 27017)"
else
    echo -e "${RED}[!]${NC} MongoDB başladıla bilmədi - manual başladın"
fi

# Backend .env-i lokal olaraq konfiqurasiya et
echo -e "${YELLOW}[*]${NC} Backend konfiqurasiya edilir..."
cat > "${SCRIPT_DIR}/backend/.env" << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=tasktracker_local
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=tasktracker-local-secret-key-$(date +%s)
EOF

# Frontend .env-i lokal olaraq konfiqurasiya et  
echo -e "${YELLOW}[*]${NC} Frontend konfiqurasiya edilir..."
cat > "${SCRIPT_DIR}/frontend/.env" << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
BROWSER=none
EOF

# Backend başlatmaq
echo -e "${YELLOW}[*]${NC} Backend başladılır (port 8001)..."
cd "${SCRIPT_DIR}/backend"

if [ -d "venv" ]; then
    source venv/bin/activate
else
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install fastapi uvicorn motor python-dotenv pydantic bcrypt pyjwt python-jose email-validator python-multipart
fi

nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "${SCRIPT_DIR}/backend.pid"
deactivate 2>/dev/null || true

sleep 3

# Backend test et
if curl -s http://localhost:8001/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} Backend işləyir - http://localhost:8001"
else
    echo -e "${YELLOW}[!]${NC} Backend başladılır, gözləyin..."
    sleep 3
fi

# Frontend başlatmaq
echo -e "${YELLOW}[*]${NC} Frontend başladılır (port 3000)..."
cd "${SCRIPT_DIR}/frontend"

# Node modules yoxla
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[*]${NC} Node paketləri yüklənir..."
    yarn install 2>/dev/null || npm install 2>/dev/null
fi

# Frontend-i arxa planda başlat
BROWSER=none nohup yarn start > "${LOG_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "${SCRIPT_DIR}/frontend.pid"

echo ""
echo -e "${YELLOW}[*]${NC} Frontend başladılır, bu 10-15 saniyə çəkə bilər..."
sleep 8

# Frontend test et
for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}[✓]${NC} Frontend işləyir - http://localhost:3000"
        break
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║          ${BLUE}TaskTracker Lokal Server Hazırdır!${GREEN}               ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  🌐 Frontend:  ${YELLOW}http://localhost:3000${GREEN}                      ║${NC}"
echo -e "${GREEN}║  🔧 Backend:   ${YELLOW}http://localhost:8001${GREEN}                      ║${NC}"
echo -e "${GREEN}║  📚 API Docs:  ${YELLOW}http://localhost:8001/docs${GREEN}                 ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  📁 Loglar:                                                ║${NC}"
echo -e "${GREEN}║     • Backend:  ${SCRIPT_DIR}/logs/backend.log${GREEN}            ║${NC}"
echo -e "${GREEN}║     • Frontend: ${SCRIPT_DIR}/logs/frontend.log${GREEN}           ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  🛑 Dayandırmaq: ${YELLOW}./stop-local.sh${GREEN}                          ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Brauzerdə aç
echo -e "${YELLOW}[*]${NC} Brauzer açılır..."
sleep 2
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" 2>/dev/null &
elif command -v firefox &> /dev/null; then
    firefox "http://localhost:3000" 2>/dev/null &
elif command -v chromium &> /dev/null; then
    chromium "http://localhost:3000" 2>/dev/null &
fi

echo ""
echo -e "${GREEN}[✓]${NC} Hamısı hazırdır! Brauzerdə http://localhost:3000 açın"
echo ""
