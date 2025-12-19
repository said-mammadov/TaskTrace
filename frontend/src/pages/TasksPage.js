import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    LayoutGrid, 
    List, 
    Calendar as CalendarIcon,
    Search,
    Filter,
    MoreHorizontal,
    Edit2,
    Trash2,
    Check,
    X,
    GripVertical
} from 'lucide-react';
import { useTasks, useHabits } from '../hooks/useApi';
import { formatDate, getPriorityColor, cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['todo', 'in-progress', 'completed'];
const CATEGORIES = ['General', 'Work', 'Personal', 'Health', 'Learning', 'Finance'];

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    
    const { getTasks, createTask, updateTask, deleteTask } = useTasks();
    const { getHabits } = useHabits();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [tasksData, habitsData] = await Promise.all([
                getTasks(),
                getHabits()
            ]);
            setTasks(tasksData);
            setHabits(habitsData);
        } catch (error) {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
        if (filterCategory !== 'all' && task.category !== filterCategory) return false;
        return true;
    });

    const tasksByStatus = {
        todo: filteredTasks.filter(t => t.status === 'todo'),
        'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
        completed: filteredTasks.filter(t => t.status === 'completed')
    };

    const handleCreateTask = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
            toast.success('Task deleted');
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            const updated = await updateTask(taskId, { status: newStatus });
            setTasks(tasks.map(t => t.id === taskId ? updated : t));
            if (newStatus === 'completed') {
                toast.success('Task completed!');
            }
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleSaveTask = async (taskData) => {
        try {
            if (editingTask) {
                const updated = await updateTask(editingTask.id, taskData);
                setTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
                toast.success('Task updated');
            } else {
                const created = await createTask(taskData);
                setTasks([...tasks, created]);
                toast.success('Task created');
            }
            setIsModalOpen(false);
        } catch (error) {
            toast.error('Failed to save task');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="tasks-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Tasks</h1>
                    <p className="text-zinc-500 mt-1">{tasks.length} total tasks</p>
                </div>
                <Button onClick={handleCreateTask} className="bg-white text-zinc-900 hover:bg-zinc-200" data-testid="create-task-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                </Button>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-zinc-900 border-zinc-800 text-white w-48"
                            data-testid="task-search"
                        />
                    </div>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800 text-zinc-300" data-testid="filter-priority">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="all">All Priorities</SelectItem>
                            {PRIORITIES.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800 text-zinc-300" data-testid="filter-category">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="all">All Categories</SelectItem>
                            {CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Tabs value={view} onValueChange={setView} className="bg-zinc-900 rounded-md p-1">
                    <TabsList className="bg-transparent">
                        <TabsTrigger value="kanban" className="data-[state=active]:bg-zinc-800" data-testid="view-kanban">
                            <LayoutGrid className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="list" className="data-[state=active]:bg-zinc-800" data-testid="view-list">
                            <List className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="data-[state=active]:bg-zinc-800" data-testid="view-calendar">
                            <CalendarIcon className="w-4 h-4" />
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Views */}
            <AnimatePresence mode="wait">
                {view === 'kanban' && (
                    <KanbanView 
                        tasksByStatus={tasksByStatus} 
                        onStatusChange={handleStatusChange}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                    />
                )}
                {view === 'list' && (
                    <ListView 
                        tasks={filteredTasks}
                        onStatusChange={handleStatusChange}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                    />
                )}
                {view === 'calendar' && (
                    <CalendarView 
                        tasks={filteredTasks}
                        onEdit={handleEditTask}
                    />
                )}
            </AnimatePresence>

            {/* Task Modal */}
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                task={editingTask}
                habits={habits}
            />
        </div>
    );
}

function KanbanView({ tasksByStatus, onStatusChange, onEdit, onDelete }) {
    const columns = [
        { id: 'todo', label: 'To Do', color: 'bg-zinc-600' },
        { id: 'in-progress', label: 'In Progress', color: 'bg-blue-600' },
        { id: 'completed', label: 'Completed', color: 'bg-emerald-600' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid md:grid-cols-3 gap-4"
            data-testid="kanban-view"
        >
            {columns.map((column) => (
                <div key={column.id} className="kanban-column">
                    <div className="flex items-center gap-2 mb-4">
                        <div className={cn("w-2 h-2 rounded-full", column.color)} />
                        <h3 className="text-sm font-medium text-zinc-300">{column.label}</h3>
                        <span className="text-xs text-zinc-500 ml-auto">
                            {tasksByStatus[column.id].length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {tasksByStatus[column.id].map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={onStatusChange}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </motion.div>
    );
}

function ListView({ tasks, onStatusChange, onEdit, onDelete }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900/30 rounded-lg overflow-hidden border border-zinc-800"
            data-testid="list-view"
        >
            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider p-4 w-8"></th>
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider p-4">Task</th>
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider p-4 hidden sm:table-cell">Category</th>
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider p-4 hidden md:table-cell">Due Date</th>
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider p-4">Priority</th>
                        <th className="text-left text-xs text-zinc-500 uppercase tracking-wider p-4 w-12"></th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => (
                        <tr key={task.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                            <td className="p-4">
                                <Checkbox
                                    checked={task.status === 'completed'}
                                    onCheckedChange={(checked) => 
                                        onStatusChange(task.id, checked ? 'completed' : 'todo')
                                    }
                                    data-testid={`task-checkbox-${task.id}`}
                                />
                            </td>
                            <td className="p-4">
                                <span className={cn(
                                    "text-sm",
                                    task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'
                                )}>
                                    {task.title}
                                </span>
                            </td>
                            <td className="p-4 hidden sm:table-cell">
                                <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-800 rounded">
                                    {task.category}
                                </span>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                                <span className="text-sm text-zinc-400">
                                    {task.due_date ? formatDate(task.due_date) : '-'}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
                                    {task.priority}
                                </span>
                            </td>
                            <td className="p-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1 hover:bg-zinc-700 rounded">
                                            <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                        <DropdownMenuItem onClick={() => onEdit(task)} className="text-zinc-300">
                                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-400">
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {tasks.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No tasks found</div>
            )}
        </motion.div>
    );
}

function CalendarView({ tasks, onEdit }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const tasksOnDate = tasks.filter(task => {
        if (!task.due_date) return false;
        const taskDate = new Date(task.due_date);
        return taskDate.toDateString() === selectedDate.toDateString();
    });

    const datesWithTasks = tasks
        .filter(t => t.due_date)
        .map(t => new Date(t.due_date).toDateString());

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid lg:grid-cols-2 gap-6"
            data-testid="calendar-view"
        >
            <div className="metric-card flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md"
                    modifiers={{
                        hasTasks: (date) => datesWithTasks.includes(date.toDateString())
                    }}
                    modifiersStyles={{
                        hasTasks: { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                    }}
                />
            </div>
            <div className="metric-card">
                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">
                    {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                <div className="space-y-2">
                    {tasksOnDate.length === 0 ? (
                        <p className="text-zinc-500 text-sm">No tasks due on this date</p>
                    ) : (
                        tasksOnDate.map(task => (
                            <div
                                key={task.id}
                                onClick={() => onEdit(task)}
                                className="p-3 bg-zinc-800/50 rounded-md cursor-pointer hover:bg-zinc-800 transition-colors"
                            >
                                <p className="text-sm text-zinc-200">{task.title}</p>
                                <p className={cn("text-xs mt-1", getPriorityColor(task.priority))}>
                                    {task.priority}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function TaskCard({ task, onStatusChange, onEdit, onDelete }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="task-card group"
            data-testid={`task-card-${task.id}`}
        >
            <div className="flex items-start gap-3">
                <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => 
                        onStatusChange(task.id, checked ? 'completed' : 'todo')
                    }
                    className="mt-0.5"
                    data-testid={`task-complete-${task.id}`}
                />
                <div className="flex-1 min-w-0">
                    <p className={cn(
                        "text-sm",
                        task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'
                    )}>
                        {task.title}
                    </p>
                    {task.description && (
                        <p className="text-xs text-zinc-500 mt-1 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-zinc-600 px-1.5 py-0.5 bg-zinc-800 rounded">
                            {task.category}
                        </span>
                        <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
                            {task.priority}
                        </span>
                        {task.due_date && (
                            <span className="text-xs text-zinc-500">
                                {formatDate(task.due_date)}
                            </span>
                        )}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded transition-opacity">
                            <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem onClick={() => onEdit(task)} className="text-zinc-300">
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    );
}

function TaskModal({ isOpen, onClose, onSave, task, habits }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('General');
    const [priority, setPriority] = useState('Medium');
    const [status, setStatus] = useState('todo');
    const [dueDate, setDueDate] = useState(null);
    const [habitId, setHabitId] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setCategory(task.category);
            setPriority(task.priority);
            setStatus(task.status);
            setDueDate(task.due_date ? new Date(task.due_date) : null);
            setHabitId(task.habit_id || null);
        } else {
            setTitle('');
            setDescription('');
            setCategory('General');
            setPriority('Medium');
            setStatus('todo');
            setDueDate(null);
            setHabitId(null);
        }
    }, [task, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                title,
                description,
                category,
                priority,
                status,
                due_date: dueDate ? dueDate.toISOString() : null,
                habit_id: habitId
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title"
                            required
                            className="bg-zinc-800 border-zinc-700"
                            data-testid="task-title-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            className="bg-zinc-800 border-zinc-700"
                            data-testid="task-description-input"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="task-category-select">
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
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="task-priority-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {PRIORITIES.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="task-status-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start bg-zinc-800 border-zinc-700 text-left" data-testid="task-due-date-btn">
                                        <CalendarIcon className="w-4 h-4 mr-2 text-zinc-500" />
                                        {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Select date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={setDueDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    {habits.length > 0 && (
                        <div className="space-y-2">
                            <Label>Link to Habit (optional)</Label>
                            <Select value={habitId || 'none'} onValueChange={(v) => setHabitId(v === 'none' ? null : v)}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Select habit" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="none">None</SelectItem>
                                    {habits.map(h => (
                                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-white text-zinc-900 hover:bg-zinc-200" data-testid="task-submit-btn">
                            {loading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
