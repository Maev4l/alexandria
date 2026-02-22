// Edited by Claude.
// Libraries tab: displays owned and shared libraries
import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import EmptyBookshelf from '@/components/EmptyBookshelf';
import { useLibraries } from '@/state';
import { AppBar } from '@/navigation';
import LibraryCard from '@/components/LibraryCard';
import PullToRefresh from '@/components/PullToRefresh';
import LibraryActionsSheet from '@/components/LibraryActionsSheet';
import { useToast } from '@/components/Toast';

const Libraries = () => {
  const navigate = useNavigate();
  const { ownedLibraries, sharedLibraries, isLoading, error, hasLoaded, fetchLibraries, deleteLibrary, shareLibrary } = useLibraries();
  const toast = useToast();
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch libraries on mount if not already loaded
  useEffect(() => {
    if (!hasLoaded) {
      fetchLibraries();
    }
  }, [hasLoaded, fetchLibraries]);

  const handleRefresh = useCallback(async () => {
    await fetchLibraries();
  }, [fetchLibraries]);

  const handleLibraryClick = (library) => {
    navigate(`/libraries/${library.id}`);
  };

  const handleLongPress = useCallback((library) => {
    setSelectedLibrary(library);
    setIsActionsOpen(true);
  }, []);

  // Close actions sheet (don't clear selectedLibrary - let sheet keep it during exit animation)
  const handleCloseActions = useCallback(() => {
    setIsActionsOpen(false);
    setIsActionLoading(false);
    // Note: selectedLibrary is intentionally NOT cleared here to allow exit animation
  }, []);

  // Handle action from sheet
  // data parameter contains extra info like { email } for share action
  const handleAction = useCallback(async (action, library, data) => {
    switch (action) {
      case 'edit':
        handleCloseActions();
        navigate(`/libraries/${library.id}/edit`);
        break;
      case 'share':
        setIsActionLoading(true);
        try {
          await shareLibrary(library.id, data.email);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to share library');
          setIsActionLoading(false);
        }
        break;
      case 'unshare':
        handleCloseActions();
        navigate(`/libraries/${library.id}/unshare`);
        break;
      case 'delete':
        setIsActionLoading(true);
        try {
          await deleteLibrary(library.id);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to delete library');
          setIsActionLoading(false);
        }
        break;
      default:
        break;
    }
  }, [navigate, deleteLibrary, shareLibrary, toast, handleCloseActions]);

  // Determine content based on state
  const hasData = ownedLibraries.length > 0 || sharedLibraries.length > 0;

  const renderContent = () => {
    // Initial loading state (no data yet)
    if (isLoading && !hasData) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // Error state (no data)
    if (error && !hasData) {
      return (
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Pull down to retry</p>
          </div>
        </PullToRefresh>
      );
    }

    // Empty state with bookshelf illustration
    if (!hasData) {
      return (
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
            <EmptyBookshelf className="w-32 h-28 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-lg font-medium">No libraries yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first library to start organizing your books.
              </p>
            </div>
          </div>
        </PullToRefresh>
      );
    }

    // Libraries grid
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-6">
          {/* Owned libraries */}
          {ownedLibraries.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                My Libraries
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {ownedLibraries.map((library, idx) => (
                  <LibraryCard
                    key={library.id}
                    library={library}
                    onClick={handleLibraryClick}
                    onLongPress={handleLongPress}
                    index={idx}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Shared libraries */}
          {sharedLibraries.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Shared with me
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {sharedLibraries.map((library, idx) => (
                  <LibraryCard
                    key={library.id}
                    library={library}
                    onClick={handleLibraryClick}
                    index={ownedLibraries.length + idx}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </PullToRefresh>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AppBar
        title="My Libraries"
        headerRight={
          <button
            onClick={() => navigate('/libraries/new')}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
            aria-label="Add library"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="relative flex-1 min-h-0">
        {renderContent()}
      </div>
      <LibraryActionsSheet
        library={selectedLibrary}
        isOpen={isActionsOpen}
        onClose={handleCloseActions}
        onAction={handleAction}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default Libraries;
