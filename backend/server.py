from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import traceback

# Diagnostics import
from diagnostics import (
    diagnostics_logger, 
    healing_engine, 
    DiagnosticsMiddleware,
    catch_errors,
    ErrorType,
    ErrorRecord,
    ErrorSeverity,
    MongoDBDiagnostics,
    initialize_diagnostics
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment validation with auto-recovery
def get_env_with_fallback(key: str, fallback: str) -> str:
    value = os.environ.get(key)
    if not value:
        os.environ[key] = fallback
        return fallback
    return value

mongo_url = get_env_with_fallback('MONGO_URL', 'mongodb://localhost:27017')
db_name = get_env_with_fallback('DB_NAME', 'tasktracker_local')
jwt_secret = get_env_with_fallback('JWT_SECRET', f'auto-secret-{uuid.uuid4().hex}')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="TaskTracker API", version="2.0.0")
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin")
diagnostics_router = APIRouter(prefix="/api/diagnostics")
security = HTTPBearer()

JWT_SECRET = jwt_secret
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB Diagnostics instance
mongo_diag: MongoDBDiagnostics = None

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str = "user"
    created_at: str
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    priority: str = "Medium"
    status: str = "todo"
    due_date: Optional[str] = None
    habit_id: Optional[str] = None
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    habit_id: Optional[str] = None
    tags: Optional[List[str]] = None

class TaskResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    due_date: Optional[str]
    habit_id: Optional[str]
    tags: List[str]
    created_at: str
    updated_at: str
    completed_at: Optional[str]

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "#FAFAFA"
    icon: str = "target"
    target_minutes_per_day: int = 30
    category: str = "General"

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    target_minutes_per_day: Optional[int] = None
    category: Optional[str] = None

class HabitResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    color: str
    icon: str
    target_minutes_per_day: int
    category: str
    total_time_minutes: int
    current_streak: int
    longest_streak: int
    created_at: str
    updated_at: str

class SessionCreate(BaseModel):
    habit_id: str
    duration_minutes: int
    notes: Optional[str] = ""
    started_at: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    user_id: str
    habit_id: str
    duration_minutes: int
    notes: str
    started_at: str
    ended_at: str

class ActiveSessionCreate(BaseModel):
    habit_id: str

class ActiveSessionResponse(BaseModel):
    id: str
    user_id: str
    habit_id: str
    started_at: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str = "user") -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============== GLOBAL EXCEPTION HANDLER ==============

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Bütün gözlənilməz xətaları tut"""
    error_record = ErrorRecord(
        error_type=ErrorType.BACKEND_SERVER,
        message=str(exc),
        severity=ErrorSeverity.CRITICAL,
        source="global_exception_handler",
        request_info={
            "method": request.method,
            "path": str(request.url.path),
            "query": str(request.query_params)
        },
        stack_trace=traceback.format_exc()
    )
    
    # Avtomatik bərpa cəhdi
    recovered = await healing_engine.attempt_recovery(error_record)
    await diagnostics_logger.log(error_record.to_dict())
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_id": error_record.error_id,
            "auto_recovery_attempted": recovered
        }
    )

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
@catch_errors(ErrorType.BACKEND_API)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "user"
    
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": role,
        "is_active": True,
        "created_at": now
    }
    await db.users.insert_one(user)
    token = create_token(user_id, role)
    return {"token": token, "user": {"id": user_id, "email": data.email, "name": data.name, "role": role, "created_at": now}}

@api_router.post("/auth/login", response_model=dict)
@catch_errors(ErrorType.BACKEND_API)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_token(user["id"], user.get("role", "user"))
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user.get("role", "user"), "created_at": user["created_at"]}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user.get("role", "user"), "created_at": user["created_at"], "is_active": user.get("is_active", True)}

# ============== ADMIN ROUTES ==============

@admin_router.get("/users", response_model=List[dict])
async def admin_get_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@admin_router.get("/users/{user_id}", response_model=dict)
async def admin_get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # User statistikası
    tasks_count = await db.tasks.count_documents({"user_id": user_id})
    habits_count = await db.habits.count_documents({"user_id": user_id})
    sessions_count = await db.sessions.count_documents({"user_id": user_id})
    
    user["stats"] = {
        "tasks_count": tasks_count,
        "habits_count": habits_count,
        "sessions_count": sessions_count
    }
    return user

@admin_router.put("/users/{user_id}", response_model=dict)
async def admin_update_user(user_id: str, data: UserUpdate, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
        # Audit log
        await db.admin_audit.insert_one({
            "id": str(uuid.uuid4()),
            "admin_id": admin["id"],
            "action": "update_user",
            "target_user_id": user_id,
            "changes": update_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@admin_router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # User data silmək
    await db.tasks.delete_many({"user_id": user_id})
    await db.habits.delete_many({"user_id": user_id})
    await db.sessions.delete_many({"user_id": user_id})
    await db.active_sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    # Audit log
    await db.admin_audit.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "action": "delete_user",
        "target_user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "User and all data deleted"}

@admin_router.get("/stats")
async def admin_get_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    total_tasks = await db.tasks.count_documents({})
    completed_tasks = await db.tasks.count_documents({"status": "completed"})
    total_habits = await db.habits.count_documents({})
    total_sessions = await db.sessions.count_documents({})
    
    # Son 7 gün aktivliyi
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_tasks = await db.tasks.count_documents({"created_at": {"$gte": week_ago.isoformat()}})
    recent_sessions = await db.sessions.count_documents({"ended_at": {"$gte": week_ago.isoformat()}})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "total_habits": total_habits,
        "total_sessions": total_sessions,
        "recent_tasks_7d": recent_tasks,
        "recent_sessions_7d": recent_sessions
    }

@admin_router.get("/audit-logs")
async def admin_get_audit_logs(limit: int = 50, admin: dict = Depends(get_admin_user)):
    logs = await db.admin_audit.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# ============== DIAGNOSTICS ROUTES ==============

@diagnostics_router.get("/logs")
async def get_diagnostics_logs(limit: int = 100, error_type: str = None, admin: dict = Depends(get_admin_user)):
    logs = await diagnostics_logger.get_recent_logs(limit, error_type)
    return logs

@diagnostics_router.get("/stats")
async def get_diagnostics_stats(admin: dict = Depends(get_admin_user)):
    stats = await diagnostics_logger.get_error_stats()
    return stats

@diagnostics_router.get("/health")
async def health_check():
    """Sistem sağlamlıq yoxlaması"""
    health = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {}
    }
    
    # MongoDB yoxla
    try:
        await db.command("ping")
        health["services"]["mongodb"] = {"status": "healthy"}
    except Exception as e:
        health["services"]["mongodb"] = {"status": "unhealthy", "error": str(e)}
        health["status"] = "degraded"
    
    # Disk yoxla
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        health["services"]["disk"] = {
            "status": "healthy" if free > 1e9 else "warning",
            "free_gb": round(free / 1e9, 2)
        }
    except:
        pass
    
    return health

@diagnostics_router.post("/trigger-recovery/{error_type}")
async def trigger_manual_recovery(error_type: str, admin: dict = Depends(get_admin_user)):
    """Manual bərpa tətiklə"""
    try:
        et = ErrorType(error_type)
        error_record = ErrorRecord(
            error_type=et,
            message="Manual recovery triggered",
            severity=ErrorSeverity.MEDIUM,
            source="manual_trigger"
        )
        success = await healing_engine.attempt_recovery(error_record)
        await diagnostics_logger.log(error_record.to_dict())
        return {"success": success, "error_record": error_record.to_dict()}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid error type: {error_type}")

# ============== TASK ROUTES ==============

@api_router.post("/tasks", response_model=TaskResponse)
@catch_errors(ErrorType.BACKEND_API)
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    task = {
        "id": task_id,
        "user_id": user["id"],
        "title": data.title,
        "description": data.description or "",
        "category": data.category or "General",
        "priority": data.priority,
        "status": data.status,
        "due_date": data.due_date,
        "habit_id": data.habit_id,
        "tags": data.tags or [],
        "created_at": now,
        "updated_at": now,
        "completed_at": None
    }
    await db.tasks.insert_one(task)
    return {k: v for k, v in task.items() if k != "_id"}

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if data.status == "completed" and task.get("status") != "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif data.status and data.status != "completed":
        update_data["completed_at"] = None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ============== HABIT ROUTES ==============

@api_router.post("/habits", response_model=HabitResponse)
@catch_errors(ErrorType.BACKEND_API)
async def create_habit(data: HabitCreate, user: dict = Depends(get_current_user)):
    habit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    habit = {
        "id": habit_id,
        "user_id": user["id"],
        "name": data.name,
        "description": data.description or "",
        "color": data.color,
        "icon": data.icon,
        "target_minutes_per_day": data.target_minutes_per_day,
        "category": data.category,
        "total_time_minutes": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "created_at": now,
        "updated_at": now
    }
    await db.habits.insert_one(habit)
    return {k: v for k, v in habit.items() if k != "_id"}

@api_router.get("/habits", response_model=List[HabitResponse])
async def get_habits(user: dict = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return habits

@api_router.get("/habits/{habit_id}", response_model=HabitResponse)
async def get_habit(habit_id: str, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"id": habit_id, "user_id": user["id"]}, {"_id": 0})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit

@api_router.put("/habits/{habit_id}", response_model=HabitResponse)
async def update_habit(habit_id: str, data: HabitUpdate, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"id": habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.habits.update_one({"id": habit_id}, {"$set": update_data})
    updated = await db.habits.find_one({"id": habit_id}, {"_id": 0})
    return updated

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user: dict = Depends(get_current_user)):
    result = await db.habits.delete_one({"id": habit_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    await db.sessions.delete_many({"habit_id": habit_id})
    await db.active_sessions.delete_many({"habit_id": habit_id})
    return {"message": "Habit deleted"}

# ============== SESSION ROUTES ==============

@api_router.post("/sessions", response_model=SessionResponse)
@catch_errors(ErrorType.BACKEND_API)
async def create_session(data: SessionCreate, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"id": data.habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    started = data.started_at or (now - timedelta(minutes=data.duration_minutes)).isoformat()
    
    session = {
        "id": session_id,
        "user_id": user["id"],
        "habit_id": data.habit_id,
        "duration_minutes": data.duration_minutes,
        "notes": data.notes or "",
        "started_at": started,
        "ended_at": now.isoformat()
    }
    await db.sessions.insert_one(session)
    await db.habits.update_one({"id": data.habit_id}, {"$inc": {"total_time_minutes": data.duration_minutes}})
    await update_streak(data.habit_id, user["id"])
    
    return {k: v for k, v in session.items() if k != "_id"}

@api_router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(habit_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if habit_id:
        query["habit_id"] = habit_id
    sessions = await db.sessions.find(query, {"_id": 0}).sort("ended_at", -1).to_list(500)
    return sessions

@api_router.get("/habits/{habit_id}/sessions", response_model=List[SessionResponse])
async def get_habit_sessions(habit_id: str, user: dict = Depends(get_current_user)):
    sessions = await db.sessions.find({"habit_id": habit_id, "user_id": user["id"]}, {"_id": 0}).sort("ended_at", -1).to_list(500)
    return sessions

# ============== ACTIVE SESSION ROUTES ==============

@api_router.post("/active-sessions", response_model=ActiveSessionResponse)
async def start_session(data: ActiveSessionCreate, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"id": data.habit_id, "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    existing = await db.active_sessions.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already have an active session")
    
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    active_session = {
        "id": session_id,
        "user_id": user["id"],
        "habit_id": data.habit_id,
        "started_at": now
    }
    await db.active_sessions.insert_one(active_session)
    return {k: v for k, v in active_session.items() if k != "_id"}

@api_router.get("/active-sessions", response_model=Optional[ActiveSessionResponse])
async def get_active_session(user: dict = Depends(get_current_user)):
    session = await db.active_sessions.find_one({"user_id": user["id"]}, {"_id": 0})
    return session

@api_router.delete("/active-sessions/{session_id}")
async def stop_session(session_id: str, save: bool = True, user: dict = Depends(get_current_user)):
    active = await db.active_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not active:
        raise HTTPException(status_code=404, detail="Active session not found")
    
    if save:
        started = datetime.fromisoformat(active["started_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        duration = int((now - started).total_seconds() / 60)
        
        if duration > 0:
            session = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "habit_id": active["habit_id"],
                "duration_minutes": duration,
                "notes": "",
                "started_at": active["started_at"],
                "ended_at": now.isoformat()
            }
            await db.sessions.insert_one(session)
            await db.habits.update_one({"id": active["habit_id"]}, {"$inc": {"total_time_minutes": duration}})
            await update_streak(active["habit_id"], user["id"])
    
    await db.active_sessions.delete_one({"id": session_id})
    return {"message": "Session stopped"}

# ============== ANALYTICS ROUTES ==============

@api_router.get("/analytics/overview")
async def get_analytics_overview(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    habits = await db.habits.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    sessions = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t["status"] == "completed"])
    total_habits = len(habits)
    total_time = sum(h.get("total_time_minutes", 0) for h in habits)
    max_streak = max([h.get("longest_streak", 0) for h in habits], default=0)
    
    today = datetime.now(timezone.utc).date()
    week_ago = today - timedelta(days=7)
    
    weekly_sessions = [s for s in sessions if datetime.fromisoformat(s["ended_at"].replace('Z', '+00:00')).date() >= week_ago]
    weekly_time = sum(s.get("duration_minutes", 0) for s in weekly_sessions)
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "total_habits": total_habits,
        "total_time_minutes": total_time,
        "weekly_time_minutes": weekly_time,
        "longest_streak": max_streak
    }

@api_router.get("/analytics/habits/{habit_id}")
async def get_habit_analytics(habit_id: str, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"id": habit_id, "user_id": user["id"]}, {"_id": 0})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    sessions = await db.sessions.find({"habit_id": habit_id, "user_id": user["id"]}, {"_id": 0}).sort("ended_at", -1).to_list(500)
    
    today = datetime.now(timezone.utc).date()
    daily_data = {}
    for i in range(30):
        day = today - timedelta(days=i)
        daily_data[day.isoformat()] = 0
    
    for session in sessions:
        session_date = datetime.fromisoformat(session["ended_at"].replace('Z', '+00:00')).date()
        if session_date.isoformat() in daily_data:
            daily_data[session_date.isoformat()] += session.get("duration_minutes", 0)
    
    timeline = [{"date": k, "minutes": v} for k, v in sorted(daily_data.items())]
    
    weekly_totals = []
    for i in range(4):
        week_start = today - timedelta(days=today.weekday() + 7 * i)
        week_end = week_start + timedelta(days=6)
        week_total = sum(
            s.get("duration_minutes", 0) for s in sessions
            if week_start <= datetime.fromisoformat(s["ended_at"].replace('Z', '+00:00')).date() <= week_end
        )
        weekly_totals.append({"week": f"Week {4-i}", "minutes": week_total})
    
    tasks = await db.tasks.find({"habit_id": habit_id, "user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    return {
        "habit": habit,
        "timeline": timeline,
        "weekly_totals": list(reversed(weekly_totals)),
        "recent_sessions": sessions[:10],
        "related_tasks": tasks,
        "total_sessions": len(sessions)
    }

@api_router.get("/analytics/weekly-activity")
async def get_weekly_activity(user: dict = Depends(get_current_user)):
    sessions = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    today = datetime.now(timezone.utc).date()
    
    daily_data = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        day_sessions = [s for s in sessions if datetime.fromisoformat(s["ended_at"].replace('Z', '+00:00')).date() == day]
        day_tasks = [t for t in tasks if t.get("completed_at") and datetime.fromisoformat(t["completed_at"].replace('Z', '+00:00')).date() == day]
        daily_data.append({
            "date": day.isoformat(),
            "day": day.strftime("%a"),
            "minutes": sum(s.get("duration_minutes", 0) for s in day_sessions),
            "tasks_completed": len(day_tasks)
        })
    
    return daily_data

async def update_streak(habit_id: str, user_id: str):
    sessions = await db.sessions.find({"habit_id": habit_id, "user_id": user_id}, {"_id": 0}).sort("ended_at", -1).to_list(500)
    
    if not sessions:
        return
    
    habit = await db.habits.find_one({"id": habit_id}, {"_id": 0})
    target = habit.get("target_minutes_per_day", 30)
    
    session_dates = {}
    for s in sessions:
        date = datetime.fromisoformat(s["ended_at"].replace('Z', '+00:00')).date()
        session_dates[date] = session_dates.get(date, 0) + s.get("duration_minutes", 0)
    
    today = datetime.now(timezone.utc).date()
    current_streak = 0
    check_date = today
    
    while check_date in session_dates and session_dates[check_date] >= target:
        current_streak += 1
        check_date -= timedelta(days=1)
    
    longest_streak = max(current_streak, habit.get("longest_streak", 0))
    
    await db.habits.update_one(
        {"id": habit_id},
        {"$set": {"current_streak": current_streak, "longest_streak": longest_streak}}
    )

@api_router.get("/")
async def root():
    return {"message": "TaskTracker API", "version": "2.0.0"}

# Include routers
app.include_router(api_router)
app.include_router(admin_router)
app.include_router(diagnostics_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Başlanğıcda diagnostika sistemini işə sal"""
    global mongo_diag
    try:
        mongo_diag = await initialize_diagnostics(db)
        logger.info("Diagnostics system initialized successfully")
    except Exception as e:
        logger.error(f"Diagnostics initialization failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
