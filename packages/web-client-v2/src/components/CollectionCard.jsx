// Edited by Claude.
// Collapsible card for displaying a collection of books
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import BookCard from './BookCard';

const STAGGER_DELAY = 50; // ms per item for staggered animation

const CollectionCard = ({ name, items, onItemClick, onItemLongPress, isSharedLibrary = false, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const itemCount = items.length;

  // Staggered animation style
  const animationStyle = index != null
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  return (
    <div
      style={animationStyle}
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        'shadow-[var(--card-shadow)] transition-shadow duration-200',
        isExpanded && 'ring-1 ring-accent shadow-[var(--card-shadow-hover)]',
        // Staggered fade-in animation
        index != null && 'animate-fade-in-up'
      )}
    >
      {/* Collection header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 p-3 text-left transition-colors',
          'hover:bg-accent/50 active:bg-accent'
        )}
      >
        {/* Expand/collapse icon */}
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>

        {/* Collection info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="font-medium truncate">{name}</p>
          <p className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'book' : 'books'}
          </p>
        </div>
      </button>

      {/* Expanded content - nested items */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/20 p-2 space-y-1">
          {items.map((item) => (
            <BookCard
              key={item.id}
              book={item}
              onClick={onItemClick}
              onLongPress={onItemLongPress}
              showOrder
              compact
              isSharedLibrary={isSharedLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionCard;
