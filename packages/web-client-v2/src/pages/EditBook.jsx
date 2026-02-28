// Edited by Claude.
// Edit book page - form to update existing book details
// Uses LibrariesContext to update items, allows collection assignment
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useItemData } from '@/hooks';
import { librariesApi } from '@/api';
import { useToast } from '@/components/Toast';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import CollectionPickerSheet from '@/components/CollectionPickerSheet';

const EditBook = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const { updateBook } = useLibraries();
  const { item: book, library } = useItemData(libraryId, itemId);
  const toast = useToast();

  // Pre-fill form with existing book data
  const [cover, setCover] = useState('');
  const [coverError, setCoverError] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authors, setAuthors] = useState('');
  const [isbn, setIsbn] = useState('');
  const [order, setOrder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Collection picker state
  const [collectionId, setCollectionId] = useState(null);
  const [collectionName, setCollectionName] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  // Initialize form when book data loads
  useEffect(() => {
    if (book && !initialized) {
      setCover(book.pictureUrl || '');
      setTitle(book.title || '');
      setSummary(book.summary || '');
      setAuthors(book.authors?.join(', ') || '');
      setIsbn(book.isbn || '');
      setOrder(book.order?.toString() || '');
      setCollectionId(book.collectionId || null);
      setCollectionName(book.collectionName || '');
      setInitialized(true);
    }
  }, [book, initialized]);

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
      setOrder('');
    }
  };

  // Reset cover error when URL changes
  const handleCoverChange = (e) => {
    setCover(e.target.value);
    setCoverError(false);
  };

  // Title is required, and order is required when collection is selected
  const isValid = title.trim().length > 0 && (!collectionId || order.trim().length > 0);

  // Check if there are changes compared to original book data
  // Includes collection changes (now editable via picker)
  const hasChanges = initialized && (
    cover.trim() !== (book?.pictureUrl || '') ||
    title.trim() !== (book?.title || '') ||
    summary.trim() !== (book?.summary || '') ||
    authors.trim() !== (book?.authors?.join(', ') || '') ||
    isbn.trim() !== (book?.isbn || '') ||
    collectionId !== (book?.collectionId || null) ||
    order !== (book?.order?.toString() || '')
  );

  const canSubmit = isValid && hasChanges && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !libraryId || !itemId) return;

    setIsSubmitting(true);
    try {
      const authorsArray = authors.split(',').map((a) => a.trim()).filter(Boolean);
      await updateBook(libraryId, itemId, {
        title: title.trim(),
        summary: summary.trim() || null,
        authors: authorsArray,
        isbn: isbn.trim() || null,
        pictureUrl: cover.trim() || null,
        collectionId: collectionId,
        order: collectionId && order ? parseInt(order, 10) : null,
      });
      navigate(-1);
    } catch (err) {
      toast.error(err.message || 'Failed to update book');
      setIsSubmitting(false);
    }
  }, [canSubmit, libraryId, itemId, title, summary, authors, isbn, cover, collectionId, order, updateBook, navigate, toast]);

  // Handle missing book data
  if (!book && initialized) {
    return (
      <div className="flex flex-col h-full">
        <AppBar title="Edit Book" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Book not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title="Edit Book"
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
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
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

export default EditBook;
