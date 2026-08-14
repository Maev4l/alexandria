import { cn } from '@/lib/cn';
import { bookPlateLine, filmPlateLine } from '@/lib/format';

const FILM = 1;

// The line's position never changes; only which fields fill it.
const PlateLine = ({ item, className }) => {
  const text = item.type === FILM ? filmPlateLine(item) : bookPlateLine(item);
  if (!text) return null;
  return (
    <span className={cn('num mt-[3px] block text-[11px] text-ink-soft', className)}>{text}</span>
  );
};

export default PlateLine;
