import { useState, useCallback } from 'react';
import axios from 'axios';

// Lokal üçün - environment variable-dan və ya default localhost
const API_URL = process.env.REACT_APP_BACKEND_URL 
    ? `${process.env.REACT_APP_BACKEND_URL}/api`
    : 'http://localhost:8001/api';

export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const request = useCallback(async (method, endpoint, data = null) => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                method,
                url: `${API_URL}${endpoint}`,
            };
            if (data) {
                config.data = data;
            }
            const response = await axios(config);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.detail || err.message || 'An error occurred';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const get = useCallback((endpoint) => request('GET', endpoint), [request]);
    const post = useCallback((endpoint, data) => request('POST', endpoint, data), [request]);
    const put = useCallback((endpoint, data) => request('PUT', endpoint, data), [request]);
    const del = useCallback((endpoint) => request('DELETE', endpoint), [request]);

    return { get, post, put, del, loading, error };
}

export function useTasks() {
    const api = useApi();
    
    return {
        getTasks: () => api.get('/tasks'),
        getTask: (id) => api.get(`/tasks/${id}`),
        createTask: (data) => api.post('/tasks', data),
        updateTask: (id, data) => api.put(`/tasks/${id}`, data),
        deleteTask: (id) => api.del(`/tasks/${id}`),
        loading: api.loading,
        error: api.error
    };
}

export function useHabits() {
    const api = useApi();
    
    return {
        getHabits: () => api.get('/habits'),
        getHabit: (id) => api.get(`/habits/${id}`),
        createHabit: (data) => api.post('/habits', data),
        updateHabit: (id, data) => api.put(`/habits/${id}`, data),
        deleteHabit: (id) => api.del(`/habits/${id}`),
        getHabitSessions: (id) => api.get(`/habits/${id}/sessions`),
        getHabitAnalytics: (id) => api.get(`/analytics/habits/${id}`),
        loading: api.loading,
        error: api.error
    };
}

export function useSessions() {
    const api = useApi();
    
    return {
        getSessions: (habitId) => api.get(habitId ? `/sessions?habit_id=${habitId}` : '/sessions'),
        createSession: (data) => api.post('/sessions', data),
        getActiveSession: () => api.get('/active-sessions'),
        startSession: (habitId) => api.post('/active-sessions', { habit_id: habitId }),
        stopSession: (id, save = true) => api.del(`/active-sessions/${id}?save=${save}`),
        loading: api.loading,
        error: api.error
    };
}

export function useAnalytics() {
    const api = useApi();
    
    return {
        getOverview: () => api.get('/analytics/overview'),
        getWeeklyActivity: () => api.get('/analytics/weekly-activity'),
        getHabitAnalytics: (id) => api.get(`/analytics/habits/${id}`),
        loading: api.loading,
        error: api.error
    };
}
