import { NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import {
  House,
  ClipboardCheck,
  History,
  Settings,
  LogOut,
  Menu,
  CheckCircle2,
  UserCircle,
  Heart,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '../../../features/auth/controller/useSession';
const links = [
  { to: '/', label: 'Ringkasan', icon: House },
  { to: '/pemeriksaan', label: 'Pemeriksaan', icon: ClipboardCheck },
  { to: '/riwayat', label: 'Riwayat', icon: History },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];
export function AppShell({ serverClock }: { serverClock?: ReactNode }) {
  const session = useSession(),
    [menu, setMenu] = useState(false);
  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (menu ? 'sidebar-open' : '')}>
        <nav aria-label="Navigasi utama">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              title={link.label}
              onClick={() => setMenu(false)}
            >
              <link.icon size={21} />
              <span className="sr-only">{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer" title="CV lokal · Tanpa API AI">
          <CheckCircle2 size={18} />
          <span className="sr-only">CV lokal · Tanpa API AI</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar no-print">
          <div className="row">
            <button
              className="icon-button mobile-menu"
              aria-label="Buka menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
            <BrandLogo />
          </div>
          <div className="row">
            {serverClock}
            <span className="environment-tag local-mode" role="status" aria-label="Mode pembacaan">
              <CheckCircle2 size={15} /> CV lokal
            </span>
            <UserCircle size={23} />
            <span className="user-name">
              {session.user?.username}
              <small>{session.user?.role}</small>
            </span>
            <button
              className="icon-button"
              aria-label="Keluar"
              onClick={() => session.logout.mutate()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer no-print">
          <span>© 2026 · Created with</span>
          <Heart size={12} fill="currentColor" role="img" aria-label="love" />
          <span>by Magang Nasional Batch 2 2026 · UGM x ITS Boys</span>
        </footer>
        <nav className="mobile-nav no-print" aria-label="Navigasi HP">
          {links.slice(0, 3).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              <l.icon size={21} />
              <span>{l.label === 'Pemeriksaan' ? 'Periksa' : l.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setMenu(!menu)}>
            <Menu size={21} />
            <span>Lainnya</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
