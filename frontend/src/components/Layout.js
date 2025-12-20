import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, 
    CheckSquare, 
    Target, 
    Settings, 
    LogOut,
    Menu,
    X,
    ChevronRight,
    Plus,
    Search,
    Bell,
    Moon,
    Sun,
    Zap,
    Calendar,
    BarChart3,
    Clock,
    Flame,
    TrendingUp,
    Command
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn, formatDuration } from '../lib/utils';
import ActiveTimer from './ActiveTimer';
import { useAnalytics, useHabits } from '../hooks/useApi';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: '1' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks', shortcut: '2' },
    { path: '/habits', icon: Target, label: 'Habits', shortcut: '3' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', shortcut: '4' },
    { path: '/calendar', icon: Calendar, label: 'Calendar', shortcut: '5' },
    { path: '/settings', icon: Settings, label: 'Settings', shortcut: '0' },
];

const quickActions = [
    { label: 'New Task', icon: Plus, action: 'new-task', shortcut: 'T' },
    { label: 'New Habit', icon: Target, action: 'new-habit', shortcut: 'H' },
    { label: 'Start Focus', icon: Zap, action: 'start-focus', shortcut: 'F' },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [overview, setOverview] = useState(null);
    const [habits, setHabits] = useState([]);
    const [notifications, setNotifications] = useState([
        { id: 1, text: 'Daily streak maintained!', time: '2m ago', read: false },
        { id: 2, text: 'New achievement unlocked', time: '1h ago', read: false },
    ]);
    const [showNotifications, setShowNotifications] = useState(false);

    const { getOverview } = useAnalytics();
    const { getHabits } = useHabits();

    useEffect(() => {
        loadSidebarData();
        const interval = setInterval(loadSidebarData, 60000);
        
        const handleUpdate = () => loadSidebarData();
        window.addEventListener('session-updated', handleUpdate);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('session-updated', handleUpdate);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandOpen(true);
            }
            if (e.key === 'Escape') {
                setCommandOpen(false);
                setShowNotifications(false);
            }
            // Number shortcuts for navigation
            if (!commandOpen && !e.metaKey && !e.ctrlKey) {
                const nav = navItems.find(n => n.shortcut === e.key);
                if (nav) navigate(nav.path);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commandOpen, navigate]);

    const loadSidebarData = async () => {
        try {
            const [overviewData, habitsData] = await Promise.all([
                getOverview(),
                getHabits()
            ]);
            setOverview(overviewData);
            setHabits(habitsData.slice(0, 3));
        } catch (error) {
            console.error('Failed to load sidebar data:', error);
        }
    };

    const getBreadcrumbs = () => {
        const paths = location.pathname.split('/').filter(Boolean);
        return paths.map((path, index) => ({
            label: path.charAt(0).toUpperCase() + path.slice(1),
            path: '/' + paths.slice(0, index + 1).join('/')
        }));
    };

    const handleQuickAction = (action) => {
        setCommandOpen(false);
        switch(action) {
            case 'new-task':
                navigate('/tasks?new=true');
                break;
            case 'new-habit':
                navigate('/habits?new=true');
                break;
            case 'start-focus':
                navigate('/habits');
                break;
            default:
                break;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Desktop Sidebar */}
            <motion.aside 
                initial={false}
                animate={{ width: sidebarOpen ? 280 : 72 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    "hidden md:flex flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-xl fixed h-full z-40"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-zinc-800">
                    <motion.button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid="sidebar-toggle"
                    >
                        <Menu className="w-5 h-5 text-zinc-400" />
                    </motion.button>
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="ml-3 flex items-center gap-2"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold text-white tracking-tight text-lg">
                                    TaskTracker
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Quick Stats */}
                <AnimatePresence>
                    {sidebarOpen && overview && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 py-4 border-b border-zinc-800"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <motion.div 
                                    className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800"
                                    whileHover={{ scale: 1.02, borderColor: '#3f3f46' }}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Streak</span>
                                    </div>
                                    <p className="text-lg font-bold text-white font-mono">{overview.longest_streak || 0}</p>
                                </motion.div>
                                <motion.div 
                                    className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800"
                                    whileHover={{ scale: 1.02, borderColor: '#3f3f46' }}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Focus</span>
                                    </div>
                                    <p className="text-lg font-bold text-white font-mono">{formatDuration(overview.weekly_time_minutes || 0)}</p>
                                </motion.div>
                            </div>
                            <motion.div 
                                className="mt-2 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800"
                                whileHover={{ scale: 1.01, borderColor: '#3f3f46' }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-zinc-500">Weekly Progress</span>
                                    <span className="text-xs text-emerald-400 font-mono">
                                        {overview.completed_tasks || 0}/{overview.total_tasks || 0}
                                    </span>
                                </div>
                                <Progress 
                                    value={overview.total_tasks ? (overview.completed_tasks / overview.total_tasks) * 100 : 0} 
                                    className="h-1.5 bg-zinc-800"
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 mb-2"
                            >
                                Navigation
                            </motion.p>
                        )}
                    </AnimatePresence>
                    {navItems.map((item, index) => (
                        <motion.div
                            key={item.path}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <NavLink
                                to={item.path}
                                data-testid={`nav-${item.label.toLowerCase()}`}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                                    isActive 
                                        ? "bg-zinc-800 text-white shadow-lg shadow-zinc-900/50" 
                                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNav"
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"
                                            />
                                        )}
                                        <motion.div
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <item.icon className="w-5 h-5 flex-shrink-0" />
                                        </motion.div>
                                        <AnimatePresence>
                                            {sidebarOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="flex-1 flex items-center justify-between"
                                                >
                                                    <span className="text-sm font-medium">{item.label}</span>
                                                    <kbd className="hidden group-hover:inline-flex px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-900 rounded border border-zinc-700">
                                                        {item.shortcut}
                                                    </kbd>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </NavLink>
                        </motion.div>
                    ))}

                    {/* Quick Habits */}
                    <AnimatePresence>
                        {sidebarOpen && habits.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-zinc-800"
                            >
                                <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 mb-2">
                                    Quick Access
                                </p>
                                {habits.map((habit, i) => (
                                    <motion.div
                                        key={habit.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.05 }}
                                    >
                                        <NavLink
                                            to={`/habits/${habit.id}`}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-all duration-200 group"
                                        >
                                            <div 
                                                className="w-6 h-6 rounded-md flex items-center justify-center"
                                                style={{ backgroundColor: `${habit.color}20` }}
                                            >
                                                <Target className="w-3.5 h-3.5" style={{ color: habit.color }} />
                                            </div>
                                            <span className="text-sm truncate flex-1">{habit.name}</span>
                                            {habit.current_streak > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] text-orange-400">
                                                    <Flame className="w-3 h-3" />
                                                    {habit.current_streak}
                                                </span>
                                            )}
                                        </NavLink>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </nav>

                {/* Active Timer */}
                <ActiveTimer collapsed={!sidebarOpen} />

                {/* User section */}
                <div className="p-3 border-t border-zinc-800">
                    {/* Theme Toggle */}
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={toggleTheme}
                                className="w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                                data-testid="theme-toggle"
                            >
                                <motion.div
                                    animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                </motion.div>
                                <span className="text-sm">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                    
                    <div className={cn(
                        "flex items-center gap-3 px-3 py-2",
                        !sidebarOpen && "justify-center"
                    )}>
                        <motion.div 
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            {user?.name?.charAt(0).toUpperCase()}
                        </motion.div>
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <motion.button
                        onClick={logout}
                        data-testid="logout-btn"
                        className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 mt-2 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200",
                            !sidebarOpen && "justify-center"
                        )}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.98 }}
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
                    </motion.button>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white">TaskTracker</span>
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 hover:bg-zinc-800 rounded-lg relative"
                        whileTap={{ scale: 0.95 }}
                    >
                        <Bell className="w-5 h-5 text-zinc-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </motion.button>
                    <motion.button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 hover:bg-zinc-800 rounded-lg"
                        whileTap={{ scale: 0.95 }}
                        data-testid="mobile-menu-toggle"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </motion.button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="md:hidden fixed inset-0 top-16 bg-zinc-950/98 backdrop-blur-xl z-40"
                    >
                        <nav className="p-4 space-y-2">
                            {navItems.map((item, i) => (
                                <motion.div
                                    key={item.path}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-3 px-4 py-3.5 rounded-xl",
                                            isActive ? "bg-zinc-800 text-white" : "text-zinc-400"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </NavLink>
                                </motion.div>
                            ))}
                            <motion.button
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: navItems.length * 0.05 }}
                                onClick={() => { logout(); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-red-400"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">Logout</span>
                            </motion.button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={cn(
                "flex-1 transition-all duration-300",
                sidebarOpen ? "md:ml-[280px]" : "md:ml-[72px]",
                "mt-16 md:mt-0"
            )}>
                {/* Top Bar */}
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-30">
                    <nav className="flex items-center text-sm">
                        {getBreadcrumbs().map((crumb, index) => (
                            <motion.span 
                                key={crumb.path} 
                                className="flex items-center"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-zinc-600" />}
                                <span className={cn(
                                    index === getBreadcrumbs().length - 1 
                                        ? "text-white font-medium" 
                                        : "text-zinc-500 hover:text-zinc-300 cursor-pointer"
                                )}>
                                    {crumb.label}
                                </span>
                            </motion.span>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <motion.button
                            onClick={() => setCommandOpen(true)}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            data-testid="command-palette-btn"
                        >
                            <Search className="w-4 h-4" />
                            <span className="text-sm">Search...</span>
                            <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700">⌘K</kbd>
                        </motion.button>
                        <motion.button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="hidden md:flex p-2 hover:bg-zinc-800 rounded-lg relative"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Bell className="w-5 h-5 text-zinc-400" />
                            {unreadCount > 0 && (
                                <motion.span 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" 
                                />
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Command Palette */}
            <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 p-0 max-w-lg">
                    <div className="p-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Search className="w-5 h-5 text-zinc-500" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search or type a command..."
                                className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-zinc-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 py-2">Quick Actions</p>
                        {quickActions.map((action) => (
                            <motion.button
                                key={action.action}
                                onClick={() => handleQuickAction(action.action)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
                                whileHover={{ x: 3 }}
                            >
                                <action.icon className="w-4 h-4 text-zinc-500" />
                                <span className="flex-1 text-left text-sm">{action.label}</span>
                                <kbd className="px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
                                    {action.shortcut}
                                </kbd>
                            </motion.button>
                        ))}
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 py-2 mt-2">Navigation</p>
                        {navItems.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                            <motion.button
                                key={item.path}
                                onClick={() => { navigate(item.path); setCommandOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
                                whileHover={{ x: 3 }}
                            >
                                <item.icon className="w-4 h-4 text-zinc-500" />
                                <span className="flex-1 text-left text-sm">{item.label}</span>
                                <kbd className="px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
                                    {item.shortcut}
                                </kbd>
                            </motion.button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Notifications Dropdown */}
            <AnimatePresence>
                {showNotifications && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="fixed top-16 right-6 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="font-medium text-white">Notifications</h3>
                            <span className="text-xs text-zinc-500">{unreadCount} unread</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.map((notif) => (
                                <motion.div
                                    key={notif.id}
                                    className={cn(
                                        "p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors",
                                        !notif.read && "bg-blue-500/5"
                                    )}
                                    whileHover={{ x: 3 }}
                                >
                                    <p className="text-sm text-zinc-300">{notif.text}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{notif.time}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
