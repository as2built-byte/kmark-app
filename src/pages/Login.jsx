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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* Decorative gold radial glow — top centre */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(184,150,46,0.18) 0%, transparent 70%)' }}
      />

      {/* Decorative thin gold lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,150,46,0.08), transparent)' }} />
        <div className="absolute bottom-1/4 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,150,46,0.08), transparent)' }} />
        <div className="absolute left-1/4 top-0 h-full w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(184,150,46,0.06), transparent)' }} />
        <div className="absolute right-1/4 top-0 h-full w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(184,150,46,0.06), transparent)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/logo-kmark.png"
            alt="K-MARK Logo"
            className="h-24 w-auto object-contain mb-4"
            style={{ filter: 'drop-shadow(0 0 18px rgba(184,150,46,0.75)) drop-shadow(0 0 40px rgba(184,150,46,0.30))' }}
          />
          <div className="flex items-center gap-3">
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,150,46,0.5))' }} />
            <p className="text-xs tracking-[0.25em] uppercase" style={{ color: 'rgba(184,150,46,0.65)' }}>Portale Aziendale</p>
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, rgba(184,150,46,0.5), transparent)' }} />
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'linear-gradient(145deg, #131313 0%, #161616 100%)',
            border: '1px solid rgba(184,150,46,0.25)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(184,150,46,0.1)',
          }}
        >
          {/* Card top gold accent line */}
          <div className="h-px w-full mb-6 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,150,46,0.5), transparent)' }} />

          <h2 className="text-xl font-bold mb-1" style={{ color: '#b8962e' }}>Accedi</h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(240,236,224,0.35)' }}>Inserisci le tue credenziali aziendali</p>

          {error && (
            <div className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 mb-5" style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', color: '#e57373' }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(184,150,46,0.6)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nome@kmark.it"
                className="w-full rounded-xl px-4 py-3 text-sm transition"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(184,150,46,0.2)',
                  color: '#f0ece0',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(184,150,46,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,150,46,0.08)'; }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(184,150,46,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(184,150,46,0.6)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm transition"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(184,150,46,0.2)',
                  color: '#f0ece0',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(184,150,46,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,150,46,0.08)'; }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(184,150,46,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-2"
              style={{
                background: loading ? 'rgba(184,150,46,0.5)' : 'linear-gradient(135deg, #b8962e 0%, #d4af50 50%, #b8962e 100%)',
                color: '#0a0a0a',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(184,150,46,0.35)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" style={{ color: '#0a0a0a' }} /> : null}
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          {/* Bottom gold accent line */}
          <div className="h-px w-full mt-6 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,150,46,0.3), transparent)' }} />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(184,150,46,0.3)' }}>
          © {new Date().getFullYear()} K-MARK S.P.A. — Tutti i diritti riservati
        </p>
      </div>
    </div>
  );
}
