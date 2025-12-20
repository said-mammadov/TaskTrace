import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTasks } from '../hooks/useApi';
import { cn, getPriorityColor } from '../lib/utils';
import { Button } from '../components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

export default function CalendarPage() {
    const [tasks, setTasks] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    const { getTasks } = useTasks();

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const data = await getTasks();
            setTasks(data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getTasksForDate = (date) => {
        return tasks.filter(task => {
            if (!task.due_date) return false;
            return isSameDay(new Date(task.due_date), date);
        });
    };

    const selectedTasks = getTasksForDate(selectedDate);

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

    return (
        <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="calendar-page"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <motion.h1 
                        className="text-3xl font-bold text-white tracking-tight"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        Calendar
                    </motion.h1>
                    <motion.p 
                        className="text-zinc-500 mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        View your tasks by date
                    </motion.p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <motion.div 
                    className="lg:col-span-2 metric-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <div className="flex gap-2">
                            <motion.button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <ChevronLeft className="w-5 h-5 text-zinc-400" />
                            </motion.button>
                            <motion.button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-center text-xs text-zinc-500 font-medium py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before month start */}
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        
                        {days.map((day, i) => {
                            const dayTasks = getTasksForDate(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const today = isToday(day);
                            
                            return (
                                <motion.button
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "aspect-square p-1 rounded-lg transition-all relative group",
                                        isSelected && "bg-blue-600",
                                        !isSelected && today && "bg-zinc-800",
                                        !isSelected && !today && "hover:bg-zinc-800/50"
                                    )}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                >
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isSelected ? "text-white" : today ? "text-blue-400" : "text-zinc-400"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayTasks.length > 0 && (
                                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                            {dayTasks.slice(0, 3).map((_, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={cn(
                                                        "w-1 h-1 rounded-full",
                                                        isSelected ? "bg-white" : "bg-blue-500"
                                                    )} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Selected Date Tasks */}
                <motion.div 
                    className="metric-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    
                    {selectedTasks.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-500 text-sm">No tasks due on this date</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedTasks.map((task, i) => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-3 bg-zinc-800/50 rounded-lg"
                                >
                                    <p className="text-sm text-zinc-200 font-medium">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-700 rounded">
                                            {task.category}
                                        </span>
                                        <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
