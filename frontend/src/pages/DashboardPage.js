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
    Flame,
    Zap,
    Activity,
    Award,
    Star
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
    Bar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    Cell,
    PieChart,
    Pie
} from 'recharts';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DashboardPage() {
    const [overview, setOverview] = useState(null);
    const [weeklyActivity, setWeeklyActivity] = useState([]);
    const [habits, setHabits] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState(null);
    
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
        .slice(0, 6);

    // Radar chart data for habits
    const radarData = habits.slice(0, 6).map(habit => ({
        habit: habit.name.length > 10 ? habit.name.substring(0, 10) + '...' : habit.name,
        progress: Math.min(100, (habit.total_time_minutes / (habit.target_minutes_per_day * 7)) * 100),
        streak: habit.current_streak * 10,
        fullMark: 100
    }));

    // Task distribution by status
    const taskDistribution = [
        { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#71717A' },
        { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#3B82F6' },
        { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#10B981' },
    ].filter(d => d.value > 0);

    // Task by priority
    const tasksByPriority = [
        { name: 'Critical', value: tasks.filter(t => t.priority === 'Critical').length, color: '#EF4444' },
        { name: 'High', value: tasks.filter(t => t.priority === 'High').length, color: '#F97316' },
        { name: 'Medium', value: tasks.filter(t => t.priority === 'Medium').length, color: '#F59E0B' },
        { name: 'Low', value: tasks.filter(t => t.priority === 'Low').length, color: '#10B981' },
    ].filter(d => d.value > 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div 
                    className="w-12 h-12 border-3 border-zinc-700 border-t-blue-500 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            </div>
        );
    }

    const metrics = [
        { 
            label: 'Tasks Completed', 
            value: overview?.completed_tasks || 0, 
            total: overview?.total_tasks || 0,
            icon: CheckSquare, 
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            trend: '+12%'
        },
        { 
            label: 'Active Habits', 
            value: overview?.total_habits || 0, 
            icon: Target, 
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            trend: '+3'
        },
        { 
            label: 'Weekly Focus', 
            value: formatDuration(overview?.weekly_time_minutes || 0), 
            icon: Clock, 
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10',
            trend: '+25%'
        },
        { 
            label: 'Best Streak', 
            value: `${overview?.longest_streak || 0}`, 
            suffix: 'days',
            icon: Flame, 
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            trend: 'Record!'
        },
    ];

    return (
        <motion.div 
            className="space-y-8" 
            data-testid="dashboard-page"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <motion.h1 
                        className="text-3xl font-bold text-white tracking-tight"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        Dashboard
                    </motion.h1>
                    <motion.p 
                        className="text-zinc-500 mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Your productivity command center
                    </motion.p>
                </div>
                <div className="flex gap-3">
                    <Link to="/tasks">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600" data-testid="add-task-btn">
                                <Plus className="w-4 h-4 mr-2" />
                                New Task
                            </Button>
                        </motion.div>
                    </Link>
                    <Link to="/habits">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0" data-testid="add-habit-btn">
                                <Plus className="w-4 h-4 mr-2" />
                                New Habit
                            </Button>
                        </motion.div>
                    </Link>
                </div>
            </motion.div>

            {/* Metrics Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, i) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                        whileHover={{ 
                            scale: 1.03, 
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                            borderColor: '#3f3f46'
                        }}
                        onClick={() => setSelectedMetric(selectedMetric === i ? null : i)}
                        className={cn(
                            "metric-card group cursor-pointer relative overflow-hidden",
                            selectedMetric === i && "ring-2 ring-blue-500/50"
                        )}
                        data-testid={`metric-${metric.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                        <motion.div 
                            className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity", metric.bgColor)}
                            initial={false}
                        />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <motion.div 
                                    className={cn("p-2 rounded-lg", metric.bgColor)}
                                    whileHover={{ rotate: 10, scale: 1.1 }}
                                >
                                    <metric.icon className={cn("w-5 h-5", metric.color)} />
                                </motion.div>
                                <motion.span 
                                    className="text-xs text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                >
                                    {metric.trend}
                                </motion.span>
                            </div>
                            <motion.p 
                                className="text-3xl font-bold text-white font-mono tabular-nums"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                            >
                                {metric.value}
                                {metric.suffix && <span className="text-lg text-zinc-500 ml-1">{metric.suffix}</span>}
                            </motion.p>
                            {metric.total && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-zinc-500">{metric.label}</span>
                                        <span className="text-zinc-400">{Math.round((metric.value / metric.total) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            className={cn("h-full rounded-full", metric.bgColor.replace('/10', ''))}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(metric.value / metric.total) * 100}%` }}
                                            transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                                        />
                                    </div>
                                </div>
                            )}
                            {!metric.total && (
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                                    {metric.label}
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Charts Row */}
            <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6">
                {/* Weekly Activity Chart */}
                <motion.div
                    className="metric-card lg:col-span-2"
                    whileHover={{ borderColor: '#3f3f46' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                                Weekly Activity
                            </h2>
                        </div>
                        <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyActivity} barGap={8}>
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
                                    width={35}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#18181B', 
                                        border: '1px solid #27272A',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                                    }}
                                    labelStyle={{ color: '#FAFAFA', fontWeight: 600 }}
                                    itemStyle={{ color: '#A1A1AA' }}
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                />
                                <Bar 
                                    dataKey="minutes" 
                                    fill="url(#blueGradient)" 
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1500}
                                />
                                <Bar 
                                    dataKey="tasks_completed" 
                                    fill="url(#greenGradient)" 
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1500}
                                />
                                <defs>
                                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3B82F6" />
                                        <stop offset="100%" stopColor="#1D4ED8" />
                                    </linearGradient>
                                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" />
                                        <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-xs text-zinc-500">Focus Minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span className="text-xs text-zinc-500">Tasks Done</span>
                        </div>
                    </div>
                </motion.div>

                {/* Task Distribution */}
                <motion.div
                    className="metric-card"
                    whileHover={{ borderColor: '#3f3f46' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                                Task Status
                            </h2>
                        </div>
                    </div>
                    <div className="h-48">
                        {taskDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={taskDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={4}
                                        dataKey="value"
                                        animationDuration={1500}
                                    >
                                        {taskDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#18181B', 
                                            border: '1px solid #27272A',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">
                                No tasks yet
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {taskDistribution.map((item) => (
                            <div key={item.name} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-xs text-zinc-500">{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            {/* Habits Radar Chart */}
            {habits.length > 0 && (
                <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
                    <motion.div
                        className="metric-card"
                        whileHover={{ borderColor: '#3f3f46' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" />
                                <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                                    Habits Radar
                                </h2>
                            </div>
                            <Link to="/habits" className="text-zinc-500 hover:text-white transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#27272A" />
                                    <PolarAngleAxis 
                                        dataKey="habit" 
                                        tick={{ fill: '#71717A', fontSize: 11 }}
                                    />
                                    <PolarRadiusAxis 
                                        angle={30} 
                                        domain={[0, 100]} 
                                        tick={{ fill: '#52525B', fontSize: 10 }}
                                        axisLine={false}
                                    />
                                    <Radar
                                        name="Progress"
                                        dataKey="progress"
                                        stroke="#8B5CF6"
                                        fill="#8B5CF6"
                                        fillOpacity={0.3}
                                        animationDuration={1500}
                                    />
                                    <Radar
                                        name="Streak"
                                        dataKey="streak"
                                        stroke="#F59E0B"
                                        fill="#F59E0B"
                                        fillOpacity={0.2}
                                        animationDuration={1500}
                                    />
                                    <Legend 
                                        wrapperStyle={{ paddingTop: '20px' }}
                                        formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#18181B', 
                                            border: '1px solid #27272A',
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: '#FAFAFA' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Priority Distribution */}
                    <motion.div
                        className="metric-card"
                        whileHover={{ borderColor: '#3f3f46' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-orange-400" />
                                <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                                    Priority Breakdown
                                </h2>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {tasksByPriority.map((priority, i) => (
                                <motion.div 
                                    key={priority.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-zinc-400">{priority.name}</span>
                                        <span className="text-sm font-mono text-zinc-300">{priority.value}</span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: priority.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(priority.value / tasks.length) * 100}%` }}
                                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                                        />
                                    </div>
                                </motion.div>
                            ))}
                            {tasksByPriority.length === 0 && (
                                <div className="text-center py-8 text-zinc-500">
                                    No tasks to display
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Bottom Row */}
            <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
                {/* Recent Tasks */}
                <motion.div
                    className="metric-card"
                    whileHover={{ borderColor: '#3f3f46' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                                Pending Tasks
                            </h2>
                        </div>
                        <Link to="/tasks" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {recentTasks.length === 0 ? (
                            <motion.div 
                                className="text-center py-8"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <CheckSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 text-sm">All caught up!</p>
                                <p className="text-zinc-600 text-xs mt-1">No pending tasks</p>
                            </motion.div>
                        ) : (
                            recentTasks.map((task, i) => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ x: 5, backgroundColor: 'rgba(39, 39, 42, 0.5)' }}
                                    className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg cursor-pointer transition-all"
                                    data-testid={`task-item-${task.id}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <motion.div 
                                            className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", 
                                                task.status === 'in-progress' ? 'bg-blue-500' : 'bg-zinc-600'
                                            )}
                                            animate={task.status === 'in-progress' ? { scale: [1, 1.2, 1] } : {}}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        />
                                        <span className="text-sm text-zinc-300 truncate">{task.title}</span>
                                    </div>
                                    <span className={cn("text-xs font-semibold flex-shrink-0 ml-2 px-2 py-0.5 rounded-full", 
                                        getPriorityColor(task.priority),
                                        task.priority === 'Critical' && 'bg-red-500/10',
                                        task.priority === 'High' && 'bg-orange-500/10',
                                        task.priority === 'Medium' && 'bg-yellow-500/10',
                                        task.priority === 'Low' && 'bg-emerald-500/10'
                                    )}>
                                        {task.priority}
                                    </span>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Top Habits */}
                <motion.div
                    className="metric-card"
                    whileHover={{ borderColor: '#3f3f46' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-blue-400" />
                            <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                                Your Habits
                            </h2>
                        </div>
                        <Link to="/habits" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {topHabits.length === 0 ? (
                            <motion.div 
                                className="text-center py-8"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <Target className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 text-sm">No habits yet</p>
                                <p className="text-zinc-600 text-xs mt-1">Start building your routine</p>
                            </motion.div>
                        ) : (
                            topHabits.slice(0, 4).map((habit, i) => (
                                <motion.div
                                    key={habit.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Link
                                        to={`/habits/${habit.id}`}
                                        className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg hover:bg-zinc-900/50 transition-all group"
                                        data-testid={`habit-item-${habit.id}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <motion.div 
                                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${habit.color}20` }}
                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                            >
                                                <Target className="w-5 h-5" style={{ color: habit.color }} />
                                            </motion.div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-zinc-300 truncate font-medium">{habit.name}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {formatDuration(habit.total_time_minutes)} total
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {habit.current_streak > 0 && (
                                                <motion.span 
                                                    className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full"
                                                    animate={{ scale: [1, 1.05, 1] }}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                >
                                                    <Flame className="w-3 h-3" />
                                                    {habit.current_streak}
                                                </motion.span>
                                            )}
                                            <motion.div
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                whileHover={{ x: 3 }}
                                            >
                                                <ArrowRight className="w-4 h-4 text-zinc-500" />
                                            </motion.div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
