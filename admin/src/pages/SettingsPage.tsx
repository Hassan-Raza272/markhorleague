import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../layouts/AdminLayout';
import { getLeagueSettings, updateLeagueSettings } from '../services/playerService';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import type { LeagueSettings } from '../types';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getLeagueSettings,
  });

  const [form, setForm] = useState<Partial<LeagueSettings>>({});

  const current = { ...settings, ...form };

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateLeagueSettings(current, user.uid, user.email ?? 'admin');
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setForm({});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="h-8 w-40 bg-mcl-forest-700 rounded animate-pulse" />
          <div className="admin-panel p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-mcl-forest-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-mcl-forest-900 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Settings</h1>
          <p className="text-mcl-silver-400 mt-1">Manage league registration settings</p>
        </div>

        <div className="admin-panel p-6 space-y-5">
          <div>
            <label className="admin-label">League Name</label>
            <input
              value={current.leagueName ?? ''}
              onChange={e => setForm({ ...form, leagueName: e.target.value })}
              className="admin-input"
            />
          </div>

          <div>
            <label className="admin-label">Season / Year</label>
            <input
              value={current.season ?? ''}
              onChange={e => setForm({ ...form, season: e.target.value })}
              className="admin-input"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-mcl-forest-900 border border-mcl-forest-600">
            <div>
              <p className="font-semibold text-white">Registration</p>
              <p className="text-sm text-mcl-silver-400">
                {current.registrationOpen ? 'Currently OPEN' : 'Currently CLOSED'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, registrationOpen: !current.registrationOpen })
              }
              className={`relative w-14 h-7 rounded-full transition ${
                current.registrationOpen ? 'bg-mcl-lime-500' : 'bg-mcl-forest-600'
              }`}>
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  current.registrationOpen ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="admin-label">Registration Deadline</label>
            <input
              type="date"
              value={current.registrationDeadline ?? ''}
              onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
              className="admin-input"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-mcl-forest-900 border border-mcl-forest-600">
            <div>
              <p className="font-semibold text-white">Public Player List</p>
              <p className="text-sm text-mcl-silver-400">
                Allow public viewing of approved players
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  publicPlayerListEnabled: !current.publicPlayerListEnabled,
                })
              }
              className={`relative w-14 h-7 rounded-full transition ${
                current.publicPlayerListEnabled ? 'bg-mcl-lime-500' : 'bg-mcl-forest-600'
              }`}>
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  current.publicPlayerListEnabled ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="admin-label">Maximum Registrations (optional)</label>
            <input
              type="number"
              value={current.maxRegistrations ?? ''}
              onChange={e =>
                setForm({
                  ...form,
                  maxRegistrations: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="admin-input"
              placeholder="No limit"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 bg-mcl-lime-500 hover:bg-mcl-lime-400 text-mcl-forest-950 font-bold rounded-xl transition">
            Save Settings
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
