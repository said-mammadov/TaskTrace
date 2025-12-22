# 🚀 TaskTracker - Tam Quraşdırma və İstifadə Təlimatı

## 📋 Mündəricat
1. [Sistem Tələbləri](#sistem-tələbləri)
2. [Sürətli Başlanğıc](#sürətli-başlanğıc)
3. [Ətraflı Quraşdırma](#ətraflı-quraşdırma)
4. [Admin Panel](#admin-panel)
5. [Self-Healing Sistemi](#self-healing-sistemi)
6. [Skript Əmrləri](#skript-əmrləri)
7. [Problemlərin Həlli](#problemlərin-həlli)

---

## 💻 Sistem Tələbləri

| Komponent | Minimum Versiya |
|-----------|-----------------|
| Python | 3.8+ |
| Node.js | 16+ |
| MongoDB | 4.4+ |
| RAM | 4GB |
| Disk | 2GB boş yer |

### Lazımi Paketlər (Kali Linux)
```bash
sudo apt install python3 python3-pip python3-venv nodejs npm mongodb curl git
```

---

## ⚡ Sürətli Başlanğıc

### 1-ci Üsul: Tam Avtomatik (Tövsiyə Olunur)
```bash
cd /app
chmod +x tasktracker.sh
./tasktracker.sh start
```

Bu skript avtomatik olaraq:
- ✅ Bütün asılılıqları yoxlayır və yükləyir
- ✅ MongoDB-ni başladır
- ✅ Backend və Frontend-i konfiqurasiya edir
- ✅ Bütün servisləri başladır
- ✅ Self-healing monitoru aktivləşdirir

### 2-ci Üsul: Sadə Başlatma
```bash
cd /app
chmod +x start-local.sh
./start-local.sh
```

---

## 🔧 Ətraflı Quraşdırma

### Addım 1: İlk Quraşdırma (Yalnız bir dəfə)
```bash
cd /app
chmod +x setup-kali.sh
./setup-kali.sh
```

Bu skript:
- Sistem paketlərini yeniləyir
- Python virtual environment yaradır
- Backend və Frontend asılılıqlarını yükləyir
- MongoDB-ni konfiqurasiya edir

### Addım 2: Manual Quraşdırma (Alternativ)

#### Backend:
```bash
cd /app/backend

# Virtual environment yarat
python3 -m venv venv
source venv/bin/activate

# Paketləri yüklə
pip install fastapi uvicorn motor python-dotenv pydantic bcrypt pyjwt python-jose psutil

# .env faylı yarat
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=tasktracker_local
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=http://localhost:3000
EOF

# Backend-i başlat
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend:
```bash
cd /app/frontend

# .env faylı yarat
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
BROWSER=none
EOF

# Paketləri yüklə
yarn install  # və ya npm install

# Frontend-i başlat
yarn start
```

---

## 🛡️ Admin Panel

### Admin Girişi

**İlk qeydiyyatdan keçən istifadəçi avtomatik olaraq admin olur!**

1. Brauzerdə `http://localhost:3000/register` açın
2. Qeydiyyatdan keçin
3. Admin Panel-ə daxil olun: `http://localhost:3000/admin`

### Admin Panel Funksiyaları

| Funksiya | Təsvir |
|----------|--------|
| **İstifadəçi İdarəetməsi** | Bütün istifadəçiləri görün, redaktə edin, silin |
| **Rol Dəyişdirmə** | İstifadəçiləri admin/user edin |
| **Status Dəyişdirmə** | Hesabları aktiv/deaktiv edin |
| **Statistika** | Cəmi task, habit, session sayları |
| **Diagnostika** | Sistem xətalarını izləyin |
| **Audit Log** | Admin əməliyyatlarının tarixçəsi |

### Admin API Endpoints

```bash
# İstifadəçi siyahısı
GET /api/admin/users

# Tək istifadəçi məlumatı
GET /api/admin/users/{user_id}

# İstifadəçi yenilə
PUT /api/admin/users/{user_id}
{
  "name": "Yeni ad",
  "role": "admin",  # və ya "user"
  "is_active": true  # və ya false
}

# İstifadəçi sil
DELETE /api/admin/users/{user_id}

# Statistika
GET /api/admin/stats

# Audit logları
GET /api/admin/audit-logs
```

---

## 🔄 Self-Healing Sistemi

TaskTracker avtomatik bərpa sisteminə malikdir:

### Avtomatik Bərpa Olunan Problemlər

| Problem | Avtomatik Həll |
|---------|---------------|
| **MongoDB çökdü** | Avtomatik yenidən başladılır |
| **Backend cavab vermir** | Proses yenidən başladılır |
| **Frontend çökdü** | Build və restart |
| **Port konflikti** | Köhnə proses dayandırılır |
| **ENV çatışmır** | Default dəyərlərlə yaradılır |

### Monitor Sistemi

`tasktracker.sh` skripti arxa planda monitor işlədir:
- Hər 30 saniyədə servisləri yoxlayır
- Çökmüş servisi avtomatik bərpa edir
- Bütün hadisələri loglar

### Logların Yeri

```
/app/logs/
├── backend.log      # Backend logları
├── frontend.log     # Frontend logları
├── mongodb.log      # MongoDB logları
└── recovery.log     # Bərpa hadisələri

/var/log/tasktracker/
└── system.log       # Sistem diagnostikası
```

### Diagnostika API

```bash
# Sistem sağlamlığı
GET /api/diagnostics/health

# Xəta logları
GET /api/diagnostics/logs?limit=50

# Xəta statistikası
GET /api/diagnostics/stats

# Manual bərpa tətiklə
POST /api/diagnostics/trigger-recovery/{error_type}
```

---

## 📜 Skript Əmrləri

### tasktracker.sh (Əsas Skript)

```bash
# Sistemi başlat (self-healing aktiv)
./tasktracker.sh start

# Sistemi dayandır
./tasktracker.sh stop

# Yenidən başlat
./tasktracker.sh restart

# Status yoxla
./tasktracker.sh status

# Sağlamlıq yoxlaması
./tasktracker.sh health

# Manual bərpa
./tasktracker.sh recover
```

### Digər Skriptlər

```bash
# Sadə başlatma (monitoring olmadan)
./start-local.sh

# Dayandırma
./stop-local.sh

# İlk quraşdırma
./setup-kali.sh
```

---

## 🛠️ Problemlərin Həlli

### ❌ MongoDB başlamır

```bash
# Data qovluğunun icazələrini yoxla
sudo chown -R $USER:$USER /app/mongodb_data

# Manuel başlat
mongod --dbpath /app/mongodb_data --port 27017 --fork --logpath /app/logs/mongodb.log

# Systemd ilə
sudo systemctl start mongod
```

### ❌ Port artıq istifadədə

```bash
# 8001 portunu azad et
sudo fuser -k 8001/tcp

# 3000 portunu azad et  
sudo fuser -k 3000/tcp

# Və ya
lsof -i :8001  # PID-i tap
kill -9 <PID>
```

### ❌ Backend xətası

```bash
# Logları yoxla
tail -f /app/logs/backend.log

# Virtual environment-i yenidən qur
cd /app/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### ❌ Frontend başlamır

```bash
# Node modules-u yenidən yüklə
cd /app/frontend
rm -rf node_modules
yarn install

# Logları yoxla
tail -f /app/logs/frontend.log
```

### ❌ Admin rolum yoxdur

Database-i təmizləyib yenidən qeydiyyatdan keçin:
```bash
# MongoDB shell-ə daxil ol
mongosh tasktracker_local

# Users collection-u təmizlə
db.users.deleteMany({})

# Çıx və yenidən qeydiyyatdan keç
```

---

## 🌐 URL-lər

| Servis | URL |
|--------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8001/api |
| **API Docs (Swagger)** | http://localhost:8001/docs |
| **Admin Panel** | http://localhost:3000/admin |
| **MongoDB** | mongodb://localhost:27017 |

---

## 📁 Fayl Strukturu

```
/app/
├── backend/
│   ├── server.py          # Əsas API serveri
│   ├── diagnostics.py     # Self-healing modulu
│   ├── .env               # Backend konfiqurasiyası
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AdminPage.js      # Admin panel
│   │   │   ├── DashboardPage.js  # Ana səhifə
│   │   │   ├── TasksPage.js      # Tapşırıqlar
│   │   │   └── HabitsPage.js     # Vərdişlər
│   │   └── components/
│   └── .env               # Frontend konfiqurasiyası
├── logs/                  # Sistem logları
├── mongodb_data/          # Database faylları
├── tasktracker.sh         # Əsas idarəetmə skripti
├── setup-kali.sh          # İlk quraşdırma
├── start-local.sh         # Sadə başlatma
└── stop-local.sh          # Dayandırma
```

---

## 🎯 Sürətli Referans

```bash
# Başlat
./tasktracker.sh start

# Status
./tasktracker.sh status

# Dayandır
./tasktracker.sh stop

# Logları izlə
tail -f /app/logs/backend.log

# Database təmizlə (yeni admin üçün)
mongosh tasktracker_local --eval "db.users.deleteMany({})"
```

---

**TaskTracker v2.0** - Kali Linux üçün Self-Healing Task Manager
