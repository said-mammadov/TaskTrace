#!/bin/bash

# =============================================================================
# TaskTracker - Kali Linux Tam Quraşdırma və Başlatma Skripti
# Yalnız lokal server - heç bir xarici URL istifadə edilmir
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║     ████████╗ █████╗ ███████╗██╗  ██╗████████╗██████╗            ║"
    echo "║     ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝╚══██╔══╝██╔══██╗           ║"
    echo "║        ██║   ███████║███████╗█████╔╝    ██║   ██████╔╝           ║"
    echo "║        ██║   ██╔══██║╚════██║██╔═██╗    ██║   ██╔══██╗           ║"
    echo "║        ██║   ██║  ██║███████║██║  ██╗   ██║   ██║  ██║           ║"
    echo "║        ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝           ║"
    echo "║                                                                  ║"
    echo "║              Kali Linux - Lokal Quraşdırma                       ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_banner

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}"

echo -e "${BLUE}[1/6]${NC} Sistem paketləri yenilənir..."
sudo apt update -y 2>/dev/null || true

echo -e "${BLUE}[2/6]${NC} Asılılıqlar yüklənir..."
sudo apt install -y python3 python3-pip python3-venv python3-dev nodejs npm curl git build-essential 2>/dev/null || true

# MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}[*]${NC} MongoDB yüklənir..."
    sudo apt install -y mongodb 2>/dev/null || sudo apt install -y mongodb-org 2>/dev/null || true
fi

# Yarn
if ! command -v yarn &> /dev/null; then
    sudo npm install -g yarn 2>/dev/null || true
fi

echo -e "${GREEN}[✓]${NC} Asılılıqlar hazırdır"

echo -e "${BLUE}[3/6]${NC} MongoDB konfiqurasiya edilir..."
mkdir -p "${APP_DIR}/mongodb_data"
mkdir -p "${APP_DIR}/logs"

# MongoDB başlat
sudo systemctl start mongod 2>/dev/null || \
mongod --dbpath "${APP_DIR}/mongodb_data" --port 27017 --fork --logpath "${APP_DIR}/logs/mongodb.log" 2>/dev/null || true
sleep 2

if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}[✓]${NC} MongoDB işləyir"
else
    echo -e "${YELLOW}[!]${NC} MongoDB manual başladılmalıdır"
fi

echo -e "${BLUE}[4/6]${NC} Backend qurulur..."
cd "${APP_DIR}/backend"

# Virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip 2>/dev/null
pip install fastapi==0.110.1 uvicorn==0.25.0 motor==3.3.1 python-dotenv pydantic bcrypt pyjwt python-jose email-validator python-multipart 2>/dev/null

# Backend .env - YALNIZ LOKAL
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=tasktracker_local
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "local-secret-$(date +%s)")
EOF

deactivate
echo -e "${GREEN}[✓]${NC} Backend hazırdır"

echo -e "${BLUE}[5/6]${NC} Frontend qurulur..."
cd "${APP_DIR}/frontend"

# Frontend .env - YALNIZ LOKAL
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
BROWSER=none
EOF

echo -e "${YELLOW}[*]${NC} Node paketləri yüklənir (bu bir az vaxt ala bilər)..."
yarn install 2>/dev/null || npm install 2>/dev/null
echo -e "${GREEN}[✓]${NC} Frontend hazırdır"

echo -e "${BLUE}[6/6]${NC} Skriptlər hazırlanır..."
cd "${APP_DIR}"
chmod +x start-local.sh stop-local.sh 2>/dev/null || true

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║                   QURAŞDIRMA TAMAMLANDI!                         ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║  Başlatmaq üçün:    ${YELLOW}./start-local.sh${GREEN}                          ║${NC}"
echo -e "${GREEN}║  Dayandırmaq üçün:  ${YELLOW}./stop-local.sh${GREEN}                           ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║  URL-lər (yalnız lokal):                                         ║${NC}"
echo -e "${GREEN}║      Frontend: ${YELLOW}http://localhost:3000${GREEN}                          ║${NC}"
echo -e "${GREEN}║      Backend:  ${YELLOW}http://localhost:8001${GREEN}                          ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "İndi başlatmaq istəyirsiniz? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start-local.sh
fi
