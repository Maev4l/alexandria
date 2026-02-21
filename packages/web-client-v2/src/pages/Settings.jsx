// Edited by Claude.
// Settings tab: account info, about, and sign out
import { useNavigate } from 'react-router-dom';
import { User, Info, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/navigation';

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <AppBar title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {/* Account section */}
          <button
            type="button"
            onClick={() => navigate('/settings/account')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 active:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Account</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* About section */}
          <button
            type="button"
            onClick={() => navigate('/settings/about')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 active:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">About</p>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Sign out section */}
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 active:bg-accent transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive">Sign out</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
