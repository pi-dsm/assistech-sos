import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink, Menu, Wrench, X } from './icons';
import { useAuth } from '../context/AuthContext';
import { crumbsFor, navFor } from '../config/navigation';
import { ROLES } from '../utils/format';
import { readPref, writePref } from './ui';

const OPEN_KEY = 'sidebar_open_groups';

export function Logo({ dark = true, size = 'md' }) {
  const box = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  return (
    <span className={`flex items-center gap-2 font-extrabold tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'} ${dark ? 'text-white' : 'text-slate-900'}`}>
      <span className={`grid ${box} place-items-center rounded-lg bg-blue-600 text-white`}><Wrench size={size === 'lg' ? 22 : 18} /></span>
      <span>
        AssisTech <span className={dark ? 'text-blue-400' : 'text-blue-600'}>SOS</span>
      </span>
    </span>
  );
}

function Sidebar({ onNavigate }) {
  const { user, tenant, logout, can, isSuper } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const groups = navFor(can, isSuper);
  const home = isSuper ? '/super' : '/app';

  // Grupos abertos: lembrados no navegador; o grupo da tela atual sempre abre
  const [open, setOpen] = useState(() => {
    try {
      return JSON.parse(readPref(OPEN_KEY, '[]'));
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const current = groups.find((g) => g.base && pathname.startsWith(g.base));
    if (current && !open.includes(current.key)) setOpen((o) => [...o, current.key]);
  }, [pathname]);
  useEffect(() => writePref(OPEN_KEY, JSON.stringify(open)), [open]);

  const toggle = (key) => setOpen((o) => (o.includes(key) ? o.filter((k) => k !== key) : [...o, key]));
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-blue-600 text-white shadow-card' : 'text-white/75 hover:bg-ink-800 hover:text-white'
    }`;

  return (
    <>
      <div className="px-5 pb-4 pt-5">
        <Link to={home} onClick={onNavigate} aria-label="Ir para a tela inicial"><Logo /></Link>
        <p className="mt-1 truncate pl-10 text-[11px] font-medium uppercase tracking-wider text-white/50">
          {isSuper ? 'Gestão da plataforma' : tenant?.name || 'Assistência técnica'}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3" aria-label="Menu principal">
        {groups.map((g) => {
          const Icon = g.icon;
          if (g.action === 'logout') {
            return (
              <button key="logout" type="button" onClick={handleLogout} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/15 hover:text-white">
                <Icon size={18} /> {g.label}
              </button>
            );
          }
          if (!g.children) {
            return (
              <NavLink key={g.key} to={g.to} end={g.end} onClick={onNavigate} className={(s) => `${linkCls(s)} py-2.5`}>
                <Icon size={18} /> {g.label}
              </NavLink>
            );
          }
          const expanded = open.includes(g.key);
          const active = pathname.startsWith(g.base);
          return (
            <div key={g.key} className="mt-1">
              <button
                type="button"
                onClick={() => toggle(g.key)}
                aria-expanded={expanded}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-bold uppercase tracking-wide transition hover:bg-ink-800 ${
                  active ? 'text-white' : 'text-white/50'
                }`}
              >
                <Icon size={17} className={active ? 'text-blue-400' : ''} />
                <span className="flex-1">{g.label}</span>
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expanded && (
                <div className="ml-[22px] mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                  {g.children.map((c) => (
                    <NavLink key={c.to} to={c.to} onClick={onNavigate} className={linkCls}>
                      <c.icon size={16} /> {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-sm font-bold text-white">
            {(user?.name || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-white/50">{ROLES[user?.role]}</p>
          </div>
        </div>
        {tenant?.slug && (
          <a href={`/loja/${tenant.slug}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white">
            <ExternalLink size={12} /> Vitrine e consulta pública de OS
          </a>
        )}
      </div>
    </>
  );
}

export default function Layout() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const { isSuper } = useAuth();
  const crumbs = crumbsFor(pathname);

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-ink-900 md:flex">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-ink-900 px-4 py-3 md:hidden">
        <Link to={isSuper ? '/super' : '/app'}><Logo /></Link>
        <button onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-white hover:bg-ink-800" aria-label="Abrir menu"><Menu /></button>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-ink-900">
            <button onClick={() => setDrawer(false)} className="absolute right-2 top-3 rounded-lg p-2 text-white hover:bg-ink-800" aria-label="Fechar menu"><X /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {crumbs.length > 1 && (
          <div className="border-b border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 sm:px-6 lg:px-8">
            <span className="font-semibold text-blue-700">{crumbs[0]}</span>
            <ChevronRight size={12} className="mx-1.5 inline" />
            <span className="font-semibold text-slate-900">{crumbs[1]}</span>
          </div>
        )}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
