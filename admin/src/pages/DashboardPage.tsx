import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardStatsCards } from '../components/DashboardStatsCards';
import { getAllPlayers, computeStats } from '../services/playerService';
import { exportToPDF } from '../utils/exportUtils';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export function DashboardPage() {
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getAllPlayers,
  });

  const stats = computeStats(players);
  const recentPlayers = players.slice(0, 8);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
            <p className="text-mcl-silver-400 mt-1">
              MCL 2026-27 · Markhor Cricket League Overview ·{' '}
              <span className="text-amber-400 font-semibold">{stats.pending} Pending</span>
              {' · '}
              <span className="text-mcl-lime-500 font-semibold">{stats.approved} Approved</span>
            </p>
          </div>
          <button
            onClick={async () => {
              if (!players.length) {
                toast.error('No players to export');
                return;
              }
              try {
                toast.loading('Building PDF with photos...', { id: 'dash-pdf' });
                await exportToPDF(players);
                toast.success('Premium PDF downloaded', { id: 'dash-pdf' });
              } catch (err: unknown) {
                toast.error(
                  err instanceof Error ? err.message : 'PDF download failed',
                  { id: 'dash-pdf' },
                );
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mcl-gold-500 text-mcl-forest-950 text-sm font-bold hover:bg-mcl-gold-400 transition">
            <Download size={16} /> Save Premium PDF
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 admin-panel animate-pulse" />
            ))}
          </div>
        ) : (
          <DashboardStatsCards stats={stats} />
        )}

        <div className="bg-mcl-forest-800 rounded-2xl border border-mcl-forest-600 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-mcl-forest-600">
            <h2 className="font-bold text-white">Recent Registrations</h2>
            <Link
              to="/players"
              className="flex items-center gap-1 text-sm font-semibold text-mcl-lime-500 hover:text-mcl-lime-400">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-mcl-forest-900/60 text-left text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Player ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mcl-forest-700">
                {recentPlayers.map(p => (
                  <tr key={p.id} className="hover:bg-mcl-forest-700/40 transition">
                    <td className="px-6 py-3 text-sm font-mono font-semibold text-mcl-lime-500">
                      {p.playerId}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {p.profileImage ? (
                          <img
                            src={p.profileImage}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border-2 border-mcl-gold-500"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-mcl-forest-700 text-mcl-lime-500 flex items-center justify-center text-xs font-bold border border-mcl-lime-500/40">
                            {p.fullName.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-white">{p.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-mcl-silver-400">{p.role}</td>
                    <td className="px-6 py-3 text-sm text-mcl-silver-400">{p.city}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-3 text-sm text-mcl-silver-400">
                      {format(p.createdAt, 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
                {recentPlayers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-mcl-silver-400">
                      No registrations yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
