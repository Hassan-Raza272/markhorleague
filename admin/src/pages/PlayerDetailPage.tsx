import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { StatusBadge } from '../components/StatusBadge';
import {
  getPlayerById,
  updatePlayer,
  updatePlayerStatus,
  setPlayerCategory,
} from '../services/playerService';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Player, PlayerCategory, RegistrationStatus } from '../types';

const STATUSES: RegistrationStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

const CATEGORIES: PlayerCategory[] = [
  'JUNIOR',
  'SENIOR',
  'EMERGING',
];

const CATEGORY_LABELS: Record<PlayerCategory, string> = {
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  EMERGING: 'Emerging',
};

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Player>>({});
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const { data: player, isLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayerById(id!),
    enabled: !!id,
  });

  const startEdit = () => {
    if (player) {
      setForm(player);
      setEditing(true);
    }
  };

  const handleSave = async () => {
    if (!user || !id) return;
    try {
      await updatePlayer(id, form, user.uid, user.email ?? 'admin');
      toast.success('Player updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleStatusChange = async (status: RegistrationStatus) => {
    if (!user || !id || !player) return;
    if (status === 'REJECTED') {
      setShowReject(true);
      return;
    }
    try {
      await updatePlayerStatus(id, status, user.uid, user.email ?? 'admin');
      toast.success(`Status updated to ${status}`);
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handleReject = async () => {
    if (!user || !id || !player || !rejectReason.trim()) {
      toast.error('Rejection reason required');
      return;
    }
    await updatePlayerStatus(
      id,
      'REJECTED',
      user.uid,
      user.email ?? 'admin',
      rejectReason,
    );
    toast.success('Player rejected');
    setShowReject(false);
    queryClient.invalidateQueries({ queryKey: ['player', id] });
    queryClient.invalidateQueries({ queryKey: ['players'] });
  };

  const handleCategoryChange = async (value: string) => {
    if (!user || !id) return;
    try {
      const category =
        value === '' ? null : (value as PlayerCategory);
      await setPlayerCategory(id, category, user.uid, user.email ?? 'admin');
      toast.success(
        category
          ? `Category set to ${CATEGORY_LABELS[category]}`
          : 'Category cleared',
      );
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Category update failed');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-mcl-forest-700 rounded-full animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-mcl-forest-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-mcl-forest-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-48 admin-panel animate-pulse" />
          <div className="h-64 admin-panel animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (!player) {
    return (
      <AdminLayout>
        <p className="text-mcl-silver-400">Player not found</p>
      </AdminLayout>
    );
  }

  const data = editing ? form : player;

  const Field = ({
    label,
    field,
  }: {
    label: string;
    field: keyof Player;
  }) => (
    <div className="py-3 border-b border-mcl-forest-700">
      <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      {editing ? (
        <input
          value={String(data[field] ?? '')}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          className="admin-input py-2"
        />
      ) : (
        <p className="text-sm font-medium text-white">
          {String(data[field] ?? '—')}
        </p>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/players')}
            className="p-2 rounded-xl hover:bg-mcl-forest-800 text-mcl-lime-500 border border-mcl-forest-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-white">{player.fullName}</h1>
            <p className="text-mcl-lime-500 font-mono font-bold">{player.playerId}</p>
          </div>
          <StatusBadge status={player.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="admin-panel p-6 text-center">
            {player.profileImage ? (
              <img
                src={player.profileImage}
                alt={player.fullName}
                className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-mcl-gold-500 mb-4"
              />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto bg-mcl-forest-700 text-mcl-lime-500 flex items-center justify-center text-4xl font-bold mb-4 border border-mcl-lime-500/40">
                {player.fullName.charAt(0)}
              </div>
            )}
            <p className="text-sm text-mcl-silver-400">
              Registered {format(player.createdAt, 'dd MMM yyyy')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {STATUSES.map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  disabled={player.status === status}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    player.status === status
                      ? 'bg-mcl-lime-500 text-mcl-forest-950 border-mcl-lime-500'
                      : 'border-mcl-forest-600 text-mcl-silver-100 hover:border-mcl-lime-500'
                  }`}>
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-4 text-left">
              <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-2 text-center">
                Category
              </p>
              <select
                value={player.category ?? ''}
                onChange={e => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-mcl-gold-500 bg-mcl-forest-900 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-mcl-gold-400">
                <option value="">Unassigned</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="px-4 py-2 border border-mcl-lime-500 text-mcl-lime-500 rounded-xl text-sm font-semibold hover:bg-mcl-lime-500/10">
                  Edit Info
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1 px-4 py-2 bg-mcl-lime-500 text-mcl-forest-950 rounded-xl text-sm font-semibold">
                  <Save size={16} /> Save
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 admin-panel p-6">
            <h2 className="font-bold text-white mb-4">Player Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Field label="Full Name" field="fullName" />
              <Field label="Father's Name" field="fatherName" />
              <Field label="Phone" field="phone" />
              <Field label="Email" field="email" />
              <Field label="CNIC" field="cnic" />
              <Field label="Date of Birth" field="dateOfBirth" />
              <Field label="Age" field="age" />
              <Field label="City" field="city" />
              <Field label="Address" field="address" />
              <div className="py-3 border-b border-mcl-forest-700">
                <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-1">
                  Category
                </p>
                <p className="text-sm font-medium text-white">
                  {player.category
                    ? CATEGORY_LABELS[player.category]
                    : 'Unassigned'}
                </p>
              </div>
              <Field label="Role" field="role" />
              <Field label="Batting Style" field="battingStyle" />
              <Field label="Bowling Style" field="bowlingStyle" />
              <Field label="Experience (Years)" field="yearsOfExperience" />
              <Field label="Current Club" field="currentClub" />
              <Field label="Shirt Number" field="shirtNumber" />
              <div className="py-3 border-b border-mcl-forest-700">
                <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-1">
                  Uniform Size
                </p>
                {editing ? (
                  <select
                    value={data.kitSize ?? ''}
                    onChange={e =>
                      setForm({
                        ...form,
                        kitSize: (e.target.value || undefined) as Player['kitSize'],
                      })
                    }
                    className="admin-select w-full">
                    <option value="">Not selected</option>
                    <option value="S">Small</option>
                    <option value="M">Medium</option>
                    <option value="L">Large</option>
                    <option value="XL">XL</option>
                    <option value="2XL">2XL</option>
                    <option value="3XL">3XL</option>
                    <option value="4XL">4XL</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-white">
                    {player.kitSize
                      ? {
                          S: 'Small',
                          M: 'Medium',
                          L: 'Large',
                          XL: 'XL',
                          '2XL': '2XL',
                          '3XL': '3XL',
                          '4XL': '4XL',
                        }[player.kitSize]
                      : '—'}
                  </p>
                )}
              </div>
              <Field label="Achievements" field="achievements" />
            </div>

            {player.rejectionReason && (
              <div className="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <p className="text-sm font-semibold text-red-400">Rejection Reason</p>
                <p className="text-sm text-red-300 mt-1">{player.rejectionReason}</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-mcl-forest-600">
              <h3 className="font-bold text-white mb-4">Registration Fee</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div className="py-3 border-b border-mcl-forest-700">
                  <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-1">
                    Registration Fee
                  </p>
                  <p className="text-sm font-bold text-mcl-gold-400">PKR 2,500</p>
                </div>
                <div className="py-3 border-b border-mcl-forest-700">
                  <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-1">
                    Easypaisa
                  </p>
                  <p className="text-sm font-medium text-white">03085386894</p>
                  <p className="text-xs text-mcl-silver-400 mt-1">
                    Title: Bilal Shafeeq Bhatti
                  </p>
                </div>
                <div className="py-3 border-b border-mcl-forest-700">
                  <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-1">
                    Receipt Status
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      player.feeReceiptUrl ? 'text-mcl-lime-500' : 'text-amber-400'
                    }`}>
                    {player.feeReceiptUrl ? 'Receipt submitted' : 'Not submitted'}
                  </p>
                  {player.feeReceiptSubmittedAt ? (
                    <p className="text-xs text-mcl-silver-400 mt-1">
                      Sent {format(player.feeReceiptSubmittedAt, 'dd MMM yyyy, hh:mm a')}
                    </p>
                  ) : null}
                </div>
              </div>
              {player.feeReceiptUrl ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-mcl-silver-400 uppercase tracking-wider mb-2">
                    Payment Receipt
                  </p>
                  <a
                    href={player.feeReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block">
                    <img
                      src={player.feeReceiptUrl}
                      alt="Payment receipt"
                      className="max-w-full max-h-80 rounded-xl border border-mcl-forest-600"
                    />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-mcl-silver-400 mt-4 italic">
                  No payment receipt uploaded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="admin-panel p-6 w-full max-w-md">
            <h3 className="font-bold text-white mb-4">Reject Player</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="admin-input mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReject(false)}
                className="flex-1 py-2.5 border border-mcl-forest-600 rounded-xl font-semibold text-mcl-silver-100 hover:bg-mcl-forest-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
