import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AdminLayout } from '../layouts/AdminLayout';
import { getLeagueSettings } from '../services/playerService';

interface PublicPlayer {
  playerId: string;
  fullName: string;
  profileImage?: string;
  age: number;
  city: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  yearsOfExperience: number;
}

async function getPublicPlayers(): Promise<PublicPlayer[]> {
  const snap = await getDocs(collection(db, 'publicPlayers'));
  return snap.docs.map(d => d.data() as PublicPlayer);
}

export function PublicListPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getLeagueSettings,
  });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['publicPlayers'],
    queryFn: getPublicPlayers,
    enabled: settings?.publicPlayerListEnabled,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Public Player List</h1>
          <p className="text-mcl-silver-400 mt-1">
            Preview of publicly visible approved players
          </p>
        </div>

        {!settings?.publicPlayerListEnabled ? (
          <div className="admin-panel p-6 text-center border-amber-500/30">
            <p className="text-amber-400 font-semibold">
              Public player list is currently disabled.
            </p>
            <p className="text-mcl-silver-400 text-sm mt-2">
              Enable it in Settings to allow public viewing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 admin-panel animate-pulse" />
              ))
            ) : players.length === 0 ? (
              <p className="text-mcl-silver-400 col-span-full text-center py-12">
                No approved players in public list yet
              </p>
            ) : (
              players.map(p => (
                <div
                  key={p.playerId}
                  className="admin-panel p-5 text-center hover:border-mcl-lime-500/40 transition">
                  {p.profileImage ? (
                    <img
                      src={p.profileImage}
                      alt={p.fullName}
                      className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-mcl-gold-500 mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto bg-mcl-forest-700 text-mcl-lime-500 flex items-center justify-center text-xl font-bold mb-3 border border-mcl-lime-500/40">
                      {p.fullName.charAt(0)}
                    </div>
                  )}
                  <p className="font-bold text-white">{p.fullName}</p>
                  <p className="text-xs font-mono text-mcl-lime-500 mt-1">{p.playerId}</p>
                  <p className="text-sm text-mcl-silver-400 mt-2">
                    {p.role} · {p.city}
                  </p>
                  <p className="text-xs text-mcl-silver-400 mt-1">
                    {p.battingStyle} · {p.bowlingStyle}
                  </p>
                  <p className="text-xs text-mcl-silver-400">
                    {p.yearsOfExperience} yrs experience
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
