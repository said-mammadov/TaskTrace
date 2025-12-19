#!/bin/bash

# =============================================================================
# TaskTracker - Kali Linux Setup Script
# Notion-style Task Manager with Habit Tracking
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Header
echo ""
echo "=============================================="
echo "   TaskTracker - Kali Linux Setup Script"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Consider running as normal user."
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}"

# -----------------------------------------------------------------------------
# Step 1: System Dependencies
# -----------------------------------------------------------------------------
print_status "Updating system packages..."
sudo apt update -y

print_status "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    mongodb \
    curl \
    git

# Install Yarn
if ! command -v yarn &> /dev/null; then
    print_status "Installing Yarn..."
    sudo npm install -g yarn
fi

print_success "System dependencies installed"

# -----------------------------------------------------------------------------
# Step 2: MongoDB Setup
# -----------------------------------------------------------------------------
print_status "Setting up MongoDB..."

# Start MongoDB service
sudo systemctl enable mongodb 2>/dev/null || true
sudo systemctl start mongodb 2>/dev/null || sudo mongod --fork --logpath /var/log/mongodb.log --dbpath /var/lib/mongodb 2>/dev/null || true

# Wait for MongoDB
sleep 3

# Check MongoDB
if pgrep -x "mongod" > /dev/null; then
    print_success "MongoDB is running"
else
    print_warning "MongoDB may not be running. Trying alternative start..."
    mkdir -p ~/mongodb_data
    mongod --dbpath ~/mongodb_data --port 27017 --fork --logpath ~/mongodb.log 2>/dev/null || true
fi

# -----------------------------------------------------------------------------
# Step 3: Backend Setup
# -----------------------------------------------------------------------------
print_status "Setting up Backend..."

cd "${APP_DIR}/backend"

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate

print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install fastapi uvicorn motor python-dotenv pydantic bcrypt pyjwt python-jose email-validator python-multipart

# Create .env file if not exists
if [ ! -f ".env" ]; then
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=tasktracker
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -hex 32)
EOF
    print_success "Backend .env created"
else
    print_warning "Backend .env already exists, skipping..."
fi

deactivate
print_success "Backend setup complete"

# -----------------------------------------------------------------------------
# Step 4: Frontend Setup
# -----------------------------------------------------------------------------
print_status "Setting up Frontend..."

cd "${APP_DIR}/frontend"

# Install Node.js dependencies
print_status "Installing Node.js dependencies (this may take a while)..."
yarn install

# Create .env file if not exists
if [ ! -f ".env" ]; then
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
    print_success "Frontend .env created"
else
    print_warning "Frontend .env already exists, skipping..."
fi

print_success "Frontend setup complete"

# -----------------------------------------------------------------------------
# Step 5: Create Start/Stop Scripts
# -----------------------------------------------------------------------------
print_status "Creating management scripts..."

cd "${APP_DIR}"

# Start script
cat > start.sh << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting TaskTracker..."

# Start MongoDB if not running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    sudo systemctl start mongodb 2>/dev/null || mongod --dbpath ~/mongodb_data --port 27017 --fork --logpath ~/mongodb.log
    sleep 2
fi

# Start Backend
echo "Starting Backend on port 8001..."
cd "${SCRIPT_DIR}/backend"
source venv/bin/activate
nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > ../backend.log 2>&1 &
echo $! > ../backend.pid
deactivate

# Start Frontend
echo "Starting Frontend on port 3000..."
cd "${SCRIPT_DIR}/frontend"
nohup yarn start > ../frontend.log 2>&1 &
echo $! > ../frontend.pid

echo ""
echo "=============================================="
echo "  TaskTracker is starting!"
echo "=============================================="
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8001"
echo "  API Docs: http://localhost:8001/docs"
echo ""
echo "  Logs:"
echo "    - Backend:  ${SCRIPT_DIR}/backend.log"
echo "    - Frontend: ${SCRIPT_DIR}/frontend.log"
echo ""
echo "  Stop with: ./stop.sh"
echo "=============================================="
EOF

chmod +x start.sh

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping TaskTracker..."

# Stop Backend
if [ -f "${SCRIPT_DIR}/backend.pid" ]; then
    PID=$(cat "${SCRIPT_DIR}/backend.pid")
    kill $PID 2>/dev/null || true
    rm "${SCRIPT_DIR}/backend.pid"
    echo "Backend stopped"
fi

# Stop Frontend
if [ -f "${SCRIPT_DIR}/frontend.pid" ]; then
    PID=$(cat "${SCRIPT_DIR}/frontend.pid")
    kill $PID 2>/dev/null || true
    rm "${SCRIPT_DIR}/frontend.pid"
    echo "Frontend stopped"
fi

# Kill any remaining processes
pkill -f "uvicorn server:app" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

echo "TaskTracker stopped"
EOF

chmod +x stop.sh

# Status script
cat > status.sh << 'EOF'
#!/bin/bash

echo "TaskTracker Status"
echo "=================="

# Check MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo "MongoDB:  ✓ Running"
else
    echo "MongoDB:  ✗ Not running"
fi

# Check Backend
if pgrep -f "uvicorn server:app" > /dev/null; then
    echo "Backend:  ✓ Running (http://localhost:8001)"
else
    echo "Backend:  ✗ Not running"
fi

# Check Frontend
if pgrep -f "react-scripts" > /dev/null; then
    echo "Frontend: ✓ Running (http://localhost:3000)"
else
    echo "Frontend: ✗ Not running"
fi
EOF

chmod +x status.sh

print_success "Management scripts created"

# -----------------------------------------------------------------------------
# Step 6: Create Desktop Entry (Optional)
# -----------------------------------------------------------------------------
print_status "Creating desktop entry..."

mkdir -p ~/.local/share/applications

cat > ~/.local/share/applications/tasktracker.desktop << EOF
[Desktop Entry]
Name=TaskTracker
Comment=Notion-style Task Manager with Habit Tracking
Exec=x-terminal-emulator -e "cd ${APP_DIR} && ./start.sh && sleep 5 && xdg-open http://localhost:3000"
Icon=utilities-tasks
Terminal=false
Type=Application
Categories=Office;ProjectManagement;
EOF

print_success "Desktop entry created"

# -----------------------------------------------------------------------------
# Complete
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "   Setup Complete!"
echo "=============================================="
echo ""
echo "  To start TaskTracker:"
echo "    cd ${APP_DIR}"
echo "    ./start.sh"
echo ""
echo "  To stop TaskTracker:"
echo "    ./stop.sh"
echo ""
echo "  To check status:"
echo "    ./status.sh"
echo ""
echo "  URLs:"
echo "    Frontend: http://localhost:3000"
echo "    Backend:  http://localhost:8001"
echo "    API Docs: http://localhost:8001/docs"
echo ""
echo "=============================================="

# Ask to start now
read -p "Start TaskTracker now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./start.sh
fi
