// Edited by Claude.
// Video detail — "reading table": poster standing on a lit walnut ledge against linen,
// with a restrained linen-washed halo. No reflection, no saturated band.
import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Film, Clock, Calendar, Stamp } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import FadeImage from '@/components/FadeImage';
import { useExtractedColor, createCoverHalo } from '@/lib/colorExtractor';

const VideoDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, isSharedLibrary } = useItemData(libraryId, itemId);

  const video = contextItem || location.state?.item;

  const cloudFrontUrl = video?.picture
    ? `${video.picture}?v=${video.updatedAt ? new Date(video.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const isLent = !!video?.lentTo;

  const { color } = useExtractedColor(cloudFrontUrl);
  const haloStyle = useMemo(() => ({ background: createCoverHalo(color), opacity: color ? 0.22 : 0 }), [color]);

  if (!video) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <AppBar title="Video" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Video not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AppBar
        title={video.title}
        headerRight={
          !isSharedLibrary ? (
            <button
              onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/history`)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              aria-label="View history"
            >
              <Stamp className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none" style={haloStyle} />

        <div className="absolute inset-0 overflow-y-auto">
          <div className="relative pt-8 px-6 flex flex-col items-center">
            <div className="w-44 h-64 rounded-[6px_6px_3px_3px] bg-muted flex items-center justify-center overflow-hidden shadow-[var(--shelf-shadow)] animate-cover-settle">
              {hasImage ? (
                <FadeImage src={cloudFrontUrl} alt={video.title} className="w-full h-full object-cover"
                  fallback={<Film className="h-14 w-14 text-muted-foreground/50" />} />
              ) : (
                <Film className="h-14 w-14 text-muted-foreground/50" />
              )}
            </div>
            <div className="shelf-ledge mt-0 h-2.5 w-56 max-w-full rounded-[1px]" />

            {/* Date-due slip tucked at the cover's lower edge */}
            {isLent && (
              <div className="lent-duecard -mt-1 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                <div className="ephemera-caps text-[11px]">Lent</div>
                {!isSharedLibrary && (
                  <div className="mt-0.5 font-serif italic text-[14px]" style={{ color: '#946022' }}>to {video.lentTo}</div>
                )}
              </div>
            )}

            <div className="text-center mt-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <h1 className="font-sans text-2xl font-bold text-foreground">{video.title}</h1>
              {video.directors?.length > 0 && (
                <p className="font-serif italic text-lg text-muted-foreground mt-1">dir. {video.directors.join(', ')}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {video.releaseYear && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <Calendar className="h-3.5 w-3.5" />{video.releaseYear}
                </div>
              )}
              {video.duration && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <Clock className="h-3.5 w-3.5" />{video.duration} min
                </div>
              )}
            </div>

          </div>

          <div className="px-4 pt-6 pb-8">
            <div className="bg-card rounded-2xl shadow-[var(--card-shadow)] p-4 space-y-4">
              {video.cast?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cast</p>
                  <p className="text-sm">{video.cast.join(', ')}</p>
                </div>
              )}
              {video.collectionName && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collection</p>
                  <p className="text-sm">
                    {video.collectionName}
                    {video.order != null && <span className="text-muted-foreground"> #{video.order}</span>}
                  </p>
                </div>
              )}
              {video.summary && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                  <p className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{video.summary}</p>
                </div>
              )}
              {!video.cast?.length && !video.collectionName && !video.summary && (
                <p className="text-sm text-muted-foreground text-center py-2">No additional details</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
