import { cn } from '@/lib/cn';
import { ChevronLeft } from '@/components/icons';
import SearchField from '@/components/imprint/SearchField.jsx';

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

    {/* Only the root pins the field. Inside a library, the loudest mark on screen would be a
        control promising to search EVERY library — the fastest affordance taking the reader out
        of what they came to browse. Scoping it was the obvious repair and the wrong one: the API
        has no scoped search, so scoping means filtering a global response, which HIDES matches
        elsewhere and then needs a second control to un-hide them. Global search already prints
        each result's library, so nothing is lost by leaving browse without a field. */}
    {search && !inverted && <SearchField />}
  </header>
);

export default AppHeader;
