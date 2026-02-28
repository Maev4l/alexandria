// Edited by Claude.
// Edit video form - allows collection assignment
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Film, ChevronDown } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useItemData } from '@/hooks';
import { librariesApi } from '@/api';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/Toast';
import CollectionPickerSheet from '@/components/CollectionPickerSheet';

const EditVideo = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const { updateVideo } = useLibraries();
  const { item: video } = useItemData(libraryId, itemId);
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    directors: '',
    cast: '',
    releaseYear: '',
    duration: '',
    pictureUrl: '',
    order: '',
  });

  const [posterError, setPosterError] = useState(false);

  // Collection picker state
  const [collectionId, setCollectionId] = useState(null);
  const [collectionName, setCollectionName] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  // Initialize form when video data loads
  useEffect(() => {
    if (video && !initialized) {
      setForm({
        title: video.title || '',
        summary: video.summary || '',
        directors: video.directors?.join(', ') || '',
        cast: video.cast?.join(', ') || '',
        releaseYear: video.releaseYear?.toString() || '',
        duration: video.duration?.toString() || '',
        pictureUrl: video.pictureUrl || '',
        order: video.order?.toString() || '',
      });
      setCollectionId(video.collectionId || null);
      setCollectionName(video.collectionName || '');
      setInitialized(true);
    }
  }, [video, initialized]);

  // Fetch available collections for this library
  useEffect(() => {
    if (!libraryId) return;

    const fetchCollections = async () => {
      setCollectionsLoading(true);
      try {
        const response = await librariesApi.getCollections(libraryId);
        setCollections(response.collections || []);
      } catch (err) {
        console.error('Failed to fetch collections:', err);
        // Non-fatal - user can still edit without changing collection
      } finally {
        setCollectionsLoading(false);
      }
    };

    fetchCollections();
  }, [libraryId]);

  // Handle collection selection from picker
  const handleCollectionSelect = (collection) => {
    if (collection) {
      setCollectionId(collection.id);
      setCollectionName(collection.name);
    } else {
      // "None" selected - remove from collection
      setCollectionId(null);
      setCollectionName('');
      setForm((prev) => ({ ...prev, order: '' }));
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (field === 'pictureUrl') setPosterError(false);
  };

  // Title is required, and order is required when collection is selected
  const isValid = form.title.trim().length > 0 && (!collectionId || form.order.trim().length > 0);

  // Check if there are changes compared to original video data
  // Includes collection changes (now editable via picker)
  const hasChanges = initialized && (
    form.title.trim() !== (video?.title || '') ||
    form.summary.trim() !== (video?.summary || '') ||
    form.directors.trim() !== (video?.directors?.join(', ') || '') ||
    form.cast.trim() !== (video?.cast?.join(', ') || '') ||
    form.releaseYear !== (video?.releaseYear?.toString() || '') ||
    form.duration !== (video?.duration?.toString() || '') ||
    form.pictureUrl.trim() !== (video?.pictureUrl || '') ||
    collectionId !== (video?.collectionId || null) ||
    form.order !== (video?.order?.toString() || '')
  );

  const canSubmit = isValid && hasChanges && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !libraryId || !itemId) return;

    setIsSubmitting(true);
    try {
      await updateVideo(libraryId, itemId, {
        title: form.title.trim(),
        summary: form.summary.trim(),
        directors: form.directors
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        cast: form.cast
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        releaseYear: form.releaseYear ? parseInt(form.releaseYear, 10) : null,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        pictureUrl: form.pictureUrl.trim() || null,
        collectionId: collectionId,
        order: collectionId && form.order ? parseInt(form.order, 10) : null,
      });

      navigate(-1);
    } catch (err) {
      console.error('Failed to update video:', err);
      toast.error(err.message || 'Failed to update video');
      setIsSubmitting(false);
    }
  }, [canSubmit, libraryId, itemId, form, collectionId, updateVideo, navigate, toast]);

  // Handle missing video data
  if (!video && initialized) {
    return (
      <div className="flex flex-col h-full">
        <AppBar title="Edit Video" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Video not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title="Edit Video"
        headerRight={
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`text-sm font-medium ${
              canSubmit ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Done'}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-8">
          {/* Poster preview */}
          <div className="flex justify-center">
            <div className="w-28 h-40 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border shadow-[var(--card-shadow)]">
              {form.pictureUrl && !posterError ? (
                <img
                  src={form.pictureUrl}
                  alt="Video poster preview"
                  className="w-full h-full object-cover"
                  onError={() => setPosterError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <Film className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">
                    {posterError ? 'Invalid URL' : 'No poster'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Poster URL */}
          <div className="space-y-2">
            <Label htmlFor="pictureUrl">Poster URL</Label>
            <Input
              id="pictureUrl"
              type="url"
              value={form.pictureUrl}
              onChange={handleChange('pictureUrl')}
              placeholder="https://..."
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={handleChange('title')}
              placeholder="Enter video title"
            />
          </div>

          {/* Directors */}
          <div className="space-y-2">
            <Label htmlFor="directors">Directors</Label>
            <Input
              id="directors"
              value={form.directors}
              onChange={handleChange('directors')}
              placeholder="Comma-separated names"
            />
          </div>

          {/* Cast */}
          <div className="space-y-2">
            <Label htmlFor="cast">Cast</Label>
            <Input
              id="cast"
              value={form.cast}
              onChange={handleChange('cast')}
              placeholder="Comma-separated names"
            />
          </div>

          {/* Year and Duration row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="releaseYear">Year</Label>
              <Input
                id="releaseYear"
                type="number"
                value={form.releaseYear}
                onChange={handleChange('releaseYear')}
                placeholder="2024"
                min="1800"
                max="2100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                value={form.duration}
                onChange={handleChange('duration')}
                placeholder="120"
                min="0"
                max="1000"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={form.summary}
              onChange={handleChange('summary')}
              placeholder="Enter plot summary"
              rows={4}
            />
          </div>

          {/* Collection section - tappable field opens picker */}
          <div className={collectionId ? 'grid grid-cols-2 gap-4' : ''}>
            <div className="space-y-2">
              <Label>Collection</Label>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span className={collectionName ? '' : 'text-muted-foreground'}>
                  {collectionName || 'None'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Order field only shown when collection is selected (required) */}
            {collectionId && (
              <div className="space-y-2">
                <Label htmlFor="order">Order *</Label>
                <Input
                  id="order"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="1000"
                  value={form.order}
                  onChange={handleChange('order')}
                  placeholder="1"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collection picker sheet */}
      <CollectionPickerSheet
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        collections={collections}
        selectedId={collectionId}
        onSelect={handleCollectionSelect}
        isLoading={collectionsLoading}
      />
    </div>
  );
};

export default EditVideo;
