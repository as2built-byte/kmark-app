import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar, { navItems } from './Sidebar';
import LanguageSelector from './LanguageSelector';

export default function Layout() {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleNav = navItems.filter(n => !n.admin || userRole === 'admin');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isFullHeight = location.pathname === '/presenze';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a0a0a] text-white shadow" style={{borderBottom:'1px solid rgba(184,150,46,0.18)'}}>
          <div className="flex items-center gap-2">
            <img
              src="/logo-kmark.png"
              alt="K-MARK Logo"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#0a0a0a] px-3 pb-3 space-y-1" style={{borderBottom:'1px solid rgba(184,150,46,0.15)'}}>
            {visibleNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white'
                      : 'text-white/55 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut size={16} />
              Esci
            </button>
          </div>
        )}

        <main className={`flex-1 ${isFullHeight ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6'}`}>
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav className="md:hidden flex justify-around items-center bg-[#0a0a0a] text-white py-2" style={{borderTop:'1px solid rgba(184,150,46,0.15)'}}>
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-all ${
                  isActive ? 'text-[#b8962e]' : 'text-white/40 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
