import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Plus, 
    Target, 
    Play, 
    Clock,
    Flame,
    ArrowRight,
    MoreHorizontal,
    Edit2,
    Trash2,
    TrendingUp
} from 'lucide-react';
import { useHabits, useSessions } from '../hooks/useApi';
import { formatDuration, cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';

const COLORS = [
    '#FAFAFA', '#EF4444', '#F97316', '#F59E0B', '#84CC16', 
    '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
];

const CATEGORIES = ['General', 'Health', 'Learning', 'Work', 'Personal', 'Fitness', 'Creative'];

const ICONS = ['target', 'book', 'dumbbell', 'brain', 'heart', 'code', 'music', 'pen'];

export default function HabitsPage() {
    const [habits, setHabits] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    
    const { getHabits, createHabit, updateHabit, deleteHabit } = useHabits();
    const { getActiveSession, startSession, stopSession } = useSessions();

    useEffect(() => {
        loadData();
        
        const handleUpdate = () => loadData();
        window.addEventListener('session-updated', handleUpdate);
        return () => window.removeEventListener('session-updated', handleUpdate);
    }, []);

    const loadData = async () => {
        try {
            const [habitsData, activeData] = await Promise.all([
                getHabits(),
                getActiveSession()
            ]);
            setHabits(habitsData);
            setActiveSession(activeData);
        } catch (error) {
            toast.error('Failed to load habits');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateHabit = () => {
        setEditingHabit(null);
        setIsModalOpen(true);
    };

    const handleEditHabit = (habit, e) => {
        e.stopPropagation();
        e.preventDefault();
        setEditingHabit(habit);
        setIsModalOpen(true);
    };

    const handleDeleteHabit = async (habitId, e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await deleteHabit(habitId);
            setHabits(habits.filter(h => h.id !== habitId));
            toast.success('Habit deleted');
        } catch (error) {
            toast.error('Failed to delete habit');
        }
    };

    const handleSaveHabit = async (habitData) => {
        try {
            if (editingHabit) {
                const updated = await updateHabit(editingHabit.id, habitData);
                setHabits(habits.map(h => h.id === editingHabit.id ? updated : h));
                toast.success('Habit updated');
            } else {
                const created = await createHabit(habitData);
                setHabits([...habits, created]);
                toast.success('Habit created');
            }
            setIsModalOpen(false);
        } catch (error) {
            toast.error('Failed to save habit');
        }
    };

    const handleStartSession = async (habitId, e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (activeSession) {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const totalTime = habits.reduce((acc, h) => acc + h.total_time_minutes, 0);
    const longestStreak = Math.max(...habits.map(h => h.longest_streak), 0);

    return (
        <div className="space-y-6" data-testid="habits-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Habits</h1>
                    <p className="text-zinc-500 mt-1">
                        {habits.length} habits · {formatDuration(totalTime)} tracked
                    </p>
                </div>
                <Button onClick={handleCreateHabit} className="bg-white text-zinc-900 hover:bg-zinc-200" data-testid="create-habit-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    New Habit
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="metric-card">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Habits</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">{habits.length}</p>
                </div>
                <div className="metric-card">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Time</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">{formatDuration(totalTime)}</p>
                </div>
                <div className="metric-card">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Best Streak</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">{longestStreak} days</p>
                </div>
                <div className="metric-card">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Active Now</span>
                    </div>
                    <p className="text-2xl font-semibold text-white font-mono">
                        {activeSession ? '1' : '0'}
                    </p>
                </div>
            </div>

            {/* Habits Grid */}
            {habits.length === 0 ? (
                <div className="text-center py-16">
                    <Target className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No habits yet</h3>
                    <p className="text-zinc-500 mb-4">Start building your habits and track your progress</p>
                    <Button onClick={handleCreateHabit} variant="outline" className="border-zinc-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first habit
                    </Button>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {habits.map((habit, i) => (
                        <motion.div
                            key={habit.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <HabitCard
                                habit={habit}
                                isActive={activeSession?.habit_id === habit.id}
                                onStart={handleStartSession}
                                onEdit={handleEditHabit}
                                onDelete={handleDeleteHabit}
                            />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Habit Modal */}
            <HabitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveHabit}
                habit={editingHabit}
            />
        </div>
    );
}

function HabitCard({ habit, isActive, onStart, onEdit, onDelete }) {
    const todayProgress = Math.min(100, (habit.total_time_minutes / (habit.target_minutes_per_day * 30)) * 100);

    return (
        <Link
            to={`/habits/${habit.id}`}
            className="habit-card block group"
            data-testid={`habit-card-${habit.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${habit.color}20` }}
                >
                    <Target className="w-5 h-5" style={{ color: habit.color }} />
                </div>
                <div className="flex items-center gap-1">
                    {isActive ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                        </span>
                    ) : (
                        <button
                            onClick={(e) => onStart(habit.id, e)}
                            className="p-2 hover:bg-zinc-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`start-habit-${habit.id}`}
                        >
                            <Play className="w-4 h-4 text-emerald-400" />
                        </button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <button className="p-2 hover:bg-zinc-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={(e) => onEdit(habit, e)} className="text-zinc-300">
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => onDelete(habit.id, e)} className="text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <h3 className="text-base font-medium text-white mb-1">{habit.name}</h3>
            {habit.description && (
                <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{habit.description}</p>
            )}

            <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(habit.total_time_minutes)}
                </div>
                {habit.current_streak > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-orange-400">
                        <Flame className="w-3.5 h-3.5" />
                        {habit.current_streak} day streak
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Progress</span>
                    <span className="text-zinc-400">{Math.round(todayProgress)}%</span>
                </div>
                <Progress value={todayProgress} className="h-1.5 bg-zinc-800" />
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">{habit.category}</span>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
        </Link>
    );
}

function HabitModal({ isOpen, onClose, onSave, habit }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#FAFAFA');
    const [category, setCategory] = useState('General');
    const [targetMinutes, setTargetMinutes] = useState(30);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (habit) {
            setName(habit.name);
            setDescription(habit.description || '');
            setColor(habit.color);
            setCategory(habit.category);
            setTargetMinutes(habit.target_minutes_per_day);
        } else {
            setName('');
            setDescription('');
            setColor('#FAFAFA');
            setCategory('General');
            setTargetMinutes(30);
        }
    }, [habit, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                name,
                description,
                color,
                category,
                target_minutes_per_day: targetMinutes,
                icon: 'target'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{habit ? 'Edit Habit' : 'New Habit'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Morning Meditation"
                            required
                            className="bg-zinc-800 border-zinc-700"
                            data-testid="habit-name-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            className="bg-zinc-800 border-zinc-700"
                            data-testid="habit-description-input"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="habit-category-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Daily Target (min)</Label>
                            <Input
                                type="number"
                                value={targetMinutes}
                                onChange={(e) => setTargetMinutes(parseInt(e.target.value) || 30)}
                                min={1}
                                max={480}
                                className="bg-zinc-800 border-zinc-700"
                                data-testid="habit-target-input"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-md transition-transform hover:scale-110",
                                        color === c && "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                                    )}
                                    style={{ backgroundColor: c }}
                                    data-testid={`color-${c}`}
                                />
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-white text-zinc-900 hover:bg-zinc-200" data-testid="habit-submit-btn">
                            {loading ? 'Saving...' : habit ? 'Save Changes' : 'Create Habit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
