import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class TaskTrackerAPITester:
    def __init__(self, base_url="https://tasktracker-357.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return None

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_user_{timestamp}@example.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"

        # Test registration
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        result = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if result and 'token' in result:
            self.token = result['token']
            self.user_id = result['user']['id']
            
            # Test login with same credentials
            login_data = {
                "email": test_email,
                "password": test_password
            }
            
            login_result = self.run_test(
                "User Login",
                "POST",
                "auth/login",
                200,
                data=login_data
            )
            
            # Test get current user
            self.run_test(
                "Get Current User",
                "GET",
                "auth/me",
                200
            )
            
            return True
        
        return False

    def test_tasks_crud(self):
        """Test task CRUD operations"""
        print("\n📋 Testing Task Management...")
        
        # Create task
        task_data = {
            "title": "Test Task",
            "description": "This is a test task",
            "category": "Work",
            "priority": "High",
            "status": "todo",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "tags": ["test", "api"]
        }
        
        created_task = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if not created_task:
            return False
            
        task_id = created_task['id']
        
        # Get all tasks
        self.run_test(
            "Get All Tasks",
            "GET",
            "tasks",
            200
        )
        
        # Get specific task
        self.run_test(
            "Get Specific Task",
            "GET",
            f"tasks/{task_id}",
            200
        )
        
        # Update task
        update_data = {
            "status": "completed",
            "priority": "Medium"
        }
        
        self.run_test(
            "Update Task",
            "PUT",
            f"tasks/{task_id}",
            200,
            data=update_data
        )
        
        # Delete task
        self.run_test(
            "Delete Task",
            "DELETE",
            f"tasks/{task_id}",
            200
        )
        
        return True

    def test_habits_crud(self):
        """Test habit CRUD operations"""
        print("\n🎯 Testing Habit Management...")
        
        # Create habit
        habit_data = {
            "name": "Test Habit",
            "description": "This is a test habit",
            "color": "#3B82F6",
            "icon": "target",
            "target_minutes_per_day": 30,
            "category": "Health"
        }
        
        created_habit = self.run_test(
            "Create Habit",
            "POST",
            "habits",
            200,
            data=habit_data
        )
        
        if not created_habit:
            return False
            
        habit_id = created_habit['id']
        
        # Get all habits
        self.run_test(
            "Get All Habits",
            "GET",
            "habits",
            200
        )
        
        # Get specific habit
        self.run_test(
            "Get Specific Habit",
            "GET",
            f"habits/{habit_id}",
            200
        )
        
        # Update habit
        update_data = {
            "target_minutes_per_day": 45,
            "color": "#10B981"
        }
        
        self.run_test(
            "Update Habit",
            "PUT",
            f"habits/{habit_id}",
            200,
            data=update_data
        )
        
        return habit_id

    def test_sessions_flow(self, habit_id):
        """Test session management"""
        print("\n⏱️ Testing Session Management...")
        
        # Start active session
        session_data = {"habit_id": habit_id}
        
        active_session = self.run_test(
            "Start Active Session",
            "POST",
            "active-sessions",
            200,
            data=session_data
        )
        
        if not active_session:
            return False
            
        session_id = active_session['id']
        
        # Get active session
        self.run_test(
            "Get Active Session",
            "GET",
            "active-sessions",
            200
        )
        
        # Stop session
        self.run_test(
            "Stop Active Session",
            "DELETE",
            f"active-sessions/{session_id}?save=true",
            200
        )
        
        # Create manual session
        manual_session_data = {
            "habit_id": habit_id,
            "duration_minutes": 25,
            "notes": "Test session notes"
        }
        
        self.run_test(
            "Create Manual Session",
            "POST",
            "sessions",
            200,
            data=manual_session_data
        )
        
        # Get all sessions
        self.run_test(
            "Get All Sessions",
            "GET",
            "sessions",
            200
        )
        
        # Get habit sessions
        self.run_test(
            "Get Habit Sessions",
            "GET",
            f"habits/{habit_id}/sessions",
            200
        )
        
        return True

    def test_analytics(self, habit_id):
        """Test analytics endpoints"""
        print("\n📊 Testing Analytics...")
        
        # Get overview analytics
        self.run_test(
            "Get Analytics Overview",
            "GET",
            "analytics/overview",
            200
        )
        
        # Get habit analytics
        self.run_test(
            "Get Habit Analytics",
            "GET",
            f"analytics/habits/{habit_id}",
            200
        )
        
        # Get weekly activity
        self.run_test(
            "Get Weekly Activity",
            "GET",
            "analytics/weekly-activity",
            200
        )
        
        return True

    def cleanup_habit(self, habit_id):
        """Clean up test habit"""
        print("\n🧹 Cleaning up...")
        
        self.run_test(
            "Delete Test Habit",
            "DELETE",
            f"habits/{habit_id}",
            200
        )

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting TaskTracker API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test authentication
        if not self.test_auth_flow():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Test tasks
        if not self.test_tasks_crud():
            print("❌ Task tests failed")
            return False
        
        # Test habits
        habit_id = self.test_habits_crud()
        if not habit_id:
            print("❌ Habit tests failed")
            return False
        
        # Test sessions
        if not self.test_sessions_flow(habit_id):
            print("❌ Session tests failed")
        
        # Test analytics
        self.test_analytics(habit_id)
        
        # Cleanup
        self.cleanup_habit(habit_id)
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")

def main():
    tester = TaskTrackerAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        return 0 if success and tester.tests_passed == tester.tests_run else 1
    except Exception as e:
        print(f"❌ Test suite failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())