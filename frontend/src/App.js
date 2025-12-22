import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import HabitsPage from './pages/HabitsPage';
import HabitDetailPage from './pages/HabitDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import './App.css';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }
    
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={
                <PublicRoute>
                    <LoginPage />
                </PublicRoute>
            } />
            <Route path="/register" element={
                <PublicRoute>
                    <RegisterPage />
                </PublicRoute>
            } />
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="habits" element={<HabitsPage />} />
                <Route path="habits/:habitId" element={<HabitDetailPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <div className="noise-overlay" />
                    <AppRoutes />
                    <Toaster position="bottom-right" richColors />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
