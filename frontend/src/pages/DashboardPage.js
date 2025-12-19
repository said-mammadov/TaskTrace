import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    CheckSquare, 
    Target, 
    Clock, 
    TrendingUp, 
    Plus,
    ArrowRight,
    Calendar,
    Flame
} from 'lucide-react';
import { useAnalytics, useHabits, useTasks } from '../hooks/useApi';
import { formatDuration, formatDate, getPriorityColor, cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

export default function DashboardPage() {
    const [overview, setOverview] = useState(null);
    const [weeklyActivity, setWeeklyActivity] = useState([]);
    const [habits, setHabits] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const { getOverview, getWeeklyActivity } = useAnalytics();
    const { getHabits } = useHabits();
    const { getTasks } = useTasks();

    useEffect(() => {
        loadData();
        
        const handleUpdate = () => loadData();
        window.addEventListener('session-updated', handleUpdate);
        return () => window.removeEventListener('session-updated', handleUpdate);
    }, []);

    const loadData = async () => {
        try {
            const [overviewData, activityData, habitsData, tasksData] = await Promise.all([
                getOverview(),
                getWeeklyActivity(),
                getHabits(),
                getTasks()
            ]);
            setOverview(overviewData);
            setWeeklyActivity(activityData);
            setHabits(habitsData);
            setTasks(tasksData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const recentTasks = tasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    const topHabits = habits
        .sort((a, b) => b.total_time_minutes - a.total_time_minutes)
        .slice(0, 4);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const metrics = [
        { label: 'Tasks Completed', value: overview?.completed_tasks || 0, icon: CheckSquare, color: 'text-emerald-400' },
        { label: 'Active Habits', value: overview?.total_habits || 0, icon: Target, color: 'text-blue-400' },
        { label: 'Weekly Focus', value: formatDuration(overview?.weekly_time_minutes || 0), icon: Clock, color: 'text-purple-400' },
        { label: 'Best Streak', value: `${overview?.longest_streak || 0} days`, icon: Flame, color: 'text-orange-400' },
    ];

    return (
        <div className="space-y-8" data-testid="dashboard-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
                    <p className="text-zinc-500 mt-1">Your productivity at a glance</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/tasks">
                        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" data-testid="add-task-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            New Task
                        </Button>
                    </Link>
                    <Link to="/habits">
                        <Button className="bg-white text-zinc-900 hover:bg-zinc-200" data-testid="add-habit-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            New Habit
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, i) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="metric-card group"
                        data-testid={`metric-${metric.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <metric.icon className={cn("w-5 h-5", metric.color)} />
                            <TrendingUp className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                        <p className="text-2xl font-semibold text-white font-mono tabular-nums">
                            {metric.value}
                        </p>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                            {metric.label}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Weekly Activity Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="metric-card"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Weekly Activity
                        </h2>
                        <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyActivity}>
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                    width={30}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#18181B', 
                                        border: '1px solid #27272A',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#FAFAFA' }}
                                    itemStyle={{ color: '#A1A1AA' }}
                                />
                                <Bar dataKey="minutes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Tasks Completed Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="metric-card"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Tasks Completed
                        </h2>
                        <CheckSquare className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyActivity}>
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                    width={30}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#18181B', 
                                        border: '1px solid #27272A',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#FAFAFA' }}
                                />
                                <defs>
                                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="tasks_completed" 
                                    stroke="#10B981" 
                                    fill="url(#colorTasks)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Tasks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="metric-card"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Pending Tasks
                        </h2>
                        <Link to="/tasks" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {recentTasks.length === 0 ? (
                            <p className="text-zinc-500 text-sm py-4 text-center">No pending tasks</p>
                        ) : (
                            recentTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-md hover:bg-zinc-900/50 transition-colors"
                                    data-testid={`task-item-${task.id}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", 
                                            task.status === 'in-progress' ? 'bg-blue-500' : 'bg-zinc-600'
                                        )} />
                                        <span className="text-sm text-zinc-300 truncate">{task.title}</span>
                                    </div>
                                    <span className={cn("text-xs font-medium flex-shrink-0 ml-2", getPriorityColor(task.priority))}>
                                        {task.priority}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Top Habits */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="metric-card"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Your Habits
                        </h2>
                        <Link to="/habits" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {topHabits.length === 0 ? (
                            <p className="text-zinc-500 text-sm py-4 text-center">No habits yet</p>
                        ) : (
                            topHabits.map((habit) => (
                                <Link
                                    key={habit.id}
                                    to={`/habits/${habit.id}`}
                                    className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-md hover:bg-zinc-900/50 transition-colors group"
                                    data-testid={`habit-item-${habit.id}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div 
                                            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${habit.color}20` }}
                                        >
                                            <Target className="w-4 h-4" style={{ color: habit.color }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-zinc-300 truncate">{habit.name}</p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDuration(habit.total_time_minutes)} total
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {habit.current_streak > 0 && (
                                            <span className="flex items-center gap-1 text-xs text-orange-400">
                                                <Flame className="w-3 h-3" />
                                                {habit.current_streak}
                                            </span>
                                        )}
                                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
