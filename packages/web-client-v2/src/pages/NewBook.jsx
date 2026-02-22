// Edited by Claude.
// New book page - manual entry form
// Uses LibrariesContext to create items
import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useToast } from '@/components/Toast';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

const NewBook = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { createBook } = useLibraries();
  const toast = useToast();

  // Get prefilled collection and order from location state
  const prefilledCollection = location.state?.collection || '';
  const prefilledOrder = location.state?.order || '';

  // Cancel: go back to previous page
  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const [cover, setCover] = useState('');
  const [coverError, setCoverError] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authors, setAuthors] = useState('');
  const [isbn, setIsbn] = useState('');
  const [collection, setCollection] = useState(prefilledCollection);
  const [order, setOrder] = useState(prefilledOrder);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset cover error when URL changes
  const handleCoverChange = (e) => {
    setCover(e.target.value);
    setCoverError(false);
  };

  const canSubmit = title.trim() && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !libraryId) return;

    setIsSubmitting(true);
    try {
      const authorsArray = authors.split(',').map((a) => a.trim()).filter(Boolean);
      await createBook(libraryId, {
        title: title.trim(),
        summary: summary.trim() || null,
        authors: authorsArray,
        isbn: isbn.trim() || null,
        pictureUrl: cover.trim() || null,
        collection: collection.trim() || null,
        order: order ? parseInt(order, 10) : null,
      });
      // Navigate back to library content, replacing history
      navigate(`/libraries/${libraryId}`, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to create book');
      setIsSubmitting(false);
    }
  }, [canSubmit, libraryId, title, summary, authors, isbn, cover, collection, order, createBook, navigate, toast]);

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title="New Book"
        headerLeft={
          <button
            onClick={handleCancel}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        }
        headerRight={
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              canSubmit
                ? 'text-primary hover:bg-accent'
                : 'text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Saving...' : 'Done'}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-8">
          {/* Cover preview - asymmetric radius mimics real book */}
          <div className="flex justify-center">
            <div className="w-32 h-44 rounded-[2px_6px_6px_2px] bg-muted flex items-center justify-center overflow-hidden border border-border shadow-[var(--card-shadow)]">
              {cover && !coverError ? (
                <img
                  src={cover}
                  alt="Book cover preview"
                  className="w-full h-full object-cover"
                  onError={() => setCoverError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">
                    {coverError ? 'Invalid URL' : 'No cover'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover">Cover URL</Label>
            <Input
              id="cover"
              type="url"
              value={cover}
              onChange={handleCoverChange}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Book description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authors">Authors</Label>
            <Input
              id="authors"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="Author names (comma separated)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <Input
              id="isbn"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBN (10 or 13 digits)"
              maxLength={13}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collection">Collection</Label>
              <Input
                id="collection"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="Collection name"
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
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBook;
