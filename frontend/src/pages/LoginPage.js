import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await login(email, password);
            toast.success('Welcome back!');
        } catch (error) {
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Left side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
                            Welcome back
                        </h1>
                        <p className="text-zinc-400">
                            Sign in to continue to TaskTracker
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                data-testid="login-email"
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
                                    data-testid="login-password"
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
                            data-testid="login-submit"
                            className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-medium h-11"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-zinc-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-white hover:underline" data-testid="register-link">
                            Sign up
                        </Link>
                    </p>
                </motion.div>
            </div>

            {/* Right side - Branding */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-zinc-900 border-l border-zinc-800 p-12">
                <div className="max-w-md">
                    <div className="text-6xl font-bold text-white tracking-tight mb-6">
                        Task<span className="text-zinc-500">Tracker</span>
                    </div>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                        Your personal command center for tasks, habits, and productivity.
                    </p>
                    <div className="mt-12 grid grid-cols-3 gap-4">
                        {['Tasks', 'Habits', 'Analytics'].map((item, i) => (
                            <motion.div
                                key={item}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center"
                            >
                                <div className="text-2xl font-mono text-white mb-1">
                                    {i === 0 ? '∞' : i === 1 ? '24/7' : '100%'}
                                </div>
                                <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                    {item}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
