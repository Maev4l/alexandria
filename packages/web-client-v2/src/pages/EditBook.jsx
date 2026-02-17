// Edited by Claude.
// Edit book page - form to update existing book details
// Uses LibrariesContext to update items
import { useEffect, useState, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { useNavigation } from '@/navigation';
import { useLibraries } from '@/state';
import { useToast } from '@/components/Toast';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

const EditBook = () => {
  const { setOptions, params, goBack } = useNavigation();
  const { updateBook } = useLibraries();
  const toast = useToast();
  const library = params?.library;
  const book = params?.book;

  // Pre-fill form with existing book data
  const [cover, setCover] = useState(book?.pictureUrl || '');
  const [coverError, setCoverError] = useState(false);
  const [title, setTitle] = useState(book?.title || '');
  const [summary, setSummary] = useState(book?.summary || '');
  const [authors, setAuthors] = useState(book?.authors?.join(', ') || '');
  const [isbn, setIsbn] = useState(book?.isbn || '');
  const [collection, setCollection] = useState(book?.collection || '');
  const [order, setOrder] = useState(book?.order?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset cover error when URL changes
  const handleCoverChange = (e) => {
    setCover(e.target.value);
    setCoverError(false);
  };

  // Title is required
  const isValid = title.trim().length > 0;

  // Check if there are changes compared to original book data
  const hasChanges =
    cover.trim() !== (book?.pictureUrl || '') ||
    title.trim() !== (book?.title || '') ||
    summary.trim() !== (book?.summary || '') ||
    authors.trim() !== (book?.authors?.join(', ') || '') ||
    isbn.trim() !== (book?.isbn || '') ||
    collection.trim() !== (book?.collection || '') ||
    order !== (book?.order?.toString() || '');

  const canSubmit = isValid && hasChanges && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !library?.id || !book?.id) return;

    setIsSubmitting(true);
    try {
      const authorsArray = authors.split(',').map((a) => a.trim()).filter(Boolean);
      await updateBook(library.id, book.id, {
        title: title.trim(),
        summary: summary.trim() || null,
        authors: authorsArray,
        isbn: isbn.trim() || null,
        pictureUrl: cover.trim() || null,
        collection: collection.trim() || null,
        order: order ? parseInt(order, 10) : null,
      });
      goBack();
    } catch (err) {
      toast.error(err.message || 'Failed to update book');
      setIsSubmitting(false);
    }
  }, [canSubmit, library?.id, book?.id, title, summary, authors, isbn, cover, collection, order, updateBook, goBack, toast]);

  // Set up header with Done button
  useEffect(() => {
    setOptions({
      title: 'Edit Book',
      headerRight: (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`text-sm font-medium ${
            canSubmit ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Done'}
        </button>
      ),
    });
  }, [setOptions, handleSubmit, canSubmit, isSubmitting]);

  // Handle missing book data
  if (!book) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground">Book not found</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
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
  );
};

export default EditBook;
