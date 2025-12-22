import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Shield, 
    Activity, 
    Trash2, 
    Edit2, 
    Search,
    UserCheck,
    UserX,
    BarChart3,
    Clock,
    Target,
    CheckSquare,
    AlertTriangle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Eye,
    Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn, formatDate, formatDateTime } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL 
    ? `${process.env.REACT_APP_BACKEND_URL}/api`
    : 'http://localhost:8001/api';

export default function AdminPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [diagnosticsLogs, setDiagnosticsLogs] = useState([]);
    const [diagnosticsStats, setDiagnosticsStats] = useState(null);
    const [healthStatus, setHealthStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);

    useEffect(() => {
        if (user?.role === 'admin') {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            const [usersRes, statsRes, auditRes, diagLogsRes, diagStatsRes, healthRes] = await Promise.all([
                axios.get(`${API_URL}/admin/users`),
                axios.get(`${API_URL}/admin/stats`),
                axios.get(`${API_URL}/admin/audit-logs`),
                axios.get(`${API_URL}/diagnostics/logs?limit=50`),
                axios.get(`${API_URL}/diagnostics/stats`),
                axios.get(`${API_URL}/diagnostics/health`)
            ]);
            setUsers(usersRes.data);
            setStats(statsRes.data);
            setAuditLogs(auditRes.data);
            setDiagnosticsLogs(diagLogsRes.data);
            setDiagnosticsStats(diagStatsRes.data);
            setHealthStatus(healthRes.data);
        } catch (error) {
            console.error('Failed to load admin data:', error);
            toast.error('Admin data yüklənmədi');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId, data) => {
        try {
            await axios.put(`${API_URL}/admin/users/${userId}`, data);
            toast.success('İstifadəçi yeniləndi');
            loadData();
            setEditingUser(null);
        } catch (error) {
            toast.error('Xəta baş verdi');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Bu istifadəçini silmək istədiyinizə əminsiniz? Bütün data silinəcək!')) return;
        
        try {
            await axios.delete(`${API_URL}/admin/users/${userId}`);
            toast.success('İstifadəçi silindi');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Xəta baş verdi');
        }
    };

    const handleTriggerRecovery = async (errorType) => {
        try {
            const res = await axios.post(`${API_URL}/diagnostics/trigger-recovery/${errorType}`);
            toast.success(res.data.success ? 'Bərpa uğurlu oldu' : 'Bərpa uğursuz oldu');
            loadData();
        } catch (error) {
            toast.error('Bərpa başladıla bilmədi');
        }
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Admin Girişi Tələb Olunur</h2>
                    <p className="text-zinc-500">Bu səhifəyə yalnız adminlər daxil ola bilər.</p>
                </div>
            </div>
        );
    }

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
            data-testid="admin-page"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Shield className="w-8 h-8 text-purple-500" />
                        Admin Panel
                    </h1>
                    <p className="text-zinc-500 mt-1">Sistem idarəetməsi və monitorinq</p>
                </div>
                <Button onClick={loadData} variant="outline" className="border-zinc-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Yenilə
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Cəmi İstifadəçi', value: stats?.total_users || 0, icon: Users, color: 'text-blue-400' },
                    { label: 'Aktiv', value: stats?.active_users || 0, icon: UserCheck, color: 'text-emerald-400' },
                    { label: 'Cəmi Task', value: stats?.total_tasks || 0, icon: CheckSquare, color: 'text-purple-400' },
                    { label: 'Cəmi Habit', value: stats?.total_habits || 0, icon: Target, color: 'text-orange-400' },
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

            {/* Health Status */}
            {healthStatus && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "metric-card border-l-4",
                        healthStatus.status === 'healthy' ? 'border-l-emerald-500' : 'border-l-yellow-500'
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className={cn(
                                "w-5 h-5",
                                healthStatus.status === 'healthy' ? 'text-emerald-400' : 'text-yellow-400'
                            )} />
                            <span className="text-white font-medium">Sistem Statusu: {healthStatus.status}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {Object.entries(healthStatus.services || {}).map(([name, info]) => (
                                <span key={name} className="flex items-center gap-1 text-sm">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        info.status === 'healthy' ? 'bg-emerald-500' : 'bg-yellow-500'
                                    )} />
                                    <span className="text-zinc-400">{name}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="users" className="data-[state=active]:bg-zinc-800">
                        <Users className="w-4 h-4 mr-2" />
                        İstifadəçilər
                    </TabsTrigger>
                    <TabsTrigger value="diagnostics" className="data-[state=active]:bg-zinc-800">
                        <Activity className="w-4 h-4 mr-2" />
                        Diagnostika
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-zinc-800">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Audit Log
                    </TabsTrigger>
                </TabsList>

                {/* Users Tab */}
                <TabsContent value="users" className="mt-6">
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <Input
                                placeholder="İstifadəçi axtar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>

                        {/* Users Table */}
                        <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800">
                                        <th className="text-left text-xs text-zinc-500 uppercase p-4">İstifadəçi</th>
                                        <th className="text-left text-xs text-zinc-500 uppercase p-4">Rol</th>
                                        <th className="text-left text-xs text-zinc-500 uppercase p-4">Status</th>
                                        <th className="text-left text-xs text-zinc-500 uppercase p-4">Qoşulma</th>
                                        <th className="text-left text-xs text-zinc-500 uppercase p-4 w-32">Əməliyyat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((u) => (
                                        <motion.tr 
                                            key={u.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-white font-medium">{u.name}</p>
                                                        <p className="text-xs text-zinc-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-xs font-medium",
                                                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-300'
                                                )}>
                                                    {u.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "flex items-center gap-1 text-xs",
                                                    u.is_active !== false ? 'text-emerald-400' : 'text-red-400'
                                                )}>
                                                    {u.is_active !== false ? (
                                                        <><UserCheck className="w-3 h-3" /> Aktiv</>
                                                    ) : (
                                                        <><UserX className="w-3 h-3" /> Deaktiv</>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-zinc-400">
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={async () => {
                                                            const res = await axios.get(`${API_URL}/admin/users/${u.id}`);
                                                            setViewingUser(res.data);
                                                        }}
                                                        className="p-1.5 hover:bg-zinc-700 rounded"
                                                    >
                                                        <Eye className="w-4 h-4 text-zinc-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUser(u)}
                                                        className="p-1.5 hover:bg-zinc-700 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-zinc-400" />
                                                    </button>
                                                    {u.id !== user.id && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-1.5 hover:bg-red-500/20 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* Diagnostics Tab */}
                <TabsContent value="diagnostics" className="mt-6">
                    <div className="space-y-6">
                        {/* Error Stats */}
                        {diagnosticsStats?.by_type && diagnosticsStats.by_type.length > 0 && (
                            <div className="metric-card">
                                <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">Xəta Statistikası</h3>
                                <div className="space-y-3">
                                    {diagnosticsStats.by_type.map((stat) => (
                                        <div key={stat._id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                                <span className="text-sm text-zinc-300">{stat._id}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-zinc-400">Cəmi: {stat.count}</span>
                                                <span className="text-emerald-400">Avtomatik düzəldildi: {stat.auto_fixed}</span>
                                                <span className="text-red-400">Uğursuz: {stat.failed}</span>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleTriggerRecovery(stat._id)}
                                                    className="border-zinc-700 h-7"
                                                >
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    Bərpa
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Errors */}
                        <div className="metric-card">
                            <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">Son Xətalar</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {diagnosticsLogs.length === 0 ? (
                                    <p className="text-zinc-500 text-center py-4">Xəta tapılmadı</p>
                                ) : (
                                    diagnosticsLogs.map((log, i) => (
                                        <DiagnosticLogItem key={log.error_id || i} log={log} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Audit Tab */}
                <TabsContent value="audit" className="mt-6">
                    <div className="metric-card">
                        <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider mb-4">Admin Əməliyyatları</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {auditLogs.length === 0 ? (
                                <p className="text-zinc-500 text-center py-4">Əməliyyat tapılmadı</p>
                            ) : (
                                auditLogs.map((log) => (
                                    <div 
                                        key={log.id}
                                        className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                log.action === 'delete_user' ? 'bg-red-500/10' : 'bg-blue-500/10'
                                            )}>
                                                {log.action === 'delete_user' ? (
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                ) : (
                                                    <Edit2 className="w-4 h-4 text-blue-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-200">{log.action}</p>
                                                <p className="text-xs text-zinc-500">Target: {log.target_user_id?.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-zinc-500">{formatDateTime(log.timestamp)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit User Modal */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>İstifadəçini Redaktə Et</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <EditUserForm 
                            user={editingUser} 
                            onSave={handleUpdateUser}
                            onCancel={() => setEditingUser(null)}
                            currentUserId={user.id}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* View User Modal */}
            <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>İstifadəçi Məlumatları</DialogTitle>
                    </DialogHeader>
                    {viewingUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {viewingUser.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{viewingUser.name}</h3>
                                    <p className="text-zinc-500">{viewingUser.email}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{viewingUser.stats?.tasks_count || 0}</p>
                                    <p className="text-xs text-zinc-500">Task</p>
                                </div>
                                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{viewingUser.stats?.habits_count || 0}</p>
                                    <p className="text-xs text-zinc-500">Habit</p>
                                </div>
                                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{viewingUser.stats?.sessions_count || 0}</p>
                                    <p className="text-xs text-zinc-500">Session</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

function EditUserForm({ user, onSave, onCancel, currentUserId }) {
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState(user.role || 'user');
    const [isActive, setIsActive] = useState(user.is_active !== false);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Ad</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                />
            </div>
            <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole} disabled={user.id === currentUserId}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
                <Label>Aktiv</Label>
                <Switch 
                    checked={isActive} 
                    onCheckedChange={setIsActive}
                    disabled={user.id === currentUserId}
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Ləğv et</Button>
                <Button onClick={() => onSave(user.id, { name, role, is_active: isActive })}>
                    Yadda saxla
                </Button>
            </DialogFooter>
        </div>
    );
}

function DiagnosticLogItem({ log }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-zinc-800/30 rounded-lg overflow-hidden">
            <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/50"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-1.5 rounded",
                        log.severity === 'critical' ? 'bg-red-500/20' :
                        log.severity === 'high' ? 'bg-orange-500/20' :
                        'bg-yellow-500/20'
                    )}>
                        <AlertTriangle className={cn(
                            "w-3.5 h-3.5",
                            log.severity === 'critical' ? 'text-red-400' :
                            log.severity === 'high' ? 'text-orange-400' :
                            'text-yellow-400'
                        )} />
                    </div>
                    <div>
                        <p className="text-sm text-zinc-200">{log.error_type}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-md">{log.message}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {log.auto_fixed && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Avtomatik düzəldildi
                        </span>
                    )}
                    <span className="text-xs text-zinc-500">{formatDateTime(log.timestamp)}</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3"
                    >
                        <div className="bg-zinc-900 rounded p-3 text-xs font-mono text-zinc-400 overflow-x-auto">
                            <pre>{JSON.stringify(log, null, 2)}</pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
