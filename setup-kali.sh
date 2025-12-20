#!/bin/bash

# =============================================================================
# TaskTracker - Kali Linux Lokal Server Setup Script
# Notion-style Task Manager with Habit Tracking
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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
    echo "║              Kali Linux Local Server Setup                       ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() { echo -e "${BLUE}[*]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Root istifadəçisi olaraq işə salınıb. Normal istifadəçi ilə işlətmək tövsiyə olunur."
    fi
}

print_banner
check_root

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}"

# =============================================================================
# Step 1: Sistem Asılılıqlarının Yüklənməsi
# =============================================================================
echo ""
print_status "Sistem paketləri yenilənir..."
sudo apt update -y 2>/dev/null || true

print_status "Sistem asılılıqları yüklənir..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nodejs \
    npm \
    curl \
    git \
    build-essential \
    libffi-dev \
    libssl-dev \
    2>/dev/null || true

# MongoDB yüklənməsi
print_status "MongoDB yüklənir..."
if ! command -v mongod &> /dev/null; then
    # MongoDB Community Edition yüklənməsi
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor 2>/dev/null || true
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list 2>/dev/null || true
    sudo apt update 2>/dev/null || true
    sudo apt install -y mongodb-org 2>/dev/null || sudo apt install -y mongodb 2>/dev/null || true
fi

# Yarn yüklənməsi
if ! command -v yarn &> /dev/null; then
    print_status "Yarn yüklənir..."
    sudo npm install -g yarn 2>/dev/null || true
fi

print_success "Sistem asılılıqları yükləndi"

# =============================================================================
# Step 2: MongoDB Qurulması
# =============================================================================
print_status "MongoDB konfiqurasiya edilir..."

# MongoDB data directory yaratmaq
MONGO_DATA_DIR="${APP_DIR}/mongodb_data"
MONGO_LOG_FILE="${APP_DIR}/logs/mongodb.log"

mkdir -p "${MONGO_DATA_DIR}"
mkdir -p "${APP_DIR}/logs"

# MongoDB servisini başlatmaq
print_status "MongoDB başladılır..."
if command -v systemctl &> /dev/null; then
    sudo systemctl enable mongod 2>/dev/null || true
    sudo systemctl start mongod 2>/dev/null || true
fi

# Əgər systemctl işləmirsə, birbaşa mongod başlatmaq
if ! pgrep -x "mongod" > /dev/null; then
    mongod --dbpath "${MONGO_DATA_DIR}" --port 27017 --fork --logpath "${MONGO_LOG_FILE}" 2>/dev/null || true
fi

sleep 3

if pgrep -x "mongod" > /dev/null; then
    print_success "MongoDB işləyir"
else
    print_warning "MongoDB işə düşmədi. Manual başlatma lazım ola bilər."
fi

# =============================================================================
# Step 3: Backend Qurulması
# =============================================================================
print_status "Backend qurulur..."

cd "${APP_DIR}/backend"

# Virtual environment yaratmaq
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Virtual environment aktivləşdirmək və paketləri yükləmək
source venv/bin/activate

print_status "Python paketləri yüklənir..."
pip install --upgrade pip 2>/dev/null
pip install \
    fastapi==0.110.1 \
    uvicorn==0.25.0 \
    motor==3.3.1 \
    python-dotenv>=1.0.1 \
    pydantic>=2.6.4 \
    bcrypt==4.1.3 \
    pyjwt>=2.10.1 \
    python-jose>=3.3.0 \
    email-validator>=2.2.0 \
    python-multipart>=0.0.9 \
    2>/dev/null

# Backend .env faylı yaratmaq
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=tasktracker_local
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "tasktracker-secret-key-local-$(date +%s)")
EOF

print_success "Backend .env yaradıldı"
deactivate
print_success "Backend quruldu"

# =============================================================================
# Step 4: Frontend Qurulması
# =============================================================================
print_status "Frontend qurulur..."

cd "${APP_DIR}/frontend"

# Frontend .env faylı (lokal üçün)
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

print_status "Node.js paketləri yüklənir (bu bir az vaxt ala bilər)..."
yarn install 2>/dev/null || npm install 2>/dev/null

print_success "Frontend quruldu"

# =============================================================================
# Step 5: İdarəetmə Skriptləri
# =============================================================================
print_status "İdarəetmə skriptləri yaradılır..."

cd "${APP_DIR}"

# Start script
cat > start.sh << 'STARTSCRIPT'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONGO_DATA_DIR="${SCRIPT_DIR}/mongodb_data"
LOG_DIR="${SCRIPT_DIR}/logs"

mkdir -p "${LOG_DIR}"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     TaskTracker Başladılır...          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# MongoDB başlatmaq
echo "[*] MongoDB yoxlanılır..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "[*] MongoDB başladılır..."
    mkdir -p "${MONGO_DATA_DIR}"
    mongod --dbpath "${MONGO_DATA_DIR}" --port 27017 --fork --logpath "${LOG_DIR}/mongodb.log" 2>/dev/null
    sleep 2
fi

if pgrep -x "mongod" > /dev/null; then
    echo "[✓] MongoDB işləyir"
else
    echo "[!] MongoDB başladıla bilmədi"
fi

# Backend başlatmaq
echo "[*] Backend başladılır (port 8001)..."
cd "${SCRIPT_DIR}/backend"
source venv/bin/activate
nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > "${LOG_DIR}/backend.log" 2>&1 &
echo $! > "${SCRIPT_DIR}/backend.pid"
deactivate
sleep 2

if [ -f "${SCRIPT_DIR}/backend.pid" ] && kill -0 $(cat "${SCRIPT_DIR}/backend.pid") 2>/dev/null; then
    echo "[✓] Backend işləyir - http://localhost:8001"
else
    echo "[!] Backend başladıla bilmədi"
fi

# Frontend başlatmaq
echo "[*] Frontend başladılır (port 3000)..."
cd "${SCRIPT_DIR}/frontend"
nohup yarn start > "${LOG_DIR}/frontend.log" 2>&1 &
echo $! > "${SCRIPT_DIR}/frontend.pid"
sleep 3

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  TaskTracker Hazırdır!                     ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  🌐 Frontend:  http://localhost:3000                       ║"
echo "║  🔧 Backend:   http://localhost:8001                       ║"
echo "║  📚 API Docs:  http://localhost:8001/docs                  ║"
echo "║                                                            ║"
echo "║  📁 Loglar:                                                ║"
echo "║     • Backend:  ${LOG_DIR}/backend.log                     ║"
echo "║     • Frontend: ${LOG_DIR}/frontend.log                    ║"
echo "║     • MongoDB:  ${LOG_DIR}/mongodb.log                     ║"
echo "║                                                            ║"
echo "║  Dayandırmaq üçün: ./stop.sh                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Brauzerdə avtomatik açmaq
sleep 5
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" 2>/dev/null &
elif command -v firefox &> /dev/null; then
    firefox "http://localhost:3000" 2>/dev/null &
fi
STARTSCRIPT

chmod +x start.sh

# Stop script
cat > stop.sh << 'STOPSCRIPT'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     TaskTracker Dayandırılır...        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Backend dayandırmaq
if [ -f "${SCRIPT_DIR}/backend.pid" ]; then
    PID=$(cat "${SCRIPT_DIR}/backend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo "[✓] Backend dayandırıldı"
    fi
    rm -f "${SCRIPT_DIR}/backend.pid"
fi

# Frontend dayandırmaq
if [ -f "${SCRIPT_DIR}/frontend.pid" ]; then
    PID=$(cat "${SCRIPT_DIR}/frontend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo "[✓] Frontend dayandırıldı"
    fi
    rm -f "${SCRIPT_DIR}/frontend.pid"
fi

# Qalan prosesləri təmizləmək
pkill -f "uvicorn server:app" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node.*start" 2>/dev/null || true

echo ""
echo "[✓] TaskTracker tamamilə dayandırıldı"
echo ""
STOPSCRIPT

chmod +x stop.sh

# Status script
cat > status.sh << 'STATUSSCRIPT'
#!/bin/bash

echo ""
echo "╔════════════════════════════════════════╗"
echo "║        TaskTracker Status              ║"
echo "╚════════════════════════════════════════╝"
echo ""

# MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo "  MongoDB:   ✅ İşləyir (port 27017)"
else
    echo "  MongoDB:   ❌ Dayandırılıb"
fi

# Backend
if pgrep -f "uvicorn server:app" > /dev/null; then
    echo "  Backend:   ✅ İşləyir (http://localhost:8001)"
else
    echo "  Backend:   ❌ Dayandırılıb"
fi

# Frontend
if pgrep -f "react-scripts" > /dev/null || pgrep -f "node.*start" > /dev/null; then
    echo "  Frontend:  ✅ İşləyir (http://localhost:3000)"
else
    echo "  Frontend:  ❌ Dayandırılıb"
fi

echo ""
STATUSSCRIPT

chmod +x status.sh

# Restart script
cat > restart.sh << 'RESTARTSCRIPT'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[*] TaskTracker yenidən başladılır..."
"${SCRIPT_DIR}/stop.sh"
sleep 2
"${SCRIPT_DIR}/start.sh"
RESTARTSCRIPT

chmod +x restart.sh

# Logs script
cat > logs.sh << 'LOGSSCRIPT'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"

echo "╔════════════════════════════════════════╗"
echo "║        TaskTracker Logları             ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "1) Backend logları"
echo "2) Frontend logları"
echo "3) MongoDB logları"
echo "4) Hamısı (tail -f)"
echo ""
read -p "Seçiminiz (1-4): " choice

case $choice in
    1) tail -f "${LOG_DIR}/backend.log" ;;
    2) tail -f "${LOG_DIR}/frontend.log" ;;
    3) tail -f "${LOG_DIR}/mongodb.log" ;;
    4) tail -f "${LOG_DIR}"/*.log ;;
    *) echo "Yanlış seçim" ;;
esac
LOGSSCRIPT

chmod +x logs.sh

print_success "İdarəetmə skriptləri yaradıldı"

# =============================================================================
# Step 6: Desktop Entry (İstəyə bağlı)
# =============================================================================
print_status "Desktop entry yaradılır..."

mkdir -p ~/.local/share/applications

cat > ~/.local/share/applications/tasktracker.desktop << EOF
[Desktop Entry]
Name=TaskTracker
Comment=Notion-style Task Manager with Habit Tracking
Exec=bash -c "cd ${APP_DIR} && ./start.sh"
Icon=utilities-tasks
Terminal=true
Type=Application
Categories=Office;ProjectManagement;Utility;
Keywords=task;habit;productivity;tracker;
EOF

print_success "Desktop entry yaradıldı"

# =============================================================================
# Tamamlandı
# =============================================================================
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║                    QURAŞDIRMA TAMAMLANDI!                        ║"
echo "║                                                                  ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║                                                                  ║"
echo "║  TaskTracker-ı başlatmaq üçün:                                   ║"
echo "║                                                                  ║"
echo "║      cd ${APP_DIR}                                               ║"
echo "║      ./start.sh                                                  ║"
echo "║                                                                  ║"
echo "║  Digər əmrlər:                                                   ║"
echo "║      ./stop.sh     - Dayandırmaq                                 ║"
echo "║      ./restart.sh  - Yenidən başlatmaq                           ║"
echo "║      ./status.sh   - Statusu yoxlamaq                            ║"
echo "║      ./logs.sh     - Logları görmək                              ║"
echo "║                                                                  ║"
echo "║  URL-lər:                                                        ║"
echo "║      Frontend: http://localhost:3000                             ║"
echo "║      Backend:  http://localhost:8001                             ║"
echo "║      API Docs: http://localhost:8001/docs                        ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# İndi başlatmaq istəyirsinizmi?
read -p "TaskTracker-ı indi başlatmaq istəyirsiniz? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start.sh
fi
