// Edited by Claude.
// Pull to refresh component - adapted from react-simple-pull-to-refresh
// Uses transform-based animation for smoother UX
// Supports scrollRef for external scroll control (e.g., scroll to top)
import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Direction constants for scroll detection
const DIRECTION = {
  UP: -1,
  DOWN: 1,
};

// Check if element has scrollable overflow
const isOverflowScrollable = (element) => {
  const overflowType = getComputedStyle(element).overflowY;
  // Document scrolling element with visible overflow is scrollable
  if (element === document.scrollingElement && overflowType === 'visible') {
    return true;
  }
  return overflowType === 'scroll' || overflowType === 'auto';
};

// Check if element is scrollable in a direction
const isScrollable = (element, direction) => {
  if (!isOverflowScrollable(element)) {
    return false;
  }
  if (direction === DIRECTION.DOWN) {
    const bottomScroll = element.scrollTop + element.clientHeight;
    return bottomScroll < element.scrollHeight;
  }
  if (direction === DIRECTION.UP) {
    return element.scrollTop > 0;
  }
  return false;
};

// Check if element or any ancestor is scrollable in direction
const isTreeScrollable = (element, direction) => {
  if (isScrollable(element, direction)) {
    return true;
  }
  if (!element.parentElement) {
    return false;
  }
  return isTreeScrollable(element.parentElement, direction);
};

const PullToRefresh = forwardRef(({
  onRefresh,
  onScroll,
  children,
  className,
  isPullable = true,
  pullDownThreshold = 67,
  maxPullDownDistance = 95,
  resistance = 1,
  backgroundColor,
}, ref) => {
  const containerRef = useRef(null);
  const childrenRef = useRef(null);
  const pullDownRef = useRef(null);

  // Expose scrollToTop method via ref
  useImperativeHandle(ref, () => ({
    scrollToTop: (smooth = true) => {
      childrenRef.current?.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'instant',
      });
    },
    getScrollTop: () => childrenRef.current?.scrollTop || 0,
  }), []);

  // Use refs for mutable state to avoid re-renders during drag
  const stateRef = useRef({
    pullToRefreshThresholdBreached: false,
    isDragging: false,
    startY: 0,
    currentY: 0,
  });

  // Reset container to initial state
  const initContainer = useCallback(() => {
    requestAnimationFrame(() => {
      if (childrenRef.current) {
        childrenRef.current.style.overflowX = 'hidden';
        childrenRef.current.style.overflowY = 'auto';
        childrenRef.current.style.transform = 'unset';
      }
      if (pullDownRef.current) {
        pullDownRef.current.style.opacity = '0';
      }
      if (containerRef.current) {
        containerRef.current.classList.remove('ptr--pull-down-threshold-breached');
        containerRef.current.classList.remove('ptr--dragging');
      }
      stateRef.current.pullToRefreshThresholdBreached = false;
    });
  }, []);

  const onTouchStart = useCallback((e) => {
    const state = stateRef.current;
    state.isDragging = false;

    // Get start position (mouse or touch)
    if (e instanceof MouseEvent) {
      state.startY = e.pageY;
    } else if (window.TouchEvent && e instanceof TouchEvent) {
      state.startY = e.touches[0].pageY;
    }
    state.currentY = state.startY;

    // Check if a nested element can be scrolled up (prevents pull when scrolling)
    if (e.type === 'touchstart' && isTreeScrollable(e.target, DIRECTION.UP)) {
      return;
    }

    // Cancel if content is scrolled down (top not visible)
    if (childrenRef.current?.getBoundingClientRect().top < 0) {
      return;
    }

    state.isDragging = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    const state = stateRef.current;
    if (!state.isDragging) return;

    // Get current position
    if (window.TouchEvent && e instanceof TouchEvent) {
      state.currentY = e.touches[0].pageY;
    } else {
      state.currentY = e.pageY;
    }

    containerRef.current?.classList.add('ptr--dragging');

    // If pulling up, cancel drag
    if (state.currentY < state.startY) {
      state.isDragging = false;
      return;
    }

    // Prevent default scroll behavior
    if (e.cancelable) {
      e.preventDefault();
    }

    const yDistanceMoved = Math.min(
      (state.currentY - state.startY) / resistance,
      maxPullDownDistance
    );

    // Check if threshold breached
    if (yDistanceMoved >= pullDownThreshold) {
      state.isDragging = true;
      state.pullToRefreshThresholdBreached = true;
      containerRef.current?.classList.remove('ptr--dragging');
      containerRef.current?.classList.add('ptr--pull-down-threshold-breached');
    }

    // Stop animation at max distance
    if (yDistanceMoved >= maxPullDownDistance) {
      return;
    }

    // Apply transform and opacity
    if (pullDownRef.current) {
      pullDownRef.current.style.opacity = String(yDistanceMoved / 65);
      pullDownRef.current.style.visibility = 'visible';
    }
    if (childrenRef.current) {
      childrenRef.current.style.overflow = 'visible';
      childrenRef.current.style.transform = `translate(0px, ${yDistanceMoved}px)`;
    }
  }, [resistance, maxPullDownDistance, pullDownThreshold]);

  const onEnd = useCallback(() => {
    const state = stateRef.current;
    state.isDragging = false;
    state.startY = 0;
    state.currentY = 0;

    // Not pulled enough, reset
    if (!state.pullToRefreshThresholdBreached) {
      if (pullDownRef.current) {
        pullDownRef.current.style.visibility = 'hidden';
      }
      initContainer();
      return;
    }

    // Keep at threshold position during refresh
    if (childrenRef.current) {
      childrenRef.current.style.overflow = 'visible';
      childrenRef.current.style.transform = `translate(0px, ${pullDownThreshold}px)`;
    }

    // Trigger refresh
    onRefresh().then(initContainer).catch(initContainer);
  }, [onRefresh, pullDownThreshold, initContainer]);

  // Set up event listeners
  useEffect(() => {
    if (!isPullable || !childrenRef.current) return;

    const childrenEl = childrenRef.current;

    childrenEl.addEventListener('touchstart', onTouchStart, { passive: true });
    childrenEl.addEventListener('mousedown', onTouchStart);
    childrenEl.addEventListener('touchmove', onTouchMove, { passive: false });
    childrenEl.addEventListener('mousemove', onTouchMove);
    childrenEl.addEventListener('touchend', onEnd);
    childrenEl.addEventListener('mouseup', onEnd);
    document.body.addEventListener('mouseleave', onEnd);

    return () => {
      childrenEl.removeEventListener('touchstart', onTouchStart);
      childrenEl.removeEventListener('mousedown', onTouchStart);
      childrenEl.removeEventListener('touchmove', onTouchMove);
      childrenEl.removeEventListener('mousemove', onTouchMove);
      childrenEl.removeEventListener('touchend', onEnd);
      childrenEl.removeEventListener('mouseup', onEnd);
      document.body.removeEventListener('mouseleave', onEnd);
    };
  }, [isPullable, onTouchStart, onTouchMove, onEnd]);

  // Set up scroll listener for onScroll callback
  useEffect(() => {
    if (!onScroll || !childrenRef.current) return;

    const childrenEl = childrenRef.current;
    const handleScroll = () => {
      onScroll(childrenEl.scrollTop);
    };

    childrenEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => childrenEl.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'ptr absolute inset-0 overflow-hidden',
        className
      )}
      style={{ backgroundColor }}
    >
      {/* Pull down indicator - absolutely positioned, revealed via transform */}
      <div
        ref={pullDownRef}
        className="ptr__pull-down absolute left-0 right-0 top-0 overflow-hidden invisible"
        style={{ opacity: 0 }}
      >
        {/* Loader shown during refresh */}
        <div className="ptr__loader ptr__pull-down--loading hidden mx-auto text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        </div>
        {/* Pull indicator shown while dragging */}
        <div className="ptr__pull-down--pull-more hidden mx-auto text-center py-4">
          <Loader2 className="h-6 w-6 text-muted-foreground mx-auto" />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={childrenRef}
        className="ptr__children h-full w-full overflow-y-auto overflow-x-hidden relative transition-transform duration-200 ease-out"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>

      {/* CSS for state-based visibility - using style tag for dynamic classes */}
      <style>{`
        .ptr.ptr--dragging .ptr__pull-down--pull-more {
          display: block;
        }
        .ptr.ptr--dragging.ptr--pull-down-threshold-breached .ptr__pull-down--pull-more {
          display: none;
        }
        .ptr.ptr--pull-down-threshold-breached .ptr__pull-down {
          opacity: 1 !important;
        }
        .ptr.ptr--pull-down-threshold-breached .ptr__pull-down--loading {
          display: block;
        }
        .ptr__pull-down {
          transition: transform 0.2s cubic-bezier(0, 0, 0.31, 1);
        }
      `}</style>
    </div>
  );
});

export default PullToRefresh;
