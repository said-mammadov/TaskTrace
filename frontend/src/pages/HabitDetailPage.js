import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft,
    Target, 
    Clock, 
    Flame,
    Play,
    Calendar,
    TrendingUp,
    TrendingDown,
    CheckSquare,
    FileText,
    MoreHorizontal,
    Edit2,
    Trash2
} from 'lucide-react';
import { useHabits, useSessions, useTasks } from '../hooks/useApi';
import { formatDuration, formatDate, formatDateTime, cn, getPriorityColor } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
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

export default function HabitDetailPage() {
    const { habitId } = useParams();
    const navigate = useNavigate();
    const [habit, setHabit] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    
    const { getHabit, deleteHabit, getHabitAnalytics } = useHabits();
    const { getActiveSession, startSession, stopSession, createSession } = useSessions();

    const loadData = useCallback(async () => {
        try {
            const [habitData, analyticsData, activeData] = await Promise.all([
                getHabit(habitId),
                getHabitAnalytics(habitId),
                getActiveSession()
            ]);
            setHabit(habitData);
            setAnalytics(analyticsData);
            setActiveSession(activeData?.habit_id === habitId ? activeData : null);
        } catch (error) {
            console.error('Failed to load habit:', error);
            toast.error('Failed to load habit');
            navigate('/habits');
        } finally {
            setLoading(false);
        }
    }, [habitId, getHabit, getHabitAnalytics, getActiveSession, navigate]);

    useEffect(() => {
        loadData();
        
        const handleUpdate = () => loadData();
        window.addEventListener('session-updated', handleUpdate);
        return () => window.removeEventListener('session-updated', handleUpdate);
    }, [loadData]);

    const handleStartSession = async () => {
        const active = await getActiveSession();
        if (active) {
            toast.error('You already have an active session');
            return;
        }
        
        try {
            const session = await startSession(habitId);
            setActiveSession(session);
            toast.success('Session started!');
            window.dispatchEvent(new Event('session-updated'));
        } catch (error) {
            toast.error('Failed to start session');
        }
    };

    const handleStopSession = async () => {
        if (!activeSession) return;
        
        try {
            await stopSession(activeSession.id, true);
            setActiveSession(null);
            toast.success('Session saved!');
            window.dispatchEvent(new Event('session-updated'));
            loadData();
        } catch (error) {
            toast.error('Failed to stop session');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this habit?')) return;
        
        try {
            await deleteHabit(habitId);
            toast.success('Habit deleted');
            navigate('/habits');
        } catch (error) {
            toast.error('Failed to delete habit');
        }
    };

    const handleLogSession = async (duration, notes) => {
        try {
            await createSession({
                habit_id: habitId,
                duration_minutes: duration,
                notes
            });
            toast.success('Session logged!');
            setSessionModalOpen(false);
            loadData();
        } catch (error) {
            toast.error('Failed to log session');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!habit) return null;

    const weeklyTotal = analytics?.weekly_totals?.reduce((acc, w) => acc + w.minutes, 0) || 0;
    const monthlyAvg = analytics?.timeline?.reduce((acc, d) => acc + d.minutes, 0) / 30 || 0;
    const trend = analytics?.timeline?.slice(-7).reduce((acc, d) => acc + d.minutes, 0) > 
                  analytics?.timeline?.slice(-14, -7).reduce((acc, d) => acc + d.minutes, 0) ? 'up' : 'down';

    return (
        <div className="space-y-6" data-testid="habit-detail-page">
            {/* Back Button & Header */}
            <div className="flex items-center gap-4">
                <Link to="/habits" className="p-2 hover:bg-zinc-800 rounded-md transition-colors" data-testid="back-to-habits">
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${habit.color}20` }}
                        >
                            <Target className="w-5 h-5" style={{ color: habit.color }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-white tracking-tight">{habit.name}</h1>
                            <p className="text-zinc-500">{habit.category}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeSession ? (
                        <Button onClick={handleStopSession} variant="destructive" data-testid="stop-session-btn">
                            Stop Session
                        </Button>
                    ) : (
                        <Button onClick={handleStartSession} className="bg-emerald-600 hover:bg-emerald-700" data-testid="start-session-btn">
                            <Play className="w-4 h-4 mr-2" />
                            Start Session
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setSessionModalOpen(true)} className="border-zinc-700" data-testid="log-session-btn">
                        Log Session
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={handleDelete} className="text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Habit
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Active Session Banner */}
            {activeSession && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center justify-between"
                    data-testid="active-session-banner"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-400 font-medium">Session in progress</span>
                    </div>
                    <ActiveSessionTimer startedAt={activeSession.started_at} />
                </motion.div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="metric-card"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Time</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">{formatDuration(habit.total_time_minutes)}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="metric-card"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Current Streak</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">{habit.current_streak} days</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="metric-card"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">This Week</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">{formatDuration(weeklyTotal)}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="metric-card"
                >
                    <div className="flex items-center gap-2 mb-2">
                        {trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Trend</span>
                    </div>
                    <p className={cn("text-2xl font-semibold font-mono", trend === 'up' ? 'text-emerald-400' : 'text-red-400')}>
                        {trend === 'up' ? 'Improving' : 'Declining'}
                    </p>
                </motion.div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Timeline Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="metric-card"
                >
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                        Daily Progress (Last 30 Days)
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.timeline || []}>
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 10 }}
                                    tickFormatter={(v) => v.slice(5)}
                                    interval={6}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                    width={40}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#18181B', 
                                        border: '1px solid #27272A',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#FAFAFA' }}
                                    formatter={(value) => [`${value} min`, 'Time']}
                                />
                                <defs>
                                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={habit.color} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={habit.color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="minutes" 
                                    stroke={habit.color} 
                                    fill="url(#colorMinutes)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Weekly Totals */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="metric-card"
                >
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                        Weekly Totals
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.weekly_totals || []}>
                                <XAxis 
                                    dataKey="week" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                    width={40}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#18181B', 
                                        border: '1px solid #27272A',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#FAFAFA' }}
                                    formatter={(value) => [`${value} min`, 'Time']}
                                />
                                <Bar dataKey="minutes" fill={habit.color} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Section */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Sessions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="metric-card"
                >
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                        Recent Sessions
                    </h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {analytics?.recent_sessions?.length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-4">No sessions yet</p>
                        ) : (
                            analytics?.recent_sessions?.map((session) => (
                                <div 
                                    key={session.id}
                                    className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-md"
                                >
                                    <div>
                                        <p className="text-sm text-zinc-200">
                                            {formatDuration(session.duration_minutes)}
                                        </p>
                                        {session.notes && (
                                            <p className="text-xs text-zinc-500 mt-0.5">{session.notes}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-zinc-500">
                                        {formatDateTime(session.ended_at)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Related Tasks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="metric-card"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                            Related Tasks
                        </h2>
                        <Link to="/tasks" className="text-xs text-zinc-500 hover:text-white">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {analytics?.related_tasks?.length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-4">No related tasks</p>
                        ) : (
                            analytics?.related_tasks?.map((task) => (
                                <div 
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-md"
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckSquare className={cn(
                                            "w-4 h-4",
                                            task.status === 'completed' ? 'text-emerald-400' : 'text-zinc-500'
                                        )} />
                                        <span className={cn(
                                            "text-sm",
                                            task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'
                                        )}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <span className={cn("text-xs", getPriorityColor(task.priority))}>
                                        {task.priority}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Log Session Modal */}
            <LogSessionModal
                isOpen={sessionModalOpen}
                onClose={() => setSessionModalOpen(false)}
                onSave={handleLogSession}
            />
        </div>
    );
}

function ActiveSessionTimer({ startedAt }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const startTime = new Date(startedAt).getTime();
        
        const updateElapsed = () => {
            const now = Date.now();
            setElapsed(Math.floor((now - startTime) / 1000));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [startedAt]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <span className="font-mono text-xl text-white tabular-nums">
            {formatTime(elapsed)}
        </span>
    );
}

function LogSessionModal({ isOpen, onClose, onSave }) {
    const [duration, setDuration] = useState(30);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(duration, notes);
            setDuration(30);
            setNotes('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Log Session</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                            min={1}
                            max={480}
                            required
                            className="bg-zinc-800 border-zinc-700"
                            data-testid="session-duration-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What did you work on?"
                            className="bg-zinc-800 border-zinc-700 min-h-[80px]"
                            data-testid="session-notes-input"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-white text-zinc-900 hover:bg-zinc-200" data-testid="log-session-submit">
                            {loading ? 'Saving...' : 'Log Session'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
