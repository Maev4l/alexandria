// Edited by Claude.
// Display TMDB search results and allow user to select one to add
import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Film, Check } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const VideoDetectionResults = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { createVideo } = useLibraries();
  const toast = useToast();

  // Get data from location state
  const videos = location.state?.videos || [];
  const extractedTitle = location.state?.extractedTitle;
  const searchTitle = location.state?.searchTitle;
  const prefilledCollection = location.state?.collection || null;
  const prefilledOrder = location.state?.order || '';

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // Go back in history to library content
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleCreate = async () => {
    if (isCreating || !videos[selectedIndex]) return;

    setIsCreating(true);
    try {
      const video = videos[selectedIndex];
      await createVideo(libraryId, {
        title: video.title,
        summary: video.summary || '',
        directors: video.directors || [],
        cast: video.cast || [],
        releaseYear: video.releaseYear || null,
        duration: video.duration || null,
        tmdbId: video.tmdbId || null,
        pictureUrl: video.pictureUrl || null,
        collection: prefilledCollection,
        order: prefilledOrder ? parseInt(prefilledOrder, 10) : null,
      });

      toast.success('Video added');
      // Go back 2 steps to library content (skip detection results + add-video)
      navigate(-2);
    } catch (err) {
      console.error('Failed to create video:', err);
      toast.error(err.message || 'Failed to add video');
    } finally {
      setIsCreating(false);
    }
  };

  // Can add when a video is selected and not currently creating
  const canAdd = selectedIndex !== null && videos[selectedIndex] && !isCreating;

  // Render AppBar with Cancel and Add buttons
  const renderAppBar = () => (
    <AppBar
      title="Select Video"
      headerLeft={
        <button
          onClick={handleBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      }
      headerRight={
        <button
          onClick={handleCreate}
          disabled={!canAdd}
          className={cn(
            'text-sm font-medium',
            canAdd ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {isCreating ? 'Adding...' : 'Add'}
        </button>
      }
    />
  );

  // Guard: no videos provided
  if (videos.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {renderAppBar()}
        <div className="flex flex-col flex-1 items-center justify-center p-4 text-center">
          <Film className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try searching with a different title
          </p>
          <button
            onClick={handleBack}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {renderAppBar()}
      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {videos.map((video, index) => (
            <button
              key={video.id || index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'w-full flex gap-3 p-3 rounded-xl border-2 transition-all text-left',
                selectedIndex === index
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              {/* Poster */}
              {video.pictureUrl ? (
                <img
                  src={video.pictureUrl}
                  alt={video.title}
                  className="w-16 h-24 object-cover rounded-md flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-24 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                  <Film className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium line-clamp-2">{video.title}</p>
                  {selectedIndex === index && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-1 text-sm text-muted-foreground">
                  {video.releaseYear && <span>{video.releaseYear}</span>}
                  {video.directors?.length > 0 && (
                    <span> · {video.directors[0]}</span>
                  )}
                  {video.duration && <span> · {video.duration} min</span>}
                </div>

                {/* Summary preview */}
                {video.summary && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {video.summary}
                  </p>
                )}

                {/* Source badge */}
                <p className="mt-2 text-xs text-muted-foreground/70">
                  Source: {video.source}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoDetectionResults;
