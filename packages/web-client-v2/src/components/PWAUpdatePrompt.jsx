// Prompts user when a new PWA version is available
import { RefreshCw } from 'lucide-react';
import { usePWA } from '@/pwa';
import { cn } from '@/lib/utils';

const PWAUpdatePrompt = () => {
  const { needRefresh, applyUpdate } = usePWA();

  if (!needRefresh) return null;

  return (
    // Entire banner is tappable for better mobile UX
    <button
      onClick={applyUpdate}
      className={cn(
        'fixed left-4 right-4 z-[100]',
        // Account for safe area on notched devices
        'top-[max(1rem,env(safe-area-inset-top))]',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'bg-primary text-primary-foreground',
        'animate-in slide-in-from-top-4 fade-in duration-300',
        'cursor-pointer active:opacity-90'
      )}
      role="alert"
      aria-label="New version available. Tap to update."
    >
      <RefreshCw className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium text-left">New version available</p>
      <span className="shrink-0 px-3 py-1 text-sm font-medium bg-white/20 rounded-md">
        Update
      </span>
    </button>
  );
};

export default PWAUpdatePrompt;
