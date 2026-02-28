// Edited by Claude.
// Video detail view
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Film, Clock, Calendar, Users, History } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import FadeImage from '@/components/FadeImage';

const VideoDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, isSharedLibrary } = useItemData(libraryId, itemId);

  // Use item from context, or fallback to item passed via location.state (from Search)
  const video = contextItem || location.state?.item;

  if (!video) {
    return (
      <div className="flex flex-col h-full">
        <AppBar title="Video" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Video not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title={video.title}
        headerRight={
          !isSharedLibrary ? (
            <button
              onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/history`)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
              aria-label="View history"
            >
              <History className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto">
        {/* Poster and basic info */}
        <div className="p-4 flex gap-4">
          {video.pictureUrl ? (
            <div className="w-28 h-40 rounded-lg shadow-md flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
              <FadeImage
                src={video.pictureUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                fallback={<Film className="h-10 w-10 text-muted-foreground/50" />}
              />
            </div>
          ) : (
            <div className="w-28 h-40 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Film className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold leading-tight">{video.title}</h1>

            {/* Directors */}
            {video.directors?.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {video.directors.join(', ')}
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {video.releaseYear && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  <Calendar className="h-3 w-3" />
                  {video.releaseYear}
                </div>
              )}
              {video.duration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  {video.duration} min
                </div>
              )}
            </div>

            {/* Lent status */}
            {video.lentTo && (
              <div className="mt-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                {isSharedLibrary ? 'Lent' : `Lent to ${video.lentTo}`}
              </div>
            )}

            {/* Collection info */}
            {video.collectionName && (
              <p className="mt-3 text-xs text-muted-foreground">
                Collection: {video.collectionName}
                {video.order && ` (#${video.order})`}
              </p>
            )}
          </div>
        </div>

        {/* Cast section */}
        {video.cast?.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Cast</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {video.cast.join(', ')}
            </p>
          </div>
        )}

        {/* Summary section */}
        {video.summary && (
          <div className="px-4 py-3 border-t border-border">
            <h2 className="text-sm font-medium mb-2">Summary</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {video.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetail;
