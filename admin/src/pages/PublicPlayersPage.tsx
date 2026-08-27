import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
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

export function PublicPlayersPage() {
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
    <div className="min-h-screen bg-gradient-to-b from-mcl-forest-950 to-mcl-forest-800">
      <header className="py-12 text-center">
        <img
          src="/mcl-logo.png"
          alt="MCL"
          className="w-20 h-20 mx-auto mb-4 rounded-full object-cover drop-shadow-xl"
        />
        <h1 className="text-4xl font-extrabold text-white tracking-wide">
          {settings?.leagueName ?? 'MCL 2026-27'}
        </h1>
        <p className="text-mcl-lime-500 mt-2 text-lg font-semibold">
          Official Registered Players
        </p>
        <div className="w-16 h-1 bg-mcl-gold-500 mx-auto mt-4 rounded" />
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        {!settings?.publicPlayerListEnabled ? (
          <div className="admin-panel p-12 text-center">
            <p className="text-white text-lg font-semibold">
              The public player list is not currently available.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 admin-panel animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-mcl-silver-400 text-center mb-8">
              {players.length} registered players
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(p => (
                <div
                  key={p.playerId}
                  className="admin-panel p-6 text-center hover:border-mcl-lime-500/40 transition">
                  {p.profileImage ? (
                    <img
                      src={p.profileImage}
                      alt={p.fullName}
                      className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-mcl-gold-500 mb-4"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full mx-auto bg-mcl-forest-700 text-mcl-lime-500 flex items-center justify-center text-2xl font-bold mb-4 border border-mcl-lime-500/40">
                      {p.fullName.charAt(0)}
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-white">{p.fullName}</h3>
                  <p className="text-sm font-mono text-mcl-gold-400 font-semibold mt-1">
                    {p.playerId}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-mcl-silver-400">
                    <p>
                      {p.role} · Age {p.age}
                    </p>
                    <p>{p.city}</p>
                    <p>
                      {p.battingStyle} · {p.bowlingStyle}
                    </p>
                    <p>{p.yearsOfExperience} years experience</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="text-center py-6 text-mcl-silver-400 text-sm">
        © {new Date().getFullYear()} MCL 2026-27 Cricket League
      </footer>
    </div>
  );
}
