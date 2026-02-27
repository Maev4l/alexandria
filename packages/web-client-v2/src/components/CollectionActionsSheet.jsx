// Edited by Claude.
// Bottom sheet for collection actions: Add book, Add video, Delete
// Includes two-step delete confirmation
import { useState, useEffect, useRef } from 'react';
import { BookOpen, Film, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANIMATION_DURATION = 200; // ms

const CollectionActionsSheet = ({
  isOpen,
  onClose,
  collectionName,
  onAddBook,
  onAddVideo,
  onDelete,
  isLoading = false,
}) => {
  // Track current view mode: 'actions' | 'delete'
  const [mode, setMode] = useState('actions');

  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Cache collection name when sheet opens (so we have data during exit animation)
  const cachedNameRef = useRef(null);
  if (isOpen && collectionName) {
    cachedNameRef.current = collectionName;
  }

  // Use cached name for display
  const displayName = cachedNameRef.current;

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else if (isVisible) {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Reset state after close animation
        setMode('actions');
        cachedNameRef.current = null;
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  // Don't render until visible
  if (!isVisible || !displayName) return null;

  const handleAddBook = () => {
    onClose();
    onAddBook?.();
  };

  const handleAddVideo = () => {
    onClose();
    onAddVideo?.();
  };

  const handleDeleteClick = () => {
    setMode('delete');
  };

  const handleConfirmDelete = () => {
    onDelete?.();
    onClose();
  };

  const handleBack = () => {
    if (!isLoading) {
      setMode('actions');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Shared animation classes
  const backdropClasses = cn(
    'absolute inset-0 bg-black/50 transition-opacity',
    isAnimating ? 'opacity-100' : 'opacity-0'
  );

  const sheetClasses = cn(
    'relative bg-background rounded-t-xl transition-all',
    isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  );

  const transitionStyle = { transitionDuration: `${ANIMATION_DURATION}ms` };

  // Delete confirmation view
  if (mode === 'delete') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <div className={backdropClasses} style={transitionStyle} onClick={handleBack} />
        <div className={sheetClasses} style={transitionStyle}>
          {/* Warning content */}
          <div className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Delete Collection?</h3>
              <p className="text-sm text-muted-foreground">
                This will delete <span className="font-medium text-foreground">{displayName}</span>. Items in this collection will not be deleted.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 pt-0 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-2">
            <button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-lg bg-destructive text-destructive-foreground font-medium',
                'hover:bg-destructive/90 transition-colors disabled:opacity-50',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default actions view
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className={backdropClasses} style={transitionStyle} onClick={handleClose} />
      <div className={sheetClasses} style={transitionStyle}>
        {/* Collection name header */}
        <div className="px-4 py-3 border-b border-border text-center">
          <p className="font-medium truncate">{displayName}</p>
        </div>

        {/* Actions */}
        <div className="py-2">
          <button
            onClick={handleAddBook}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
          >
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span>Add a book</span>
          </button>

          <button
            onClick={handleAddVideo}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
          >
            <Film className="h-5 w-5 text-muted-foreground" />
            <span>Add a video</span>
          </button>

          <button
            onClick={handleDeleteClick}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 active:bg-destructive/10 transition-colors text-destructive"
          >
            <Trash2 className="h-5 w-5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Cancel button */}
        <div className="p-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectionActionsSheet;
