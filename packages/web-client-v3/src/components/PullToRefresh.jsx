import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const THRESHOLD_PX = 64;
// The sheet of paper does not slide freely under the finger.
const RESISTANCE = 0.4;

// Transform-based so the browser never repaints the list while the reader pulls. The ref is
// forwarded to the scrolling element, because tapping the header title scrolls it to top.
const PullToRefresh = forwardRef(({ onRefresh, className, children }, ref) => {
  const [offset, setOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const start = useRef(null);
  const scroller = useRef(null);

  useImperativeHandle(ref, () => scroller.current, []);

  const onPointerDown = (event) => {
    if (scroller.current?.scrollTop > 0) return;
    start.current = event.clientY;
  };

  const onPointerMove = (event) => {
    if (start.current === null) return;
    const delta = event.clientY - start.current;
    if (delta <= 0) return;
    setOffset(Math.min(delta * RESISTANCE, THRESHOLD_PX * 1.5));
  };

  const onPointerUp = async () => {
    const shouldRefresh = offset >= THRESHOLD_PX;
    start.current = null;
    setOffset(0);
    if (!shouldRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      ref={scroller}
      className={cn('overflow-y-auto overscroll-contain', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        style={{ transform: `translateY(${offset}px)` }}
        className="transition-transform duration-[var(--press-fast)] ease-linear"
      >
        {isRefreshing && (
          <p role="status" className="caps p-2 text-center text-[11px] text-ink-soft">
            Refreshing
          </p>
        )}
        {children}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';

export default PullToRefresh;
