// Edited by Claude.
// Manual video entry form
import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/Toast';

const NewVideo = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { createVideo } = useLibraries();
  const toast = useToast();

  // Get prefilled collection and order from location state
  // Collection is { id, name } object or null
  const collection = location.state?.collection || null;
  const prefilledOrder = location.state?.order || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    directors: '',
    cast: '',
    releaseYear: '',
    duration: '',
    pictureUrl: '',
    order: prefilledOrder,
  });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createVideo(libraryId, {
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
        collectionId: collection?.id || null,
        order: form.order ? parseInt(form.order, 10) : null,
      });

      toast.success('Video added');
      // Navigate back to library content, replacing history
      navigate(`/libraries/${libraryId}`, { replace: true });
    } catch (err) {
      console.error('Failed to create video:', err);
      toast.error(err.message || 'Failed to add video');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppBar title="New Video" />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={handleChange('title')}
            placeholder="Enter video title"
            required
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
            rows={3}
          />
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

        {/* Collection and Order row - only shown if adding to a collection */}
        {collection && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Collection</Label>
              <Input
                value={collection.name}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Order</Label>
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
          </div>
        )}
      </div>

        {/* Submit button */}
        <div className="p-4 border-t border-border">
          <Button
            type="submit"
            disabled={!form.title.trim() || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Video'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVideo;
