from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'tasktracker-secret-key-2024')
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    created_at: str

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

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
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

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "created_at": now
    }
    await db.users.insert_one(user)
    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "email": data.email, "name": data.name, "created_at": now}}

@api_router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "created_at": user["created_at"]}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "created_at": user["created_at"]}

# ============== TASK ROUTES ==============

@api_router.post("/tasks", response_model=TaskResponse)
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
    
    await db.habits.update_one(
        {"id": data.habit_id},
        {"$inc": {"total_time_minutes": data.duration_minutes}}
    )
    
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
    sessions = await db.sessions.find(
        {"habit_id": habit_id, "user_id": user["id"]}, {"_id": 0}
    ).sort("ended_at", -1).to_list(500)
    return sessions

# ============== ACTIVE SESSION (TIMER) ROUTES ==============

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
            await db.habits.update_one(
                {"id": active["habit_id"]},
                {"$inc": {"total_time_minutes": duration}}
            )
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
    
    sessions = await db.sessions.find(
        {"habit_id": habit_id, "user_id": user["id"]}, {"_id": 0}
    ).sort("ended_at", -1).to_list(500)
    
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
        day_sessions = [
            s for s in sessions 
            if datetime.fromisoformat(s["ended_at"].replace('Z', '+00:00')).date() == day
        ]
        day_tasks = [
            t for t in tasks 
            if t.get("completed_at") and datetime.fromisoformat(t["completed_at"].replace('Z', '+00:00')).date() == day
        ]
        daily_data.append({
            "date": day.isoformat(),
            "day": day.strftime("%a"),
            "minutes": sum(s.get("duration_minutes", 0) for s in day_sessions),
            "tasks_completed": len(day_tasks)
        })
    
    return daily_data

async def update_streak(habit_id: str, user_id: str):
    sessions = await db.sessions.find(
        {"habit_id": habit_id, "user_id": user_id}, {"_id": 0}
    ).sort("ended_at", -1).to_list(500)
    
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
    return {"message": "TaskTracker API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
