import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlayersPage } from './pages/PlayersPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { PublicListPage } from './pages/PublicListPage';
import { PublicPlayersPage } from './pages/PublicPlayersPage';
import { DraftBoardPage } from './pages/DraftBoardPage';

const queryClient = new QueryClient();

function AppSkeleton() {
  return (
    <div className="min-h-screen bg-mcl-forest-900 p-6 space-y-4">
      <div className="h-16 admin-panel animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-32 admin-panel animate-pulse" />
        <div className="h-32 admin-panel animate-pulse" />
        <div className="h-32 admin-panel animate-pulse" />
      </div>
      <div className="h-64 admin-panel animate-pulse" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <AppSkeleton />;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <AppSkeleton />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user && isAdmin ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/players"
        element={
          <ProtectedRoute>
            <PlayersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/players/:id"
        element={
          <ProtectedRoute>
            <PlayerDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/public-list"
        element={
          <ProtectedRoute>
            <PublicListPage />
          </ProtectedRoute>
        }
      />
      <Route path="/public" element={<PublicPlayersPage />} />
      <Route path="/draft-board" element={<DraftBoardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
