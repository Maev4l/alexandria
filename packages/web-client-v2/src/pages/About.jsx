// Edited by Claude.
// About page - displays app information and version
import { useEffect } from 'react';
import { LibraryBig } from 'lucide-react';
import { useNavigation } from '@/navigation';

// Build hash injected at build time via vite.config.js
const BUILD_HASH = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';

const About = () => {
  const { setOptions } = useNavigation();

  // Clear header right button (prevent stale buttons from previous screens)
  useEffect(() => {
    setOptions({ headerRight: null });
  }, [setOptions]);

  return (
    <div className="absolute inset-0 overflow-y-auto">
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
          Manage your personal libraries, organize your books, and share your collection with friends.
        </p>

        {/* Footer */}
        <div className="pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Made with care for book lovers
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
