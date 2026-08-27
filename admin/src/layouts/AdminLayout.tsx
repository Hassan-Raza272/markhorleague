import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Globe,
  LogOut,
  Activity,
  MonitorPlay,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/audit-log', icon: Activity, label: 'Audit Log' },
  { to: '/public-list', icon: Globe, label: 'Public List' },
];

export function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-mcl-forest-900 flex flex-col fixed left-0 top-0 z-40 border-r border-mcl-forest-600">
      <div className="p-5 border-b border-mcl-forest-600">
        <div className="flex items-center gap-3">
          <img
            src="/mcl-logo.png"
            alt="MCL"
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h1 className="text-white font-extrabold text-lg tracking-wide">MCL 2026-27</h1>
            <p className="text-mcl-lime-500 text-xs font-bold uppercase tracking-wider">
              Super Admin
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-mcl-lime-500/15 text-mcl-lime-500 border border-mcl-lime-500/30'
                  : 'text-mcl-silver-400 hover:bg-mcl-forest-800 hover:text-white border border-transparent'
              }`
            }>
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        <a
          href="/draft-board"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-mcl-silver-400 hover:bg-mcl-forest-800 hover:text-white border border-transparent transition-all">
          <MonitorPlay size={18} />
          <span className="flex-1">Draft Board (LED)</span>
          <ExternalLink size={14} className="opacity-60" />
        </a>
      </nav>

      <div className="p-4 border-t border-mcl-forest-600">
        <p className="text-mcl-silver-400 text-xs truncate px-4 mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-mcl-silver-400 hover:bg-mcl-forest-800 hover:text-white w-full transition-all">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-mcl-forest-900">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 bg-mcl-forest-900">{children}</main>
    </div>
  );
}
