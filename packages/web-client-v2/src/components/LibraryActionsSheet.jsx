// Edited by Claude.
// Action sheet for library actions (Edit, Share, Unshare, Delete)
// Includes two-step delete confirmation
import { useState, useEffect } from 'react';
import { Pencil, Share2, UserMinus, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const LibraryActionsSheet = ({ library, isOpen, onClose, onAction }) => {
  // Track whether we're showing the delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isShared = library?.sharedTo?.length > 0;

  // Reset confirmation state when sheet closes or library changes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!library || !isOpen) return null;

  const handleAction = (action) => {
    onClose();
    onAction?.(action, library);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    handleAction('delete');
  };

  // Delete confirmation view
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={handleCancelDelete}
        />

        {/* Confirmation sheet */}
        <div className="relative bg-background rounded-t-xl">
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
                This will permanently delete <span className="font-medium text-foreground">{library.name}</span> and all its books. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 pt-0 space-y-2">
            <button
              onClick={handleConfirmDelete}
              className="w-full py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={handleCancelDelete}
              className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'relative bg-background rounded-t-xl',
          'animate-in slide-in-from-bottom duration-300'
        )}
      >
        {/* Library name header */}
        <div className="px-4 py-3 border-b border-border text-center">
          <p className="font-medium truncate">{library.name}</p>
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
            onClick={() => handleAction('share')}
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
        <div className="p-4 pt-2 border-t border-border">
          <button
            onClick={onClose}
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
