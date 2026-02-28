// Edited by Claude.
// Action sheet for item actions (Edit, Lend/Return, Delete)
// Includes inline lend form and two-step delete confirmation
// Supports enter/exit fade animations
import { useState, useEffect, useRef } from 'react';
import { Pencil, ArrowRightFromLine, Undo2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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
    'relative bg-background rounded-t-xl transition-all',
    isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
  );

  const transitionStyle = { transitionDuration: `${ANIMATION_DURATION}ms` };

  // Lend form view
  if (mode === 'lend') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <div className={backdropClasses} style={transitionStyle} onClick={handleBack} />
        <div className={sheetClasses} style={transitionStyle}>
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
        {/* Item title header */}
        <div className="px-4 py-3 border-b border-border text-center">
          <p className="font-medium truncate">{item.title}</p>
        </div>

        {/* Actions */}
        <div className="py-2">
          <button
            onClick={() => handleAction('edit')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
          >
            <Pencil className="h-5 w-5 text-muted-foreground" />
            <span>Edit</span>
          </button>

          {isLent ? (
            <button
              onClick={handleReturnClick}
              disabled={isLoading}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Undo2 className="h-5 w-5 text-muted-foreground" />
              )}
              <span>{isLoading ? 'Returning...' : 'Return'}</span>
            </button>
          ) : (
            <button
              onClick={handleLendClick}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
            >
              <ArrowRightFromLine className="h-5 w-5 text-muted-foreground" />
              <span>Lend</span>
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 active:bg-destructive/10 transition-colors text-destructive"
          >
            <Trash2 className="h-5 w-5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

export default ItemActionsSheet;
