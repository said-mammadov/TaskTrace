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
import SettingsPage from './pages/SettingsPage';
import './App.css';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
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
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
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
                <Route path="settings" element={<SettingsPage />} />
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
                    <Toaster position="bottom-right" />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
