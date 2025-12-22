#!/bin/bash

# =============================================================================
# TaskTracker - Unified Self-Healing Startup Script
# Kali Linux üçün tam avtomatik bərpa və başlatma sistemi
# =============================================================================

set -o pipefail

# ============== RƏNGLƏRİN TƏYİNİ ==============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# ============== QLobal DƏYİŞƏNLƏR ==============
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
MONGO_DATA_DIR="${SCRIPT_DIR}/mongodb_data"
SYSTEM_LOG="/var/log/tasktracker/system.log"
RECOVERY_LOG="${LOG_DIR}/recovery.log"
HEALTH_CHECK_INTERVAL=30
MAX_RECOVERY_ATTEMPTS=3

# Portlar
BACKEND_PORT=8001
FRONTEND_PORT=3000
MONGODB_PORT=27017

# PID faylları
BACKEND_PID_FILE="${SCRIPT_DIR}/backend.pid"
FRONTEND_PID_FILE="${SCRIPT_DIR}/frontend.pid"
MONITOR_PID_FILE="${SCRIPT_DIR}/monitor.pid"

# ============== LOG FUNKSİYALARI ==============
log_info() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[INFO]${NC} ${timestamp} - $1"
    echo "[INFO] ${timestamp} - $1" >> "${RECOVERY_LOG}" 2>/dev/null
}

log_success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[✓]${NC} ${timestamp} - $1"
    echo "[SUCCESS] ${timestamp} - $1" >> "${RECOVERY_LOG}" 2>/dev/null
}

log_warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[!]${NC} ${timestamp} - $1"
    echo "[WARNING] ${timestamp} - $1" >> "${RECOVERY_LOG}" 2>/dev/null
}

log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[✗]${NC} ${timestamp} - $1"
    echo "[ERROR] ${timestamp} - $1" >> "${RECOVERY_LOG}" 2>/dev/null
}

log_recovery() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local json="{\"timestamp\":\"${timestamp}\",\"action\":\"$1\",\"status\":\"$2\",\"details\":\"$3\"}"
    echo "${json}" >> "${RECOVERY_LOG}" 2>/dev/null
}

# ============== BANNER ==============
print_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ████████╗ █████╗ ███████╗██╗  ██╗████████╗██████╗  █████╗  ██████╗██╗  ██╗║
║   ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝║
║      ██║   ███████║███████╗█████╔╝    ██║   ██████╔╝███████║██║     █████╔╝ ║
║      ██║   ██╔══██║╚════██║██╔═██╗    ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ║
║      ██║   ██║  ██║███████║██║  ██╗   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗║
║      ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝║
║                                                                              ║
║            Self-Healing System v2.0 - Kali Linux Edition                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# ============== DİREKTORİYALARI YARAT ==============
create_directories() {
    log_info "Direktoriyalar yaradılır..."
    
    mkdir -p "${LOG_DIR}"
    mkdir -p "${MONGO_DATA_DIR}"
    mkdir -p "${SCRIPT_DIR}/backend"
    mkdir -p "${SCRIPT_DIR}/frontend"
    
    # System log directory (sudo ilə)
    sudo mkdir -p /var/log/tasktracker 2>/dev/null || mkdir -p ~/.tasktracker/logs
    sudo chmod 777 /var/log/tasktracker 2>/dev/null || true
    
    touch "${RECOVERY_LOG}"
    log_success "Direktoriyalar hazırdır"
}

# ============== ASILILIQLARI YOXLA VƏ QURAŞDIR ==============
check_and_install_dependencies() {
    log_info "Asılılıqlar yoxlanılır..."
    
    local missing_deps=()
    
    # Python3
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi
    
    # Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("nodejs")
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # MongoDB
    if ! command -v mongod &> /dev/null; then
        missing_deps+=("mongodb")
    fi
    
    # curl
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    # psutil üçün lazımi paketlər
    if ! python3 -c "import psutil" 2>/dev/null; then
        log_info "Python psutil yüklənir..."
        pip3 install psutil 2>/dev/null || true
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_warning "Çatışmayan paketlər: ${missing_deps[*]}"
        log_info "Paketlər yüklənir..."
        
        sudo apt update 2>/dev/null || true
        sudo apt install -y ${missing_deps[*]} 2>/dev/null || {
            log_error "Paketlər yüklənə bilmədi. Manual quraşdırma tələb olunur."
            return 1
        }
        
        log_recovery "install_dependencies" "success" "Installed: ${missing_deps[*]}"
    fi
    
    # Yarn
    if ! command -v yarn &> /dev/null; then
        log_info "Yarn quraşdırılır..."
        sudo npm install -g yarn 2>/dev/null || npm install -g yarn 2>/dev/null || true
    fi
    
    log_success "Bütün asılılıqlar hazırdır"
    return 0
}

# ============== PORT KONFLİKTİNİ HƏL ET ==============
resolve_port_conflict() {
    local port=$1
    local service_name=$2
    
    log_info "Port ${port} yoxlanılır (${service_name})..."
    
    # Portu istifadə edən prosesi tap
    local pid=$(lsof -t -i:${port} 2>/dev/null | head -1)
    
    if [ -n "$pid" ]; then
        local proc_name=$(ps -p $pid -o comm= 2>/dev/null)
        log_warning "Port ${port} proses tərəfindən istifadə olunur: PID=${pid}, Name=${proc_name}"
        
        # Prosesi dayandır
        kill $pid 2>/dev/null
        sleep 1
        
        # Hələ də işləyirsə, zorla dayandır
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
        
        # Yenidən yoxla
        if lsof -i:${port} &>/dev/null; then
            # fuser istifadə et
            fuser -k ${port}/tcp 2>/dev/null
            sleep 1
        fi
        
        if ! lsof -i:${port} &>/dev/null; then
            log_success "Port ${port} azad edildi"
            log_recovery "port_conflict_resolution" "success" "Port ${port} freed from PID ${pid}"
            return 0
        else
            log_error "Port ${port} azad edilə bilmədi"
            log_recovery "port_conflict_resolution" "failed" "Could not free port ${port}"
            return 1
        fi
    else
        log_success "Port ${port} artıq boşdur"
        return 0
    fi
}

# ============== MONGODB BƏRPASI ==============
recover_mongodb() {
    log_info "MongoDB yoxlanılır və bərpa edilir..."
    local attempts=0
    
    while [ $attempts -lt $MAX_RECOVERY_ATTEMPTS ]; do
        ((attempts++))
        
        # MongoDB işləyirmi yoxla
        if pgrep -x "mongod" > /dev/null; then
            # Bağlantı yoxla
            if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null || \
               mongo --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
                log_success "MongoDB işləyir və cavab verir"
                return 0
            else
                log_warning "MongoDB işləyir amma cavab vermir. Yenidən başladılır..."
                pkill -9 mongod 2>/dev/null
                sleep 2
            fi
        fi
        
        log_info "MongoDB başladılır (cəhd ${attempts}/${MAX_RECOVERY_ATTEMPTS})..."
        
        # Data directory yarad
        mkdir -p "${MONGO_DATA_DIR}"
        
        # Fərqli üsullarla başlatmağa çalış
        # 1. systemd
        if command -v systemctl &> /dev/null; then
            sudo systemctl start mongod 2>/dev/null && {
                sleep 3
                if pgrep -x "mongod" > /dev/null; then
                    log_success "MongoDB systemd ilə başladıldı"
                    log_recovery "mongodb_recovery" "success" "Started via systemd"
                    return 0
                fi
            }
        fi
        
        # 2. service
        sudo service mongodb start 2>/dev/null && {
            sleep 3
            if pgrep -x "mongod" > /dev/null; then
                log_success "MongoDB service ilə başladıldı"
                log_recovery "mongodb_recovery" "success" "Started via service"
                return 0
            fi
        }
        
        # 3. Direct mongod
        mongod --dbpath "${MONGO_DATA_DIR}" --port ${MONGODB_PORT} --fork --logpath "${LOG_DIR}/mongodb.log" 2>/dev/null && {
            sleep 3
            if pgrep -x "mongod" > /dev/null; then
                log_success "MongoDB birbaşa başladıldı"
                log_recovery "mongodb_recovery" "success" "Started directly"
                return 0
            fi
        }
        
        sleep 2
    done
    
    log_error "MongoDB başladıla bilmədi"
    log_recovery "mongodb_recovery" "failed" "All attempts exhausted"
    return 1
}

# ============== ENV BƏRPASI ==============
recover_environment() {
    log_info "Environment dəyişənləri yoxlanılır..."
    
    # Backend .env
    local backend_env="${SCRIPT_DIR}/backend/.env"
    local need_backend_env=false
    
    if [ ! -f "$backend_env" ]; then
        need_backend_env=true
    else
        # Vacib dəyişənləri yoxla
        for var in MONGO_URL DB_NAME JWT_SECRET CORS_ORIGINS; do
            if ! grep -q "^${var}=" "$backend_env" 2>/dev/null; then
                need_backend_env=true
                break
            fi
        done
    fi
    
    if [ "$need_backend_env" = true ]; then
        log_info "Backend .env yaradılır..."
        cat > "$backend_env" << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=tasktracker_local
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "auto-secret-$(date +%s)")
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
        log_success "Backend .env yaradıldı"
        log_recovery "env_recovery" "success" "Backend .env created"
    fi
    
    # Frontend .env
    local frontend_env="${SCRIPT_DIR}/frontend/.env"
    
    if [ ! -f "$frontend_env" ] || ! grep -q "REACT_APP_BACKEND_URL" "$frontend_env" 2>/dev/null; then
        log_info "Frontend .env yaradılır..."
        cat > "$frontend_env" << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
BROWSER=none
EOF
        log_success "Frontend .env yaradıldı"
        log_recovery "env_recovery" "success" "Frontend .env created"
    fi
    
    return 0
}

# ============== BACKEND BƏRPASI ==============
recover_backend() {
    log_info "Backend yoxlanılır və bərpa edilir..."
    
    # Port konfliktini həll et
    resolve_port_conflict ${BACKEND_PORT} "backend"
    
    cd "${SCRIPT_DIR}/backend"
    
    # Virtual environment yoxla
    if [ ! -d "venv" ]; then
        log_info "Python virtual environment yaradılır..."
        python3 -m venv venv || {
            log_error "Virtual environment yaradıla bilmədi"
            return 1
        }
    fi
    
    # Aktivləşdir və paketləri yoxla
    source venv/bin/activate
    
    # Lazımi paketləri yoxla və yüklə
    local required_packages="fastapi uvicorn motor python-dotenv pydantic bcrypt pyjwt python-jose email-validator python-multipart psutil"
    
    log_info "Python paketləri yoxlanılır..."
    pip install --upgrade pip 2>/dev/null
    pip install $required_packages 2>/dev/null || {
        log_warning "Bəzi paketlər yüklənə bilmədi, davam edilir..."
    }
    
    # Köhnə prosesi dayandır
    if [ -f "${BACKEND_PID_FILE}" ]; then
        local old_pid=$(cat "${BACKEND_PID_FILE}")
        kill $old_pid 2>/dev/null
        sleep 1
    fi
    pkill -f "uvicorn server:app" 2>/dev/null
    sleep 1
    
    # Backend-i başlat
    log_info "Backend başladılır..."
    nohup uvicorn server:app --host 0.0.0.0 --port ${BACKEND_PORT} --reload > "${LOG_DIR}/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "${BACKEND_PID_FILE}"
    
    deactivate
    
    # Yoxla
    sleep 3
    for i in {1..10}; do
        if curl -s http://localhost:${BACKEND_PORT}/api/ > /dev/null 2>&1; then
            log_success "Backend işləyir (PID: ${pid})"
            log_recovery "backend_recovery" "success" "Started on port ${BACKEND_PORT}"
            return 0
        fi
        sleep 1
    done
    
    log_error "Backend cavab vermir"
    log_recovery "backend_recovery" "failed" "Not responding after start"
    return 1
}

# ============== FRONTEND BƏRPASI ==============
recover_frontend() {
    log_info "Frontend yoxlanılır və bərpa edilir..."
    
    # Port konfliktini həll et
    resolve_port_conflict ${FRONTEND_PORT} "frontend"
    
    cd "${SCRIPT_DIR}/frontend"
    
    # node_modules yoxla
    if [ ! -d "node_modules" ]; then
        log_info "Node paketləri yüklənir..."
        yarn install 2>/dev/null || npm install 2>/dev/null || {
            log_warning "Paketlər yüklənə bilmədi, npm cache təmizlənir..."
            npm cache clean --force 2>/dev/null
            rm -rf node_modules package-lock.json yarn.lock 2>/dev/null
            yarn install 2>/dev/null || npm install 2>/dev/null || {
                log_error "Frontend paketləri yüklənə bilmədi"
                return 1
            }
        }
    fi
    
    # Köhnə prosesi dayandır
    if [ -f "${FRONTEND_PID_FILE}" ]; then
        local old_pid=$(cat "${FRONTEND_PID_FILE}")
        kill $old_pid 2>/dev/null
        sleep 1
    fi
    pkill -f "react-scripts start" 2>/dev/null
    pkill -f "node.*react" 2>/dev/null
    sleep 1
    
    # Frontend-i başlat
    log_info "Frontend başladılır..."
    BROWSER=none nohup yarn start > "${LOG_DIR}/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "${FRONTEND_PID_FILE}"
    
    # Yoxla
    log_info "Frontend-in başlaması gözlənilir (bu 15-20 saniyə çəkə bilər)..."
    for i in {1..30}; do
        if curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
            log_success "Frontend işləyir (PID: ${pid})"
            log_recovery "frontend_recovery" "success" "Started on port ${FRONTEND_PORT}"
            return 0
        fi
        sleep 1
    done
    
    log_warning "Frontend hələ tam başlamayıb, amma proses işləyir"
    return 0
}

# ============== SAĞLAMLIQ YOXLAMASI ==============
health_check() {
    local all_healthy=true
    
    # MongoDB
    if ! pgrep -x "mongod" > /dev/null; then
        log_warning "MongoDB işləmir!"
        all_healthy=false
    fi
    
    # Backend
    if ! curl -s http://localhost:${BACKEND_PORT}/api/ > /dev/null 2>&1; then
        log_warning "Backend cavab vermir!"
        all_healthy=false
    fi
    
    # Frontend
    if ! curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
        log_warning "Frontend cavab vermir!"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        return 0
    else
        return 1
    fi
}

# ============== MONİTOR FUNKSIYASI ==============
start_monitor() {
    log_info "Sistem monitoru başladılır..."
    
    # Köhnə monitoru dayandır
    if [ -f "${MONITOR_PID_FILE}" ]; then
        local old_pid=$(cat "${MONITOR_PID_FILE}")
        kill $old_pid 2>/dev/null
    fi
    
    # Monitor skripti
    (
        while true; do
            sleep ${HEALTH_CHECK_INTERVAL}
            
            # MongoDB yoxla
            if ! pgrep -x "mongod" > /dev/null; then
                log_warning "[MONITOR] MongoDB çökdü, bərpa edilir..."
                recover_mongodb
            fi
            
            # Backend yoxla
            if ! curl -s http://localhost:${BACKEND_PORT}/api/ > /dev/null 2>&1; then
                log_warning "[MONITOR] Backend çökdü, bərpa edilir..."
                recover_backend
            fi
            
            # Frontend yoxla (daha az tez-tez)
            if [ $((RANDOM % 2)) -eq 0 ]; then
                if ! curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
                    if ! pgrep -f "react-scripts" > /dev/null && ! pgrep -f "node.*react" > /dev/null; then
                        log_warning "[MONITOR] Frontend çökdü, bərpa edilir..."
                        recover_frontend
                    fi
                fi
            fi
        done
    ) &
    
    echo $! > "${MONITOR_PID_FILE}"
    log_success "Monitor başladıldı (PID: $(cat ${MONITOR_PID_FILE}))"
}

# ============== DAYANDIRMA ==============
stop_all() {
    log_info "Bütün xidmətlər dayandırılır..."
    
    # Monitor
    if [ -f "${MONITOR_PID_FILE}" ]; then
        kill $(cat "${MONITOR_PID_FILE}") 2>/dev/null
        rm -f "${MONITOR_PID_FILE}"
    fi
    
    # Backend
    if [ -f "${BACKEND_PID_FILE}" ]; then
        kill $(cat "${BACKEND_PID_FILE}") 2>/dev/null
        rm -f "${BACKEND_PID_FILE}"
    fi
    pkill -f "uvicorn server:app" 2>/dev/null
    
    # Frontend
    if [ -f "${FRONTEND_PID_FILE}" ]; then
        kill $(cat "${FRONTEND_PID_FILE}") 2>/dev/null
        rm -f "${FRONTEND_PID_FILE}"
    fi
    pkill -f "react-scripts start" 2>/dev/null
    pkill -f "node.*react" 2>/dev/null
    
    log_success "Bütün xidmətlər dayandırıldı"
}

# ============== STATUS ==============
show_status() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    SİSTEM STATUSU                          ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # MongoDB
    if pgrep -x "mongod" > /dev/null; then
        echo -e "  MongoDB:   ${GREEN}✓ İşləyir${NC} (port ${MONGODB_PORT})"
    else
        echo -e "  MongoDB:   ${RED}✗ Dayandırılıb${NC}"
    fi
    
    # Backend
    if curl -s http://localhost:${BACKEND_PORT}/api/ > /dev/null 2>&1; then
        echo -e "  Backend:   ${GREEN}✓ İşləyir${NC} (http://localhost:${BACKEND_PORT})"
    else
        echo -e "  Backend:   ${RED}✗ Dayandırılıb${NC}"
    fi
    
    # Frontend
    if curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
        echo -e "  Frontend:  ${GREEN}✓ İşləyir${NC} (http://localhost:${FRONTEND_PORT})"
    else
        if pgrep -f "react-scripts" > /dev/null || pgrep -f "node.*react" > /dev/null; then
            echo -e "  Frontend:  ${YELLOW}◐ Başladılır...${NC}"
        else
            echo -e "  Frontend:  ${RED}✗ Dayandırılıb${NC}"
        fi
    fi
    
    # Monitor
    if [ -f "${MONITOR_PID_FILE}" ] && kill -0 $(cat "${MONITOR_PID_FILE}") 2>/dev/null; then
        echo -e "  Monitor:   ${GREEN}✓ Aktiv${NC}"
    else
        echo -e "  Monitor:   ${YELLOW}○ Deaktiv${NC}"
    fi
    
    echo ""
}

# ============== ƏSAS BAŞLATMA ==============
main_start() {
    print_banner
    
    log_info "TaskTracker Self-Healing System başladılır..."
    
    # 1. Direktoriyalar
    create_directories
    
    # 2. Asılılıqlar
    check_and_install_dependencies || {
        log_error "Kritik asılılıqlar yüklənə bilmədi"
        exit 1
    }
    
    # 3. Environment
    recover_environment
    
    # 4. MongoDB
    recover_mongodb || {
        log_error "MongoDB başladıla bilmədi. Manual müdaxilə tələb olunur."
    }
    
    # 5. Backend
    recover_backend || {
        log_error "Backend başladıla bilmədi."
    }
    
    # 6. Frontend
    recover_frontend || {
        log_warning "Frontend tam başlamadı."
    }
    
    # 7. Monitor
    start_monitor
    
    # 8. Final status
    echo ""
    show_status
    
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                    ║${NC}"
    echo -e "${GREEN}║              TaskTracker Hazırdır!                                 ║${NC}"
    echo -e "${GREEN}║                                                                    ║${NC}"
    echo -e "${GREEN}║  🌐 Frontend:  ${WHITE}http://localhost:3000${GREEN}                             ║${NC}"
    echo -e "${GREEN}║  🔧 Backend:   ${WHITE}http://localhost:8001${GREEN}                             ║${NC}"
    echo -e "${GREEN}║  📚 API Docs:  ${WHITE}http://localhost:8001/docs${GREEN}                        ║${NC}"
    echo -e "${GREEN}║  🛡️  Admin:     ${WHITE}http://localhost:3000/admin${GREEN}                       ║${NC}"
    echo -e "${GREEN}║                                                                    ║${NC}"
    echo -e "${GREEN}║  📊 Loglar:    ${WHITE}${LOG_DIR}${GREEN}                                        ║${NC}"
    echo -e "${GREEN}║  🔄 Monitor:   ${WHITE}Aktiv (${HEALTH_CHECK_INTERVAL}s interval)${GREEN}                          ║${NC}"
    echo -e "${GREEN}║                                                                    ║${NC}"
    echo -e "${GREEN}║  Dayandırmaq:  ${YELLOW}./tasktracker.sh stop${GREEN}                             ║${NC}"
    echo -e "${GREEN}║  Status:       ${YELLOW}./tasktracker.sh status${GREEN}                           ║${NC}"
    echo -e "${GREEN}║                                                                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Brauzer aç
    sleep 3
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "http://localhost:3000" 2>/dev/null &
    fi
}

# ============== ƏMRLƏR ==============
case "${1:-start}" in
    start)
        main_start
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        main_start
        ;;
    status)
        show_status
        ;;
    health)
        if health_check; then
            echo -e "${GREEN}Sistem sağlamdır${NC}"
            exit 0
        else
            echo -e "${RED}Sistem problemləri var${NC}"
            exit 1
        fi
        ;;
    recover)
        log_info "Manual bərpa başladılır..."
        recover_mongodb
        recover_backend
        recover_frontend
        show_status
        ;;
    *)
        echo "İstifadə: $0 {start|stop|restart|status|health|recover}"
        exit 1
        ;;
esac
