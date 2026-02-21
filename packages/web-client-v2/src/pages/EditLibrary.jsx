// Edited by Claude.
// Page for editing an existing library
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useLibraryData } from '@/hooks';
import { useToast } from '@/components/Toast';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';

const EditLibrary = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { updateLibrary } = useLibraries();
  const { library } = useLibraryData(libraryId);
  const toast = useToast();

  const [name, setName] = useState(library?.name || '');
  const [description, setDescription] = useState(library?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form when library loads
  useEffect(() => {
    if (library) {
      setName(library.name || '');
      setDescription(library.description || '');
    }
  }, [library]);

  // Name is required, max 20 chars
  const isValid = name.trim().length > 0 && name.trim().length <= 20;

  // Check if there are changes
  const hasChanges =
    name.trim() !== (library?.name || '') ||
    description.trim() !== (library?.description || '');

  const handleSave = useCallback(async () => {
    if (!isValid || isSubmitting || !library) return;

    setIsSubmitting(true);
    try {
      await updateLibrary(library.id, {
        name: name.trim(),
        description: description.trim(),
      });
      navigate(-1);
    } catch (err) {
      toast.error(err.message || 'Failed to update library');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, library, name, description, updateLibrary, navigate, toast]);

  if (!library) {
    return (
      <div className="flex flex-col h-full">
        <AppBar title="Edit Library" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Library not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title={library.name}
        headerRight={
          <button
            onClick={handleSave}
            disabled={!isValid || !hasChanges || isSubmitting}
            className={`text-sm font-medium ${
              isValid && hasChanges && !isSubmitting ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Done'}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="library-name">Name</Label>
            <Input
              id="library-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Library"
              maxLength={20}
              autoCapitalize="words"
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">
              {name.length}/20
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="library-description">Description (optional)</Label>
            <Textarea
              id="library-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description"
              maxLength={100}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/100
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditLibrary;
