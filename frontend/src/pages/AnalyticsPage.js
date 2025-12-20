import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    BarChart3, 
    TrendingUp, 
    Clock, 
    Target, 
    Calendar,
    Flame,
    Activity,
    Award
} from 'lucide-react';
import { useAnalytics, useHabits, useTasks } from '../hooks/useApi';
import { formatDuration, cn } from '../lib/utils';
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
    LineChart,
    Line
} from 'recharts';

export default function AnalyticsPage() {
    const [overview, setOverview] = useState(null);
    const [weeklyActivity, setWeeklyActivity] = useState([]);
    const [habits, setHabits] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('week');

    const { getOverview, getWeeklyActivity } = useAnalytics();
    const { getHabits } = useHabits();
    const { getTasks } = useTasks();

    useEffect(() => {
        loadData();
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
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const radarData = habits.slice(0, 6).map(habit => ({
        habit: habit.name.length > 8 ? habit.name.substring(0, 8) + '...' : habit.name,
        progress: Math.min(100, (habit.total_time_minutes / (habit.target_minutes_per_day * 7)) * 100),
        streak: Math.min(100, habit.current_streak * 10),
    }));

    const completionRate = overview?.total_tasks ? Math.round((overview.completed_tasks / overview.total_tasks) * 100) : 0;

    return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="analytics-page"
        >
            {/* Header */}
            <div>
                <motion.h1 
                    className="text-3xl font-bold text-white tracking-tight"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    Analytics
                </motion.h1>
                <motion.p 
                    className="text-zinc-500 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    Track your productivity trends
                </motion.p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
                {['week', 'month', 'year'].map((range) => (
                    <motion.button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            timeRange === range 
                                ? "bg-blue-600 text-white" 
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                    </motion.button>
                ))}
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Focus Time', value: formatDuration(overview?.total_time_minutes || 0), icon: Clock, color: 'text-purple-400' },
                    { label: 'Tasks Completed', value: overview?.completed_tasks || 0, icon: Target, color: 'text-emerald-400' },
                    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-blue-400' },
                    { label: 'Best Streak', value: `${overview?.longest_streak || 0} days`, icon: Flame, color: 'text-orange-400' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="metric-card"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className={cn("w-4 h-4", stat.color)} />
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Activity Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="metric-card"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Activity Trend
                        </h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyActivity}>
                                <defs>
                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                                    labelStyle={{ color: '#FAFAFA' }}
                                />
                                <Area type="monotone" dataKey="minutes" stroke="#3B82F6" fill="url(#colorActivity)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Habits Radar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="metric-card"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-purple-400" />
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Habits Performance
                        </h2>
                    </div>
                    <div className="h-64">
                        {radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#27272A" />
                                    <PolarAngleAxis dataKey="habit" tick={{ fill: '#71717A', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#52525B', fontSize: 10 }} />
                                    <Radar name="Progress" dataKey="progress" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                                    <Radar name="Streak" dataKey="streak" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                                    <Legend />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">
                                No habits to display
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Productivity Score */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="metric-card"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                        Productivity Score
                    </h2>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="relative">
                        <svg className="w-48 h-48 transform -rotate-90">
                            <circle cx="96" cy="96" r="88" stroke="#27272A" strokeWidth="8" fill="none" />
                            <motion.circle 
                                cx="96" 
                                cy="96" 
                                r="88" 
                                stroke="url(#scoreGradient)" 
                                strokeWidth="8" 
                                fill="none"
                                strokeLinecap="round"
                                initial={{ strokeDasharray: "0 553" }}
                                animate={{ strokeDasharray: `${completionRate * 5.53} 553` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                            <defs>
                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3B82F6" />
                                    <stop offset="100%" stopColor="#8B5CF6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-bold text-white">{completionRate}</span>
                            <span className="text-zinc-500 text-sm mt-1">Score</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
