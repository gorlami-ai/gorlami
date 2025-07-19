import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { SignOutIcon } from '../assets/icons';

export function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const getInitials = (email?: string) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  const displayName = authService.isAuthEnabled() 
    ? (user.user_metadata?.name || user.email?.split('@')[0] || 'User')
    : 'Test User';

  const displayEmail = authService.isAuthEnabled() 
    ? user.email 
    : 'test@example.com';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-3 px-1">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {getInitials(displayEmail)}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 truncate">{displayEmail}</div>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full px-3 py-1.5 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
      >
        <SignOutIcon className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}