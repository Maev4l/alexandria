// Edited by Claude.
// AppBar: sticky header with centered title, back button slot, and right slot
// Tapping title scrolls content to top (if screen has registered a scroll handler)
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigation } from './NavigationContext';

const AppBar = ({ title, subtitle, headerLeft, headerRight, showBackButton = 'auto', className }) => {
  const { canGoBack, goBack, triggerScrollToTop } = useNavigation();

  // Determine if back button should show: 'auto' uses canGoBack, or explicit boolean
  const shouldShowBack = showBackButton === 'auto' ? canGoBack : showBackButton;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border bg-background',
        subtitle ? 'h-16' : 'h-14',
        className
      )}
    >
      <div className="flex h-full items-center px-4">
        {/* Left slot: back button or custom content */}
        <div className="flex w-12 justify-start">
          {headerLeft ?? (
            shouldShowBack && (
              <button
                onClick={goBack}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )
          )}
        </div>

        {/* Center: title + optional subtitle (tap to scroll to top) */}
        <button
          type="button"
          onClick={triggerScrollToTop}
          className="flex-1 flex flex-col items-center justify-center bg-transparent border-none cursor-pointer active:opacity-70"
          aria-label="Scroll to top"
        >
          <span className="text-lg font-semibold truncate max-w-full">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground truncate max-w-full">{subtitle}</span>
          )}
        </button>

        {/* Right slot: reserved for future actions */}
        <div className="flex w-12 justify-end">
          {headerRight}
        </div>
      </div>
    </header>
  );
};

export default AppBar;
