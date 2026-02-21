// Edited by Claude.
// Page for unsharing a library - shows list of users it's shared with
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, User } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useLibraryData } from '@/hooks';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const UnshareLibrary = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { unshareLibrary } = useLibraries();
  const { library } = useLibraryData(libraryId);
  const toast = useToast();

  const sharedUsers = library?.sharedTo || [];

  // Track which users are selected for removal
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSelection = selectedUsers.size > 0;

  const toggleUser = (userName) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userName)) {
        next.delete(userName);
      } else {
        next.add(userName);
      }
      return next;
    });
  };

  const handleUnshare = useCallback(async () => {
    if (!hasSelection || isSubmitting || !library) return;

    setIsSubmitting(true);
    try {
      // Unshare from all selected users in a single API call
      await unshareLibrary(library.id, Array.from(selectedUsers));
      navigate(-1);
    } catch (err) {
      toast.error(err.message || 'Failed to unshare library');
    } finally {
      setIsSubmitting(false);
    }
  }, [hasSelection, isSubmitting, library, selectedUsers, unshareLibrary, navigate, toast]);

  const renderContent = () => {
    if (!library) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Library not found</p>
        </div>
      );
    }

    if (sharedUsers.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">This library is not shared with anyone</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select users to remove their access to this library.
          </p>

          <div className="space-y-2">
            {sharedUsers.map((userName) => {
              const isSelected = selectedUsers.has(userName);
              return (
                <button
                  key={userName}
                  onClick={() => toggleUser(userName)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-left truncate">{userName}</span>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title={library?.name || 'Unshare Library'}
        headerLeft={
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        }
        headerRight={
          <button
            onClick={handleUnshare}
            disabled={!hasSelection || isSubmitting}
            className={`text-sm font-medium ${
              hasSelection && !isSubmitting ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {isSubmitting ? 'Removing...' : 'Done'}
          </button>
        }
      />
      {renderContent()}
    </div>
  );
};

export default UnshareLibrary;
