import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ChevronLeft, Search } from '@/components/icons';

// The header carries three things and never a tab bar: identity or a way back, the pinned
// search field, and one right-hand plate whose contents change per screen — account initials
// on the root, add inside an owned library, search on the cover.
//
// The cover drops the pinned field because there the reader is looking at one thing, and a
// search field would be chrome competing with the volume they came to read.
const AppHeader = ({
  wordmark = false,
  title,
  onBack,
  onTitleTap,
  right,
  search = true,
  inverted = false,
}) => (
  <header
    className={cn(
      'pad-top-safe border-b-2 px-4 pb-2',
      inverted ? 'border-paper bg-ink text-paper' : 'border-ink bg-paper text-ink',
    )}
  >
    <div className="flex min-h-12 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={cn(
              '-ml-3 flex size-12 shrink-0 items-center justify-center',
              inverted ? 'text-imprint' : 'text-ink-soft',
            )}
          >
            <ChevronLeft />
          </button>
        )}
        {wordmark && <span className="caps truncate text-xs font-extrabold tracking-[0.2em]">Alexandria</span>}
        {title && (
          // Content title: never uppercased, because it may be a long French name.
          <button
            type="button"
            onClick={onTitleTap}
            className="truncate text-left text-xl font-extrabold leading-tight"
          >
            {title}
          </button>
        )}
      </div>
      {right}
    </div>

    {search && !inverted && (
      <Link
        to="/search"
        className="mt-3 flex min-h-12 items-center justify-between border-2 border-ink bg-paper-deep p-2 text-[13px] text-ink-soft"
      >
        <span>Search every library</span>
        <Search size={16} />
      </Link>
    )}
  </header>
);

export default AppHeader;
