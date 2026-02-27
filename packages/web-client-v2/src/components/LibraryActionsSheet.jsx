// Edited by Claude.
// Action sheet for library actions (Edit, Share, Unshare, Delete)
// Includes inline share form and two-step delete confirmation
// Supports enter/exit fade animations
import { useState, useEffect, useRef } from 'react';
import { Pencil, Share2, UserMinus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANIMATION_DURATION = 200; // ms

const LibraryActionsSheet = ({ library, isOpen, onClose, onAction, isLoading = false }) => {
  // Track current view mode: 'actions' | 'share' | 'delete'
  const [mode, setMode] = useState('actions');
  const [email, setEmail] = useState('');
  const inputRef = useRef(null);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Cache library when sheet opens (so we have data during exit animation)
  const cachedLibraryRef = useRef(null);
  if (isOpen && library) {
    cachedLibraryRef.current = library;
  }

  // Use cached library for display (survives parent clearing the prop)
  const displayLibrary = cachedLibraryRef.current;

  const isShared = displayLibrary?.sharedTo?.length > 0;

  // Basic email validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
        setEmail('');
        cachedLibraryRef.current = null;
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Focus input when entering share mode
  useEffect(() => {
    if (mode === 'share' && inputRef.current) {
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

  // Don't render until visible, or if no library data available
  if (!isVisible || !displayLibrary) return null;

  const handleAction = (action, data) => {
    onAction?.(action, displayLibrary, data);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleShareClick = () => {
    setMode('share');
  };

  const handleShareSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail || isLoading) return;
    handleAction('share', { email: email.trim() });
  };

  const handleDeleteClick = () => {
    setMode('delete');
  };

  const handleBack = () => {
    if (!isLoading) {
      setMode('actions');
      setEmail('');
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

  // Share form view
  if (mode === 'share') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        <div className={backdropClasses} style={transitionStyle} onClick={handleBack} />
        <div className={sheetClasses} style={transitionStyle}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-border text-center">
            <p className="text-sm text-muted-foreground">Share</p>
            <p className="font-medium truncate">{displayLibrary.name}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleShareSubmit} className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="shareEmail" className="text-sm font-medium">
                User email
              </label>
              <input
                ref={inputRef}
                id="shareEmail"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-input bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <p className="text-xs text-muted-foreground">
                They will have read-only access.
              </p>
            </div>

            <div className="space-y-2 pb-[env(safe-area-inset-bottom)]">
              <button
                type="submit"
                disabled={!isValidEmail || isLoading}
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
                    Sharing...
                  </>
                ) : (
                  'Share'
                )}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Back
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
              <h3 className="text-lg font-semibold">Delete Library?</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <span className="font-medium text-foreground">{displayLibrary.name}</span> and all its books. This action cannot be undone.
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
        {/* Library name header */}
        <div className="px-4 py-3 border-b border-border text-center">
          <p className="font-medium truncate">{displayLibrary.name}</p>
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

          <button
            onClick={handleShareClick}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
          >
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <span>Share</span>
          </button>

          {isShared && (
            <button
              onClick={() => handleAction('unshare')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
            >
              <UserMinus className="h-5 w-5 text-muted-foreground" />
              <span>Unshare</span>
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

export default LibraryActionsSheet;
