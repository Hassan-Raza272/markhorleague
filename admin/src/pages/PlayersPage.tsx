import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardStatsCards } from '../components/DashboardStatsCards';
import {
  getAllPlayers,
  filterPlayers,
  approvePlayer,
  rejectPlayer,
  deletePlayer,
  getUniqueCities,
  computeStats,
} from '../services/playerService';
import { exportToExcel, exportToCSV, exportToPDF, getPremiumPdfBlob, shareFile } from '../utils/exportUtils';
import { useAuth } from '../hooks/useAuth';
import type { Player, PlayerCategory, PlayerFilters, RegistrationStatus, PlayingRole, KitSize } from '../types';
import {
  Search,
  Filter,
  Download,
  Share2,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES: RegistrationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const ROLES: PlayingRole[] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'];
const CATEGORIES: PlayerCategory[] = ['JUNIOR', 'SENIOR', 'EMERGING'];
const CATEGORY_LABELS: Record<PlayerCategory, string> = {
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  EMERGING: 'Emerging',
};

type PdfScope = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type PdfCategoryScope = 'ALL' | PlayerCategory | 'UNASSIGNED';
type PdfKitSizeScope = 'ALL' | KitSize | 'UNASSIGNED';

const PDF_SCOPES: Array<{ key: PdfScope; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const PDF_CATEGORY_SCOPES: Array<{ key: PdfCategoryScope; label: string }> = [
  { key: 'ALL', label: 'All Cats' },
  { key: 'JUNIOR', label: 'Junior' },
  { key: 'SENIOR', label: 'Senior' },
  { key: 'EMERGING', label: 'Emerging' },
  { key: 'UNASSIGNED', label: 'Unassigned' },
];

const PDF_KIT_SIZE_SCOPES: Array<{ key: PdfKitSizeScope; label: string }> = [
  { key: 'ALL', label: 'All Sizes' },
  { key: 'S', label: 'Small' },
  { key: 'M', label: 'Medium' },
  { key: 'L', label: 'Large' },
  { key: 'XL', label: 'XL' },
  { key: '2XL', label: '2XL' },
  { key: '3XL', label: '3XL' },
  { key: '4XL', label: '4XL' },
  { key: 'UNASSIGNED', label: 'Not Selected' },
];

function playersForPdfScope(
  players: Player[],
  scope: PdfScope,
  categoryScope: PdfCategoryScope,
  kitSizeScope: PdfKitSizeScope,
): Player[] {
  let list = players;
  switch (scope) {
    case 'PENDING':
      list = list.filter(p => p.status === 'PENDING');
      break;
    case 'APPROVED':
      list = list.filter(p => p.status === 'APPROVED');
      break;
    case 'REJECTED':
      list = list.filter(p => p.status === 'REJECTED');
      break;
    default:
      break;
  }
  if (categoryScope === 'UNASSIGNED') {
    list = list.filter(p => !p.category);
  } else if (categoryScope !== 'ALL') {
    list = list.filter(p => p.category === categoryScope);
  }
  if (kitSizeScope === 'UNASSIGNED') {
    list = list.filter(p => !p.kitSize);
  } else if (kitSizeScope !== 'ALL') {
    list = list.filter(p => p.kitSize === kitSizeScope);
  }
  return list;
}

export function PlayersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PlayerFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pdfScope, setPdfScope] = useState<PdfScope>('ALL');
  const [pdfCategory, setPdfCategory] = useState<PdfCategoryScope>('ALL');
  const [pdfKitSize, setPdfKitSize] = useState<PdfKitSizeScope>('ALL');

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: getAllPlayers,
  });

  const filtered = useMemo(() => filterPlayers(players, filters), [players, filters]);
  const cities = useMemo(() => getUniqueCities(players), [players]);
  const stats = useMemo(() => computeStats(players), [players]);
  const pdfPlayers = useMemo(
    () => playersForPdfScope(players, pdfScope, pdfCategory, pdfKitSize),
    [players, pdfScope, pdfCategory, pdfKitSize],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['players'] });

  const downloadPdf = async () => {
    if (!pdfPlayers.length) {
      toast.error('No players in selected PDF scope');
      return;
    }
    const label = `${PDF_SCOPES.find(s => s.key === pdfScope)?.label ?? 'All'} / ${
      PDF_CATEGORY_SCOPES.find(s => s.key === pdfCategory)?.label ?? 'All Cats'
    } / ${PDF_KIT_SIZE_SCOPES.find(s => s.key === pdfKitSize)?.label ?? 'All Sizes'}`;
    try {
      toast.loading('Building PDF with photos...', { id: 'pdf-export' });
      await exportToPDF(
        pdfPlayers,
        `MCL_2026-27_Players_${pdfScope.toLowerCase()}_${pdfCategory.toLowerCase()}_${pdfKitSize.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`,
        {
          statusScope: pdfScope,
          categoryScope: pdfCategory,
          kitSizeScope: pdfKitSize,
        },
      );
      toast.success(`Downloaded PDF (${label})`, { id: 'pdf-export' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'PDF download failed', {
        id: 'pdf-export',
      });
    }
  };

  const sharePdf = async () => {
    if (!pdfPlayers.length) {
      toast.error('No players in selected PDF scope');
      return;
    }
    try {
      const label = `${PDF_SCOPES.find(s => s.key === pdfScope)?.label ?? 'All'} / ${
        PDF_CATEGORY_SCOPES.find(s => s.key === pdfCategory)?.label ?? 'All Cats'
      } / ${PDF_KIT_SIZE_SCOPES.find(s => s.key === pdfKitSize)?.label ?? 'All Sizes'}`;
      const filename = `MCL_2026-27_Players_${pdfScope.toLowerCase()}_${pdfCategory.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      toast.loading('Building PDF with photos...', { id: 'pdf-share' });
      const blob = await getPremiumPdfBlob(pdfPlayers, {
        statusScope: pdfScope,
        categoryScope: pdfCategory,
        kitSizeScope: pdfKitSize,
      });
      await shareFile(blob, filename, `MCL 2026-27 Players (${label})`);
      toast.success(`Shared / saved PDF (${label})`, { id: 'pdf-share' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Share failed', {
        id: 'pdf-share',
      });
    }
  };

  const handleAction = async (
    action: string,
    playerDocId: string,
    playerName: string,
    extra?: string,
  ) => {
    if (!user) return;
    const email = user.email ?? 'admin';

    try {
      switch (action) {
        case 'approve':
          await approvePlayer(playerDocId, user.uid, email);
          toast.success(`${playerName} approved`);
          break;
        case 'reject':
          if (!extra) return;
          await rejectPlayer(playerDocId, user.uid, email, extra);
          toast.success(`${playerName} rejected`);
          break;
        case 'delete':
          if (!confirm(`Delete ${playerName}? This cannot be undone.`)) return;
          await deletePlayer(playerDocId, user.uid, email);
          toast.success(`${playerName} deleted`);
          break;
      }
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const clearFilters = () => setFilters({});

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Players</h1>
            <p className="text-mcl-silver-400 mt-1">
              {filtered.length} of {players.length} players ·{' '}
              <span className="text-amber-400 font-semibold">{stats.pending} Pending</span>
              {' · '}
              <span className="text-mcl-lime-500 font-semibold">{stats.approved} Approved</span>
            </p>
          </div>

          <div className="admin-panel p-4 space-y-3 w-full lg:max-w-xl">
            <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider">
              Export scope
            </p>
            <div className="flex flex-wrap gap-2">
              {PDF_SCOPES.map(scope => (
                <button
                  key={scope.key}
                  type="button"
                  onClick={() => setPdfScope(scope.key)}
                  className={`admin-chip ${
                    pdfScope === scope.key
                      ? 'bg-mcl-gold-500 text-mcl-forest-950 border-mcl-gold-500'
                      : 'admin-chip-idle'
                  }`}>
                  {scope.label}
                  {scope.key === 'ALL'
                    ? ` (${stats.total})`
                    : scope.key === 'PENDING'
                      ? ` (${stats.pending})`
                      : scope.key === 'APPROVED'
                        ? ` (${stats.approved})`
                        : ` (${stats.rejected})`}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PDF_CATEGORY_SCOPES.map(scope => (
                <button
                  key={scope.key}
                  type="button"
                  onClick={() => setPdfCategory(scope.key)}
                  className={`admin-chip ${
                    pdfCategory === scope.key
                      ? 'bg-mcl-lime-500 text-mcl-forest-950 border-mcl-lime-500'
                      : 'admin-chip-idle'
                  }`}>
                  {scope.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PDF_KIT_SIZE_SCOPES.map(scope => (
                <button
                  key={scope.key}
                  type="button"
                  onClick={() => setPdfKitSize(scope.key)}
                  className={`admin-chip ${
                    pdfKitSize === scope.key
                      ? 'bg-mcl-lime-500/25 text-mcl-lime-400 border-mcl-lime-500/50'
                      : 'admin-chip-idle'
                  }`}>
                  {scope.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-mcl-forest-600">
              <button
                type="button"
                onClick={sharePdf}
                className="flex items-center gap-2 px-4 py-2 border border-mcl-lime-500/50 text-mcl-lime-500 rounded-xl text-sm font-semibold hover:bg-mcl-lime-500/10 transition">
                <Share2 size={16} /> Share PDF
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="flex items-center gap-2 px-4 py-2 bg-mcl-gold-500 text-mcl-forest-950 rounded-xl text-sm font-semibold hover:bg-mcl-gold-400 transition">
                <Download size={16} /> Download PDF
              </button>
              <button
                type="button"
                onClick={() => exportToExcel(filtered)}
                className="flex items-center gap-2 px-4 py-2 bg-mcl-forest-900 border border-mcl-forest-600 text-white rounded-xl text-sm font-semibold hover:border-mcl-lime-500/40 transition">
                <Download size={16} /> Excel
              </button>
              <button
                type="button"
                onClick={() => exportToCSV(filtered)}
                className="flex items-center gap-2 px-4 py-2 bg-mcl-forest-900 border border-mcl-forest-600 text-white rounded-xl text-sm font-semibold hover:border-mcl-lime-500/40 transition">
                <Download size={16} /> CSV
              </button>
            </div>
          </div>
        </div>

        <DashboardStatsCards stats={stats} />

        <div className="admin-panel p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mcl-silver-400" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, CNIC, city, team..."
                value={filters.search ?? ''}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-mcl-forest-900 border border-mcl-forest-600 text-white placeholder:text-mcl-silver-400 focus:outline-none focus:ring-2 focus:ring-mcl-lime-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                showFilters
                  ? 'bg-mcl-lime-500/15 text-mcl-lime-500 border-mcl-lime-500/40'
                  : 'border-mcl-forest-600 text-mcl-silver-100 hover:border-mcl-lime-500/40'
              }`}>
              <Filter size={16} /> Filters
            </button>
            {Object.keys(filters).length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-xl">
                Clear Filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-mcl-forest-600">
              <select
                value={filters.status ?? ''}
                onChange={e =>
                  setFilters({ ...filters, status: (e.target.value || undefined) as RegistrationStatus })
                }
                className="admin-select">
                <option value="">All Statuses</option>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filters.category ?? ''}
                onChange={e =>
                  setFilters({
                    ...filters,
                    category: (e.target.value || undefined) as
                      | PlayerCategory
                      | 'UNASSIGNED'
                      | undefined,
                  })
                }
                className="admin-select">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
                <option value="UNASSIGNED">Unassigned</option>
              </select>

              <select
                value={filters.role ?? ''}
                onChange={e =>
                  setFilters({ ...filters, role: (e.target.value || undefined) as PlayingRole })
                }
                className="admin-select">
                <option value="">All Roles</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={filters.city ?? ''}
                onChange={e => setFilters({ ...filters, city: e.target.value || undefined })}
                className="admin-select">
                <option value="">All Cities</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Min Age"
                value={filters.ageMin ?? ''}
                onChange={e =>
                  setFilters({ ...filters, ageMin: e.target.value ? Number(e.target.value) : undefined })
                }
                className="admin-select"
              />

              <input
                type="number"
                placeholder="Max Age"
                value={filters.ageMax ?? ''}
                onChange={e =>
                  setFilters({ ...filters, ageMax: e.target.value ? Number(e.target.value) : undefined })
                }
                className="admin-select"
              />
            </div>
          )}
        </div>

        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="admin-table-head">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mcl-forest-700">
                {isLoading ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 10 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-mcl-forest-700 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-mcl-silver-400">
                      No players found
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-mcl-forest-700/40 transition">
                      <td className="px-4 py-3 text-xs font-mono font-bold text-mcl-lime-500">
                        {p.playerId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.profileImage ? (
                            <img
                              src={p.profileImage}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-mcl-forest-600"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-mcl-forest-700 text-mcl-lime-500 flex items-center justify-center text-xs font-bold border border-mcl-lime-500/40">
                              {p.fullName.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm font-medium text-white">{p.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-mcl-silver-100">{p.role}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-mcl-gold-400">
                        {p.category ? CATEGORY_LABELS[p.category] : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-mcl-silver-100">{p.city}</td>
                      <td className="px-4 py-3 text-sm text-mcl-silver-100">{p.age}</td>
                      <td className="px-4 py-3 text-sm font-mono text-mcl-silver-100">{p.phone}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-xs text-mcl-silver-400">
                        {format(p.createdAt, 'dd/MM/yy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/players/${p.id}`}
                            className="p-1.5 rounded-lg hover:bg-mcl-forest-700 text-mcl-lime-500"
                            title="View">
                            <Eye size={16} />
                          </Link>
                          {p.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAction('approve', p.id, p.fullName)}
                                className="p-1.5 rounded-lg hover:bg-mcl-lime-500/15 text-mcl-lime-500"
                                title="Approve">
                                <CheckCircle size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModal({ id: p.id, name: p.fullName })}
                                className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400"
                                title="Reject">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAction('delete', p.id, p.fullName)}
                            className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400"
                            title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="admin-panel p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Reject {rejectModal.name}
            </h3>
            <p className="text-sm text-mcl-silver-400 mb-4">Please provide a rejection reason.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="admin-input mb-4"
              placeholder="Player information could not be verified."
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2.5 border border-mcl-forest-600 rounded-xl font-semibold text-mcl-silver-100 hover:bg-mcl-forest-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReason.trim()) {
                    toast.error('Rejection reason is required');
                    return;
                  }
                  handleAction('reject', rejectModal.id, rejectModal.name, rejectReason);
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600">
                Reject Player
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
