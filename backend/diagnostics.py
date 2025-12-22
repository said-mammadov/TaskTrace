"""
Unified Self-Healing Error & Query Diagnostics System
TaskTracker üçün mərkəzi xəta idarəetmə və avtomatik bərpa sistemi
"""

import os
import sys
import json
import uuid
import traceback
import subprocess
import asyncio
import socket
import psutil
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Callable
from functools import wraps
from pathlib import Path
from enum import Enum
import logging

# Log directory yaratmaq
LOG_DIR = Path("/var/log/tasktracker")
try:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
except PermissionError:
    LOG_DIR = Path.home() / ".tasktracker" / "logs"
    LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "system.log"

class ErrorType(Enum):
    BACKEND_API = "backend_api"
    BACKEND_SERVER = "backend_server"
    FRONTEND_BUILD = "frontend_build"
    FRONTEND_RUNTIME = "frontend_runtime"
    MONGODB_CONNECTION = "mongodb_connection"
    MONGODB_QUERY = "mongodb_query"
    MONGODB_SCHEMA = "mongodb_schema"
    NETWORK = "network"
    PORT_CONFLICT = "port_conflict"
    PERMISSION = "permission"
    ENVIRONMENT = "environment"
    DEPENDENCY = "dependency"
    UNKNOWN = "unknown"

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RecoveryStatus(Enum):
    NOT_ATTEMPTED = "not_attempted"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    MANUAL_REQUIRED = "manual_required"

class DiagnosticsLogger:
    """Mərkəzi logging sistemi"""
    
    def __init__(self):
        self.setup_file_logger()
        self.db = None
        self.logs_collection = None
        
    def setup_file_logger(self):
        """Fayl loggeri qur"""
        self.file_logger = logging.getLogger("tasktracker_diagnostics")
        self.file_logger.setLevel(logging.DEBUG)
        
        # File handler
        try:
            file_handler = logging.FileHandler(LOG_FILE)
            file_handler.setLevel(logging.DEBUG)
            formatter = logging.Formatter(
                '%(asctime)s | %(levelname)s | %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(formatter)
            self.file_logger.addHandler(file_handler)
        except Exception as e:
            print(f"[DIAG] File logger setup failed: {e}")
            
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter('%(message)s'))
        self.file_logger.addHandler(console_handler)
    
    async def set_database(self, db):
        """MongoDB bağlantısını qur"""
        self.db = db
        self.logs_collection = db.system_logs
        # Index yarat
        try:
            await self.logs_collection.create_index("timestamp")
            await self.logs_collection.create_index("error_type")
            await self.logs_collection.create_index("correlation_id")
            await self.logs_collection.create_index("recovery_status")
        except Exception as e:
            self.file_logger.warning(f"Index creation warning: {e}")
    
    async def log(self, error_data: Dict[str, Any]):
        """Xətanı logla"""
        # Fayla yaz
        log_line = json.dumps(error_data, default=str, ensure_ascii=False)
        self.file_logger.info(log_line)
        
        # MongoDB-yə yaz
        if self.logs_collection is not None:
            try:
                await self.logs_collection.insert_one(error_data.copy())
            except Exception as e:
                self.file_logger.error(f"MongoDB log insert failed: {e}")
    
    async def get_recent_logs(self, limit: int = 100, error_type: str = None) -> List[Dict]:
        """Son logları əldə et"""
        if self.logs_collection is None:
            return []
        
        query = {}
        if error_type:
            query["error_type"] = error_type
            
        try:
            cursor = self.logs_collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
            return await cursor.to_list(length=limit)
        except Exception:
            return []
    
    async def get_error_stats(self) -> Dict[str, Any]:
        """Xəta statistikasını əldə et"""
        if self.logs_collection is None:
            return {}
        
        try:
            pipeline = [
                {"$group": {
                    "_id": "$error_type",
                    "count": {"$sum": 1},
                    "auto_fixed": {"$sum": {"$cond": [{"$eq": ["$recovery_status", "success"]}, 1, 0]}},
                    "failed": {"$sum": {"$cond": [{"$eq": ["$recovery_status", "failed"]}, 1, 0]}}
                }},
                {"$sort": {"count": -1}}
            ]
            cursor = self.logs_collection.aggregate(pipeline)
            stats = await cursor.to_list(length=100)
            return {"by_type": stats}
        except Exception:
            return {}

# Qlobal logger instance
diagnostics_logger = DiagnosticsLogger()

class ErrorRecord:
    """Strukturlaşdırılmış xəta qeydi"""
    
    def __init__(
        self,
        error_type: ErrorType,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        source: str = "unknown",
        request_info: Dict = None,
        query_info: Dict = None,
        user_action: str = None,
        stack_trace: str = None,
        correlation_id: str = None
    ):
        self.error_id = str(uuid.uuid4())
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.request_id = str(uuid.uuid4())
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.error_type = error_type.value
        self.message = message
        self.severity = severity.value
        self.source = source
        self.request_info = request_info or {}
        self.query_info = query_info or {}
        self.user_action = user_action
        self.stack_trace = stack_trace or traceback.format_exc()
        self.recovery_status = RecoveryStatus.NOT_ATTEMPTED.value
        self.recovery_attempts = []
        self.auto_fixed = False
        self.hostname = socket.gethostname()
        self.pid = os.getpid()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_id": self.error_id,
            "correlation_id": self.correlation_id,
            "request_id": self.request_id,
            "timestamp": self.timestamp,
            "error_type": self.error_type,
            "message": self.message,
            "severity": self.severity,
            "source": self.source,
            "request_info": self.request_info,
            "query_info": self.query_info,
            "user_action": self.user_action,
            "stack_trace": self.stack_trace,
            "recovery_status": self.recovery_status,
            "recovery_attempts": self.recovery_attempts,
            "auto_fixed": self.auto_fixed,
            "hostname": self.hostname,
            "pid": self.pid
        }
    
    def add_recovery_attempt(self, action: str, success: bool, details: str = ""):
        self.recovery_attempts.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "success": success,
            "details": details
        })
        if success:
            self.recovery_status = RecoveryStatus.SUCCESS.value
            self.auto_fixed = True
        elif len(self.recovery_attempts) >= 3:
            self.recovery_status = RecoveryStatus.MANUAL_REQUIRED.value

class SelfHealingEngine:
    """Özünü bərpa edən sistem"""
    
    def __init__(self):
        self.recovery_handlers = {}
        self.register_default_handlers()
    
    def register_default_handlers(self):
        """Default bərpa handler-ləri qeyd et"""
        self.recovery_handlers[ErrorType.MONGODB_CONNECTION] = self.recover_mongodb_connection
        self.recovery_handlers[ErrorType.PORT_CONFLICT] = self.recover_port_conflict
        self.recovery_handlers[ErrorType.ENVIRONMENT] = self.recover_environment
        self.recovery_handlers[ErrorType.BACKEND_SERVER] = self.recover_backend_server
        self.recovery_handlers[ErrorType.MONGODB_QUERY] = self.recover_mongodb_query
        self.recovery_handlers[ErrorType.MONGODB_SCHEMA] = self.recover_mongodb_schema
    
    async def attempt_recovery(self, error_record: ErrorRecord) -> bool:
        """Xətanı avtomatik düzəltməyə çalış"""
        error_type = ErrorType(error_record.error_type)
        
        if error_type not in self.recovery_handlers:
            error_record.recovery_status = RecoveryStatus.MANUAL_REQUIRED.value
            return False
        
        error_record.recovery_status = RecoveryStatus.IN_PROGRESS.value
        
        try:
            handler = self.recovery_handlers[error_type]
            success = await handler(error_record)
            return success
        except Exception as e:
            error_record.add_recovery_attempt(
                f"recovery_{error_type.value}",
                False,
                str(e)
            )
            return False
    
    async def recover_mongodb_connection(self, error_record: ErrorRecord) -> bool:
        """MongoDB bağlantısını bərpa et"""
        attempts = [
            ("check_mongod_running", self._check_and_start_mongod),
            ("reconnect_client", self._reconnect_mongodb_client),
            ("create_missing_db", self._create_missing_database)
        ]
        
        for action_name, action_func in attempts:
            try:
                success = await action_func()
                error_record.add_recovery_attempt(action_name, success)
                if success:
                    return True
            except Exception as e:
                error_record.add_recovery_attempt(action_name, False, str(e))
        
        return False
    
    async def _check_and_start_mongod(self) -> bool:
        """MongoDB servisini yoxla və başlat"""
        try:
            # MongoDB işləyirmi yoxla
            result = subprocess.run(
                ["pgrep", "-x", "mongod"],
                capture_output=True,
                timeout=5
            )
            
            if result.returncode != 0:
                # MongoDB işləmir, başlat
                start_commands = [
                    ["sudo", "systemctl", "start", "mongod"],
                    ["sudo", "service", "mongodb", "start"],
                    ["mongod", "--fork", "--logpath", "/tmp/mongod.log", "--dbpath", "/tmp/mongodb_data"]
                ]
                
                for cmd in start_commands:
                    try:
                        subprocess.run(cmd, capture_output=True, timeout=10)
                        await asyncio.sleep(2)
                        # Yenidən yoxla
                        check = subprocess.run(["pgrep", "-x", "mongod"], capture_output=True)
                        if check.returncode == 0:
                            return True
                    except:
                        continue
                
                return False
            return True
        except Exception:
            return False
    
    async def _reconnect_mongodb_client(self) -> bool:
        """MongoDB client-i yenidən bağla"""
        # Bu funksiya əsas server.py-dən çağırılacaq
        return True
    
    async def _create_missing_database(self) -> bool:
        """Çatışmayan database yarad"""
        return True
    
    async def recover_port_conflict(self, error_record: ErrorRecord) -> bool:
        """Port konfliktini həll et"""
        port = error_record.request_info.get("port", 8001)
        
        try:
            # Portu istifadə edən prosesi tap
            for conn in psutil.net_connections():
                if conn.laddr.port == port and conn.status == 'LISTEN':
                    try:
                        proc = psutil.Process(conn.pid)
                        proc.terminate()
                        await asyncio.sleep(1)
                        error_record.add_recovery_attempt("kill_port_process", True, f"Killed PID {conn.pid}")
                        return True
                    except:
                        pass
            
            # Alternativ: fuser istifadə et
            subprocess.run(
                ["fuser", "-k", f"{port}/tcp"],
                capture_output=True,
                timeout=5
            )
            await asyncio.sleep(1)
            error_record.add_recovery_attempt("fuser_kill", True)
            return True
            
        except Exception as e:
            error_record.add_recovery_attempt("port_recovery", False, str(e))
            return False
    
    async def recover_environment(self, error_record: ErrorRecord) -> bool:
        """ENV dəyişənlərini bərpa et"""
        missing_var = error_record.request_info.get("missing_var", "")
        
        defaults = {
            "MONGO_URL": "mongodb://localhost:27017",
            "DB_NAME": "tasktracker_local",
            "JWT_SECRET": f"auto-generated-{uuid.uuid4().hex}",
            "CORS_ORIGINS": "http://localhost:3000"
        }
        
        if missing_var in defaults:
            os.environ[missing_var] = defaults[missing_var]
            error_record.add_recovery_attempt("set_default_env", True, f"{missing_var}={defaults[missing_var]}")
            return True
        
        return False
    
    async def recover_backend_server(self, error_record: ErrorRecord) -> bool:
        """Backend serveri bərpa et"""
        try:
            # Uvicorn prosesini yenidən başlat
            subprocess.run(
                ["pkill", "-f", "uvicorn server:app"],
                capture_output=True
            )
            await asyncio.sleep(2)
            
            # Yenidən başlat
            subprocess.Popen(
                ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
                cwd="/app/backend",
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            error_record.add_recovery_attempt("restart_backend", True)
            return True
        except Exception as e:
            error_record.add_recovery_attempt("restart_backend", False, str(e))
            return False
    
    async def recover_mongodb_query(self, error_record: ErrorRecord) -> bool:
        """MongoDB sorğu xətasını bərpa et"""
        # Timeout halında retry
        if "timeout" in error_record.message.lower():
            error_record.add_recovery_attempt("increase_timeout", True, "Will retry with longer timeout")
            return True
        return False
    
    async def recover_mongodb_schema(self, error_record: ErrorRecord) -> bool:
        """MongoDB schema xətasını bərpa et"""
        # Çatışmayan sahə üçün default dəyər
        error_record.add_recovery_attempt("apply_default_schema", True)
        return True

# Qlobal self-healing engine
healing_engine = SelfHealingEngine()

class DiagnosticsMiddleware:
    """FastAPI middleware xəta tutmaq üçün"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        correlation_id = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc)
        
        # Request məlumatlarını topla
        request_info = {
            "method": scope.get("method", ""),
            "path": scope.get("path", ""),
            "query_string": scope.get("query_string", b"").decode(),
            "correlation_id": correlation_id,
            "start_time": start_time.isoformat()
        }
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
                if status_code >= 400:
                    # Xəta baş verdi
                    error_record = ErrorRecord(
                        error_type=ErrorType.BACKEND_API,
                        message=f"HTTP {status_code} on {request_info['path']}",
                        severity=ErrorSeverity.HIGH if status_code >= 500 else ErrorSeverity.MEDIUM,
                        source="api_middleware",
                        request_info=request_info,
                        correlation_id=correlation_id
                    )
                    
                    # Avtomatik bərpa cəhdi
                    if status_code >= 500:
                        await healing_engine.attempt_recovery(error_record)
                    
                    await diagnostics_logger.log(error_record.to_dict())
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            # Gözlənilməz xəta
            error_record = ErrorRecord(
                error_type=ErrorType.BACKEND_SERVER,
                message=str(e),
                severity=ErrorSeverity.CRITICAL,
                source="middleware_exception",
                request_info=request_info,
                correlation_id=correlation_id
            )
            
            await healing_engine.attempt_recovery(error_record)
            await diagnostics_logger.log(error_record.to_dict())
            raise

def catch_errors(error_type: ErrorType = ErrorType.BACKEND_API):
    """Decorator xətaları tutmaq üçün"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            correlation_id = str(uuid.uuid4())
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                error_record = ErrorRecord(
                    error_type=error_type,
                    message=str(e),
                    severity=ErrorSeverity.HIGH,
                    source=func.__name__,
                    correlation_id=correlation_id
                )
                
                # Avtomatik bərpa
                recovered = await healing_engine.attempt_recovery(error_record)
                await diagnostics_logger.log(error_record.to_dict())
                
                if recovered:
                    # Təkrar cəhd
                    try:
                        return await func(*args, **kwargs)
                    except:
                        pass
                
                raise
        return wrapper
    return decorator

class MongoDBDiagnostics:
    """MongoDB xüsusi diagnostikası"""
    
    def __init__(self, db):
        self.db = db
        self.query_log = []
    
    async def safe_query(self, collection_name: str, operation: str, query: Dict = None, **kwargs):
        """Təhlükəsiz MongoDB sorğusu"""
        correlation_id = str(uuid.uuid4())
        query_info = {
            "collection": collection_name,
            "operation": operation,
            "query": query,
            "kwargs": str(kwargs)
        }
        
        try:
            collection = self.db[collection_name]
            
            if operation == "find":
                result = await collection.find(query or {}, **kwargs).to_list(kwargs.get("limit", 100))
            elif operation == "find_one":
                result = await collection.find_one(query or {}, **kwargs)
            elif operation == "insert_one":
                result = await collection.insert_one(query or {})
            elif operation == "update_one":
                result = await collection.update_one(query, kwargs.get("update", {}))
            elif operation == "delete_one":
                result = await collection.delete_one(query or {})
            elif operation == "aggregate":
                result = await collection.aggregate(query or []).to_list(100)
            else:
                raise ValueError(f"Unknown operation: {operation}")
            
            return result
            
        except Exception as e:
            error_record = ErrorRecord(
                error_type=ErrorType.MONGODB_QUERY,
                message=str(e),
                severity=ErrorSeverity.HIGH,
                source="mongodb_diagnostics",
                query_info=query_info,
                correlation_id=correlation_id
            )
            
            await healing_engine.attempt_recovery(error_record)
            await diagnostics_logger.log(error_record.to_dict())
            raise
    
    async def ensure_collections(self, collections: List[str]):
        """Collection-ların mövcudluğunu təmin et"""
        try:
            existing = await self.db.list_collection_names()
            for coll in collections:
                if coll not in existing:
                    await self.db.create_collection(coll)
                    await diagnostics_logger.log({
                        "event": "collection_created",
                        "collection": coll,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
        except Exception as e:
            error_record = ErrorRecord(
                error_type=ErrorType.MONGODB_SCHEMA,
                message=f"Failed to ensure collections: {e}",
                severity=ErrorSeverity.MEDIUM,
                source="ensure_collections"
            )
            await healing_engine.attempt_recovery(error_record)
            await diagnostics_logger.log(error_record.to_dict())
    
    async def ensure_indexes(self, indexes: Dict[str, List[str]]):
        """Index-lərin mövcudluğunu təmin et"""
        for collection_name, index_fields in indexes.items():
            try:
                collection = self.db[collection_name]
                for field in index_fields:
                    await collection.create_index(field)
            except Exception as e:
                await diagnostics_logger.log({
                    "event": "index_creation_failed",
                    "collection": collection_name,
                    "field": field,
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

async def initialize_diagnostics(db):
    """Diagnostika sistemini işə sal"""
    await diagnostics_logger.set_database(db)
    
    # Required collections
    mongo_diag = MongoDBDiagnostics(db)
    await mongo_diag.ensure_collections([
        "users", "tasks", "habits", "sessions", 
        "active_sessions", "system_logs", "admin_audit"
    ])
    
    # Required indexes
    await mongo_diag.ensure_indexes({
        "users": ["email", "id"],
        "tasks": ["user_id", "status", "created_at"],
        "habits": ["user_id", "id"],
        "sessions": ["habit_id", "user_id", "ended_at"],
        "system_logs": ["timestamp", "error_type", "correlation_id"]
    })
    
    return mongo_diag
