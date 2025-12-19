import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, 
    CheckSquare, 
    Target, 
    Settings, 
    LogOut,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import ActiveTimer from './ActiveTimer';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/habits', icon: Target, label: 'Habits' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const getBreadcrumbs = () => {
        const paths = location.pathname.split('/').filter(Boolean);
        return paths.map((path, index) => ({
            label: path.charAt(0).toUpperCase() + path.slice(1),
            path: '/' + paths.slice(0, index + 1).join('/')
        }));
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Desktop Sidebar */}
            <motion.aside 
                initial={false}
                animate={{ width: sidebarOpen ? 240 : 72 }}
                className={cn(
                    "hidden md:flex flex-col border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-md fixed h-full z-40"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-zinc-800">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
                        data-testid="sidebar-toggle"
                    >
                        <Menu className="w-5 h-5 text-zinc-400" />
                    </button>
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="ml-3 font-semibold text-white tracking-tight"
                            >
                                TaskTracker
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            data-testid={`nav-${item.label.toLowerCase()}`}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-150",
                                isActive 
                                    ? "bg-zinc-800 text-white" 
                                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                            )}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <AnimatePresence>
                                {sidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-sm font-medium"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}
                </nav>

                {/* Active Timer */}
                <ActiveTimer collapsed={!sidebarOpen} />

                {/* User section */}
                <div className="p-3 border-t border-zinc-800">
                    <div className={cn(
                        "flex items-center gap-3 px-3 py-2",
                        !sidebarOpen && "justify-center"
                    )}>
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button
                        onClick={logout}
                        data-testid="logout-btn"
                        className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 mt-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors",
                            !sidebarOpen && "justify-center"
                        )}
                    >
                        <LogOut className="w-5 h-5" />
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm"
                                >
                                    Logout
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 z-50 flex items-center justify-between px-4">
                <span className="font-semibold text-white">TaskTracker</span>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 hover:bg-zinc-800 rounded-md"
                    data-testid="mobile-menu-toggle"
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        className="md:hidden fixed inset-0 top-16 bg-zinc-950 z-40"
                    >
                        <nav className="p-4 space-y-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-md",
                                        isActive ? "bg-zinc-800 text-white" : "text-zinc-400"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                            <button
                                onClick={() => { logout(); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-zinc-400"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={cn(
                "flex-1 transition-all duration-300",
                sidebarOpen ? "md:ml-60" : "md:ml-[72px]",
                "mt-16 md:mt-0"
            )}>
                {/* Breadcrumb */}
                <div className="h-12 border-b border-zinc-800 flex items-center px-6 bg-zinc-950/50">
                    <nav className="flex items-center text-sm">
                        {getBreadcrumbs().map((crumb, index) => (
                            <span key={crumb.path} className="flex items-center">
                                {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-zinc-600" />}
                                <span className={cn(
                                    index === getBreadcrumbs().length - 1 
                                        ? "text-white" 
                                        : "text-zinc-500"
                                )}>
                                    {crumb.label}
                                </span>
                            </span>
                        ))}
                    </nav>
                </div>

                {/* Page Content */}
                <div className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
