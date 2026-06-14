// Edited by Claude.
// Action sheet for item actions (Edit, Lend/Return, Delete)
// Includes inline lend form and two-step delete confirmation
// Supports enter/exit fade animations
import { useState, useEffect, useRef } from 'react';
import { PencilLine, BookUp, BookDown, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANIMATION_DURATION = 250; // ms

const ItemActionsSheet = ({ item, isOpen, onClose, onAction, isLoading = false }) => {
  // Track current view mode: 'actions' | 'lend' | 'delete'
  const [mode, setMode] = useState('actions');
  const [personName, setPersonName] = useState('');
  const inputRef = useRef(null);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Cache item when sheet opens (so we have data during exit animation)
  const cachedItemRef = useRef(null);
  if (isOpen && item) {
    cachedItemRef.current = item;
  }

  // Use cached item for display (survives parent clearing the prop)
  const displayItem = cachedItemRef.current;

  // Check if item is currently lent out
  const isLent = !!displayItem?.lentTo;

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
        setPersonName('');
        cachedItemRef.current = null;
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Focus input when entering lend mode
  useEffect(() => {
    if (mode === 'lend' && inputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

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

  // Don't render until visible, or if no item data available
  if (!isVisible || !displayItem) return null;

  const handleAction = (action, data) => {
    onAction?.(action, displayItem, data);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleLendClick = () => {
    setMode('lend');
  };

  const handleLendSubmit = (e) => {
    e.preventDefault();
    const trimmedName = personName.trim();
    if (!trimmedName || isLoading) return;
    handleAction('lend', { personName: trimmedName });
  };

  const handleReturnClick = () => {
    handleAction('return');
  };

  const handleDeleteClick = () => {
    setMode('delete');
  };

  const handleBack = () => {
    if (!isLoading) {
      setMode('actions');
      setPersonName('');
    }
  };

  // Shared animation classes
  const backdropClasses = cn(
    'absolute inset-0 bg-black/50 transition-opacity',
    isAnimating ? 'opacity-100' : 'opacity-0'
  );

  const sheetClasses = cn(
    'relative bg-card rounded-t-2xl transition-all border-t border-border',
    isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
  );

  const transitionStyle = { transitionDuration: `${ANIMATION_DURATION}ms` };

  // Lend form view
  if (mode === 'lend') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <div className={backdropClasses} style={transitionStyle} onClick={handleBack} />
        <div className={sheetClasses} style={transitionStyle}>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-4 py-3 border-b border-border text-center">
            <p className="text-sm text-muted-foreground">Lending</p>
            <p className="font-medium truncate">{displayItem.title}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLendSubmit} className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="personName" className="text-sm font-medium">
                Borrower's name
              </label>
              <input
                ref={inputRef}
                id="personName"
                type="text"
                placeholder="Enter name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                maxLength={50}
                disabled={isLoading}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-input bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            <div className="pb-[env(safe-area-inset-bottom)]">
              <button
                type="submit"
                disabled={!personName.trim() || isLoading}
                className={cn(
                  'w-full py-3 rounded-lg font-medium transition-colors',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Lending...
                  </>
                ) : (
                  'Lend'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Delete confirmation view
  if (mode === 'delete') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <div className={backdropClasses} style={transitionStyle} onClick={handleBack} />
        <div className={sheetClasses} style={transitionStyle}>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Warning content */}
          <div className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Delete Item?</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <span className="font-medium text-foreground truncate">{item.title}</span>. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 pt-0 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-2">
            <button
              onClick={() => handleAction('delete')}
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
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Item title header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="min-w-[60px]" />
          <h2 className="text-base font-semibold truncate">{displayItem.title}</h2>
          <div className="min-w-[60px]" />
        </div>

        {/* Actions - prominent style */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => handleAction('edit')}
            className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <PencilLine className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Edit</p>
              <p className="text-sm text-muted-foreground">Change details</p>
            </div>
          </button>

          {isLent ? (
            <button
              onClick={handleReturnClick}
              disabled={isLoading}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <BookDown className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">{isLoading ? 'Returning...' : 'Return'}</p>
                <p className="text-sm text-muted-foreground">Mark as returned</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleLendClick}
              className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Lend</p>
                <p className="text-sm text-muted-foreground">Track who borrowed it</p>
              </div>
            </button>
          )}

          {/* Delete - compact style, separated */}
          <div className="pt-2 border-t border-border">
            <button
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 active:bg-destructive/10 transition-colors text-destructive"
            >
              <Trash2 className="h-5 w-5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default ItemActionsSheet;
