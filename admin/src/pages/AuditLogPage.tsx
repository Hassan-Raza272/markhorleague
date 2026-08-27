import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { getAuditLogs } from '../services/playerService';
import { format } from 'date-fns';

export function AuditLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Audit Log</h1>
          <p className="text-mcl-silver-400 mt-1">Track all admin actions</p>
        </div>

        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="admin-table-head">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Admin</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Player ID</th>
                  <th className="px-6 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mcl-forest-700">
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-6 py-3">
                            <div className="h-4 bg-mcl-forest-700 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-mcl-silver-400">
                      No audit logs yet
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-mcl-forest-700/40 transition">
                      <td className="px-6 py-3 text-sm text-mcl-silver-400">
                        {format(log.timestamp, 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-3 text-sm text-white">{log.adminEmail}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-mcl-lime-500/15 text-mcl-lime-500 border border-mcl-lime-500/30 rounded-lg">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-mono text-mcl-lime-500">
                        {log.playerId ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-mcl-silver-400">
                        {log.reason ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
