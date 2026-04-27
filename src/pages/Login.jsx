import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/timbratura');
    } catch (err) {
      setError('Credenziali non valide. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-kmark.png"
            alt="K-MARK Logo"
            className="h-20 w-auto object-contain mb-3 drop-shadow-lg"
          />
          <p className="text-white/50 text-sm">Portale Aziendale</p>
        </div>

        <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-5">Accedi</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nome@kmark.it"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b] transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c0392b] hover:bg-[#a93226] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} K-MARK S.P.A. — Tutti i diritti riservati
        </p>
      </div>
    </div>
  );
}
