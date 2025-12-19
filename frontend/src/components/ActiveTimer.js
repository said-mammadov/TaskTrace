import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Clock } from 'lucide-react';
import { useSessions, useHabits } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function ActiveTimer({ collapsed }) {
    const [activeSession, setActiveSession] = useState(null);
    const [habit, setHabit] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const { getActiveSession, stopSession } = useSessions();
    const { getHabit } = useHabits();

    const fetchActiveSession = useCallback(async () => {
        try {
            const session = await getActiveSession();
            if (session) {
                setActiveSession(session);
                const habitData = await getHabit(session.habit_id);
                setHabit(habitData);
            } else {
                setActiveSession(null);
                setHabit(null);
            }
        } catch (error) {
            console.error('Failed to fetch active session:', error);
        }
    }, [getActiveSession, getHabit]);

    useEffect(() => {
        fetchActiveSession();
        const interval = setInterval(fetchActiveSession, 30000);
        return () => clearInterval(interval);
    }, [fetchActiveSession]);

    useEffect(() => {
        if (!activeSession) {
            setElapsed(0);
            return;
        }

        const startTime = new Date(activeSession.started_at).getTime();
        
        const updateElapsed = () => {
            const now = Date.now();
            setElapsed(Math.floor((now - startTime) / 1000));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    const handleStop = async () => {
        if (!activeSession) return;
        
        try {
            await stopSession(activeSession.id, true);
            setActiveSession(null);
            setHabit(null);
            toast.success('Session saved!');
            window.dispatchEvent(new Event('session-updated'));
        } catch (error) {
            toast.error('Failed to stop session');
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!activeSession) return null;

    return (
        <div className="p-3 border-t border-zinc-800">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cn(
                        "bg-zinc-800/50 border border-zinc-700 rounded-lg p-3",
                        collapsed && "p-2"
                    )}
                    data-testid="active-timer"
                >
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-mono text-xs text-white">
                                {formatTime(elapsed)}
                            </span>
                            <button
                                onClick={handleStop}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                                data-testid="stop-timer-btn"
                            >
                                <Square className="w-3 h-3 text-red-400" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs text-zinc-400 uppercase tracking-wider">
                                    Active Session
                                </span>
                            </div>
                            <p className="text-sm font-medium text-white mb-1 truncate">
                                {habit?.name || 'Loading...'}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-lg text-white tabular-nums">
                                    {formatTime(elapsed)}
                                </span>
                                <button
                                    onClick={handleStop}
                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-md transition-colors flex items-center gap-1.5"
                                    data-testid="stop-timer-btn"
                                >
                                    <Square className="w-3.5 h-3.5" />
                                    Stop
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
