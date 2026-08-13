import { useCallback, useRef } from 'react';

// Long-press is always duplicated by a visible affordance; on its own it is undiscoverable.
// 500ms, cancelled by movement so a scroll never opens a sheet.
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;

const useLongPress = (onLongPress) => {
  const timer = useRef(null);
  const origin = useRef(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  if (!onLongPress) return {};

  return {
    onPointerDown: (event) => {
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event) => {
      if (!origin.current) return;
      const moved =
        Math.abs(event.clientX - origin.current.x) > MOVE_TOLERANCE_PX ||
        Math.abs(event.clientY - origin.current.y) > MOVE_TOLERANCE_PX;
      if (moved) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onClick: (event) => {
      // Swallow the click the long press produced, so the reader is not navigated somewhere
      // they did not ask to go the moment the sheet opens.
      if (fired.current) {
        event.preventDefault();
        fired.current = false;
      }
    },
    onContextMenu: (event) => event.preventDefault(),
  };
};

export default useLongPress;
