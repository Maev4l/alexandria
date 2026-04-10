// Edited by Claude.
// About page - displays app information and version
import { useState, useCallback } from 'react';
import { LibraryBig, RefreshCw, Check } from 'lucide-react';
import { AppBar } from '@/navigation';
import { usePWA } from '@/pwa';
import { cn } from '@/lib/utils';

// Build hash injected at build time via vite.config.js
const BUILD_HASH = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';

const About = () => {
  const { needRefresh, checkForUpdate, applyUpdate } = usePWA();
  const [isChecking, setIsChecking] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  const handleCheckUpdate = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    setCheckComplete(false);

    await checkForUpdate();

    // Brief delay to show checking state
    setTimeout(() => {
      setIsChecking(false);
      setCheckComplete(true);
      // Reset check complete after 2s
      setTimeout(() => setCheckComplete(false), 2000);
    }, 500);
  }, [checkForUpdate, isChecking]);

  return (
    <div className="flex flex-col h-full">
      <AppBar title="About" />
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full p-8 space-y-6">
          {/* App icon */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
            <LibraryBig className="h-12 w-12 text-primary" />
          </div>

          {/* App name and version */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Alexandria</h1>
            <p className="text-muted-foreground">Version 1.0.0</p>
            <p className="text-xs text-muted-foreground/70">Build {BUILD_HASH}</p>
          </div>

          {/* Description */}
          <p className="text-center text-sm text-muted-foreground max-w-xs">
            Organize your books and videos, track your lending, and share your collection with friends.
          </p>

          {/* Check for updates button */}
          <div className="pt-4">
            {needRefresh ? (
              <button
                onClick={applyUpdate}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-primary text-primary-foreground font-medium',
                  'hover:bg-primary/90 transition-colors'
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Update available - tap to install
              </button>
            ) : (
              <button
                onClick={handleCheckUpdate}
                disabled={isChecking}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'border border-border bg-muted/50',
                  'hover:bg-muted transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : checkComplete ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Up to date
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Check for updates
                  </>
                )}
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Made with care for collectors
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
