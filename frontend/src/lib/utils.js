import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

export function getRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
}

export function getPriorityColor(priority) {
    switch (priority?.toLowerCase()) {
        case 'critical': return 'text-red-400';
        case 'high': return 'text-orange-400';
        case 'medium': return 'text-yellow-400';
        case 'low': return 'text-emerald-400';
        default: return 'text-zinc-400';
    }
}

export function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'completed': return 'bg-emerald-600';
        case 'in-progress': return 'bg-blue-600';
        case 'todo': return 'bg-zinc-600';
        default: return 'bg-zinc-600';
    }
}
