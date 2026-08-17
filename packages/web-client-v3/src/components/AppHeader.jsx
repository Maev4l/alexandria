import { Link } from 'react-router-dom';
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
        {wordmark && (onBack ? (
          // A screen that already has a back control is not depending on the wordmark as its
          // only exit, so it stays inert text here — matching the pre-existing look on the one
          // screen type where the two are expected to coexist (the still-unbuilt stubs this fix
          // also touches).
          <span className="caps truncate text-xs font-extrabold tracking-[0.2em]">Alexandria</span>
        ) : (
          // With no `onBack`, the wordmark is the ONLY thing in this corner of the header — on
          // the libraries root today, and on any future screen reached in this configuration.
          // A `<span>` here is a standing trap: it looks identical to a real mark but does
          // nothing on tap, in an app installed as a standalone PWA with no browser chrome and
          // no back gesture to fall back on (see the critique this fixes). Linking it home is
          // the fix at the level of the shared component, not the seven call sites: every future
          // `wordmark`-only header gets an exit for free. The 48px-floor reasoning is the same as
          // the title button below — it is a real tap now, so it claims its own min-h-12 rather
          // than borrowing the row's.
          <Link
            to="/libraries"
            className="caps flex min-h-12 min-w-0 items-center truncate text-xs font-extrabold tracking-[0.2em]"
          >
            Alexandria
          </Link>
        ))}
        {title && (onTitleTap ? (
          // 48px floor (P1 #4): the text alone only stood 25px tall, sitting inside 48px of
          // space that the header row already reserves (every title screen also carries a
          // back button, which is already size-12 — but the row's own min-h-12 guarantees the
          // floor even on the rare screen that doesn't). Rather than lean on that coincidence,
          // the button claims its own min-h-12 directly, so it is 48px on its own terms. The
          // truncating text moves to an inner span: once the button itself is a flex box, a
          // flex item's default min-width:auto would otherwise block the shrink `truncate`
          // needs (min-w-0 here breaks that), and `truncate` needs a block-level box to
          // establish overflow/ellipsis rather than a `<button>`'s implied inline content.
          <button
            type="button"
            onClick={onTitleTap}
            className="flex min-h-12 min-w-0 items-center text-left"
          >
            <span className="block min-w-0 truncate text-xl font-extrabold leading-tight">
              {title}
            </span>
          </button>
        ) : (
          // No `onTitleTap` means there is nothing to activate: a `<button>` here announced
          // "Fiction, button" and did nothing on tap, an interactive role with no behaviour.
          // Plain text keeps the truncation without claiming a touch target it doesn't need —
          // there is no gesture to reserve 48px of height for.
          <span className="block min-w-0 truncate text-xl font-extrabold leading-tight">
            {title}
          </span>
        ))}
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
