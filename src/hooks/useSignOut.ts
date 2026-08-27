import { useAuth } from '../hooks/useAuth';
import { usePremiumAlert } from '../components/PremiumAlertProvider';

export function useSignOut() {
  const { logout } = useAuth();
  const { alert } = usePremiumAlert();

  const confirmSignOut = () => {
    alert('Sign Out', 'Are you sure you want to sign out of MCL 2026-27?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout().catch(() => {
            alert('Error', 'Could not sign out. Please try again.');
          });
        },
      },
    ]);
  };

  return { confirmSignOut, logout };
}
