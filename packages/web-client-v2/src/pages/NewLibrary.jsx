// Edited by Claude.
// Page for creating a new library
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useToast } from '@/components/Toast';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';

const NewLibrary = () => {
  const navigate = useNavigate();
  const { createLibrary } = useLibraries();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Name is required, max 20 chars
  const isValid = name.trim().length > 0 && name.trim().length <= 20;

  const handleSave = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createLibrary({
        name: name.trim(),
        description: description.trim(),
      });
      navigate(-1);
    } catch (err) {
      toast.error(err.message || 'Failed to create library');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, name, description, createLibrary, navigate, toast]);

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title="New Library"
        headerRight={
          <button
            onClick={handleSave}
            disabled={!isValid || isSubmitting}
            className={`text-sm font-medium ${
              isValid && !isSubmitting ? 'text-primary' : 'text-muted-foreground'
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

export default NewLibrary;
