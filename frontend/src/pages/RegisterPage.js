import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await register(email, password, name);
            toast.success('Account created successfully!');
        } catch (error) {
            toast.error(error.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-zinc-900 border-r border-zinc-800 p-12">
                <div className="max-w-md">
                    <div className="text-6xl font-bold text-white tracking-tight mb-6">
                        Task<span className="text-zinc-500">Tracker</span>
                    </div>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                        Track your tasks, build habits, and achieve your goals with precision.
                    </p>
                    <div className="mt-12 space-y-4">
                        {[
                            { icon: '✓', text: 'Notion-style task management' },
                            { icon: '◎', text: 'Habit tracking with streaks' },
                            { icon: '▣', text: 'Kanban, Table & Calendar views' },
                            { icon: '◇', text: 'Beautiful analytics dashboard' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="flex items-center gap-3"
                            >
                                <span className="w-8 h-8 bg-zinc-800 rounded-md flex items-center justify-center text-white">
                                    {item.icon}
                                </span>
                                <span className="text-zinc-300">{item.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
                            Create account
                        </h1>
                        <p className="text-zinc-400">
                            Start tracking your productivity today
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-zinc-300">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                                data-testid="register-name"
                                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                data-testid="register-email"
                                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-300">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    data-testid="register-password"
                                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            data-testid="register-submit"
                            className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-medium h-11"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-zinc-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-white hover:underline" data-testid="login-link">
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
