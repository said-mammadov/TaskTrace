import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, User, Bell, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();

    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    return (
        <div className="max-w-2xl space-y-8" data-testid="settings-page">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
                <p className="text-zinc-500 mt-1">Manage your preferences</p>
            </div>

            {/* Profile Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="metric-card"
            >
                <div className="flex items-center gap-2 mb-6">
                    <User className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Profile</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-medium text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-lg font-medium text-white">{user?.name}</p>
                        <p className="text-sm text-zinc-500">{user?.email}</p>
                    </div>
                </div>
            </motion.div>

            {/* Appearance Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="metric-card"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Sun className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Appearance</h2>
                </div>
                <div className="space-y-4">
                    <Label className="text-zinc-400">Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {themeOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setTheme(option.value)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors",
                                    theme === option.value
                                        ? "border-white bg-zinc-800"
                                        : "border-zinc-800 hover:border-zinc-700"
                                )}
                                data-testid={`theme-${option.value}`}
                            >
                                <option.icon className={cn(
                                    "w-5 h-5",
                                    theme === option.value ? "text-white" : "text-zinc-500"
                                )} />
                                <span className={cn(
                                    "text-sm",
                                    theme === option.value ? "text-white" : "text-zinc-500"
                                )}>
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Notifications Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="metric-card"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Bell className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Notifications</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-200">Daily Reminders</p>
                            <p className="text-xs text-zinc-500">Get reminded about your habits</p>
                        </div>
                        <Switch data-testid="daily-reminders-switch" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-200">Streak Alerts</p>
                            <p className="text-xs text-zinc-500">Get notified when streak is at risk</p>
                        </div>
                        <Switch data-testid="streak-alerts-switch" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-200">Weekly Summary</p>
                            <p className="text-xs text-zinc-500">Receive weekly progress report</p>
                        </div>
                        <Switch data-testid="weekly-summary-switch" />
                    </div>
                </div>
            </motion.div>

            {/* Privacy Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="metric-card"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Shield className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Privacy & Data</h2>
                </div>
                <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300" data-testid="export-data-btn">
                        Export Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300" data-testid="delete-account-btn">
                        Delete Account
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
