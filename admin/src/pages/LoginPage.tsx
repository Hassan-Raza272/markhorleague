import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome, Super Admin');
      navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mcl-forest-900 p-4 relative overflow-hidden">
      <div className="absolute -top-24 left-1/4 w-72 h-72 rounded-full bg-mcl-lime-500/10 blur-3xl" />
      <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-mcl-gold-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/mcl-logo.png"
            alt="MCL Logo"
            className="w-28 h-28 mx-auto mb-4 rounded-full object-cover drop-shadow-xl"
          />
          <h1 className="text-3xl font-extrabold text-white tracking-[0.2em]">
            MCL 2026-27
          </h1>
          <p className="text-mcl-lime-500 mt-2 text-sm font-bold uppercase tracking-wider">
            Markhor Cricket League · Season 4
          </p>
          <p className="text-mcl-silver-400 mt-2">Super Admin Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-mcl-forest-800 rounded-2xl shadow-2xl p-8 space-y-5 border border-mcl-forest-600">
          <div>
            <label className="block text-sm font-semibold text-mcl-silver-100 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-mcl-forest-900 border border-mcl-forest-600 text-white focus:outline-none focus:ring-2 focus:ring-mcl-lime-500 focus:border-transparent transition"
              placeholder="admin@mcl2026.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-mcl-silver-100 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-mcl-forest-900 border border-mcl-forest-600 text-white focus:outline-none focus:ring-2 focus:ring-mcl-lime-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-mcl-lime-500 hover:bg-mcl-lime-400 text-mcl-forest-950 font-extrabold rounded-xl transition disabled:opacity-50 shadow-lg shadow-mcl-lime-500/20">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
