import { NavLink, useNavigate } from 'react-router-dom';
import {
  Clock,
  FileText,
  Receipt,
  CalendarDays,
  Megaphone,
  LogOut,
  Users,
  Wallet,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const navItems = [
  { to: '/timbratura',       icon: Clock,        label: 'Timbratura'        },
  { to: '/dipendenti',       icon: Users,        label: 'Dipendenti',       admin: true },
  { to: '/buste-paga',       icon: Wallet,       label: 'Buste Paga'        },
  { to: '/spese',            icon: Receipt,      label: 'Spese'             },
  { to: '/presenze',         icon: CalendarDays, label: 'Presenze'          },
  { to: '/bacheca',          icon: Megaphone,    label: 'Bacheca'           },
  { to: '/timbrature-admin', icon: ShieldCheck,    label: 'Timbrature',      admin: true },
  { to: '/presenze-admin',   icon: ClipboardCheck, label: 'Presenze',        admin: true },
];

export default function Sidebar() {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex flex-col w-64 h-full bg-[#0a0a0a] text-white" style={{borderRight:'1px solid rgba(184,150,46,0.2)', boxShadow:'4px 0 24px rgba(0,0,0,0.6)'}}>

      {/* Logo with gold glow */}
      <div className="flex items-center gap-3 px-5 py-5" style={{borderBottom:'1px solid rgba(184,150,46,0.15)'}}>
        <img
          src="/logo-kmark.png"
          alt="K-MARK Logo"
          className="h-10 w-auto object-contain"
          style={{ filter: 'drop-shadow(0 0 10px rgba(184,150,46,0.7)) drop-shadow(0 0 20px rgba(184,150,46,0.35))' }}
        />
        <div>
          <p className="text-xs font-semibold" style={{color:'#b8962e'}}>K-MARK S.P.A.</p>
          <p className="text-[10px] text-white/35 mt-0.5 tracking-wide">Portale Aziendale</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.filter(n => !n.admin).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-white/55 hover:text-white'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(90deg, rgba(184,150,46,0.25) 0%, rgba(184,150,46,0.08) 100%)',
                borderLeft: '2px solid #b8962e',
                paddingLeft: '10px',
                color: '#b8962e',
              } : { borderLeft: '2px solid transparent' }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Admin section — visible only for admins */}
        {userRole === 'admin' && (
        <div className="mt-4 pt-3 space-y-1" style={{borderTop:'1px solid rgba(184,150,46,0.12)'}}>
          <p className="text-[10px] uppercase tracking-widest font-bold px-3 mb-2" style={{color:'rgba(184,150,46,0.5)'}}>Amministrazione</p>
          {navItems.filter(n => n.admin).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'text-white' : 'text-white/55 hover:text-white'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(90deg, rgba(184,150,46,0.25) 0%, rgba(184,150,46,0.08) 100%)',
                borderLeft: '2px solid #b8962e',
                paddingLeft: '10px',
                color: '#b8962e',
              } : { borderLeft: '2px solid transparent' }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 space-y-1" style={{borderTop:'1px solid rgba(184,150,46,0.15)'}}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{background:'rgba(184,150,46,0.06)'}}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{background:'rgba(184,150,46,0.15)', color:'#b8962e', border:'1px solid rgba(184,150,46,0.3)'}}
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate" style={{color:'#b8962e'}}>{user?.email?.split('@')[0]}</p>
            <p className="text-[9px] text-white/30 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/45 transition-all"
          style={{}}
          onMouseEnter={e => { e.currentTarget.style.color='#b8962e'; e.currentTarget.style.background='rgba(184,150,46,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color=''; e.currentTarget.style.background=''; }}
        >
          <LogOut size={16} />
          Esci
        </button>
      </div>
    </aside>
  );
}
