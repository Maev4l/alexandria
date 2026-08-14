import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

// The threshold is FINGER TRAVEL; the damping is visual. They are different quantities, and
// conflating them is what made this gesture dead: with the trigger written against the damped
// offset, 0.4 resistance silently multiplied the travel required by 2.5, so an ordinary 80px
// pull produced an offset of 32 against a threshold of 64 and did nothing at all.
const THRESHOLD_PX = 72;
// Visual only. The sheet of paper does not slide freely under the finger — but resistance must
// never divide the trigger.
const RESISTANCE = 0.4;
const MAX_OFFSET_PX = 96;

// Transform-based so the browser never repaints the list while the reader pulls. The ref is
// forwarded to the scrolling element, because tapping the header title scrolls it to top.
const PullToRefresh = forwardRef(({ onRefresh, className, children }, ref) => {
  const [offset, setOffset] = useState(0);
  const [isArmed, setIsArmed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scroller = useRef(null);
  const start = useRef(null);
  const armed = useRef(false);
  const busy = useRef(false);

  useImperativeHandle(ref, () => scroller.current, []);

  const begin = useCallback((y) => {
    if (busy.current || (scroller.current?.scrollTop ?? 0) > 0) {
      start.current = null;
      return;
    }
    start.current = y;
    armed.current = false;
  }, []);

  // Returns whether the pull owns the gesture, which the touch handler needs in order to
  // decide about preventDefault.
  const move = useCallback((y) => {
    if (start.current === null) return false;
    const travel = y - start.current;
    if (travel <= 0) {
      setOffset(0);
      setIsArmed(false);
      armed.current = false;
      return false;
    }
    setOffset(Math.min(travel * RESISTANCE, MAX_OFFSET_PX));
    // Compared against TRAVEL, never against the damped offset.
    armed.current = travel >= THRESHOLD_PX;
    setIsArmed(armed.current);
    return true;
  }, []);

  const end = useCallback(async () => {
    const shouldRefresh = armed.current;
    start.current = null;
    armed.current = false;
    setOffset(0);
    setIsArmed(false);
    if (!shouldRefresh || busy.current) return;
    busy.current = true;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      busy.current = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // Touch uses native listeners rather than React props, because touchmove must be
  // NON-PASSIVE. Without preventDefault the browser claims the vertical gesture at scrollTop 0
  // and fires pointercancel after one or two moves — verified under touch emulation, where even
  // a 200px pull produced no request because move events simply stopped arriving. Fixing the
  // threshold alone would have left every phone dead while looking fixed on a desktop.
  useEffect(() => {
    const node = scroller.current;
    if (!node) return undefined;

    const onTouchStart = (event) => begin(event.touches[0].clientY);
    const onTouchMove = (event) => {
      const owned = move(event.touches[0].clientY);
      // Claim the gesture only while actually pulling down from the top; everywhere else
      // native scrolling must continue to work untouched.
      if (owned && event.cancelable) event.preventDefault();
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', end);
    node.addEventListener('touchcancel', end);
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', end);
    };
  }, [begin, move, end]);

  // Mouse only: touch is handled above, and letting both paths run would double-count a pull.
  const ifMouse = (handler) => (event) => {
    if (event.pointerType === 'mouse') handler(event.clientY);
  };

  return (
    <div
      ref={scroller}
      // A stable hook for scripts/profile-stream.mjs, which has to address the scrolling
      // element directly to measure frame times and scroll drift.
      data-stream-scroller=""
      className={cn('overflow-y-auto overscroll-contain', className)}
      onPointerDown={ifMouse(begin)}
      onPointerMove={ifMouse(move)}
      onPointerUp={ifMouse(() => end())}
      onPointerCancel={ifMouse(() => end())}
    >
      <div
        style={{ transform: `translateY(${offset}px)` }}
        className="transition-transform duration-[var(--press-fast)] ease-linear"
      >
        {/* Three states, so a reader can learn how far to pull. Before the threshold the paper
            moving is the whole signal and there is nothing to say yet; past it, the gesture
            says it will fire; after release, that it is working. */}
        {(isArmed || isRefreshing) && (
          <p
            role="status"
            data-ptr-status={isRefreshing ? 'refreshing' : 'armed'}
            className="caps p-2 text-center text-[11px] font-bold text-ink-soft"
          >
            {isRefreshing ? 'Refreshing' : 'Release to refresh'}
          </p>
        )}
        {children}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';

export default PullToRefresh;
