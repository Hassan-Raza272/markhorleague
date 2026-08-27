import { Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function StatCard({ title, value, icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-mcl-forest-800 rounded-2xl p-6 border border-mcl-forest-600 hover:border-mcl-lime-500/40 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-mcl-silver-400 mb-1">{title}</p>
          <p className="text-3xl font-extrabold text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardStatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Players"
        value={stats.total}
        icon={<Users size={22} />}
        color="#A3CF2D"
        bg="bg-mcl-lime-500/15"
      />
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={<Clock size={22} />}
        color="#F59E0B"
        bg="bg-amber-500/15"
      />
      <StatCard
        title="Approved"
        value={stats.approved}
        icon={<CheckCircle size={22} />}
        color="#A3CF2D"
        bg="bg-mcl-lime-500/15"
      />
      <StatCard
        title="Rejected"
        value={stats.rejected}
        icon={<XCircle size={22} />}
        color="#EF4444"
        bg="bg-red-500/15"
      />
    </div>
  );
}
